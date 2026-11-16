// @vitest-environment node
import { beforeEach, expect, test, vi } from "vitest";
import { summarizeWeek } from "@/server/ai/weekly";
import { asService } from "@/server/db/as-service";
import { withRls, type RlsTx } from "@/server/db/with-rls";
import { dedupeKey, generateWeeklySummaries, getLatestWeekly, lastWeek } from "./weekly";

vi.mock("@/server/ai/weekly", () => ({ summarizeWeek: vi.fn(async () => null) }));
vi.mock("@/server/db/with-rls", () => ({ withRls: vi.fn() }));
// Semua akses job lewat asService (role service_role); klien palsu dibagi ke tiap transaksi.
const db = vi.hoisted(() => ({
  user: { findMany: vi.fn() },
  insight: { findUnique: vi.fn(), create: vi.fn() },
  transaction: { groupBy: vi.fn() },
  category: { findMany: vi.fn() },
}));
vi.mock("@/server/db/as-service", () => ({ asService: vi.fn((fn: (tx: unknown) => unknown) => fn(db)) }));

const NOW = new Date("2026-11-16T00:00:00Z"); // Senin 07:00 WIB
const day = (d: string) => new Date(`${d}T00:00:00Z`);

beforeEach(() => {
  vi.clearAllMocks();
  vi.spyOn(console, "error").mockImplementation(() => {});
  db.user.findMany.mockResolvedValue([{ id: "u1", timezone: "Asia/Jakarta" }] as never);
  db.insight.findUnique.mockResolvedValue(null as never);
  db.category.findMany.mockResolvedValue([{ id: "m", name: "Makan" }] as never);
  db.transaction.groupBy.mockResolvedValue([
    { categoryId: "m", type: "expense", occurredAt: day("2026-10-14"), _sum: { amount: 200_000n } },
    { categoryId: "m", type: "expense", occurredAt: day("2026-11-04"), _sum: { amount: 200_000n } },
    { categoryId: "m", type: "expense", occurredAt: day("2026-11-12"), _sum: { amount: 300_000n } },
    { categoryId: "u", type: "income", occurredAt: day("2026-11-10"), _sum: { amount: 1_000_000n } },
    { categoryId: "u", type: "income", occurredAt: day("2026-11-01"), _sum: { amount: 9_999n } }, // di luar minggu
  ] as never);
});

test("lastWeek & dedupeKey", () => {
  expect(lastWeek("Asia/Jakarta", NOW)).toEqual({ from: "2026-11-09", to: "2026-11-15" });
  expect(dedupeKey("2026-11-09")).toBe("weekly_summary:2026-11-09");
});

test("statistik per pengguna difilter user_id; templat dipakai saat AI mati; semua lewat asService", async () => {
  expect(await generateWeeklySummaries(NOW)).toEqual({ users: 1, created: 1, skipped: 0, ai: 0, failed: 0 });
  // daftar pengguna, cek dedupe, statistik, simpan = 4 transaksi service_role
  expect(asService).toHaveBeenCalledTimes(4);
  expect(db.transaction.groupBy.mock.calls[0][0]).toMatchObject({
    where: { userId: "u1", occurredAt: { gte: day("2026-10-12"), lte: day("2026-11-15") } },
  });
  const data = db.insight.create.mock.calls[0][0].data;
  expect(data).toMatchObject({ userId: "u1", kind: "weekly_summary", dedupeKey: "weekly_summary:2026-11-09", periodStart: day("2026-11-09") });
  expect(data.payload).toMatchObject({ total_expense: 300_000, total_income: 1_000_000, avg4_expense: 100_000, model: "template" });
  expect(data.content).toMatch(/Saran: buat anggaran mingguan Makan/);
});

test("teks AI dipakai bila ada", async () => {
  vi.mocked(summarizeWeek).mockResolvedValueOnce({ text: "Hemat. Saran: x.", model: "openai-compatible:m" });
  expect((await generateWeeklySummaries(NOW)).ai).toBe(1);
  expect(db.insight.create.mock.calls[0][0].data).toMatchObject({ content: "Hemat. Saran: x.", payload: { model: "openai-compatible:m" } });
});

test("sudah ada → dilewati; error satu pengguna tidak menghentikan yang lain", async () => {
  db.user.findMany.mockResolvedValue([
    { id: "u1", timezone: "Asia/Jakarta" },
    { id: "u2", timezone: "Asia/Jakarta" },
  ] as never);
  db.insight.findUnique.mockResolvedValueOnce({ id: "x" } as never);
  db.insight.create.mockRejectedValueOnce(new Error("db"));
  expect(await generateWeeklySummaries(NOW)).toEqual({ users: 2, created: 0, skipped: 1, ai: 0, failed: 1 });
});

test("getLatestWeekly lewat RLS", async () => {
  const findFirst = vi.fn(async () => ({ id: "i", content: "c", periodStart: day("2026-11-09"), periodEnd: day("2026-11-15"), isRead: false }));
  vi.mocked(withRls).mockImplementation((_c, fn) => fn({ insight: { findFirst } } as unknown as RlsTx));
  expect(await getLatestWeekly({ sub: "u1" })).toEqual({ id: "i", content: "c", periodStart: "2026-11-09", periodEnd: "2026-11-15", isRead: false });
  findFirst.mockResolvedValueOnce(null as never);
  expect(await getLatestWeekly({ sub: "u1" })).toBeNull();
});
