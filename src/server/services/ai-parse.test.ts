// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { ParseFailure, ParseSuccess } from "@/lib/ai/types";
import { AiError, getTextParser, type Deadline, type ParsedTransaction, type TextParser } from "@/server/ai";
import { verifyDraft } from "@/server/ai/draft-token";
import { logAiEvent } from "@/server/ai/log";
import { withRls } from "@/server/db/with-rls";
import { parseTransactionText } from "./ai-parse";

vi.mock("@/server/db/with-rls", () => ({ withRls: vi.fn() }));
vi.mock("@/server/ai", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/ai")>()),
  getTextParser: vi.fn(),
}));
vi.mock("@/server/ai/log", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/server/ai/log")>();
  return { ...actual, logAiEvent: vi.fn(actual.logAiEvent) };
});

const SECRET = "d".repeat(40);
const CLAIMS = { sub: "11111111-1111-4111-8111-111111111111" };
const TEXT = "makan nasi padang kemarin 20rb";
const CAT_MAKAN = "22222222-2222-4222-8222-222222222222";
const WALLET_TUNAI = "33333333-3333-4333-8333-333333333333";

const CATEGORIES = [
  { id: CAT_MAKAN, name: "Makan", kind: "expense" },
  { id: "22222222-2222-4222-8222-222222222223", name: "Lain-lain", kind: "expense" },
  { id: "22222222-2222-4222-8222-222222222224", name: "Uang Saku", kind: "income" },
];
const WALLETS = [{ id: WALLET_TUNAI, name: "Tunai", isDefault: true }];

const AI_DATA: ParsedTransaction = {
  amount: 20000,
  type: "expense",
  category: "Makan",
  wallet: null,
  description: "makan nasi padang",
  occurred_at: "2026-09-22",
  confidence: 0.9,
};

// ---- recording fake tx ----------------------------------------------------------------------

type Call = { target: string; method: string; args: unknown[] };
const WRITE_METHODS = ["create", "createMany", "createManyAndReturn", "update", "updateMany", "upsert", "delete", "deleteMany"];

function recordingTx(opts: { categories?: unknown[]; wallets?: unknown[]; quota?: () => unknown } = {}) {
  const calls: Call[] = [];
  const raw: { sql: string; values: unknown[] }[] = [];
  const results: Record<string, unknown> = {
    "category.findMany": opts.categories ?? CATEGORIES,
    "wallet.findMany": opts.wallets ?? WALLETS,
    "user.findUnique": { timezone: "Asia/Jakarta" },
  };
  const model = (target: string) =>
    new Proxy(
      {},
      {
        get: (_t, method) => {
          if (typeof method !== "string" || method === "then") return undefined;
          return vi.fn(async (...args: unknown[]) => {
            calls.push({ target, method, args });
            return results[`${target}.${method}`];
          });
        },
      },
    );
  const tx = new Proxy(
    {},
    {
      get: (_t, prop) => {
        if (typeof prop !== "string" || prop === "then") return undefined;
        if (prop === "$queryRaw") {
          return vi.fn(async (strings: TemplateStringsArray, ...values: unknown[]) => {
            calls.push({ target: "$", method: "$queryRaw", args: values });
            raw.push({ sql: strings.join("?"), values });
            return opts.quota ? opts.quota() : [{ remaining: 99 }];
          });
        }
        if (prop.startsWith("$")) {
          return vi.fn(async (...args: unknown[]) => {
            calls.push({ target: "$", method: prop, args });
          });
        }
        return model(prop);
      },
    },
  );
  vi.mocked(withRls).mockImplementation(async (_claims, fn) => fn(tx as never));
  return { calls, raw };
}

/** P1: tidak ada penulisan selain consume_ai_quota. */
function expectNoWrites(rec: ReturnType<typeof recordingTx>) {
  expect(rec.calls.filter((c) => WRITE_METHODS.includes(c.method))).toEqual([]);
  expect(rec.calls.filter((c) => ["$executeRaw", "$executeRawUnsafe", "$queryRawUnsafe"].includes(c.method))).toEqual(
    [],
  );
  const queries = rec.calls.filter((c) => c.method === "$queryRaw");
  expect(queries).toHaveLength(1);
  expect(rec.raw).toHaveLength(1);
  expect(rec.raw[0].sql).toContain("consume_ai_quota");
}

// ---- fake parser ----------------------------------------------------------------------------

function fakeParser(
  impl: (text: string, deadline: Deadline) => Promise<{ data: ParsedTransaction; servedModel: string; attempts: number }>,
  provider: TextParser["provider"] = "anthropic",
) {
  const parser: TextParser = {
    provider,
    model: "claude-haiku-4-5",
    parse: vi.fn((text: string, _ctx, deadline: Deadline) => impl(text, deadline)),
  };
  vi.mocked(getTextParser).mockReturnValue(parser);
  return parser;
}
const succeed = (data: Partial<ParsedTransaction> = {}, servedModel = "claude-haiku-4-5") =>
  fakeParser(async () => ({ data: { ...AI_DATA, ...data }, servedModel, attempts: 1 }));
const throwing = (err: unknown) =>
  fakeParser(async () => {
    throw err;
  });

const run = () => parseTransactionText(CLAIMS, TEXT, new AbortController().signal);
const failure = (r: { body: unknown }) => r.body as ParseFailure;
const success = (r: { body: unknown }) => r.body as ParseSuccess;
const loggedText = () =>
  [vi.mocked(logAiEvent), consoleInfo, consoleWarn, consoleError]
    .flatMap((s) => s.mock.calls.flat())
    .map((a) => (typeof a === "string" ? a : JSON.stringify(a)))
    .join("\n");
const loggedEvents = () => vi.mocked(logAiEvent).mock.calls.map((c) => c[0]);

let consoleInfo: ReturnType<typeof vi.spyOn>;
let consoleWarn: ReturnType<typeof vi.spyOn>;
let consoleError: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-23T05:00:00Z")); // 12:00 WIB
  vi.stubEnv("AI_DRAFT_SECRET", SECRET);
  vi.stubEnv("AI_TEXT_PROVIDER", undefined);
  vi.stubEnv("AI_PARSE_DAILY_LIMIT", undefined);
  vi.mocked(withRls).mockReset();
  vi.mocked(getTextParser).mockReset();
  vi.mocked(logAiEvent).mockClear();
  consoleInfo = vi.spyOn(console, "info").mockImplementation(() => {});
  consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllEnvs();
  consoleInfo.mockRestore();
  consoleWarn.mockRestore();
  consoleError.mockRestore();
});

describe("parseTransactionText: sukses", () => {
  test("usulan + draft yang lolos verifyDraft, tanpa penulisan (P1)", async () => {
    const rec = recordingTx();
    succeed();
    const r = await run();
    expect(r.status).toBe(200);
    const body = success(r);
    expect(body.proposal).toEqual({
      amount: 20000,
      type: "expense",
      categoryId: CAT_MAKAN,
      walletId: WALLET_TUNAI,
      description: "makan nasi padang",
      occurredAt: "2026-09-22",
      confidence: 0.9,
    });
    expect(body.walletInferred).toBe(true);
    expect(body).not.toHaveProperty("amountOptions");

    const verified = verifyDraft(body.draft, CLAIMS.sub);
    expect(verified.ok).toBe(true);
    if (!verified.ok) return;
    expect(verified.draft.mv).toBe("anthropic:claude-haiku-4-5@p1");
    expect(verified.draft.mv).toMatch(/^[\w-]+:[\w.:\/-]+@p\d+$/);
    expect(verified.draft.lat).toBeGreaterThanOrEqual(0);
    expect(verified.draft.raw).toBe(TEXT);
    expect(verified.draft.ids).toEqual({ categoryId: CAT_MAKAN, walletId: WALLET_TUNAI });
    expect(verified.draft.parsed.wallet).toBe("Tunai");

    expectNoWrites(rec);
    const ok = loggedEvents().find((e) => e.evt === "ai_parse");
    expect(ok).toMatchObject({ outcome: "ok", provider: "anthropic", prompt: "p1", attempts: 1 });
  });

  test("konteks dibaca sebelum consume_ai_quota", async () => {
    const rec = recordingTx();
    succeed();
    await run();
    const order = rec.calls.map((c) => `${c.target}.${c.method}`);
    const quotaAt = order.indexOf("$.$queryRaw");
    for (const read of ["category.findMany", "wallet.findMany", "user.findUnique"]) {
      expect(order.indexOf(read)).toBeGreaterThanOrEqual(0);
      expect(order.indexOf(read)).toBeLessThan(quotaAt);
    }
    // Hanya baris aktif yang diminta.
    const catQuery = rec.calls.find((c) => c.target === "category")!.args[0] as { where: unknown };
    const walletQuery = rec.calls.find((c) => c.target === "wallet")!.args[0] as { where: unknown };
    expect(catQuery.where).toEqual({ isArchived: false });
    expect(walletQuery.where).toEqual({ isArchived: false });
  });

  test("konteks yang diteruskan ke parser memakai zona waktu pengguna", async () => {
    recordingTx();
    const parser = succeed();
    await run();
    const ctx = vi.mocked(parser.parse).mock.calls[0][1];
    expect(ctx).toMatchObject({ today: "2026-09-23", nowLocal: "12:00", timezone: "Asia/Jakarta" });
  });

  test("limit dari AI_PARSE_DAILY_LIMIT, bawaan 100", async () => {
    let rec = recordingTx();
    succeed();
    await run();
    expect(rec.raw[0].values).toEqual([100]);

    vi.stubEnv("AI_PARSE_DAILY_LIMIT", "7");
    rec = recordingTx();
    await run();
    expect(rec.raw[0].values).toEqual([7]);
  });

  test("confidence 1.5 → 1 di usulan dan di draft", async () => {
    recordingTx();
    succeed({ confidence: 1.5 });
    const body = success(await run());
    expect(body.proposal.confidence).toBe(1);
    const verified = verifyDraft(body.draft, CLAIMS.sub);
    expect(verified.ok && verified.draft.conf).toBe(1);
  });

  test("model 100 karakter (openai-compatible) → mv ≤ 120 dan draft tetap lolos", async () => {
    recordingTx();
    fakeParser(async () => ({ data: AI_DATA, servedModel: "x".repeat(100), attempts: 2 }), "openai-compatible");
    const body = success(await run());
    const verified = verifyDraft(body.draft, CLAIMS.sub);
    expect(verified.ok).toBe(true);
    if (!verified.ok) return;
    expect(verified.draft.mv.length).toBeLessThanOrEqual(120);
    expect(verified.draft.mv.startsWith("openai-compatible:")).toBe(true);
  });

  test("deadline ≤ 8000 ms dan dispose dipanggil saat sukses", async () => {
    recordingTx();
    const disposed = vi.fn();
    fakeParser(async (_text, deadline) => {
      expect(deadline.remainingMs()).toBeLessThanOrEqual(8000);
      const original = deadline.dispose;
      deadline.dispose = () => {
        disposed();
        original();
      };
      return { data: AI_DATA, servedModel: "claude-haiku-4-5", attempts: 1 };
    });
    await run();
    expect(disposed).toHaveBeenCalledTimes(1);
  });
});

describe("parseTransactionText: gagal sebelum LLM", () => {
  test("selector not_configured → 503 tanpa withRls (kuota tidak terpakai), prefill tanpa tanggal", async () => {
    vi.mocked(getTextParser).mockImplementation(() => {
      throw new AiError("not_configured", undefined, "env");
    });
    const r = await run();
    expect(r.status).toBe(503);
    expect(failure(r).error.code).toBe("ai_unavailable");
    expect(failure(r).prefill).toEqual({ description: TEXT, amount: 20000 });
    expect(withRls).not.toHaveBeenCalled();
  });

  test("tanpa kategori pemasukan (empty_enum) → 503, kuota & parser tidak dipanggil", async () => {
    const rec = recordingTx({ categories: CATEGORIES.filter((c) => c.kind === "expense") });
    const parser = succeed();
    const r = await run();
    expect(r.status).toBe(503);
    expect(failure(r).error.code).toBe("ai_unavailable");
    expect(failure(r).prefill).toEqual({ description: TEXT, amount: 20000 });
    expect(rec.raw).toHaveLength(0);
    expect(parser.parse).not.toHaveBeenCalled();
    expect(loggedEvents()).toContainEqual(expect.objectContaining({ evt: "ai_fallback", code: "empty_enum" }));
  });

  test("53400 → 429 quota_exceeded, parser tidak dipanggil, prefill bertanggal", async () => {
    recordingTx({ quota: () => Promise.reject(Object.assign(new Error("quota"), { code: "53400" })) });
    const parser = succeed();
    const r = await run();
    expect(r.status).toBe(429);
    expect(failure(r).error.code).toBe("quota_exceeded");
    expect(failure(r).error.message).toMatch(/Kuota AI harian/);
    expect(failure(r).prefill).toEqual({ description: TEXT, amount: 20000, occurredAt: "2026-09-22" });
    expect(parser.parse).not.toHaveBeenCalled();
  });

  test("28000 → 401 unauthorized tanpa prefill", async () => {
    recordingTx({ quota: () => Promise.reject(Object.assign(new Error("x"), { code: "28000" })) });
    const parser = succeed();
    const r = await run();
    expect(r.status).toBe(401);
    expect(failure(r).error.code).toBe("unauthorized");
    expect(failure(r).prefill).toBeUndefined();
    expect(parser.parse).not.toHaveBeenCalled();
  });

  test("22023 → 503 ai_unavailable, log error invalid_timezone, parser tidak dipanggil", async () => {
    recordingTx({ quota: () => Promise.reject(Object.assign(new Error("x"), { code: "22023" })) });
    const parser = succeed();
    const r = await run();
    expect(r.status).toBe(503);
    expect(failure(r).error.code).toBe("ai_unavailable");
    expect(failure(r).prefill?.occurredAt).toBe("2026-09-22");
    expect(parser.parse).not.toHaveBeenCalled();
    const call = vi.mocked(logAiEvent).mock.calls.find((c) => c[0].code === "invalid_timezone");
    expect(call?.[1]).toBe("error");
  });

  test("error DB tak terduga → 500 internal; log hanya nama", async () => {
    vi.mocked(withRls).mockRejectedValue(new TypeError(`koneksi gagal untuk ${TEXT}`));
    succeed();
    const r = await run();
    expect(r.status).toBe(500);
    expect(failure(r).error).toEqual({ code: "internal", message: "Terjadi kesalahan. Silakan isi form manual." });
    expect(loggedEvents()).toContainEqual(expect.objectContaining({ outcome: "internal", code: "TypeError" }));
    expect(loggedText()).not.toContain("nasi padang");
  });
});

describe("parseTransactionText: gagal setelah LLM", () => {
  test("timeout → 504 tanpa penulisan (P1), dispose tetap dipanggil", async () => {
    const rec = recordingTx();
    const disposed = vi.fn();
    fakeParser(async (_text, deadline) => {
      const original = deadline.dispose;
      deadline.dispose = () => {
        disposed();
        original();
      };
      throw new AiError("timeout");
    });
    const r = await run();
    expect(r.status).toBe(504);
    expect(failure(r).error.code).toBe("ai_timeout");
    expect(failure(r).prefill).toEqual({ description: TEXT, amount: 20000, occurredAt: "2026-09-22" });
    expect(disposed).toHaveBeenCalledTimes(1);
    expectNoWrites(rec);
  });

  test("invalid_output max_tokens → 502, stop_reason tercatat, tanpa penulisan (P1)", async () => {
    const rec = recordingTx();
    throwing(new AiError("invalid_output", undefined, "max_tokens"));
    const r = await run();
    expect(r.status).toBe(502);
    expect(failure(r).error.code).toBe("ai_invalid_output");
    expect(loggedEvents()).toContainEqual(
      expect.objectContaining({ evt: "ai_fallback", outcome: "ai_invalid_output", stop_reason: "max_tokens" }),
    );
    expectNoWrites(rec);
  });

  test("rate_limited → 503 ai_busy", async () => {
    recordingTx();
    throwing(new AiError("rate_limited", 429));
    const r = await run();
    expect(r.status).toBe(503);
    expect(failure(r).error.code).toBe("ai_busy");
  });

  test("provider_error 401 → 503 ai_unavailable, log error", async () => {
    recordingTx();
    throwing(new AiError("provider_error", 401));
    const r = await run();
    expect(r.status).toBe(503);
    expect(failure(r).error.code).toBe("ai_unavailable");
    const call = vi.mocked(logAiEvent).mock.calls.find((c) => c[0].evt === "ai_fallback");
    expect(call?.[0]).toMatchObject({ status: 401 });
    expect(call?.[1]).toBe("error");
  });

  test("confidence 0.1 → 422 ai_not_understood dengan prefill", async () => {
    recordingTx();
    succeed({ confidence: 0.1 });
    const r = await run();
    expect(r.status).toBe(422);
    expect(failure(r).error.code).toBe("ai_not_understood");
    expect(failure(r).prefill?.description).toBe(TEXT);
  });

  test("AI_DRAFT_SECRET hilang setelah parser selesai → 503 tanpa draft", async () => {
    recordingTx();
    fakeParser(async () => {
      vi.stubEnv("AI_DRAFT_SECRET", undefined);
      return { data: AI_DATA, servedModel: "claude-haiku-4-5", attempts: 1 };
    });
    const r = await run();
    expect(r.status).toBe(503);
    expect(failure(r).error.code).toBe("ai_unavailable");
    expect(r.body).not.toHaveProperty("draft");
  });

  test("error tak terduga dari parser → 500 internal, pesan tidak bocor", async () => {
    recordingTx();
    throwing(new Error("PROVIDER-SECRET-BODY"));
    const r = await run();
    expect(r.status).toBe(500);
    expect(JSON.stringify(r.body)).not.toContain("PROVIDER-SECRET-BODY");
    expect(loggedText()).not.toContain("PROVIDER-SECRET-BODY");
  });
});

describe("parseTransactionText: log bebas PII", () => {
  test.each([
    ["sukses", () => succeed()],
    ["timeout", () => throwing(new AiError("timeout"))],
    ["not understood", () => succeed({ confidence: 0.05 })],
  ])("%s: teks mentah, deskripsi, nominal, dan ID tidak pernah dicatat", async (_label, arrange) => {
    recordingTx();
    arrange();
    await run();
    const out = loggedText();
    expect(vi.mocked(logAiEvent)).toHaveBeenCalled();
    expect(out).not.toContain(TEXT);
    expect(out).not.toContain("nasi padang");
    expect(out).not.toContain("20000");
    expect(out).not.toContain(CAT_MAKAN);
    expect(out).not.toContain(WALLET_TUNAI);
    expect(out).not.toContain(CLAIMS.sub);
    expect(out).not.toContain(SECRET);
  });
});
