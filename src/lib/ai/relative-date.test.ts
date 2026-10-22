import { describe, expect, test } from "vitest";
import { lastNDays, resolveRelativeDate, shiftDate } from "./relative-date";

const TODAY = "2026-09-23"; // Rabu

describe("resolveRelativeDate (hari ini Rabu 2026-09-23)", () => {
  test.each([
    ["beli bensin kemarin", "2026-09-22"],
    ["nonton kemarin lusa", "2026-09-21"],
    ["makan 3 hari lalu", "2026-09-20"],
    ["makan 3 hari yang lalu", "2026-09-20"],
    ["2 hari lalu", "2026-09-21"],
    ["parkir tadi pagi", "2026-09-23"],
    ["hari ini makan", "2026-09-23"],
    ["barusan beli kopi", "2026-09-23"],
    ["td beli es", "2026-09-23"],
    ["bayar kos Senin lalu", "2026-09-21"],
    ["Rabu lalu", "2026-09-16"], // benar-benar lampau
    ["jum'at kemarin", "2026-09-18"],
    ["Sabtu lalu", "2026-09-19"],
  ])("%s → %s", (text, expected) => {
    expect(resolveRelativeDate(text, TODAY)).toBe(expected);
  });

  test("minggu lalu / minggu kemarin → ambiguous", () => {
    expect(resolveRelativeDate("minggu lalu beli buku", TODAY)).toBe("ambiguous");
    expect(resolveRelativeDate("minggu kemarin", TODAY)).toBe("ambiguous");
  });

  test("tanpa frasa tanggal → null", () => {
    expect(resolveRelativeDate("makan siang 25rb", TODAY)).toBeNull();
  });

  test("semalam / tadi malam memakai jam sekarang", () => {
    expect(resolveRelativeDate("semalam beli nasi goreng", TODAY, "08:00")).toBe("2026-09-22");
    expect(resolveRelativeDate("semalam beli nasi goreng", TODAY, "02:00")).toBe("2026-09-22");
    expect(resolveRelativeDate("semalam beli nasi goreng", TODAY, "21:00")).toBe("2026-09-23");
    expect(resolveRelativeDate("tadi malam makan", TODAY, "18:00")).toBe("2026-09-23");
    expect(resolveRelativeDate("tadi malam makan", TODAY, "17:59")).toBe("2026-09-22");
    expect(resolveRelativeDate("semalam beli nasi goreng", TODAY)).toBe("2026-09-22");
  });

  test("batas bulan dan tahun kabisat", () => {
    expect(resolveRelativeDate("kemarin", "2026-03-01")).toBe("2026-02-28");
    expect(resolveRelativeDate("kemarin", "2028-03-01")).toBe("2028-02-29");
    expect(resolveRelativeDate("kemarin", "2026-01-01")).toBe("2025-12-31");
  });

  test("tgl N: bulan ini atau bulan lalu, tidak pernah masa depan", () => {
    expect(resolveRelativeDate("bayar tgl 30", TODAY)).toBe("2026-08-30");
    expect(resolveRelativeDate("bayar tgl 5", TODAY)).toBe("2026-09-05");
    expect(resolveRelativeDate("tgl 30", "2026-03-23")).toBeNull(); // tidak ada 2026-02-30
    expect(resolveRelativeDate("tanggal 15", "2026-01-10")).toBe("2025-12-15");
  });

  test("dd/mm eksplisit", () => {
    expect(resolveRelativeDate("31/04", TODAY)).toBeNull();
    expect(resolveRelativeDate("makan 20/09", TODAY)).toBe("2026-09-20");
    expect(resolveRelativeDate("makan 25/12", TODAY)).toBe("2025-12-25"); // tidak masa depan
    expect(resolveRelativeDate("makan 20/09/2026", TODAY)).toBe("2026-09-20");
    expect(resolveRelativeDate("makan 20/09/26", TODAY)).toBe("2026-09-20");
    expect(resolveRelativeDate("makan 25/12/2026", TODAY)).toBeNull();
  });
});

describe("lastNDays", () => {
  test("hari ini dan 7 hari sebelumnya dengan nama hari Indonesia", () => {
    expect(lastNDays(TODAY, 8)).toEqual([
      { date: "2026-09-23", weekday: "Rabu" },
      { date: "2026-09-22", weekday: "Selasa" },
      { date: "2026-09-21", weekday: "Senin" },
      { date: "2026-09-20", weekday: "Minggu" },
      { date: "2026-09-19", weekday: "Sabtu" },
      { date: "2026-09-18", weekday: "Jumat" },
      { date: "2026-09-17", weekday: "Kamis" },
      { date: "2026-09-16", weekday: "Rabu" },
    ]);
  });

  test("shiftDate melewati batas tahun", () => {
    expect(shiftDate("2026-01-01", -1)).toBe("2025-12-31");
    expect(shiftDate("2026-09-23", -365)).toBe("2025-09-23");
  });
});
