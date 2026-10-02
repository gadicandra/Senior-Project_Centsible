import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { prisma } from "@/server/db/client";
import { withRls } from "@/server/db/with-rls";
import {
  CategoryError,
  createCategory,
  deleteCategory,
  listCategories,
  setCategoryArchived,
} from "@/server/services/categories";
import {
  WalletError,
  createWallet,
  deleteWallet,
  listWallets,
  setDefaultWallet,
  setWalletArchived,
} from "@/server/services/wallets";
import { createTestUser, deleteTestUser } from "./helpers";

let u: Awaited<ReturnType<typeof createTestUser>>;

beforeAll(async () => {
  u = await createTestUser("settings");
});
afterAll(async () => {
  if (u) await deleteTestUser(u.id);
  await prisma.$disconnect();
});

describe("dompet (FR 10)", () => {
  test("tambah, saldo dari view, ganti dompet utama", async () => {
    await createWallet(u.claims, { name: "BCA", type: "bank", initialBalance: 1_000_000 });
    let wallets = await listWallets(u.claims);
    const bca = wallets.find((w) => w.name === "BCA")!;
    expect(bca).toMatchObject({ balance: 1_000_000, isDefault: false, transactionCount: 0 });

    await setDefaultWallet(u.claims, bca.id);
    wallets = await listWallets(u.claims);
    expect(wallets.filter((w) => w.isDefault).map((w) => w.name)).toEqual(["BCA"]);
  });

  test("nama aktif unik tanpa beda huruf besar/kecil", async () => {
    await expect(createWallet(u.claims, { name: "bca", type: "bank", initialBalance: 0 })).rejects.toThrow();
  });

  test("dompet utama tidak bisa diarsipkan atau dihapus", async () => {
    const main = (await listWallets(u.claims)).find((w) => w.isDefault)!;
    await expect(setWalletArchived(u.claims, main.id, true)).rejects.toBeInstanceOf(WalletError);
    await expect(deleteWallet(u.claims, main.id)).rejects.toBeInstanceOf(WalletError);
  });

  test("dompet yang sudah dipakai transaksi hanya bisa diarsipkan", async () => {
    const tunai = (await listWallets(u.claims)).find((w) => w.name === "Tunai")!;
    await withRls(u.claims, async (tx) => {
      const cat = await tx.category.findFirstOrThrow({ where: { kind: "expense" } });
      await tx.transaction.create({
        data: { userId: u.id, walletId: tunai.id, categoryId: cat.id, amount: 15_000n, type: "expense", occurredAt: new Date() },
      });
    });
    await expect(deleteWallet(u.claims, tunai.id)).rejects.toBeInstanceOf(WalletError);
    await setWalletArchived(u.claims, tunai.id, true);
    const after = (await listWallets(u.claims)).find((w) => w.id === tunai.id)!;
    expect(after).toMatchObject({ isArchived: true, balance: -15_000, transactionCount: 1 });
  });
});

describe("kategori (FR 9)", () => {
  test("tambah lalu hapus kategori yang belum dipakai", async () => {
    await createCategory(u.claims, { name: "Langganan", kind: "expense", icon: "📺", color: "#123456" });
    const created = (await listCategories(u.claims)).find((c) => c.name === "Langganan")!;
    expect(created).toMatchObject({ isSystem: false, transactionCount: 0 });
    await deleteCategory(u.claims, created.id);
    expect((await listCategories(u.claims)).some((c) => c.id === created.id)).toBe(false);
  });

  test("kategori terpakai tidak bisa dihapus, hanya diarsipkan", async () => {
    const used = (await listCategories(u.claims)).find((c) => c.transactionCount > 0)!;
    await expect(deleteCategory(u.claims, used.id)).rejects.toBeInstanceOf(CategoryError);
    await setCategoryArchived(u.claims, used.id, true);
    await setCategoryArchived(u.claims, used.id, false);
  });

  test("kategori aktif terakhir per jenis tidak bisa diarsipkan", async () => {
    const income = (await listCategories(u.claims)).filter((c) => c.kind === "income");
    for (const c of income.slice(1)) await setCategoryArchived(u.claims, c.id, true);
    await expect(setCategoryArchived(u.claims, income[0].id, true)).rejects.toBeInstanceOf(CategoryError);
  });
});
