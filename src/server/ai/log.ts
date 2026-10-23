import "server-only";
import type { AiProviderId, AiStopReason } from ".";

// Logger terstruktur jalur AI (design §13). Hanya kunci di ALLOWED yang ditulis; tidak pernah
// teks mentah, deskripsi, nominal, nama kategori/dompet, ID/email pengguna, isi error provider,
// pesan Zod, atau stack trace.

export type AiLogEvent = {
  evt: "ai_parse" | "ai_fallback" | "ai_save";
  outcome: string;
  code?: string;
  provider?: AiProviderId;
  model?: string;
  prompt?: string;
  latency_ms?: number;
  attempts?: number;
  status?: number;
  stop_reason?: AiStopReason | "budget";
  flags?: string[];
};

export type AiLogLevel = "info" | "warn" | "error";

const ALLOWED = [
  "evt",
  "outcome",
  "code",
  "provider",
  "model",
  "prompt",
  "latency_ms",
  "attempts",
  "status",
  "stop_reason",
  "flags",
] as const satisfies readonly (keyof AiLogEvent)[];

export function logAiEvent(event: AiLogEvent, level: AiLogLevel = "info"): void {
  // Salin hanya kunci yang diizinkan, supaya objek yang dibangun longgar tetap aman.
  const out: Record<string, unknown> = {};
  for (const key of ALLOWED) if (event[key] !== undefined) out[key] = event[key];
  console[level](JSON.stringify(out));
}
