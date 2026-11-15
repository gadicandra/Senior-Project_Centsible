// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";
import { withRls, type RlsTx } from "@/server/db/with-rls";
import { getSummary } from "./summary";

vi.mock("@/server/db/with-rls", () => ({ withRls: vi.fn() }));

const CLAIMS = { sub: "11111111-1111-4111-8111-111111111111" };
const MAKAN = "22222222-2222-4222-8222-222222222222";
const TRANSPORT = "22222222-2222-4222-8222-222222222223";

type GroupByArgs = { by: string[]; where: Record<string, unknown> };

function fakeTx(opts: { daily?: unknown[]; byCategory?: unknown[]; categories?: unknown[]; total?: bigint } = {}) {
  const groupByCalls: GroupByArgs[] = [];
  const rawCalls: TemplateStringsArray[] = [];
  const findMany = vi.fn(async () => opts.categories ?? []);
  const tx = {
    transaction: {
      groupBy: vi.fn(async (args: GroupByArgs) => {
        groupByCalls.push(args);
        return args.by.includes("categoryId") ? (opts.byCategory ?? []) : (opts.daily ?? []);
      }),
    },
    category: { findMany },
    $queryRaw: vi.fn(async (strings: TemplateStringsArray) => {
      rawCalls.push(strings);
      return [{ total: opts.total ?? 0n }];
    }),
  };
  vi.mocked(withRls).mockImplementation((_claims, fn) => fn(tx as unknown as RlsTx));
  return { groupByCalls, rawCalls, findMany };
}

const day = (date: string) => new Date(`${date}T00:00:00.000Z`);

beforeEach(() => {
  vi.mocked(withRls).mockReset();
});

describe("getSummary", () => {
  test("rentang bulan, tanpa userId, konversi BigInt, dan total turunan", async () => {
    const { groupByCalls, rawCalls, findMany } = fakeTx({
      daily: [
        { occurredAt: day("2026-09-01"), type: "expense", _sum: { amount: 10_000n }, _count: { _all: 1 } },
        { occurredAt: day("2026-09-30"), type: "income", _sum: { amount: 1_000_000n }, _count: { _all: 1 } },
        { occurredAt: day("2026-09-30"), type: "expense", _sum: { amount: 25_000n }, _count: { _all: 2 } },
      ],
      byCategory: [
        { categoryId: MAKAN, _sum: { amount: 30_000n } },
        { categoryId: TRANSPORT, _sum: { amount: 5_000n } },
      ],
      categories: [
        { id: TRANSPORT, name: "Transport", icon: null, color: null, isArchived: false },
        { id: MAKAN, name: "Makan", icon: "utensils", color: "#F97316", isArchived: true },
      ],
      total: 925_000n,
    });

    const s = await getSummary(CLAIMS, "2026-09");

    expect(withRls).toHaveBeenCalledTimes(1);
    expect(groupByCalls).toHaveLength(2);
    for (const call of groupByCalls) {
      expect(call.where.occurredAt).toEqual({ gte: day("2026-09-01"), lte: day("2026-09-30") });
      expect(JSON.stringify(call.where)).not.toContain("userId");
    }
    expect(groupByCalls.find((c) => c.by.includes("categoryId"))?.where.type).toBe("expense");
    expect(findMany).toHaveBeenCalledTimes(1);
    const sql = rawCalls[0].join(" ");
    expect(sql).toContain("wallet_balances");
    expect(sql).toContain("not is_archived");

    expect(s).toMatchObject({
      month: "2026-09",
      from: "2026-09-01",
      to: "2026-09-30",
      totalBalance: 925_000,
      income: 1_000_000,
      expense: 35_000,
      transactionCount: 4,
    });
    expect(s.daily).toHaveLength(30);
    expect(s.daily[29]).toEqual({ date: "2026-09-30", income: 1_000_000, expense: 25_000 });
    expect(s.categories.map((c) => [c.name, c.amount, c.percent, c.isArchived])).toEqual([
      ["Makan", 30_000, 86, true],
      ["Transport", 5_000, 14, false],
    ]);
  });

  test("tanpa pengeluaran: lookup kategori dilewati", async () => {
    const { findMany } = fakeTx({
      daily: [{ occurredAt: day("2026-10-05"), type: "income", _sum: { amount: 500n }, _count: { _all: 1 } }],
    });
    const s = await getSummary(CLAIMS, "2026-10");
    expect(findMany).not.toHaveBeenCalled();
    expect(s.categories).toEqual([]);
    expect(s.income).toBe(500);
    expect(s.expense).toBe(0);
    expect(s.daily).toHaveLength(31);
  });

  test("kategori yang hilang dilaporkan sebagai error", async () => {
    fakeTx({ byCategory: [{ categoryId: MAKAN, _sum: { amount: 1n } }], categories: [] });
    await expect(getSummary(CLAIMS, "2026-09")).rejects.toThrow("summary: kategori tidak ditemukan");
  });
});
