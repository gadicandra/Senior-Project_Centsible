import { afterAll, beforeAll, describe, expect, test } from "vitest";
import { statusText } from "@/lib/budget";
import { dateOnlyToDate, dateToDateOnly } from "@/lib/dates";
import { BUDGET_NOT_FOUND } from "@/lib/schemas/budget";
import { prisma } from "@/server/db/client";
import { isUniqueViolation, pgCode } from "@/server/db/errors";
import { withRls } from "@/server/db/with-rls";
import { BudgetError, createBudget, deleteBudget, getBudgetOverview, updateBudgetLimit } from "@/server/services/budgets";
import { createCategory, deleteCategory, listCategories, setCategoryArchived } from "@/server/services/categories";
import { getSummary } from "@/server/services/summary";
import { createTransaction } from "@/server/services/transactions";
import { listWallets } from "@/server/services/wallets";
import { createTestUser, deleteTestUser } from "./helpers";

// Kamis 15 Okt 2026 di Asia/Jakarta → minggu 12–18 Okt, bulan Oktober.
const NOW = new Date("2026-10-15T05:00:00Z");
const TODAY = "2026-10-15";

let a: Awaited<ReturnType<typeof createTestUser>>;
let b: Awaited<ReturnType<typeof createTestUser>>;
let makan: string;
let transport: string;
let uangSaku: string;
let M: string; // anggaran bulanan Makan milik A
let W: string; // anggaran mingguan Makan milik A

const overview = (claims = a.claims) => getBudgetOverview(claims, NOW);
const byId = async (id: string) => (await overview()).budgets.find((x) => x.id === id);

beforeAll(async () => {
  [a, b] = await Promise.all([createTestUser("bud-a"), createTestUser("bud-b")]);
  const walletId = (await listWallets(a.claims)).find((w) => w.isDefault)!.id;
  const cats = await listCategories(a.claims);
  // bootstrap_user membuat dua "Lain-lain": cari berdasarkan nama DAN jenis.
  const find = (name: string, kind: "income" | "expense") => cats.find((c) => c.name === name && c.kind === kind)!.id;
  makan = find("Makan", "expense");
  transport = find("Transport", "expense");
  uangSaku = find("Uang Saku", "income");

  const tx = (type: "income" | "expense", amount: number, categoryId: string, occurredAt: string) =>
    createTransaction(a.claims, { type, amount, categoryId, occurredAt, walletId, description: "" });
  await tx("expense", 300_000, makan, "2026-10-02");
  await tx("expense", 100_000, makan, "2026-10-14");
  await tx("expense", 70_000, makan, "2026-09-30");
  await tx("expense", 50_000, transport, "2026-10-14");
  await tx("income", 1_000_000, uangSaku, "2026-10-14");
});

afterAll(async () => {
  await Promise.allSettled([a && deleteTestUser(a.id), b && deleteTestUser(b.id)]);
  await prisma.$disconnect();
});

describe("anggaran per kategori (FR 11)", () => {
  test("2. buat bulanan & mingguan Makan", async () => {
    await createBudget(a.claims, { categoryId: makan, period: "monthly", amountLimit: 500_000 }, TODAY);
    await createBudget(a.claims, { categoryId: makan, period: "weekly", amountLimit: 150_000 }, TODAY);
    const rows = await withRls(a.claims, (tx) => tx.budget.findMany({ select: { id: true, period: true, startDate: true } }));
    M = rows.find((r) => r.period === "monthly")!.id;
    W = rows.find((r) => r.period === "weekly")!.id;
    expect(dateToDateOnly(rows.find((r) => r.id === M)!.startDate)).toBe("2026-10-01");
    expect(dateToDateOnly(rows.find((r) => r.id === W)!.startDate)).toBe("2026-10-12");
  });

  test("3. pemakaian sama dengan /ringkasan", async () => {
    expect(await byId(M)).toMatchObject({ used: 400_000, percent: 80, status: "warning" });
    expect(await byId(W)).toMatchObject({ used: 100_000, percent: 66, status: "normal" });
    const summary = await getSummary(a.claims, "2026-10");
    expect(summary.categories.find((c) => c.name === "Makan")!.amount).toBe(400_000);
  });

  test("4. penolakan", async () => {
    await expect(createBudget(a.claims, { categoryId: makan, period: "monthly", amountLimit: 1_000 }, TODAY)).rejects.toThrow(
      "Kategori ini sudah punya anggaran bulanan.",
    );
    const raw = withRls(a.claims, (tx) =>
      tx.budget.create({
        data: { userId: a.id, categoryId: makan, period: "monthly", amountLimit: 1_000n, startDate: dateOnlyToDate("2026-10-01") },
      }),
    );
    await expect(raw.catch((e) => isUniqueViolation(e))).resolves.toBe(true);

    await expect(createBudget(a.claims, { categoryId: uangSaku, period: "monthly", amountLimit: 1_000 }, TODAY)).rejects.toBeInstanceOf(
      BudgetError,
    );
    await createCategory(a.claims, { name: "Arsip Anggaran", kind: "expense", icon: null, color: null });
    const archived = (await listCategories(a.claims)).find((c) => c.name === "Arsip Anggaran")!.id;
    await setCategoryArchived(a.claims, archived, true);
    await expect(createBudget(a.claims, { categoryId: archived, period: "monthly", amountLimit: 1_000 }, TODAY)).rejects.toThrow(
      "Kategori ini sudah diarsipkan.",
    );

    const zero = withRls(a.claims, (tx) =>
      tx.budget.create({
        data: { userId: a.id, categoryId: transport, period: "monthly", amountLimit: 0n, startDate: dateOnlyToDate("2026-10-01") },
      }),
    );
    await expect(zero.catch((e) => pgCode(e))).resolves.toBe("23514");
  });

  test("5. ubah batas → habis", async () => {
    await updateBudgetLimit(a.claims, M, 400_000);
    const m = (await byId(M))!;
    expect(m).toMatchObject({ percent: 100, status: "over", remaining: 0 });
    expect(statusText(m)).toBe("Anggaran habis");
  });

  test("6. RLS: B tidak bisa menyentuh anggaran A", async () => {
    const idA = W;
    await withRls(b.claims, async (tx) => {
      expect(await tx.budget.findMany({ where: { id: idA } })).toEqual([]);
      expect((await tx.budget.updateMany({ where: { id: idA }, data: { amountLimit: 1n } })).count).toBe(0);
      expect((await tx.budget.deleteMany({ where: { id: idA } })).count).toBe(0);
    });
    await expect(updateBudgetLimit(b.claims, idA, 1_000)).rejects.toThrow(BUDGET_NOT_FOUND);
    await expect(deleteBudget(b.claims, idA)).rejects.toThrow(BUDGET_NOT_FOUND);
    const start = dateOnlyToDate("2026-10-01");
    await expect(
      withRls(b.claims, (tx) => tx.budget.create({ data: { userId: a.id, categoryId: makan, period: "weekly", amountLimit: 1n, startDate: start } })),
    ).rejects.toThrow();
    await expect(
      withRls(b.claims, (tx) => tx.budget.create({ data: { userId: b.id, categoryId: makan, period: "weekly", amountLimit: 1n, startDate: start } })),
    ).rejects.toThrow();
    await expect(createBudget(b.claims, { categoryId: makan, period: "weekly", amountLimit: 1_000 }, TODAY)).rejects.toThrow(
      "Kategori tidak ditemukan.",
    );
    expect((await prisma.budget.findUniqueOrThrow({ where: { id: idA } })).amountLimit).toBe(150_000n);
    expect((await overview(b.claims)).budgets).toEqual([]);
  });

  test("7. baris nonaktif dihidupkan lagi", async () => {
    await prisma.budget.update({ where: { id: W }, data: { isActive: false } });
    expect(await byId(W)).toBeUndefined();
    await createBudget(a.claims, { categoryId: makan, period: "weekly", amountLimit: 200_000 }, TODAY);
    const row = await prisma.budget.findUniqueOrThrow({ where: { id: W } });
    expect(row).toMatchObject({ isActive: true, amountLimit: 200_000n });
    expect(dateToDateOnly(row.startDate)).toBe("2026-10-12");
  });

  test("8. hapus", async () => {
    await deleteBudget(a.claims, M);
    expect((await overview()).budgets.map((x) => x.id)).toEqual([W]);
    await expect(deleteBudget(a.claims, M)).rejects.toThrow(BUDGET_NOT_FOUND);
  });

  test("9. hapus kategori → anggarannya ikut terhapus", async () => {
    await createCategory(a.claims, { name: "Kaskade", kind: "expense", icon: null, color: null });
    const id = (await listCategories(a.claims)).find((c) => c.name === "Kaskade")!.id;
    await createBudget(a.claims, { categoryId: id, period: "monthly", amountLimit: 1_000 }, TODAY);
    await deleteCategory(a.claims, id);
    expect(await prisma.budget.count({ where: { categoryId: id } })).toBe(0);
  });

  test("10. grant", async () => {
    const [g] = await prisma.$queryRaw<{ anon_any: boolean; auth_extra: boolean; auth_any: boolean }[]>`
      select has_table_privilege('anon','public.budgets','select,insert,update,delete,truncate,references,trigger') as anon_any,
             has_table_privilege('authenticated','public.budgets','truncate,references,trigger') as auth_extra,
             has_table_privilege('authenticated','public.budgets','select,insert,update,delete') as auth_any`;
    expect(g).toEqual({ anon_any: false, auth_extra: false, auth_any: true });
  });
});
