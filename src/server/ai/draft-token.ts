import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { DESCRIPTION_MAX, DRAFT_TTL_SECONDS } from "@/lib/ai/limits";
import { ENTRY_KINDS } from "@/lib/schemas/settings";
import { getDraftSecret } from "@/server/env";
import type { ParsedResult } from "./normalize";

// Draft token bertanda tangan HMAC (design §10.2): metadata AI hanya bisa sampai ke ai_extractions
// lewat token ini, jadi browser tidak bisa memalsukan parsed_result/confidence/model_version.

const MAX_TOKEN_LENGTH = 8 * 1024;
/** Toleransi jam server yang sedikit berbeda. */
const CLOCK_SKEW_SECONDS = 60;

const payloadSchema = z.strictObject({
  v: z.literal(1),
  sub: z.string().min(1),
  iat: z.number().int(),
  mode: z.literal("text"),
  raw: z.string().min(1).max(1000),
  parsed: z.strictObject({
    amount: z.number().int(),
    type: z.enum(ENTRY_KINDS),
    category: z.string().min(1),
    wallet: z.string().min(1),
    description: z.string().max(DESCRIPTION_MAX),
    occurred_at: z.iso.date(),
    confidence: z.number().min(0).max(1),
  }),
  ids: z.strictObject({ categoryId: z.string().min(1).nullable(), walletId: z.string().min(1) }),
  mv: z.string().regex(/^[\w.:\/@-]{1,120}$/),
  lat: z.number().int().min(0).max(600_000),
  conf: z.number().min(0).max(1),
});

export type VerifiedDraft = z.infer<typeof payloadSchema>;

export type DraftInput = {
  sub: string;
  raw: string;
  parsed: ParsedResult;
  ids: { categoryId: string | null; walletId: string };
  modelVersion: string;
  latencyMs: number;
  confidence: number;
};

export type DraftFailureReason = "draft_invalid" | "draft_expired" | "draft_wrong_user";
export type DraftVerification = { ok: true; draft: VerifiedDraft } | { ok: false; reason: DraftFailureReason };

const sign = (secret: string, payloadPart: string) => createHmac("sha256", secret).update(payloadPart).digest("base64url");
const nowSeconds = () => Math.floor(Date.now() / 1000);

/** Token `payload.sig` (base64url), atau null bila AI_DRAFT_SECRET tidak tersedia. */
export function signDraft(input: DraftInput): string | null {
  const secret = getDraftSecret();
  if (secret === null) return null;
  const payload: VerifiedDraft = {
    v: 1,
    sub: input.sub,
    iat: nowSeconds(),
    mode: "text",
    raw: input.raw,
    parsed: input.parsed,
    ids: input.ids,
    mv: input.modelVersion,
    lat: input.latencyMs,
    conf: input.confidence,
  };
  const payloadPart = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  return `${payloadPart}.${sign(secret, payloadPart)}`;
}

/** Verifikasi tanda tangan, isi, pemilik, dan umur token. Tidak pernah menghitung HMAC tanpa secret. */
export function verifyDraft(token: unknown, sub: string): DraftVerification {
  const invalid = { ok: false, reason: "draft_invalid" } as const;
  const secret = getDraftSecret();
  if (secret === null) return invalid;
  if (typeof token !== "string" || token.length === 0 || token.length > MAX_TOKEN_LENGTH) return invalid;

  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return invalid;
  const [payloadPart, sigPart] = parts;

  // Bandingkan string base64url kanonis (bukan hasil decode) supaya tanda tangan tidak "lentur".
  const expected = Buffer.from(sign(secret, payloadPart), "utf8");
  const provided = Buffer.from(sigPart, "utf8");
  if (provided.length !== expected.length || !timingSafeEqual(provided, expected)) return invalid;

  let json: unknown;
  try {
    json = JSON.parse(Buffer.from(payloadPart, "base64url").toString("utf8"));
  } catch {
    return invalid;
  }
  const parsed = payloadSchema.safeParse(json);
  if (!parsed.success) return invalid;
  const draft = parsed.data;

  if (draft.sub !== sub) return { ok: false, reason: "draft_wrong_user" };
  const now = nowSeconds();
  if (draft.iat > now + CLOCK_SKEW_SECONDS) return invalid;
  if (now - draft.iat > DRAFT_TTL_SECONDS) return { ok: false, reason: "draft_expired" };
  return { ok: true, draft };
}
