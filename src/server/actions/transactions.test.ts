// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi, type MockInstance } from "vitest";
import { revalidatePath } from "next/cache";
import { verifyDraft, type VerifiedDraft } from "@/server/ai/draft-token";
import { TransactionError, createTransactionFromAi } from "@/server/services/transactions";
import { saveAiTransaction } from "./transactions";

const CLAIMS = { sub: "11111111-1111-4111-8111-111111111111", role: "authenticated" };
vi.mock("@/server/auth/session", () => ({ requireClaims: vi.fn(async () => CLAIMS) }));
vi.mock("@/server/services/profile", () => ({ getTimezone: vi.fn(async () => "Asia/Jakarta") }));
vi.mock("@/server/services/transactions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/services/transactions")>()),
  createTransactionFromAi: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/ai/draft-token", () => ({ verifyDraft: vi.fn() }));

const CATEGORY = "22222222-2222-4222-8222-222222222222";
const WALLET = "33333333-3333-4333-8333-333333333333";
const TOKEN = "cGF5bG9hZA.c2lnbmF0dXJl";
const DRAFT: VerifiedDraft = {
  v: 1,
  sub: CLAIMS.sub,
  iat: 1_790_000_000,
  mode: "text",
  raw: "beli bensin gocap kemarin",
  parsed: {
    amount: 50_000,
    type: "expense",
    category: "Transport",
    wallet: "Tunai",
    description: "beli bensin",
    occurred_at: "2026-09-22",
    confidence: 0.9,
  },
  ids: { categoryId: CATEGORY, walletId: WALLET },
  mv: "anthropic:claude-haiku-4-5@p1",
  lat: 900,
  conf: 0.9,
};
const DRAFT_SNAPSHOT = structuredClone(DRAFT);
const REJECTED =
  "Usulan AI sudah kedaluwarsa atau tidak valid. Kirim ulang kalimatnya, atau simpan lewat form manual.";

function form(overrides: Record<string, string | undefined> = {}) {
  const fields: Record<string, string | undefined> = {
    type: "expense",
    amount: "50.000",
    categoryId: CATEGORY,
    walletId: WALLET,
    description: "beli bensin",
    occurredAt: "2026-09-22",
    draft: TOKEN,
    ...overrides,
  };
  const fd = new FormData();
  for (const [key, value] of Object.entries(fields)) if (value !== undefined) fd.append(key, value);
  return fd;
}

const service = vi.mocked(createTransactionFromAi);
const verify = vi.mocked(verifyDraft);
let warn: MockInstance<typeof console.warn>;
let error: MockInstance<typeof console.error>;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-23T05:00:00Z")); // 12:00 WIB
  service.mockReset().mockResolvedValue("44444444-4444-4444-8444-444444444444");
  verify.mockReset().mockReturnValue({ ok: true, draft: DRAFT });
  vi.mocked(revalidatePath).mockClear();
  warn = vi.spyOn(console, "warn").mockImplementation(() => {});
  error = vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "info").mockImplementation(() => {});
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const logged = (spy: MockInstance) => JSON.stringify(spy.mock.calls);

describe("saveAiTransaction (design §10.1)", () => {
  test("form + draft valid → satu panggilan service, revalidate, pesan sukses", async () => {
    const result = await saveAiTransaction({}, form());
    expect(result).toEqual({ ok: true, message: "Transaksi disimpan." });
    expect(verify).toHaveBeenCalledWith(TOKEN, CLAIMS.sub);
    expect(service).toHaveBeenCalledTimes(1);
    expect(service).toHaveBeenCalledWith(
      CLAIMS,
      {
        type: "expense",
        amount: 50_000,
        categoryId: CATEGORY,
        walletId: WALLET,
        description: "beli bensin",
        occurredAt: "2026-09-22",
      },
      DRAFT,
    );
    const paths = vi.mocked(revalidatePath).mock.calls.map(([p]) => p);
    expect(paths).toEqual(expect.arrayContaining(["/", "/transaksi", "/pengaturan"]));
  });

  test.each(["draft_invalid", "draft_expired", "draft_wrong_user"] as const)(
    "draft %s → pesan §10.1, values dipertahankan, service tidak dipanggil",
    async (reason) => {
      verify.mockReturnValue({ ok: false, reason });
      const result = await saveAiTransaction({}, form());
      expect(result.ok).toBe(false);
      expect(result.message).toBe(REJECTED);
      expect(result.values).toMatchObject({ amount: "50.000", categoryId: CATEGORY });
      expect(result.values).not.toHaveProperty("draft");
      expect(service).not.toHaveBeenCalled();
      expect(logged(warn)).toContain(reason);
      expect(logged(warn)).not.toContain(TOKEN);
      expect(logged(warn)).not.toContain("cGF5bG9hZA");
    },
  );

  test("field draft hilang → diperlakukan sebagai draft_invalid", async () => {
    // verifyDraft asli mengembalikan draft_invalid untuk null; mock meniru kontrak itu.
    verify.mockImplementation((token) =>
      typeof token === "string" ? { ok: true, draft: DRAFT } : { ok: false, reason: "draft_invalid" },
    );
    const result = await saveAiTransaction({}, form({ draft: undefined }));
    expect(verify).toHaveBeenCalledWith(null, CLAIMS.sub);
    expect(result).toMatchObject({ ok: false, message: REJECTED });
    expect(service).not.toHaveBeenCalled();
    expect(logged(warn)).toContain("draft_invalid");
  });

  test.each([
    ["amount", { amount: "0" }],
    ["occurredAt", { occurredAt: "2026-09-24" }],
    ["description", { description: "x".repeat(201) }],
    ["categoryId", { categoryId: "bukan-uuid" }],
  ])("skema gagal (%s) → fieldErrors, values tetap, service tidak dipanggil", async (field, overrides) => {
    const result = await saveAiTransaction({}, form(overrides));
    expect(result.ok).toBe(false);
    expect(result.fieldErrors?.[field]?.length).toBeGreaterThan(0);
    expect(result.values).toMatchObject(overrides);
    expect(result.values).not.toHaveProperty("draft");
    expect(service).not.toHaveBeenCalled();
  });

  test("TransactionError dengan field (kategori diarsipkan) → fieldErrors.categoryId", async () => {
    service.mockRejectedValue(new TransactionError("Kategori ini sudah diarsipkan.", "categoryId"));
    const result = await saveAiTransaction({}, form());
    expect(result).toMatchObject({ ok: false, fieldErrors: { categoryId: ["Kategori ini sudah diarsipkan."] } });
    expect(result.values).not.toHaveProperty("draft");
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  test("TransactionError tanpa field → message", async () => {
    service.mockRejectedValue(new TransactionError("Transaksi tidak ditemukan."));
    const result = await saveAiTransaction({}, form());
    expect(result).toMatchObject({ ok: false, message: "Transaksi tidak ditemukan." });
  });

  test("error tak terduga → pesan umum; log hanya nama/kode, tanpa nilai form", async () => {
    service.mockRejectedValue(new Error(`insert gagal: beli bensin 50000 ${CATEGORY}`));
    const result = await saveAiTransaction({}, form());
    expect(result).toMatchObject({ ok: false, message: "Gagal menyimpan transaksi. Coba lagi." });
    expect(result.values).not.toHaveProperty("draft");
    expect(error).toHaveBeenCalledTimes(1);
    const out = logged(error);
    expect(out).toContain("Error");
    for (const secret of ["beli bensin", "50000", "50.000", CATEGORY, WALLET, TOKEN, CLAIMS.sub]) {
      expect(out).not.toContain(secret);
    }
  });

  test("field tersembunyi palsu tidak pernah sampai ke service", async () => {
    const OTHER = "99999999-9999-4999-8999-999999999999";
    const fd = form({
      source: "manual",
      parsed_result: JSON.stringify({ amount: 1, confidence: 1 }),
      confidence: "1",
      model_version: "evil",
      raw_input: "x",
      userId: OTHER,
      latency_ms: "1",
    });
    const result = await saveAiTransaction({}, fd);
    expect(result.ok).toBe(true);
    const [claims, input, draft] = service.mock.calls[0];
    expect(claims).toBe(CLAIMS);
    expect(Object.keys(input).sort()).toEqual(["amount", "categoryId", "description", "occurredAt", "type", "walletId"]);
    expect(draft).toBe(DRAFT);
    expect(draft).toEqual(DRAFT_SNAPSHOT); // tidak diubah oleh field form
    expect(JSON.stringify(service.mock.calls)).not.toContain("evil");
    expect(JSON.stringify(service.mock.calls)).not.toContain(OTHER);
  });
});
