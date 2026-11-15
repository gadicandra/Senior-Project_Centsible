import { describe, expect, test } from "vitest";
import { todayIn } from "@/lib/dates";
import {
  budgetUsage,
  formatPercent,
  formatRange,
  periodRange,
  sortBudgets,
  statusText,
  weekRange,
  type BudgetView,
} from "./budget";

describe("weekRange (Senin–Minggu)", () => {
  test.each([
    ["2026-10-26", "2026-10-26", "2026-11-01"], // Senin
    ["2026-10-25", "2026-10-19", "2026-10-25"], // Minggu
    ["2026-10-01", "2026-09-28", "2026-10-04"], // lintas bulan
    ["2026-12-31", "2026-12-28", "2027-01-03"], // lintas tahun
    ["2028-02-29", "2028-02-28", "2028-03-05"], // kabisat
  ])("%s → %s..%s", (today, from, to) => {
    expect(weekRange(today)).toEqual({ from, to });
  });

  test("mengikuti zona waktu pengguna", () => {
    const now = new Date("2026-10-25T17:30:00Z");
    expect(weekRange(todayIn("Asia/Jakarta", now))).toEqual({ from: "2026-10-26", to: "2026-11-01" });
    expect(weekRange(todayIn("UTC", now))).toEqual({ from: "2026-10-19", to: "2026-10-25" });
    expect(periodRange("monthly", todayIn("Asia/Jakarta", new Date("2026-10-31T17:30:00Z")))).toEqual({
      from: "2026-11-01",
      to: "2026-11-30",
    });
  });

  test("periodRange", () => {
    expect(periodRange("monthly", "2026-02-10")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(periodRange("weekly", "2026-02-10")).toEqual(weekRange("2026-02-10"));
  });
});

describe("budgetUsage & statusText", () => {
  test.each([
    [0, 0, "normal", 500_000],
    [399_999, 79, "normal", 100_001],
    [400_000, 80, "warning", 100_000],
    [499_999, 99, "warning", 1],
    [500_000, 100, "over", 0],
    [500_001, 100, "over", -1],
    [1_250_000, 250, "over", -750_000],
  ] as const)("used %i → %i%% %s", (used, percent, status, remaining) => {
    expect(budgetUsage(used, 500_000)).toEqual({ used, amountLimit: 500_000, percent, status, remaining });
  });

  test("teks status persis", () => {
    expect(statusText(budgetUsage(0, 500_000))).toBe("Aman · sisa Rp 500.000");
    expect(statusText(budgetUsage(325_000, 500_000))).toBe("Aman · sisa Rp 175.000");
    expect(statusText(budgetUsage(399_999, 500_000))).toBe("Aman · sisa Rp 100.001");
    expect(statusText(budgetUsage(400_000, 500_000))).toBe("Hampir habis · sisa Rp 100.000");
    expect(statusText(budgetUsage(499_999, 500_000))).toBe("Hampir habis · sisa Rp 1");
    expect(statusText(budgetUsage(500_000, 500_000))).toBe("Anggaran habis");
    expect(statusText(budgetUsage(500_001, 500_000))).toBe("Melebihi Rp 1");
  });

  test("formatPercent", () => {
    expect([0, 80, 1250].map(formatPercent)).toEqual(["0%", "80%", "1.250%"]);
  });
});

test("formatRange", () => {
  expect(formatRange({ from: "2026-10-12", to: "2026-10-18" })).toBe("12–18 Okt 2026");
  expect(formatRange({ from: "2026-09-28", to: "2026-10-04" })).toBe("28 Sep – 4 Okt 2026");
  expect(formatRange({ from: "2026-12-28", to: "2027-01-03" })).toBe("28 Des 2026 – 3 Jan 2027");
});

test("sortBudgets: percent desc, nama asc, id asc, tanpa mutasi", () => {
  const b = (id: string, name: string, percent: number) => ({ id, name, percent }) as BudgetView;
  const input = [b("1", "Makan", 10), b("3", "Makan", 50), b("2", "Makan", 50), b("4", "Belanja", 50)];
  expect(sortBudgets(input).map((x) => x.id)).toEqual(["4", "2", "3", "1"]);
  expect(input.map((x) => x.id)).toEqual(["1", "3", "2", "4"]);
});
