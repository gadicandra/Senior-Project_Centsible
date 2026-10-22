import "server-only";
import { MODEL_VERSION_MAX } from "@/lib/ai/limits";
import { PROMPT_VERSION } from "./prompt";

// Kontrak inti TextParser (design §4.1). Selector provider (getTextParser) ditambahkan di #25.

export type AiProviderId = "anthropic" | "openai-compatible" | "azure";

export type UserAiContext = {
  /** YYYY-MM-DD di zona waktu pengguna. */
  today: string;
  /** HH:mm di zona waktu pengguna (untuk "tadi pagi" / "semalam"). */
  nowLocal: string;
  /** Nama IANA yang sudah divalidasi (fallback Asia/Jakarta). */
  timezone: string;
  /** Hanya yang aktif. */
  categories: { id: string; name: string; kind: "income" | "expense" }[];
  /** Hanya yang aktif. */
  wallets: { id: string; name: string; isDefault: boolean }[];
};

/** Output wire setelah validasi skema + kanonikalisasi huruf (nama, bukan ID). */
export type ParsedTransaction = {
  amount: number;
  type: "income" | "expense";
  category: string;
  wallet: string | null;
  description: string;
  occurred_at: string;
  confidence: number;
};

export type ParseOutcome = { data: ParsedTransaction; servedModel: string; attempts: number };

/** Satu anggaran waktu bersama untuk semua panggilan SDK dalam satu parse. */
export type Deadline = { readonly signal: AbortSignal; remainingMs(): number; dispose(): void };

/** Satu-satunya sumber deadline (design §4.4). `now` bisa disuntik untuk test. */
export function createDeadline(ms: number, clientSignal?: AbortSignal, now = () => performance.now()): Deadline {
  const controller = new AbortController();
  const start = now();
  const abort = () => controller.abort(new AiError("timeout"));
  const timer = setTimeout(abort, ms);
  if (clientSignal?.aborted) abort();
  else clientSignal?.addEventListener("abort", abort, { once: true });
  const dispose = () => {
    clearTimeout(timer);
    clientSignal?.removeEventListener("abort", abort);
  };
  return { signal: controller.signal, remainingMs: () => Math.max(0, Math.round(ms - (now() - start))), dispose };
}

export interface TextParser {
  readonly provider: AiProviderId;
  readonly model: string;
  /** Melempar AiError. */
  parse(input: string, ctx: UserAiContext, deadline: Deadline): Promise<ParseOutcome>;
}

/** `<provider>:<model>@<prompt>`, selalu ≤ MODEL_VERSION_MAX (= ai_extractions_model_chk). */
export function buildModelVersion(provider: AiProviderId, servedModel: string): string {
  const prefix = `${provider}:`;
  const suffix = `@${PROMPT_VERSION}`;
  const model = servedModel.slice(0, MODEL_VERSION_MAX - prefix.length - suffix.length);
  return `${prefix}${model}${suffix}`;
}

export type AiErrorCode = "not_configured" | "timeout" | "rate_limited" | "provider_error" | "invalid_output";
/** Hanya nilai enum SDK yang tetap (tanpa PII); dicatat sebagai `stop_reason` (§13). */
export type AiStopReason = "refusal" | "max_tokens" | "length" | "content_filter";
export type AiErrorDetail = "empty_enum" | "env" | "azure" | "budget" | AiStopReason;

export class AiError extends Error {
  constructor(
    readonly code: AiErrorCode,
    readonly status?: number,
    readonly detail?: AiErrorDetail,
  ) {
    super(code);
  }
}
