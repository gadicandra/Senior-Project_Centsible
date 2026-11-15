import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { prisma } from "@/server/db/client";
import { listCategories, setCategoryArchived } from "@/server/services/categories";
import { getSummary } from "@/server/services/summary";
import { createTransaction } from "@/server/services/transactions";
import { createWallet, listWallets, setWalletArchived } from "@/server/services/wallets";
import { createTestUser, deleteTestUser } from "./helpers";

let a: Awaited<ReturnType<typeof createTestUser>>;
let b: Awaited<ReturnType<typeof createTestUser>>;
let makan: string;

beforeAll(async () => {
  [a, b] = await Promise.all([createTestUser("sum-a"), createTestUser("sum-b")]);
  const walletId = (await listWallets(a.claims)).find((w) => w.isDefault)!.id;
  const cats = await listCategories(a.claims);
  makan = cats.find((c) => c.name === "Makan")!.id;
  const transport = cats.find((c) => c.name === "Transport")!.id;
  const uangSaku = cats.find((c) => c.name === "Uang Saku")!.id;
  const base = { description: "", walletId };
  await createTransaction(a.claims, { ...base, type: "income", amount: 1_000_000, categoryId: uangSaku, occurredAt: "2026-09-30" });
  await createTransaction(a.claims, { ...base, type: "expense", amount: 25_000, categoryId: makan, occurredAt: "2026-09-30" });
  await createTransaction(a.claims, { ...base, type: "expense", amount: 50_000, categoryId: transport, occurredAt: "2026-10-01" });
  await createTransaction(a.claims, { ...base, type: "expense", amount: 10_000, categoryId: makan, occurredAt: "2026-09-01" });
});

afterAll(async () => {
  await Promise.allSettled([a && deleteTestUser(a.id), b && deleteTestUser(b.id)]);
  await prisma.$disconnect();
});

describe("ringkasan bulanan (FR 12)", () => {
  test("September 2026: total, harian, kategori; transaksi 1 Oktober tidak ikut", async () => {
    const s = await getSummary(a.claims, "2026-09");
    expect(s.income).toBe(1_000_000);
    expect(s.expense).toBe(35_000);
    expect(s.transactionCount).toBe(3);
    expect(s.daily).toHaveLength(30);
    expect(s.daily[0]).toEqual({ date: "2026-09-01", income: 0, expense: 10_000 });
    expect(s.daily[29]).toEqual({ date: "2026-09-30", income: 1_000_000, expense: 25_000 });
    expect(s.categories.map((c) => [c.name, c.amount, c.percent])).toEqual([["Makan", 35_000, 100]]);
  });

  test("Oktober 2026: hanya Transport", async () => {
    const s = await getSummary(a.claims, "2026-10");
    expect(s.income).toBe(0);
    expect(s.expense).toBe(50_000);
    expect(s.categories.map((c) => [c.name, c.percent])).toEqual([["Transport", 100]]);
  });

  test("total saldo = saldo dompet aktif; dompet arsip tidak dihitung", async () => {
    const active = (await listWallets(a.claims)).filter((w) => !w.isArchived);
    const before = (await getSummary(a.claims, "2026-09")).totalBalance;
    expect(before).toBe(active.reduce((s, w) => s + w.balance, 0));
    expect(before).toBe(915_000);

    await createWallet(a.claims, { name: "Arsip Ringkasan", type: "bank", initialBalance: 500_000 });
    const extra = (await listWallets(a.claims)).find((w) => w.name === "Arsip Ringkasan")!;
    await setWalletArchived(a.claims, extra.id, true);
    expect((await getSummary(a.claims, "2026-09")).totalBalance).toBe(before);
  });

  test("kategori arsip tetap tampil di riwayat", async () => {
    await setCategoryArchived(a.claims, makan, true);
    const s = await getSummary(a.claims, "2026-09");
    expect(s.categories).toEqual([expect.objectContaining({ id: makan, name: "Makan", isArchived: true })]);
  });

  test("RLS: pengguna lain tidak melihat data A", async () => {
    const s = await getSummary(b.claims, "2026-09");
    expect(s.income).toBe(0);
    expect(s.expense).toBe(0);
    expect(s.transactionCount).toBe(0);
    expect(s.categories).toEqual([]);
    expect(s.totalBalance).toBe(0);
  });
});
