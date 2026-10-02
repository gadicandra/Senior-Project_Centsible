import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { prisma } from "@/server/db/client";
import { setCategoryArchived, listCategories } from "@/server/services/categories";
import {
  TransactionError,
  createTransaction,
  deleteTransaction,
  listTransactions,
  updateTransaction,
} from "@/server/services/transactions";
import { listWallets } from "@/server/services/wallets";
import { createTestUser, deleteTestUser } from "./helpers";

let a: Awaited<ReturnType<typeof createTestUser>>;
let b: Awaited<ReturnType<typeof createTestUser>>;
let walletId: string;
let makan: string;
let transport: string;
let uangSaku: string;

beforeAll(async () => {
  [a, b] = await Promise.all([createTestUser("tx-a"), createTestUser("tx-b")]);
  walletId = (await listWallets(a.claims)).find((w) => w.isDefault)!.id;
  const cats = await listCategories(a.claims);
  makan = cats.find((c) => c.name === "Makan")!.id;
  transport = cats.find((c) => c.name === "Transport")!.id;
  uangSaku = cats.find((c) => c.name === "Uang Saku")!.id;
});
afterAll(async () => {
  await Promise.allSettled([a && deleteTestUser(a.id), b && deleteTestUser(b.id)]);
  await prisma.$disconnect();
});

const base = { description: "", occurredAt: "2026-09-30" };

describe("CRUD transaksi (FR 8)", () => {
  test("tambah, filter, total, dan saldo dompet", async () => {
    await createTransaction(a.claims, { ...base, type: "income", amount: 1_000_000, categoryId: uangSaku, walletId });
    await createTransaction(a.claims, { ...base, type: "expense", amount: 25_000, categoryId: makan, walletId, description: "nasi padang" });
    await createTransaction(a.claims, { ...base, type: "expense", amount: 50_000, categoryId: transport, walletId, occurredAt: "2026-10-01" });

    const all = await listTransactions(a.claims, {});
    expect(all.total).toBe(3);
    expect(all.totals).toEqual({ income: 1_000_000, expense: 75_000 });
    expect(all.items[0].occurredAt).toBe("2026-10-01"); // terbaru di atas
    expect(all.items.every((t) => t.source === "manual")).toBe(true);

    const onlyFood = await listTransactions(a.claims, { categoryId: makan });
    expect(onlyFood.items.map((t) => t.description)).toEqual(["nasi padang"]);

    const range = await listTransactions(a.claims, { from: "2026-10-01", to: "2026-10-31" });
    expect(range.total).toBe(1);

    const wallet = (await listWallets(a.claims)).find((w) => w.id === walletId)!;
    expect(wallet.balance).toBe(925_000);
  });

  test("ubah dan hapus", async () => {
    const [first] = (await listTransactions(a.claims, { categoryId: transport })).items;
    await updateTransaction(a.claims, first.id, { ...base, type: "expense", amount: 60_000, categoryId: transport, walletId });
    expect((await listTransactions(a.claims, { categoryId: transport })).items[0].amount).toBe(60_000);
    await deleteTransaction(a.claims, first.id);
    expect((await listTransactions(a.claims, { categoryId: transport })).total).toBe(0);
  });

  test("kategori harus sesuai jenis", async () => {
    await expect(
      createTransaction(a.claims, { ...base, type: "expense", amount: 1_000, categoryId: uangSaku, walletId }),
    ).rejects.toMatchObject({ field: "categoryId" });
  });

  test("kategori arsip ditolak untuk transaksi baru tapi boleh dipertahankan saat diubah", async () => {
    const [food] = (await listTransactions(a.claims, { categoryId: makan })).items;
    await setCategoryArchived(a.claims, makan, true);
    await expect(
      createTransaction(a.claims, { ...base, type: "expense", amount: 1_000, categoryId: makan, walletId }),
    ).rejects.toBeInstanceOf(TransactionError);
    await updateTransaction(a.claims, food.id, { ...base, type: "expense", amount: 30_000, categoryId: makan, walletId });
    await setCategoryArchived(a.claims, makan, false);
  });

  test("pengguna lain tidak bisa melihat, mengubah, atau menghapus", async () => {
    const [mine] = (await listTransactions(a.claims, {})).items;
    expect((await listTransactions(b.claims, {})).total).toBe(0);
    await expect(deleteTransaction(b.claims, mine.id)).rejects.toBeInstanceOf(TransactionError);
    await expect(
      updateTransaction(b.claims, mine.id, { ...base, type: "income", amount: 1, categoryId: uangSaku, walletId }),
    ).rejects.toBeInstanceOf(TransactionError);
    expect((await listTransactions(a.claims, {})).items.some((t) => t.id === mine.id)).toBe(true);
  });
});
