import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { prisma } from "@/server/db/client";
import { withRls } from "@/server/db/with-rls";
import { createTestUser, deleteTestUser } from "./helpers";

type TestUser = Awaited<ReturnType<typeof createTestUser>>;
let a: TestUser;
let b: TestUser;

beforeAll(async () => {
  a = await createTestUser("a");
  b = await createTestUser("b");
});

afterAll(async () => {
  await Promise.allSettled([a && deleteTestUser(a.id), b && deleteTestUser(b.id)]);
  await prisma.$disconnect();
});

async function seedTransaction(user: TestUser) {
  return withRls(user.claims, async (tx) => {
    const wallet = await tx.wallet.findFirstOrThrow({ where: { isDefault: true } });
    const category = await tx.category.findFirstOrThrow({ where: { kind: "expense" } });
    return tx.transaction.create({
      data: {
        userId: user.id,
        walletId: wallet.id,
        categoryId: category.id,
        amount: 50_000n,
        type: "expense",
        description: "uji",
        occurredAt: new Date(),
      },
    });
  });
}

describe("data bawaan pendaftaran (FR 9, FR 10)", () => {
  test("pengguna baru punya 10 kategori dan 1 dompet utama Tunai", async () => {
    const { categories, wallets } = await withRls(a.claims, async (tx) => ({
      categories: await tx.category.count(),
      wallets: await tx.wallet.findMany(),
    }));
    expect(categories).toBe(10);
    expect(wallets).toHaveLength(1);
    expect(wallets[0]).toMatchObject({ name: "Tunai", isDefault: true });
  });
});

describe("isolasi antar-pengguna (FR 17)", () => {
  test("A tidak bisa membaca, mengubah, atau menghapus data B", async () => {
    const txB = await seedTransaction(b);

    await withRls(a.claims, async (tx) => {
      expect(await tx.transaction.findUnique({ where: { id: txB.id } })).toBeNull();
      expect(await tx.wallet.count({ where: { userId: b.id } })).toBe(0);
      expect(await tx.category.count({ where: { userId: b.id } })).toBe(0);
      expect(await tx.user.count({ where: { id: b.id } })).toBe(0);
      const updated = await tx.transaction.updateMany({ where: { id: txB.id }, data: { amount: 1n } });
      expect(updated.count).toBe(0);
      const deleted = await tx.transaction.deleteMany({ where: { id: txB.id } });
      expect(deleted.count).toBe(0);
    });

    const stillThere = await prisma.transaction.findUniqueOrThrow({ where: { id: txB.id } });
    expect(stillThere.amount).toBe(50_000n);
  });

  test("A tidak bisa menulis baris atas nama B", async () => {
    await expect(
      withRls(a.claims, async (tx) => {
        const walletB = await prisma.wallet.findFirstOrThrow({ where: { userId: b.id } });
        await tx.wallet.create({ data: { userId: b.id, name: `curian-${walletB.id.slice(0, 4)}` } });
      }),
    ).rejects.toThrow();
  });

  test("view wallet_balances ikut tunduk pada RLS", async () => {
    const rows = await withRls(a.claims, (tx) =>
      tx.$queryRaw<{ user_id: string }[]>`select user_id from public.wallet_balances`,
    );
    expect(rows.every((r) => r.user_id === a.id)).toBe(true);
  });
});

describe("integritas lintas tenant", () => {
  test("transaksi A tidak boleh menunjuk dompet milik B", async () => {
    const walletB = await prisma.wallet.findFirstOrThrow({ where: { userId: b.id } });
    await expect(
      withRls(a.claims, async (tx) => {
        const category = await tx.category.findFirstOrThrow({ where: { kind: "expense" } });
        await tx.transaction.create({
          data: {
            userId: a.id,
            walletId: walletB.id,
            categoryId: category.id,
            amount: 1000n,
            type: "expense",
            occurredAt: new Date(),
          },
        });
      }),
    ).rejects.toThrow();
  });

  test("transaksi expense tidak boleh memakai kategori income", async () => {
    await expect(
      withRls(a.claims, async (tx) => {
        const wallet = await tx.wallet.findFirstOrThrow({ where: { isDefault: true } });
        const income = await tx.category.findFirstOrThrow({ where: { kind: "income" } });
        await tx.transaction.create({
          data: {
            userId: a.id,
            walletId: wallet.id,
            categoryId: income.id,
            amount: 1000n,
            type: "expense",
            occurredAt: new Date(),
          },
        });
      }),
    ).rejects.toThrow();
  });
});

describe("hapus akun (FR 1)", () => {
  test("menghapus user di Auth menghapus seluruh datanya", async () => {
    const c = await createTestUser("c");
    await seedTransaction(c);
    await deleteTestUser(c.id);

    const [users, wallets, categories, transactions] = await Promise.all([
      prisma.user.count({ where: { id: c.id } }),
      prisma.wallet.count({ where: { userId: c.id } }),
      prisma.category.count({ where: { userId: c.id } }),
      prisma.transaction.count({ where: { userId: c.id } }),
    ]);
    expect({ users, wallets, categories, transactions }).toEqual({
      users: 0,
      wallets: 0,
      categories: 0,
      transactions: 0,
    });
  });
});
