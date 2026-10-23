import "server-only";
import { AiError, type Deadline } from "..";

// Klasifikasi error SDK yang dipakai kedua provider (design §9.2). Pesan/isi error SDK
// tidak pernah disalin ke AiError, jadi tidak bisa bocor ke log atau respons.

type ErrorClass = abstract new (...args: never) => Error;

/** Kelas error dari satu SDK (`@anthropic-ai/sdk` atau `openai`). */
export type SdkErrorClasses = {
  /** AnthropicError / OpenAIError: induk semua error SDK. */
  BaseError: ErrorClass;
  APIError: ErrorClass;
  APIConnectionTimeoutError: ErrorClass;
  APIUserAbortError: ErrorClass;
  RateLimitError: ErrorClass;
};

/**
 * Error SDK → AiError. AiError diteruskan apa adanya; error lain yang bukan dari SDK dilempar ulang (→ 500).
 * Urutan penting: APIUserAbortError dan APIConnectionTimeoutError adalah turunan APIError.
 */
export function toAiError(sdk: SdkErrorClasses, err: unknown, deadline: Deadline): AiError {
  if (err instanceof AiError) return err;
  if (deadline.signal.aborted || err instanceof sdk.APIUserAbortError || err instanceof sdk.APIConnectionTimeoutError) {
    return new AiError("timeout");
  }
  if (err instanceof sdk.RateLimitError) return new AiError("rate_limited", 429);
  if (err instanceof sdk.APIError) {
    const status = (err as { status?: unknown }).status;
    return new AiError("provider_error", typeof status === "number" ? status : undefined);
  }
  // Error lokal SDK (mis. "Failed to parse structured output") = output tidak valid.
  if (err instanceof sdk.BaseError) return new AiError("invalid_output");
  throw err;
}

const MODEL_RE = /^[\w.:\/-]{1,100}$/;

/** Nama model dari respons provider, hanya bila karakternya aman; selain itu null. */
export function sanitizeModel(model: unknown): string | null {
  return typeof model === "string" && MODEL_RE.test(model) ? model : null;
}
