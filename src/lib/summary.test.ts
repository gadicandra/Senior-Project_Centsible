import { describe, expect, test } from "vitest";
import { todayIn } from "@/lib/dates";
import {
  categoryShares,
  formatMonthLabel,
  monthBounds,
  resolveMonth,
  shiftMonth,
  summaryQuerySchema,
  zeroFillDaily,
  type CategoryTotal,
} from "./summary";

const cat = (id: string, name: string, amount: number, isArchived = false): CategoryTotal => ({
  id,
  name,
  icon: null,
  color: null,
  isArchived,
  amount,
});

describe("resolveMonth", () => {
  const today = "2026-10-02";
  test.each([
    [undefined, "2026-10"],
    ["2026-09", "2026-09"],
    ["2026-11", "2026-10"],
    ["2019-12", "2026-10"],
    ["2020-01", "2020-01"],
    ["2026-10", "2026-10"],
  ])("%s → %s", (raw, expected) => {
    expect(resolveMonth(raw, today)).toBe(expected);
  });
});

describe("summaryQuerySchema", () => {
  test.each([["2026-13"], ["2026-1"], ["abc"], [["2026-09", "2026-08"]]])("%j tidak valid → undefined", (month) => {
    expect(summaryQuerySchema.parse({ month })).toEqual({ month: undefined });
  });
  test("bulan valid lolos", () => {
    expect(summaryQuerySchema.parse({ month: "2026-09" })).toEqual({ month: "2026-09" });
    expect(summaryQuerySchema.parse({})).toEqual({ month: undefined });
  });
});

describe("bulan berjalan mengikuti zona waktu pengguna", () => {
  test("Asia/Jakarta 2026-10-31T17:30Z sudah November", () => {
    const now = new Date("2026-10-31T17:30:00Z");
    expect(todayIn("Asia/Jakarta", now)).toBe("2026-11-01");
    expect(resolveMonth(undefined, todayIn("Asia/Jakarta", now))).toBe("2026-11");
    expect(resolveMonth(undefined, todayIn("UTC", now))).toBe("2026-10");
  });
  test("Asia/Jayapura (UTC+9) 2026-12-31T15:00Z sudah Januari 2027", () => {
    expect(resolveMonth(undefined, todayIn("Asia/Jayapura", new Date("2026-12-31T15:00:00Z")))).toBe("2027-01");
  });
});

describe("monthBounds", () => {
  test.each([
    ["2026-02", "2026-02-01", "2026-02-28"],
    ["2028-02", "2028-02-01", "2028-02-29"],
    ["2026-12", "2026-12-01", "2026-12-31"],
  ])("%s", (month, from, to) => {
    expect(monthBounds(month)).toEqual({ from, to });
  });
});

describe("shiftMonth", () => {
  test("pergantian tahun dua arah", () => {
    expect(shiftMonth("2026-01", -1, "2026-10")).toBe("2025-12");
    expect(shiftMonth("2026-12", 1, "2027-01")).toBe("2027-01");
  });
  test("null di luar rentang", () => {
    expect(shiftMonth("2026-10", 1, "2026-10")).toBeNull();
    expect(shiftMonth("2020-01", -1, "2026-10")).toBeNull();
  });
});

test("formatMonthLabel", () => {
  expect(formatMonthLabel("2026-10")).toBe("Oktober 2026");
});

describe("zeroFillDaily", () => {
  test("September 2026: 30 hari, hari kosong 0", () => {
    const days = zeroFillDaily(
      [
        { date: "2026-09-01", type: "expense", amount: 10_000 },
        { date: "2026-09-30", type: "income", amount: 1_000_000 },
        { date: "2026-09-30", type: "expense", amount: 25_000 },
      ],
      "2026-09-01",
      "2026-09-30",
    );
    expect(days).toHaveLength(30);
    expect(days[0]).toEqual({ date: "2026-09-01", income: 0, expense: 10_000 });
    expect(days[29]).toEqual({ date: "2026-09-30", income: 1_000_000, expense: 25_000 });
    expect(days.slice(1, 29).every((d) => d.income === 0 && d.expense === 0)).toBe(true);
  });
  test("baris di luar rentang diabaikan", () => {
    const days = zeroFillDaily([{ date: "2026-10-01", type: "expense", amount: 1 }], "2026-09-01", "2026-09-30");
    expect(days.every((d) => d.expense === 0)).toBe(true);
  });
  test("Februari 2028 punya 29 hari", () => {
    const days = zeroFillDaily([], "2028-02-01", "2028-02-29");
    expect(days).toHaveLength(29);
    expect(days.at(-1)?.date).toBe("2028-02-29");
  });
});

describe("categoryShares", () => {
  const percents = (items: CategoryTotal[]) => categoryShares(items).map((s) => s.percent);

  test("kosong dan satu item", () => {
    expect(categoryShares([])).toEqual([]);
    expect(percents([cat("a", "Makan", 5)])).toEqual([100]);
  });
  test("1/1/1 → 34/33/33", () => {
    const shares = categoryShares([cat("c", "C", 1), cat("a", "A", 1), cat("b", "B", 1)]);
    expect(shares.map((s) => [s.name, s.percent])).toEqual([
      ["A", 34],
      ["B", 33],
      ["C", 33],
    ]);
  });
  test("700/200/100 → 70/20/10, urut jumlah menurun", () => {
    expect(percents([cat("a", "A", 100), cat("b", "B", 700), cat("c", "C", 200)])).toEqual([70, 20, 10]);
  });
  test("jumlah & nama sama → id menentukan, stabil walau input dibalik", () => {
    const items = [cat("b-arsip", "Makan", 1, true), cat("a-aktif", "Makan", 1), cat("z", "Zat", 1)];
    const forward = categoryShares(items);
    const reversed = categoryShares([...items].reverse());
    expect(forward.map((s) => [s.id, s.percent])).toEqual([
      ["a-aktif", 34],
      ["b-arsip", 33],
      ["z", 33],
    ]);
    expect(reversed).toEqual(forward);
  });
  test("jumlah 0 dibuang", () => {
    expect(categoryShares([cat("a", "A", 0), cat("b", "B", 3)]).map((s) => s.id)).toEqual(["b"]);
  });
  test("properti: 200 larik acak selalu berjumlah 100 dan tiap persen dalam 1 poin dari nilai eksak", () => {
    let seed = 42;
    const rand = () => {
      seed = (seed * 1_103_515_245 + 12_345) % 2_147_483_648;
      return seed / 2_147_483_648;
    };
    for (let n = 0; n < 200; n++) {
      const count = 1 + Math.floor(rand() * 12);
      const items = Array.from({ length: count }, (_, i) => cat(`id${i}`, `K${i}`, 1 + Math.floor(rand() * 1_000_000)));
      const total = items.reduce((s, i) => s + i.amount, 0);
      const shares = categoryShares(items);
      expect(shares.reduce((s, x) => s + x.percent, 0)).toBe(100);
      for (const s of shares) expect(Math.abs(s.percent - (s.amount * 100) / total)).toBeLessThan(1);
    }
  });
});
