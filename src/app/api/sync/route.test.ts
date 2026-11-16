// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";
import { getClaims } from "@/server/auth/session";
import { TransactionError, createTransaction } from "@/server/services/transactions";
import { POST } from "./route";

vi.mock("@/server/auth/session", () => ({ getClaims: vi.fn(), requireClaims: vi.fn() }));
vi.mock("@/server/services/profile", () => ({ getTimezone: vi.fn(async () => "Asia/Jakarta") }));
vi.mock("@/server/services/transactions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/services/transactions")>()),
  createTransaction: vi.fn(async () => true),
}));

const CLAIMS = { sub: "11111111-1111-4111-8111-111111111111" };
const CAT = "22222222-2222-4222-8222-222222222222";
const WAL = "33333333-3333-4333-8333-333333333333";
const C1 = "44444444-4444-4444-8444-444444444441";
const C2 = "44444444-4444-4444-8444-444444444442";
const C3 = "44444444-4444-4444-8444-444444444443";
const SAME = { origin: "http://localhost:3000", host: "localhost:3000", "content-type": "application/json" };
const values = (over: Record<string, string> = {}) => ({
  type: "expense",
  amount: "25.000",
  categoryId: CAT,
  walletId: WAL,
  occurredAt: "2026-10-02",
  description: "",
  ...over,
});
const post = (body: unknown, headers: Record<string, string> = SAME) =>
  POST(new Request("http://localhost:3000/api/sync", { method: "POST", headers, body: JSON.stringify(body) }));

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getClaims).mockResolvedValue(CLAIMS);
});

describe("POST /api/sync", () => {
  test("origin lain → 403, tanpa sesi → 401, body salah → 400", async () => {
    expect((await post({}, { ...SAME, origin: "https://jahat.example" })).status).toBe(403);
    vi.mocked(getClaims).mockResolvedValueOnce(null);
    expect((await post({ items: [] })).status).toBe(401);
    expect((await post({ items: [] })).status).toBe(400);
    expect((await post({ items: [{ clientId: "x", values: {} }] })).status).toBe(400);
    expect(createTransaction).not.toHaveBeenCalled();
  });

  test("valid disimpan dengan clientId; invalid & TransactionError ditolak; unique = done", async () => {
    vi.mocked(createTransaction)
      .mockResolvedValueOnce(true)
      .mockRejectedValueOnce(new TransactionError("Kategori ini sudah diarsipkan.", "categoryId"));
    const res = await post({
      items: [
        { clientId: C1, values: values() },
        { clientId: C2, values: values({ amount: "abc" }) },
        { clientId: C3, values: values() },
      ],
    });
    expect(await res.json()).toEqual({
      results: [
        { clientId: C1, status: "done" },
        { clientId: C2, status: "rejected", message: "Nominal harus berupa angka" },
        { clientId: C3, status: "rejected", message: "Kategori ini sudah diarsipkan." },
      ],
    });
    expect(createTransaction).toHaveBeenCalledWith(CLAIMS, expect.objectContaining({ amount: 25_000 }), C1);

    vi.mocked(createTransaction).mockRejectedValueOnce({ code: "23505" });
    expect(await (await post({ items: [{ clientId: C1, values: values() }] })).json()).toEqual({
      results: [{ clientId: C1, status: "done" }],
    });
  });

  test("error DB menghentikan sisa antrean (dicoba lagi nanti)", async () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.mocked(createTransaction).mockResolvedValueOnce(true).mockRejectedValueOnce(new Error("P2028"));
    const res = await post({
      items: [
        { clientId: C1, values: values() },
        { clientId: C2, values: values() },
        { clientId: C3, values: values() },
      ],
    });
    expect(await res.json()).toEqual({ results: [{ clientId: C1, status: "done" }] });
    expect(createTransaction).toHaveBeenCalledTimes(2);
    error.mockRestore();
  });
});
