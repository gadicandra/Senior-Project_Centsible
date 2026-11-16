import { expect, test, vi } from "vitest";
import { exportHref } from "./transactions-screen";

vi.mock("@/server/actions/transactions", () => ({ saveAiTransaction: vi.fn(), saveTransaction: vi.fn(), removeTransaction: vi.fn() }));

test("exportHref memakai filter aktif tanpa nomor halaman", () => {
  expect(exportHref("")).toBe("/api/export");
  expect(exportHref("page=2")).toBe("/api/export");
  expect(exportHref("from=2026-10-01&page=3&type=expense")).toBe("/api/export?from=2026-10-01&type=expense");
});
