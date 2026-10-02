import { expect, test } from "vitest";
import { safeNext } from "./origin";

test("safeNext menolak redirect keluar domain", () => {
  expect(safeNext("/transaksi?x=1")).toBe("/transaksi?x=1");
  expect(safeNext("//evil.com")).toBe("/");
  expect(safeNext("https://evil.com")).toBe("/");
  expect(safeNext(null)).toBe("/");
});
