// @vitest-environment node
import * as crypto from "node:crypto";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { signDraft, verifyDraft, type DraftInput } from "./draft-token";

vi.mock("node:crypto", async (importOriginal) => {
  const actual = await importOriginal<typeof import("node:crypto")>();
  return { ...actual, createHmac: vi.fn(actual.createHmac) };
});

const SECRET = "k".repeat(32);
const SUB = "11111111-1111-4111-8111-111111111111";
const INPUT: DraftInput = {
  sub: SUB,
  raw: "beli bensin gocap kemarin",
  parsed: {
    amount: 50000,
    type: "expense",
    category: "Transport",
    wallet: "Tunai",
    description: "beli bensin",
    occurred_at: "2026-09-22",
    confidence: 0.9,
  },
  ids: { categoryId: "22222222-2222-4222-8222-222222222222", walletId: "33333333-3333-4333-8333-333333333333" },
  modelVersion: "anthropic:claude-haiku-4-5@p1",
  latencyMs: 812,
  confidence: 0.9,
};

const b64 = (value: unknown) => Buffer.from(JSON.stringify(value), "utf8").toString("base64url");
const decode = (token: string) => JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString("utf8"));
/** Token dengan payload bebas, ditandatangani kunci tertentu (untuk menguji validasi isi). */
const forge = (payload: unknown, key = SECRET) => {
  const part = b64(payload);
  return `${part}.${crypto.createHmac("sha256", key).update(part).digest("base64url")}`;
};

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-23T05:00:00Z"));
  vi.stubEnv("AI_DRAFT_SECRET", SECRET);
  vi.mocked(crypto.createHmac).mockClear();
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
});

describe("signDraft / verifyDraft", () => {
  test("round-trip mengembalikan payload lengkap", () => {
    const token = signDraft(INPUT)!;
    expect(token).toMatch(/^[\w-]+\.[\w-]+$/);
    // Spy benar-benar terpasang di modul (supaya cek "tanpa HMAC" di bawah bermakna).
    expect(crypto.createHmac).toHaveBeenCalledWith("sha256", SECRET);
    const result = verifyDraft(token, SUB);
    expect(result).toEqual({
      ok: true,
      draft: {
        v: 1,
        sub: SUB,
        iat: Date.parse("2026-09-23T05:00:00Z") / 1000,
        mode: "text",
        raw: INPUT.raw,
        parsed: INPUT.parsed,
        ids: INPUT.ids,
        mv: INPUT.modelVersion,
        lat: 812,
        conf: 0.9,
      },
    });
  });

  test("categoryId null diterima", () => {
    const token = signDraft({ ...INPUT, ids: { ...INPUT.ids, categoryId: null } })!;
    expect(verifyDraft(token, SUB).ok).toBe(true);
  });

  test("payload diubah → draft_invalid", () => {
    const token = signDraft(INPUT)!;
    const [, sig] = token.split(".");
    const tampered = `${b64({ ...decode(token), conf: 1 })}.${sig}`;
    expect(verifyDraft(tampered, SUB)).toEqual({ ok: false, reason: "draft_invalid" });
  });

  test("tanda tangan diubah → draft_invalid", () => {
    const token = signDraft(INPUT)!;
    const [payload, sig] = token.split(".");
    const flipped = (sig[0] === "A" ? "B" : "A") + sig.slice(1);
    expect(verifyDraft(`${payload}.${flipped}`, SUB).ok).toBe(false);
    // Panjang berbeda: jalur timingSafeEqual tidak boleh melempar.
    expect(verifyDraft(`${payload}.${sig}xx`, SUB)).toEqual({ ok: false, reason: "draft_invalid" });
    expect(verifyDraft(`${payload}.abc`, SUB)).toEqual({ ok: false, reason: "draft_invalid" });
  });

  test("sub berbeda → draft_wrong_user", () => {
    const token = signDraft(INPUT)!;
    expect(verifyDraft(token, "44444444-4444-4444-8444-444444444444")).toEqual({
      ok: false,
      reason: "draft_wrong_user",
    });
  });

  test("kedaluwarsa setelah 1800 s", () => {
    const token = signDraft(INPUT)!;
    vi.setSystemTime(new Date("2026-09-23T05:30:00Z"));
    expect(verifyDraft(token, SUB).ok).toBe(true);
    vi.setSystemTime(new Date("2026-09-23T05:30:01Z"));
    expect(verifyDraft(token, SUB)).toEqual({ ok: false, reason: "draft_expired" });
  });

  test("iat di masa depan (> 60 s) → draft_invalid", () => {
    const iat = Date.parse("2026-09-23T05:00:00Z") / 1000;
    const base = decode(signDraft(INPUT)!);
    expect(verifyDraft(forge({ ...base, iat: iat + 60 }), SUB).ok).toBe(true);
    expect(verifyDraft(forge({ ...base, iat: iat + 61 }), SUB)).toEqual({ ok: false, reason: "draft_invalid" });
  });

  test("secret lain → draft_invalid", () => {
    const token = signDraft(INPUT)!;
    vi.stubEnv("AI_DRAFT_SECRET", "z".repeat(32));
    expect(verifyDraft(token, SUB)).toEqual({ ok: false, reason: "draft_invalid" });
  });

  test.each([
    ["bukan string", 123],
    ["null", null],
    ["kosong", ""],
    ["tanpa titik", "abc"],
    ["tiga bagian", "a.b.c"],
    ["bagian kosong", "abc."],
    ["terlalu besar", `${"a".repeat(9000)}.b`],
    ["payload bukan JSON", `${Buffer.from("not json").toString("base64url")}.x`],
  ])("masukan rusak (%s) → draft_invalid", (_label, token) => {
    expect(verifyDraft(token, SUB)).toEqual({ ok: false, reason: "draft_invalid" });
  });

  test("payload bukan JSON tapi bertanda tangan sah → draft_invalid", () => {
    const part = Buffer.from("not json").toString("base64url");
    const token = `${part}.${crypto.createHmac("sha256", SECRET).update(part).digest("base64url")}`;
    expect(verifyDraft(token, SUB)).toEqual({ ok: false, reason: "draft_invalid" });
  });

  test("mv 121 karakter → draft_invalid", () => {
    const base = decode(signDraft(INPUT)!);
    expect(verifyDraft(forge({ ...base, mv: "m".repeat(120) }), SUB).ok).toBe(true);
    expect(verifyDraft(forge({ ...base, mv: "m".repeat(121) }), SUB).ok).toBe(false);
  });

  test("parsed.description 201 karakter → draft_invalid", () => {
    const base = decode(signDraft(INPUT)!);
    const parsed = { ...base.parsed, description: "d".repeat(201) };
    expect(verifyDraft(forge({ ...base, parsed }), SUB).ok).toBe(false);
  });

  test("kunci tambahan atau conf di luar 0–1 → draft_invalid", () => {
    const base = decode(signDraft(INPUT)!);
    expect(verifyDraft(forge({ ...base, extra: 1 }), SUB).ok).toBe(false);
    expect(verifyDraft(forge({ ...base, conf: 2 }), SUB).ok).toBe(false);
    expect(verifyDraft(forge({ ...base, v: 2 }), SUB).ok).toBe(false);
  });
});

describe("tanpa AI_DRAFT_SECRET yang sah", () => {
  test.each([
    ["tidak di-set", undefined],
    ["31 karakter", "k".repeat(31)],
    ["kosong", ""],
  ])("%s: signDraft → null, verifyDraft token lama → draft_invalid, tanpa HMAC", (_label, value) => {
    const token = signDraft(INPUT)!;
    vi.stubEnv("AI_DRAFT_SECRET", value);
    vi.mocked(crypto.createHmac).mockClear();
    expect(signDraft(INPUT)).toBeNull();
    expect(verifyDraft(token, SUB)).toEqual({ ok: false, reason: "draft_invalid" });
    expect(crypto.createHmac).not.toHaveBeenCalled();
  });

  test('token yang di-HMAC dengan kunci "" ditolak', () => {
    const base = decode(signDraft(INPUT)!);
    const emptyKeyToken = forge(base, "");
    vi.stubEnv("AI_DRAFT_SECRET", undefined);
    expect(verifyDraft(emptyKeyToken, SUB)).toEqual({ ok: false, reason: "draft_invalid" });
    vi.stubEnv("AI_DRAFT_SECRET", SECRET);
    expect(verifyDraft(emptyKeyToken, SUB)).toEqual({ ok: false, reason: "draft_invalid" });
  });
});
