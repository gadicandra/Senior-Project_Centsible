// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";
import { BUDGET_NOT_FOUND } from "@/lib/schemas/budget";
import { withRls, type RlsTx } from "@/server/db/with-rls";
import { BudgetError, createBudget, deleteBudget, getBudgetOverview, updateBudgetLimit } from "./budgets";

vi.mock("@/server/db/with-rls", () => ({ withRls: vi.fn() }));

const CLAIMS = { sub: "11111111-1111-4111-8111-111111111111" };
const MAKAN = "22222222-2222-4222-8222-222222222222";
const TRANSPORT = "22222222-2222-4222-8222-222222222223";
const day = (d: string) => new Date(`${d}T00:00:00.000Z`);

type Opts = {
  timezone?: string | null;
  budgets?: unknown[];
  weekly?: unknown[];
  monthly?: unknown[];
  category?: unknown;
  existing?: unknown;
  count?: number;
};

function fakeTx(o: Opts = {}) {
  const tx = {
    user: { findUnique: vi.fn(async () => (o.timezone === null ? null : { timezone: o.timezone ?? "Asia/Jakarta" })) },
    budget: {
      findMany: vi.fn(async () => o.budgets ?? []),
      findUnique: vi.fn(async () => o.existing ?? null),
      create: vi.fn(async () => ({})),
      update: vi.fn(async () => ({})),
      updateMany: vi.fn(async () => ({ count: o.count ?? 1 })),
      deleteMany: vi.fn(async () => ({ count: o.count ?? 1 })),
    },
    category: { findUnique: vi.fn(async () => o.category ?? null) },
    transaction: {
      // Panggilan pertama = minggu, kedua = bulan (urutan di Promise.all).
      groupBy: vi.fn().mockResolvedValueOnce(o.weekly ?? []).mockResolvedValueOnce(o.monthly ?? []),
    },
  };
  vi.mocked(withRls).mockImplementation((_c, fn) => fn(tx as unknown as RlsTx));
  return tx;
}

const row = (id: string, categoryId: string, period: "weekly" | "monthly", limit: bigint, name: string) => ({
  id,
  categoryId,
  period,
  amountLimit: limit,
  category: { name, icon: null, color: null, isArchived: false },
});

beforeEach(() => {
  vi.mocked(withRls).mockReset();
});

describe("getBudgetOverview", () => {
  test("rentang, filter, BigInt, dan pemakaian per periode", async () => {
    const tx = fakeTx({
      budgets: [
        row("b1", MAKAN, "monthly", 500_000n, "Makan"),
        row("b2", MAKAN, "weekly", 150_000n, "Makan"),
        row("b3", TRANSPORT, "monthly", 100_000n, "Transport"),
      ],
      weekly: [{ categoryId: MAKAN, _sum: { amount: 100_000n } }],
      monthly: [{ categoryId: MAKAN, _sum: { amount: 400_000n } }],
    });
    const o = await getBudgetOverview(CLAIMS, new Date("2026-10-15T05:00:00Z"));

    expect(withRls).toHaveBeenCalledTimes(1);
    expect(tx.budget.findMany.mock.calls[0]).toMatchObject([{ where: { isActive: true } }]);
    const wheres = tx.transaction.groupBy.mock.calls.map((c) => (c as unknown as [{ where: Record<string, unknown> }])[0].where);
    expect(wheres).toEqual([
      { type: "expense", occurredAt: { gte: day("2026-10-12"), lte: day("2026-10-18") } },
      { type: "expense", occurredAt: { gte: day("2026-10-01"), lte: day("2026-10-31") } },
    ]);
    expect(o.week).toEqual({ from: "2026-10-12", to: "2026-10-18" });
    expect(o.budgets.map((b) => [b.id, b.used, b.percent, b.status])).toEqual([
      ["b1", 400_000, 80, "warning"],
      ["b2", 100_000, 66, "normal"],
      ["b3", 0, 0, "normal"],
    ]);
    expect(o.budgets[1]).toMatchObject({ from: "2026-10-12", to: "2026-10-18", amountLimit: 150_000 });
  });

  test("tanpa baris user → Asia/Jakarta", async () => {
    fakeTx({ timezone: null });
    expect((await getBudgetOverview(CLAIMS, new Date("2026-10-25T17:30:00Z"))).today).toBe("2026-10-26");
  });
});

describe("createBudget", () => {
  const input = { categoryId: MAKAN, period: "weekly" as const, amountLimit: 150_000 };

  test.each([
    [null, "Kategori tidak ditemukan."],
    [{ kind: "income", isArchived: false }, "Anggaran hanya untuk kategori pengeluaran."],
    [{ kind: "expense", isArchived: true }, "Kategori ini sudah diarsipkan."],
  ])("kategori %j ditolak", async (category, message) => {
    const tx = fakeTx({ category });
    await expect(createBudget(CLAIMS, input, "2026-10-15")).rejects.toMatchObject({ message, field: "categoryId" });
    expect(tx.budget.create).not.toHaveBeenCalled();
    expect(tx.budget.update).not.toHaveBeenCalled();
  });

  test("duplikat aktif ditolak", async () => {
    fakeTx({ category: { kind: "expense", isArchived: false }, existing: { id: "b", isActive: true } });
    await expect(createBudget(CLAIMS, input, "2026-10-15")).rejects.toThrow("Kategori ini sudah punya anggaran mingguan.");
  });

  test("baris nonaktif dihidupkan lagi", async () => {
    const tx = fakeTx({ category: { kind: "expense", isArchived: false }, existing: { id: "b", isActive: false } });
    await createBudget(CLAIMS, input, "2026-10-15");
    expect(tx.budget.update).toHaveBeenCalledWith({
      where: { id: "b" },
      data: { amountLimit: 150_000n, startDate: day("2026-10-12"), isActive: true },
    });
  });

  test("baru: userId dari klaim, startDate = awal periode", async () => {
    const tx = fakeTx({ category: { kind: "expense", isArchived: false } });
    await createBudget(CLAIMS, { ...input, period: "monthly" }, "2026-10-15");
    expect(tx.budget.create).toHaveBeenCalledWith({
      data: {
        userId: CLAIMS.sub,
        categoryId: MAKAN,
        period: "monthly",
        amountLimit: 150_000n,
        startDate: day("2026-10-01"),
        isActive: true,
      },
    });
  });
});

describe("update & delete", () => {
  test("count 0 → BUDGET_NOT_FOUND", async () => {
    const tx = fakeTx({ count: 0 });
    await expect(updateBudgetLimit(CLAIMS, "x", 1_000)).rejects.toEqual(new BudgetError(BUDGET_NOT_FOUND));
    expect(tx.budget.updateMany.mock.calls[0]).toMatchObject([{ where: { id: "x", isActive: true } }]);
    fakeTx({ count: 0 });
    await expect(deleteBudget(CLAIMS, "x")).rejects.toThrow(BUDGET_NOT_FOUND);
  });
});
