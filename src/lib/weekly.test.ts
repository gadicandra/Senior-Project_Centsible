import { expect, test } from "vitest";
import { templateSummary, weeklyStats } from "./weekly";

const RANGE = { from: "2026-11-09", to: "2026-11-15" };

test("total, rata-rata 4 minggu, delta, urutan, dan saran untuk kenaikan terbesar", () => {
  const s = weeklyStats(RANGE, 500_000, [
    { categoryId: "t", name: "Transport", week: 140_000, prev4: [100_000, 100_000, 100_000, 100_000] },
    { categoryId: "m", name: "Makan", week: 300_000, prev4: [200_000, 220_000, 180_000, 200_000] },
    { categoryId: "k", name: "Kuliah", week: 0, prev4: [0, 0, 0, 0] },
    { categoryId: "h", name: "Hiburan", week: 50_000, prev4: [0, 0, 0, 0] },
  ]);
  expect(s.total_expense).toBe(490_000);
  expect(s.avg4_expense).toBe(300_000);
  expect(s.per_category.map((c) => [c.name, c.total, c.avg4, c.delta_pct])).toEqual([
    ["Makan", 300_000, 200_000, 50],
    ["Transport", 140_000, 100_000, 40],
    ["Hiburan", 50_000, 0, null],
  ]);
  expect(s.suggestion).toEqual({ category_id: "m", name: "Makan", suggested_limit: 200_000, reason: "naik 50% dari rata-rata 4 minggu" });
  expect(templateSummary(s).replace(/ /g, " ")).toBe(
    "Minggu lalu kamu mengeluarkan Rp 490.000, naik 63% dibanding rata-rata 4 minggu sebelumnya. " +
      "Pengeluaran terbesar di Makan (Rp 300.000). Pemasukan Rp 500.000. " +
      "Saran: buat anggaran mingguan Makan Rp 200.000 (naik 50% dari rata-rata 4 minggu).",
  );
});

test("kenaikan kecil tidak memicu saran; templat tetap memberi saran (FR 13)", () => {
  const s = weeklyStats(RANGE, 0, [{ categoryId: "m", name: "Makan", week: 105_000, prev4: [100_000, 100_000, 100_000, 100_000] }]);
  expect(s.suggestion).toBeNull();
  expect(templateSummary(s).replace(/\u00a0/g, " ")).toMatch(/Saran: pertahankan, dan pasang anggaran mingguan Makan sekitar Rp 110\.000/);
});

test("minggu kosong", () => {
  expect(templateSummary(weeklyStats(RANGE, 0, []))).toMatch(/^Minggu lalu belum ada transaksi.*Saran:/);
});
