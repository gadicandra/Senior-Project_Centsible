import { describe, expect, test } from "vitest";
import { isApiPath, isGuestOnlyPath, isPublicPath } from "./routes";

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
describe("isApiPath", () => {
  test.each(["/api", "/api/ai/parse", "/api/health"])("%s adalah API", (p) => expect(isApiPath(p)).toBe(true));
  test.each(["/", "/apix", "/transaksi", "/login"])("%s bukan API", (p) => expect(isApiPath(p)).toBe(false));
});
