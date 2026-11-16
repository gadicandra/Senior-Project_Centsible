import { afterAll, beforeAll, expect, test } from "vitest";
import { prisma } from "@/server/db/client";
import { listCategories } from "@/server/services/categories";
import { createTransaction, exportTransactions } from "@/server/services/transactions";
import { listWallets } from "@/server/services/wallets";
import { createTestUser, deleteTestUser } from "./helpers";

let a: Awaited<ReturnType<typeof createTestUser>>;
let b: Awaited<ReturnType<typeof createTestUser>>;

beforeAll(async () => {
  [a, b] = await Promise.all([createTestUser("csv-a"), createTestUser("csv-b")]);
  const walletId = (await listWallets(a.claims)).find((w) => w.isDefault)!.id;
  const cats = await listCategories(a.claims);
  const makan = cats.find((c) => c.name === "Makan" && c.kind === "expense")!.id;
  const uangSaku = cats.find((c) => c.name === "Uang Saku")!.id;
  const base = { walletId, description: "" };
  await createTransaction(a.claims, { ...base, type: "expense", amount: 25_000, categoryId: makan, occurredAt: "2026-10-02", description: "nasi, telur" });
  await createTransaction(a.claims, { ...base, type: "income", amount: 1_000_000, categoryId: uangSaku, occurredAt: "2026-10-01" });
  await createTransaction(a.claims, { ...base, type: "expense", amount: 70_000, categoryId: makan, occurredAt: "2026-09-30" });
});

afterAll(async () => {
  await Promise.allSettled([a && deleteTestUser(a.id), b && deleteTestUser(b.id)]);
  await prisma.$disconnect();
});

test("rentang tanggal, urutan terlama dulu, nama kategori & dompet (FR 15)", async () => {
  const rows = await exportTransactions(a.claims, { from: "2026-10-01", to: "2026-10-31" });
  expect(rows).toEqual([
    { occurredAt: "2026-10-01", type: "income", amount: 1_000_000, category: "Uang Saku", wallet: "Tunai", description: "" },
    { occurredAt: "2026-10-02", type: "expense", amount: 25_000, category: "Makan", wallet: "Tunai", description: "nasi, telur" },
  ]);
  expect(await exportTransactions(a.claims, { type: "expense" })).toHaveLength(2);
});

test("RLS: pengguna lain tidak mendapat baris A", async () => {
  expect(await exportTransactions(b.claims, {})).toEqual([]);
});
