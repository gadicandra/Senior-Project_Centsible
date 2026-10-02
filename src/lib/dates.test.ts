import { expect, test } from "vitest";
import { formatDateOnly, monthRange, todayIn } from "./dates";

test("todayIn memakai zona waktu pengguna, bukan UTC", () => {
  // 17:30 UTC = 00:30 WIB keesokan harinya.
  const now = new Date("2026-10-01T17:30:00Z");
  expect(todayIn("UTC", now)).toBe("2026-10-01");
  expect(todayIn("Asia/Jakarta", now)).toBe("2026-10-02");
});

test("monthRange menangani bulan 28/30/31 hari", () => {
  expect(monthRange("2026-02-10")).toEqual({ from: "2026-02-01", to: "2026-02-28" });
  expect(monthRange("2028-02-10")).toEqual({ from: "2028-02-01", to: "2028-02-29" });
  expect(monthRange("2026-10-02")).toEqual({ from: "2026-10-01", to: "2026-10-31" });
});

test("formatDateOnly tidak bergeser hari", () => {
  expect(formatDateOnly("2026-10-02")).toContain("2");
  expect(formatDateOnly("2026-10-02")).toMatch(/Okt/);
});
