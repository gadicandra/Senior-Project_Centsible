import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import {
  AnthropicError,
  APIConnectionTimeoutError,
  APIError,
  APIUserAbortError,
  RateLimitError,
} from "@anthropic-ai/sdk";
import { jsonSchemaOutputFormat } from "@anthropic-ai/sdk/helpers/json-schema";
import { AiError, type TextParser } from "..";
import { STATIC_SYSTEM_PROMPT, contextBlock, wrapUserText } from "../prompt";
import { buildWireJsonSchema, validateWire } from "../schema";
import { sanitizeModel, toAiError, type SdkErrorClasses } from "./errors";

// Provider Anthropic resmi dengan Structured Outputs (design §4.2).

const SDK_ERRORS: SdkErrorClasses = {
  BaseError: AnthropicError,
  APIError,
  APIConnectionTimeoutError,
  APIUserAbortError,
  RateLimitError,
};

/** Bagian klien yang dipakai; test menyuntikkan objek palsu. */
export type AnthropicClient = { messages: Pick<Anthropic["messages"], "parse"> };

export function anthropicParser({ client, model }: { client: AnthropicClient; model: string }): TextParser {
  return {
    provider: "anthropic",
    model,
    async parse(input, ctx, deadline) {
      let message;
      try {
        message = await client.messages.parse(
          {
            model,
            // Tanpa `temperature` (tidak ada di 1.1.0) dan tanpa `thinking`: AI_TEXT_MODEL wajib model non-thinking.
            max_tokens: 400,
            system: [
              // Statis → bisa di-cache (mungkin di bawah batas minimum cache; tidak diandalkan).
              { type: "text", text: STATIC_SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
              { type: "text", text: contextBlock(ctx) },
            ],
            messages: [{ role: "user", content: wrapUserText(input) }],
            output_config: {
              // transform:false: transform bawaan 1.1.0 memindahkan `enum` ke description (design §2.1-2).
              // `as never`: skema dibangun saat runtime, FromSchema tidak bisa menginferensinya.
              format: jsonSchemaOutputFormat(buildWireJsonSchema(ctx) as never, { transform: false }),
            },
          },
          { signal: deadline.signal, timeout: deadline.remainingMs(), maxRetries: 1 },
        );
      } catch (err) {
        throw toAiError(SDK_ERRORS, err, deadline);
      }
      if (message.stop_reason === "refusal" || message.stop_reason === "max_tokens") {
        throw new AiError("invalid_output", undefined, message.stop_reason);
      }
      // Tidak ada retry untuk output tidak valid: grammar sudah membatasi, pelanggaran = penolakan/pemotongan.
      const data = validateWire(message.parsed_output as unknown, ctx);
      return { data, servedModel: sanitizeModel(message.model) ?? model, attempts: 1 };
    },
  };
}
