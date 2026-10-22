// Kontrak respons POST /api/ai/parse (design §9.2). Aman untuk klien.

export type AiEntryType = "income" | "expense";

export type AiProposal = {
  amount: number;
  type: AiEntryType;
  categoryId: string | null;
  walletId: string;
  description: string;
  occurredAt: string;
  confidence: number;
};

export type AiFlags = {
  amount?: "ambiguous" | "mismatch" | "large" | "low_confidence";
  category?: "mismatch" | "low_confidence";
  wallet?: "low_confidence";
  occurredAt?: "future" | "invalid" | "old" | "mismatch" | "ambiguous" | "low_confidence";
};

export type ParseSuccess = {
  ok: true;
  proposal: AiProposal;
  flags: AiFlags;
  /** Hanya untuk flags.amount === "ambiguous". */
  amountOptions?: number[];
  /** true = AI tidak menyebut dompet → dompet utama dipakai. */
  walletInferred: boolean;
  /** Token bertanda tangan server (opaque bagi klien). */
  draft: string;
};

export type ParseErrorCode =
  | "forbidden_origin"
  | "unauthorized"
  | "unsupported_media_type"
  | "payload_too_large"
  | "invalid_body"
  | "quota_exceeded"
  | "ai_unavailable"
  | "ai_busy"
  | "ai_timeout"
  | "ai_invalid_output"
  | "ai_not_understood"
  | "internal";

/** Isian awal form manual; hanya dari kode deterministik, bukan dari output AI. */
export type AiPrefill = {
  description: string;
  amount?: number;
  occurredAt?: string;
  type?: AiEntryType;
};

export type ParseFailure = {
  ok: false;
  error: { code: ParseErrorCode; message: string };
  prefill?: AiPrefill;
};
