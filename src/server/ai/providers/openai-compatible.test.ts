// @vitest-environment node
import { APIConnectionTimeoutError, BadRequestError, RateLimitError } from "openai";
import { describe, expect, test, vi } from "vitest";
import { AiError, type Deadline, type UserAiContext } from "..";
import { STATIC_SYSTEM_PROMPT } from "../prompt";
import { extractJson, openAiCompatParser, type OpenAiCompatClient } from "./openai-compatible";

const ctx: UserAiContext = {
  today: "2026-09-23",
  nowLocal: "12:00",
  timezone: "Asia/Jakarta",
  categories: [
    { id: "e-transport", name: "Transport", kind: "expense" },
    { id: "i-saku", name: "Uang Saku", kind: "income" },
  ],
  wallets: [{ id: "w-tunai", name: "Tunai", isDefault: true }],
};

const TEXT = "ojek ke kampus gocap kemarin xyzzy";
const OUTPUT = {
  amount: 50000,
  type: "expense",
  category: "Transport",
  wallet: null,
  description: "ojek ke kampus",
  occurred_at: "2026-09-22",
  confidence: 0.9,
};
const MODEL = "gemini-2.5-flash";

const completion = (content: unknown, over: { finish_reason?: string; model?: string } = {}) => ({
  model: over.model ?? "google/gemini-2.5-flash",
  choices: [{ index: 0, finish_reason: over.finish_reason ?? "stop", message: { role: "assistant", content } }],
});
const valid = () => completion(JSON.stringify(OUTPUT));
const badRequest = () => new BadRequestError(400, undefined, "response_format not supported", new Headers());

/** Deadline palsu dengan remainingMs() yang ditentukan urutannya. */
function fakeDeadline(remaining: number[] = [7000, 6000, 5900, 5800]): Deadline {
  const queue = [...remaining];
  return {
    signal: new AbortController().signal,
    remainingMs: vi.fn(() => (queue.length > 1 ? queue.shift()! : queue[0])),
    dispose: () => {},
  };
}

function setup(responses: (() => unknown)[], deadline = fakeDeadline()) {
  const queue = [...responses];
  const create = vi.fn(async () => {
    const next = queue.shift();
    if (!next) throw new Error("panggilan tidak terduga");
    return next();
  });
  const client = { chat: { completions: { create } } } as unknown as OpenAiCompatClient;
  const parser = openAiCompatParser({ client, model: MODEL });
  return { create, deadline, run: () => parser.parse(TEXT, ctx, deadline) };
}

type Body = { response_format?: unknown; messages: { role: string; content: string }[]; [k: string]: unknown };
const bodyOf = (create: ReturnType<typeof vi.fn>, i: number) => create.mock.calls[i][0] as Body;
const optionsOf = (create: ReturnType<typeof vi.fn>, i: number) => create.mock.calls[i][1] as Record<string, unknown>;

async function errorOf(p: Promise<unknown>): Promise<AiError> {
  try {
    await p;
  } catch (e) {
    expect(e).toBeInstanceOf(AiError);
    return e as AiError;
  }
  throw new Error("tidak melempar");
}

describe("openAiCompatParser", () => {
  test("percobaan pertama valid → attempts 1, bentuk request benar", async () => {
    const { create, run } = setup([valid]);
    const outcome = await run();
    expect(outcome).toEqual({ data: OUTPUT, servedModel: "google/gemini-2.5-flash", attempts: 1 });
    expect(create).toHaveBeenCalledTimes(1);

    const body = bodyOf(create, 0);
    expect(body.model).toBe(MODEL);
    expect(body.temperature).toBe(0);
    expect(body.max_tokens).toBe(400);
    expect(body.response_format).toMatchObject({
      type: "json_schema",
      json_schema: { name: "centsible_transaction", strict: true },
    });
    const schema = (body.response_format as { json_schema: { schema: { properties: Record<string, { enum?: string[] }> } } })
      .json_schema.schema;
    expect(schema.properties.category.enum).toEqual(["Transport", "Uang Saku"]);
    expect(body.messages[0].role).toBe("system");
    expect(body.messages[0].content.startsWith(STATIC_SYSTEM_PROMPT)).toBe(true);
    expect(body.messages[0].content).not.toContain(TEXT);
    expect(body.messages[1]).toEqual({ role: "user", content: `<transaksi>\n${TEXT}\n</transaksi>` });
  });

  test("JSON tidak valid lalu valid → attempts 2", async () => {
    const { create, run } = setup([() => completion("maaf, saya tidak bisa"), valid]);
    expect((await run()).attempts).toBe(2);
    expect(create).toHaveBeenCalledTimes(2);
    expect(bodyOf(create, 1).response_format).toBeDefined();
  });

  test("tidak valid dua kali → invalid_output, tepat 2 panggilan", async () => {
    const bad = () => completion(JSON.stringify({ ...OUTPUT, category: "Rahasia" }));
    const { create, run } = setup([bad, bad]);
    const err = await errorOf(run());
    expect(err.code).toBe("invalid_output");
    expect(err.detail).toBeUndefined();
    expect(create).toHaveBeenCalledTimes(2);
  });

  test("konten dalam blok ```json dibaca", async () => {
    const { run } = setup([() => completion("```json\n" + JSON.stringify(OUTPUT) + "\n```")]);
    expect((await run()).data).toEqual(OUTPUT);
  });

  test("BadRequestError di percobaan 1 → percobaan 2 tanpa response_format", async () => {
    const { create, run } = setup([
      () => {
        throw badRequest();
      },
      valid,
    ]);
    expect((await run()).attempts).toBe(2);
    expect(bodyOf(create, 0).response_format).toBeDefined();
    expect(bodyOf(create, 1)).not.toHaveProperty("response_format");
    expect(bodyOf(create, 1).messages).toEqual(bodyOf(create, 0).messages);
  });

  test("timeout di percobaan 1 → timeout, tanpa percobaan kedua", async () => {
    const { create, run } = setup([
      () => {
        throw new APIConnectionTimeoutError();
      },
    ]);
    expect((await errorOf(run())).code).toBe("timeout");
    expect(create).toHaveBeenCalledTimes(1);
  });

  test("RateLimitError → rate_limited, tanpa percobaan kedua", async () => {
    const { create, run } = setup([
      () => {
        throw new RateLimitError(429, undefined, "slow down", new Headers());
      },
    ]);
    expect((await errorOf(run())).code).toBe("rate_limited");
    expect(create).toHaveBeenCalledTimes(1);
  });

  test("sisa < 1500 ms setelah output tidak valid → tanpa panggilan kedua, detail budget", async () => {
    const { create, run } = setup([() => completion("bukan json")], fakeDeadline([7000, 1499]));
    const err = await errorOf(run());
    expect(err.code).toBe("invalid_output");
    expect(err.detail).toBe("budget");
    expect(create).toHaveBeenCalledTimes(1);
  });

  test("sisa < 1500 ms setelah BadRequestError → provider_error 400, detail budget", async () => {
    const { create, run } = setup(
      [
        () => {
          throw badRequest();
        },
      ],
      fakeDeadline([7000, 1000]),
    );
    const err = await errorOf(run());
    expect(err.code).toBe("provider_error");
    expect(err.status).toBe(400);
    expect(err.detail).toBe("budget");
    expect(create).toHaveBeenCalledTimes(1);
  });

  test.each(["length", "content_filter"] as const)(
    "finish_reason %s dihitung tidak valid dan muncul sebagai detail",
    async (reason) => {
      const truncated = () => completion(JSON.stringify(OUTPUT), { finish_reason: reason });
      const { create, run } = setup([truncated, truncated]);
      const err = await errorOf(run());
      expect(err.code).toBe("invalid_output");
      expect(err.detail).toBe(reason);
      expect(create).toHaveBeenCalledTimes(2);
    },
  );

  test("finish_reason length lalu sisa anggaran habis → detail length", async () => {
    const { run } = setup([() => completion("{", { finish_reason: "length" })], fakeDeadline([7000, 100]));
    expect((await errorOf(run())).detail).toBe("length");
  });

  test("model respons disanitasi", async () => {
    const { run } = setup([() => completion(JSON.stringify(OUTPUT), { model: "evil\n" })]);
    expect((await run()).servedModel).toBe(MODEL);
  });

  test("setiap panggilan menerima signal deadline dan timeout = remainingMs() saat itu", async () => {
    const deadline = fakeDeadline([7000, 5000, 4900]);
    const { create, run } = setup([() => completion("x"), valid], deadline);
    await run();
    expect(optionsOf(create, 0)).toEqual({ signal: deadline.signal, timeout: 7000, maxRetries: 1 });
    expect(optionsOf(create, 1)).toEqual({ signal: deadline.signal, timeout: 4900, maxRetries: 1 });
  });
});

describe("extractJson", () => {
  test.each([
    ['{"a":1}', { a: 1 }],
    ['```json\n{"a":1}\n```', { a: 1 }],
    ['```\n{"a":1}\n```', { a: 1 }],
    ['Ini hasilnya: {"a":{"b":2}} semoga membantu', { a: { b: 2 } }],
  ])("%j", (content, expected) => {
    expect(extractJson(content)).toEqual(expected);
  });

  test.each([null, undefined, 42, "", "tanpa json", "{rusak"])("%j → undefined", (content) => {
    expect(extractJson(content)).toBeUndefined();
  });
});
