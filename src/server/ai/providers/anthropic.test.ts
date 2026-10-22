// @vitest-environment node
import {
  AnthropicError,
  APIConnectionTimeoutError,
  APIUserAbortError,
  AuthenticationError,
  InternalServerError,
  RateLimitError,
} from "@anthropic-ai/sdk";
import { afterEach, describe, expect, test, vi } from "vitest";
import { AiError, createDeadline, type Deadline, type UserAiContext } from "..";
import { STATIC_SYSTEM_PROMPT } from "../prompt";
import { anthropicParser, type AnthropicClient } from "./anthropic";

const ctx: UserAiContext = {
  today: "2026-09-23",
  nowLocal: "12:00",
  timezone: "Asia/Jakarta",
  categories: [
    { id: "e-transport", name: "Transport", kind: "expense" },
    { id: "e-lain", name: "Lain-lain", kind: "expense" },
    { id: "i-lain", name: "Lain-lain", kind: "income" },
  ],
  wallets: [
    { id: "w-gopay", name: "GoPay", isDefault: false },
    { id: "w-tunai", name: "Tunai", isDefault: true },
  ],
};

// Bukan salah satu few-shot, jadi kemunculannya di blok sistem pasti bocoran.
const TEXT = "ojek ke kampus gocap kemarin pake gopay xyzzy";
const OUTPUT = {
  amount: 50000,
  type: "expense",
  category: "transport",
  wallet: "GoPay",
  description: "beli bensin",
  occurred_at: "2026-09-22",
  confidence: 0.9,
};

function fakeClient(impl: (...args: unknown[]) => unknown) {
  const parse = vi.fn(impl);
  return { client: { messages: { parse } } as unknown as AnthropicClient, parse };
}

const message = (over: Record<string, unknown> = {}) => ({
  model: "claude-haiku-4-5-20251001",
  stop_reason: "end_turn",
  parsed_output: OUTPUT,
  ...over,
});

let deadline: Deadline;
afterEach(() => deadline?.dispose());

async function parseWith(impl: (...args: unknown[]) => unknown, signal?: AbortSignal) {
  const fake = fakeClient(impl);
  deadline = createDeadline(8000, signal);
  const parser = anthropicParser({ client: fake.client, model: "claude-haiku-4-5" });
  return { fake, result: parser.parse(TEXT, ctx, deadline) };
}

async function errorOf(p: Promise<unknown>): Promise<AiError> {
  try {
    await p;
  } catch (e) {
    expect(e).toBeInstanceOf(AiError);
    return e as AiError;
  }
  throw new Error("tidak melempar");
}

describe("anthropicParser: sukses", () => {
  test("bentuk request, opsi, dan hasil", async () => {
    const { fake, result } = await parseWith(async () => message());
    const outcome = await result;
    expect(outcome).toEqual({
      data: { ...OUTPUT, category: "Transport" },
      servedModel: "claude-haiku-4-5-20251001",
      attempts: 1,
    });

    expect(fake.parse).toHaveBeenCalledTimes(1);
    const [params, options] = fake.parse.mock.calls[0] as [Record<string, unknown>, Record<string, unknown>];
    expect(params.model).toBe("claude-haiku-4-5");
    expect(params.max_tokens).toBe(400);
    expect(params).not.toHaveProperty("temperature");
    expect(params).not.toHaveProperty("thinking");

    const system = params.system as { text: string; cache_control?: unknown }[];
    expect(system[0]).toEqual({ type: "text", text: STATIC_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } });
    expect(system[1].cache_control).toBeUndefined();
    expect(system.map((s) => s.text).join("\n")).not.toContain(TEXT);

    const messages = params.messages as { role: string; content: string }[];
    expect(messages).toEqual([{ role: "user", content: `<transaksi>\n${TEXT}\n</transaksi>` }]);

    const format = (params.output_config as { format: { type: string; schema: Record<string, unknown> } }).format;
    expect(format.type).toBe("json_schema");
    const props = format.schema.properties as Record<string, { enum?: string[]; anyOf?: { enum?: string[] }[] }>;
    expect(props.category.enum).toEqual(["Lain-lain", "Transport"]);
    expect(props.wallet.anyOf?.[0].enum).toEqual(["GoPay", "Tunai"]);
    expect(JSON.stringify(format.schema)).not.toMatch(/"(minimum|maximum|pattern|\$schema)"/);

    expect(options).toEqual({ signal: deadline.signal, timeout: expect.any(Number), maxRetries: 1 });
    expect(options.timeout as number).toBeLessThanOrEqual(8000);
    expect(options.timeout as number).toBeGreaterThan(0);
  });

  test("model respons yang tidak aman diganti model dari config", async () => {
    const { result } = await parseWith(async () => message({ model: "evil\nmodel" }));
    expect((await result).servedModel).toBe("claude-haiku-4-5");
  });
});

describe("anthropicParser: gagal", () => {
  test.each(["refusal", "max_tokens"] as const)("stop_reason %s → invalid_output dengan detail", async (reason) => {
    const { result } = await parseWith(async () => message({ stop_reason: reason, parsed_output: null }));
    const err = await errorOf(result);
    expect(err.code).toBe("invalid_output");
    expect(err.detail).toBe(reason);
  });

  test("parsed_output tidak sesuai skema → invalid_output", async () => {
    const { result } = await parseWith(async () => message({ parsed_output: { ...OUTPUT, category: "Rahasia" } }));
    expect((await errorOf(result)).code).toBe("invalid_output");
  });

  test("AnthropicError non-API (gagal parse) → invalid_output, dipanggil sekali", async () => {
    const { fake, result } = await parseWith(async () => {
      throw new AnthropicError("Failed to parse structured output: SyntaxError");
    });
    expect((await errorOf(result)).code).toBe("invalid_output");
    expect(fake.parse).toHaveBeenCalledTimes(1);
  });

  test("APIConnectionTimeoutError → timeout", async () => {
    const { result } = await parseWith(async () => {
      throw new APIConnectionTimeoutError();
    });
    expect((await errorOf(result)).code).toBe("timeout");
  });

  test("sinyal yang sudah abort → timeout", async () => {
    const client = new AbortController();
    client.abort();
    const { result } = await parseWith(async (_params, options) => {
      if ((options as { signal: AbortSignal }).signal.aborted) throw new APIUserAbortError();
      return message();
    }, client.signal);
    expect((await errorOf(result)).code).toBe("timeout");
  });

  test("RateLimitError → rate_limited", async () => {
    const { result } = await parseWith(async () => {
      throw new RateLimitError(429, undefined, "rate limited", new Headers());
    });
    const err = await errorOf(result);
    expect(err.code).toBe("rate_limited");
    expect(err.status).toBe(429);
  });

  test("AuthenticationError → provider_error status 401, tanpa pesan provider", async () => {
    const { result } = await parseWith(async () => {
      throw new AuthenticationError(401, { secret: "PROVIDER-BODY" }, "PROVIDER-MESSAGE", new Headers());
    });
    const err = await errorOf(result);
    expect(err.code).toBe("provider_error");
    expect(err.status).toBe(401);
    expect(err.message).not.toContain("PROVIDER");
  });

  test("InternalServerError → provider_error status 500", async () => {
    const { result } = await parseWith(async () => {
      throw new InternalServerError(500, undefined, "boom", new Headers());
    });
    const err = await errorOf(result);
    expect(err.code).toBe("provider_error");
    expect(err.status).toBe(500);
  });

  test("error bukan dari SDK dilempar ulang", async () => {
    const { result } = await parseWith(async () => {
      throw new TypeError("bug");
    });
    await expect(result).rejects.toBeInstanceOf(TypeError);
  });
});
