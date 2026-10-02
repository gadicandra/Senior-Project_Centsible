import { describe, expect, test } from "vitest";
import { formatRupiah, parseRupiah } from "./money";

describe("parseRupiah", () => {
  test.each([
    ["1500000", 1_500_000],
    ["1.500.000", 1_500_000],
    ["Rp 25.000", 25_000],
    ["-50.000", -50_000],
    ["0", 0],
  ])("%s → %d", (input, expected) => expect(parseRupiah(input)).toBe(expected));

  test.each(["", "abc", "12a"])("%s tidak valid", (input) => expect(parseRupiah(input)).toBeNaN());
});

test("formatRupiah memakai format Indonesia", () => {
  expect(formatRupiah(1_500_000).replace(/\s/g, " ")).toMatch(/^Rp\s?1\.500\.000$/);
});
