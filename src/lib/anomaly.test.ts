import { describe, expect, test } from "vitest";
import { detectAnomalies, historyWindow, median, type DailyExpense } from "./anomaly";

// Kamis 15 Okt 2026 → minggu berjalan mulai Senin 12 Okt; riwayat 17 Agu .. 5 Okt.
const TODAY = "2026-10-15";
const { weeks } = historyWindow(TODAY);

/** Satu transaksi per minggu riwayat dengan nominal `amounts[i]` (0 = minggu kosong). */
function history(categoryId: string, amounts: number[], perWeek = 1): DailyExpense[] {
  return amounts.flatMap((amount, i) => (amount ? [{ categoryId, date: weeks[i], amount, count: perWeek }] : []));
}

test("median & jendela riwayat", () => {
  expect(median([3, 1, 2])).toBe(2);
  expect(median([4, 1, 3, 2])).toBe(2.5);
  expect(weeks).toHaveLength(8);
  expect(weeks[0]).toBe("2026-08-17");
  expect(weeks[7]).toBe("2026-10-05");
});

describe("detectAnomalies", () => {
  const usual = [100_000, 120_000, 90_000, 110_000, 100_000, 95_000, 105_000, 100_000];

  test("nominal minggu ini jauh di atas kebiasaan → anomali amount", () => {
    const rows = [...history("makan", usual), { categoryId: "makan", date: "2026-10-13", amount: 400_000, count: 1 }];
    expect(detectAnomalies(rows, TODAY)).toEqual([{ categoryId: "makan", kind: "amount", current: 400_000, median: 100_000, ratio: 4 }]);
  });

  test("masih dalam kebiasaan → tidak ada", () => {
    const rows = [...history("makan", usual), { categoryId: "makan", date: "2026-10-13", amount: 130_000, count: 1 }];
    expect(detectAnomalies(rows, TODAY)).toEqual([]);
  });

  test("kebiasaan sangat stabil (MAD 0): selisih kecil diabaikan, selisih besar tetap terdeteksi", () => {
    const flat = Array(8).fill(20_000);
    expect(detectAnomalies([...history("kopi", flat), { categoryId: "kopi", date: "2026-10-12", amount: 25_000, count: 1 }], TODAY)).toEqual([]);
    expect(detectAnomalies([...history("kopi", flat), { categoryId: "kopi", date: "2026-10-12", amount: 90_000, count: 1 }], TODAY)).toHaveLength(1);
  });

  test("frekuensi naik walau nominal wajar → anomali count", () => {
    const rows = [
      ...history("jajan", Array(8).fill(40_000), 4),
      { categoryId: "jajan", date: "2026-10-12", amount: 30_000, count: 12 },
    ];
    expect(detectAnomalies(rows, TODAY)).toEqual([{ categoryId: "jajan", kind: "count", current: 12, median: 4, ratio: 3 }]);
  });

  test("minggu kosong dihitung 0; riwayat < 4 minggu aktif dilewati (pengguna baru)", () => {
    const sparse = [0, 0, 0, 0, 0, 50_000, 60_000, 55_000];
    expect(detectAnomalies([...history("hobi", sparse), { categoryId: "hobi", date: "2026-10-12", amount: 900_000, count: 1 }], TODAY)).toEqual([]);
  });

  test("transaksi di luar jendela tidak ikut; urut dari rasio terbesar", () => {
    const rows = [
      ...history("a", usual),
      ...history("b", usual),
      { categoryId: "a", date: "2026-10-13", amount: 300_000, count: 1 },
      { categoryId: "b", date: "2026-10-13", amount: 600_000, count: 1 },
      { categoryId: "a", date: "2026-08-10", amount: 9_000_000, count: 1 }, // 9 minggu lalu
    ];
    expect(detectAnomalies(rows, TODAY).map((a) => [a.categoryId, a.ratio])).toEqual([["b", 6], ["a", 3]]);
  });
});
