import { describe, expect, test } from "vitest";
import { isGuestOnlyPath, isPublicPath } from "./routes";

describe("isPublicPath", () => {
  test.each(["/login", "/register", "/reset-password", "/auth/callback", "/auth/confirm", "/api/health"])(
    "%s publik",
    (p) => expect(isPublicPath(p)).toBe(true),
  );
  test.each(["/", "/transaksi", "/pengaturan", "/update-password", "/loginx", "/api/ai/parse"])(
    "%s butuh login",
    (p) => expect(isPublicPath(p)).toBe(false),
  );
});

test("halaman tamu", () => {
  expect(isGuestOnlyPath("/login")).toBe(true);
  expect(isGuestOnlyPath("/update-password")).toBe(false);
});
