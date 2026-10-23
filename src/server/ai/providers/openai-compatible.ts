import "server-only";
import {
  APIConnectionTimeoutError,
  APIError,
  APIUserAbortError,
  BadRequestError,
  OpenAIError,
  RateLimitError,
} from "openai";
import type OpenAI from "openai";
import type { ChatCompletion, ChatCompletionCreateParamsNonStreaming } from "openai/resources/chat/completions";
import { AiError, type AiStopReason, type Deadline, type TextParser, type UserAiContext } from "..";
import { STATIC_SYSTEM_PROMPT, contextBlock, jsonOnlyInstruction, wrapUserText } from "../prompt";
import { buildWireJsonSchema, validateWire } from "../schema";
import { sanitizeModel, toAiError, type SdkErrorClasses } from "./errors";

// Provider OpenAI-compatible (mis. 9router): validasi Zod sendiri, maksimal 2 panggilan model (design §4.3).

const SDK_ERRORS: SdkErrorClasses = {
  BaseError: OpenAIError,
  APIError,
  APIConnectionTimeoutError,
  APIUserAbortError,
  RateLimitError,
};

/** Sisa anggaran minimum agar percobaan kedua masih masuk akal. */
const SECOND_ATTEMPT_MIN_MS = 1500;

// `openai/internal/*` tidak diekspor paket; ambil tipe opsi dari signature create().
type RequestOptions = NonNullable<Parameters<OpenAI["chat"]["completions"]["create"]>[1]>;

/** Bagian klien yang dipakai; test menyuntikkan objek palsu. */
export type OpenAiCompatClient = {
  chat: {
    completions: {
      create(body: ChatCompletionCreateParamsNonStreaming, options?: RequestOptions): PromiseLike<ChatCompletion>;
    };
  };
};

type ReadResult =
  | { ok: true; data: ReturnType<typeof validateWire> }
  | { ok: false; finish?: Extract<AiStopReason, "length" | "content_filter"> };

/**
 * JSON dari isi pesan: objek polos, satu blok ```json, atau substring dari `{` pertama sampai `}` terakhir.
 * `undefined` bila tidak bisa dibaca.
 */
export function extractJson(content: unknown): unknown {
  if (typeof content !== "string") return undefined;
  const text = content.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(text);
  const candidates = [text, fenced?.[1]];
  const first = text.indexOf("{");
  const last = text.lastIndexOf("}");
  if (first !== -1 && last > first) candidates.push(text.slice(first, last + 1));
  for (const candidate of candidates) {
    if (candidate === undefined) continue;
    try {
      return JSON.parse(candidate);
    } catch {
      // coba kandidat berikutnya
    }
  }
  return undefined;
}

function readCompletion(res: ChatCompletion, ctx: UserAiContext): ReadResult {
  const choice = res.choices?.[0];
  const reason = choice?.finish_reason;
  if (reason === "length" || reason === "content_filter") return { ok: false, finish: reason };
  try {
    return { ok: true, data: validateWire(extractJson(choice?.message?.content), ctx) };
  } catch (err) {
    if (err instanceof AiError) return { ok: false };
    throw err;
  }
}

export function openAiCompatParser({ client, model }: { client: OpenAiCompatClient; model: string }): TextParser {
  return {
    provider: "openai-compatible",
    model,
    async parse(input, ctx, deadline: Deadline) {
      const schema = buildWireJsonSchema(ctx);
      const plain: ChatCompletionCreateParamsNonStreaming = {
        model,
        temperature: 0,
        // max_tokens (bukan max_completion_tokens) karena lebih luas didukung gateway.
        max_tokens: 400,
        messages: [
          {
            role: "system",
            content: `${STATIC_SYSTEM_PROMPT}\n\n${contextBlock(ctx)}\n\n${jsonOnlyInstruction(schema)}`,
          },
          { role: "user", content: wrapUserText(input) },
        ],
      };
      const structured: ChatCompletionCreateParamsNonStreaming = {
        ...plain,
        response_format: {
          type: "json_schema",
          json_schema: { name: "centsible_transaction", strict: true, schema },
        },
      };
      const call = (body: ChatCompletionCreateParamsNonStreaming) =>
        client.chat.completions.create(body, {
          signal: deadline.signal,
          timeout: deadline.remainingMs(),
          maxRetries: 1,
        });
      const served = (res: ChatCompletion) => sanitizeModel(res.model) ?? model;

      // Percobaan 1: dengan response_format json_schema.
      let retryBody = structured;
      let badRequest = false;
      let finish: Extract<AiStopReason, "length" | "content_filter"> | undefined;
      try {
        const res = await call(structured);
        const read = readCompletion(res, ctx);
        if (read.ok) return { data: read.data, servedModel: served(res), attempts: 1 };
        finish = read.finish;
      } catch (err) {
        // 400 = gateway/upstream tidak mendukung json_schema → ulangi tanpa response_format.
        if (!(err instanceof BadRequestError) || deadline.signal.aborted) throw toAiError(SDK_ERRORS, err, deadline);
        badRequest = true;
        retryBody = plain;
      }

      if (deadline.remainingMs() < SECOND_ATTEMPT_MIN_MS) {
        if (badRequest) throw new AiError("provider_error", 400, "budget");
        throw new AiError("invalid_output", undefined, finish ?? "budget");
      }

      // Percobaan 2 (terakhir).
      try {
        const res = await call(retryBody);
        const read = readCompletion(res, ctx);
        if (read.ok) return { data: read.data, servedModel: served(res), attempts: 2 };
        throw new AiError("invalid_output", undefined, read.finish);
      } catch (err) {
        throw toAiError(SDK_ERRORS, err, deadline);
      }
    },
  };
}
