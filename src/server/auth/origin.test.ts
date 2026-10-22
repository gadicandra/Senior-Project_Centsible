import { describe, expect, test } from "vitest";
import { isSameOriginRequest, safeNext } from "./origin";
test("safeNext menolak redirect keluar domain", () => {
  expect(safeNext("/transaksi?x=1")).toBe("/transaksi?x=1");
  expect(safeNext("//evil.com")).toBe("/");
  expect(safeNext("https://evil.com")).toBe("/");
  expect(safeNext(null)).toBe("/");
});

describe("isSameOriginRequest", () => {
  const req = (headers: Record<string, string>) =>
    new Request("http://localhost:3000/api/ai/parse", { method: "POST", headers });

  test("origin sama → true", () => {
    expect(isSameOriginRequest(req({ origin: "http://localhost:3000", host: "localhost:3000" }))).toBe(true);
  });

  test("tanpa Origin → false", () => {
    expect(isSameOriginRequest(req({ host: "localhost:3000" }))).toBe(false);
  });

  test("origin lain → false", () => {
    expect(isSameOriginRequest(req({ origin: "https://evil.com", host: "localhost:3000" }))).toBe(false);
    expect(isSameOriginRequest(req({ origin: "http://localhost:3001", host: "localhost:3000" }))).toBe(false);
  });

  test("x-forwarded-host dipakai (nilai pertama dari daftar)", () => {
    const headers = { origin: "https://centsible.vercel.app", host: "internal:3000" };
    expect(isSameOriginRequest(req({ ...headers, "x-forwarded-host": "centsible.vercel.app" }))).toBe(true);
    expect(
      isSameOriginRequest(req({ ...headers, "x-forwarded-host": "centsible.vercel.app, proxy.internal" })),
    ).toBe(true);
    expect(isSameOriginRequest(req({ ...headers, "x-forwarded-host": "proxy.internal, centsible.vercel.app" }))).toBe(
      false,
    );
  });

  test("Sec-Fetch-Site: cross-site / same-site → false; same-origin atau tidak ada → boleh", () => {
    const base = { origin: "http://localhost:3000", host: "localhost:3000" };
    expect(isSameOriginRequest(req({ ...base, "sec-fetch-site": "cross-site" }))).toBe(false);
    expect(isSameOriginRequest(req({ ...base, "sec-fetch-site": "same-site" }))).toBe(false);
    expect(isSameOriginRequest(req({ ...base, "sec-fetch-site": "same-origin" }))).toBe(true);
    expect(isSameOriginRequest(req(base))).toBe(true);
  });

  test('Origin "null" atau rusak → false', () => {
    expect(isSameOriginRequest(req({ origin: "null", host: "localhost:3000" }))).toBe(false);
    expect(isSameOriginRequest(req({ origin: "bukan url", host: "localhost:3000" }))).toBe(false);
  });

  test("LAN dan 127.0.0.1 lewat http → true", () => {
    expect(isSameOriginRequest(req({ origin: "http://192.168.1.10:3000", host: "192.168.1.10:3000" }))).toBe(true);
    expect(isSameOriginRequest(req({ origin: "http://127.0.0.1:3000", host: "127.0.0.1:3000" }))).toBe(true);
  });

  test("perbandingan host tidak peka huruf besar", () => {
    expect(isSameOriginRequest(req({ origin: "https://Centsible.App", host: "centsible.app" }))).toBe(true);
    expect(isSameOriginRequest(req({ origin: "https://centsible.app", host: "CENTSIBLE.APP" }))).toBe(true);
  });

  test("https://evil.com dengan Host localhost:3000 → false", () => {
    expect(isSameOriginRequest(req({ origin: "https://evil.com", host: "localhost:3000" }))).toBe(false);
  });
});
