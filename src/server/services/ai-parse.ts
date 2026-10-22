import "server-only";
import { extractAmounts } from "@/lib/ai/amount";
import { AI_DEADLINE_MS, DESCRIPTION_MAX, NOT_UNDERSTOOD_CONFIDENCE } from "@/lib/ai/limits";
import { resolveRelativeDate } from "@/lib/ai/relative-date";
import type { AiPrefill, ParseErrorCode, ParseFailure, ParseSuccess } from "@/lib/ai/types";
import { todayIn } from "@/lib/dates";
import {
  AiError,
  buildModelVersion,
  createDeadline,
  getTextParser,
  type AiProviderId,
  type ParseOutcome,
  type TextParser,
  type UserAiContext,
} from "@/server/ai";
import { signDraft } from "@/server/ai/draft-token";
import { logAiEvent, type AiLogEvent, type AiLogLevel } from "@/server/ai/log";
import { normalize } from "@/server/ai/normalize";
import { PROMPT_VERSION } from "@/server/ai/prompt";
import { assertUsableContext } from "@/server/ai/schema";
import { pgCode } from "@/server/db/errors";
import { withRls, type JwtClaims, type RlsTx } from "@/server/db/with-rls";
import { getAiDailyLimit } from "@/server/env";

// Orkestrasi POST /api/ai/parse (design §9.3). Jalur ini TIDAK PERNAH menulis `transactions` (P1):
// satu-satunya penulisan adalah consume_ai_quota, sebelum panggilan LLM.

export type ParseResult =
  | { status: 200; body: ParseSuccess }
  | { status: number; body: ParseFailure };

const FALLBACK_TIMEZONE = "Asia/Jakarta";

const MESSAGES: Record<ParseErrorCode, string> = {
  forbidden_origin: "Permintaan ditolak.",
  unauthorized: "Sesi berakhir. Silakan masuk lagi.",
  unsupported_media_type: "Format permintaan tidak didukung.",
  payload_too_large: "Kalimat terlalu panjang.",
  invalid_body: "Permintaan tidak valid.",
  quota_exceeded:
    "Kuota AI harian kamu sudah habis. Catat lewat form manual dulu, ya — kuota direset tengah malam.",
  ai_unavailable: "Fitur AI sedang tidak tersedia. Silakan isi form manual.",
  ai_busy: "AI sedang sibuk. Silakan isi form manual.",
  ai_timeout: "AI terlalu lama merespons. Silakan isi form manual.",
  ai_invalid_output: "AI belum bisa membaca kalimat ini. Silakan isi form manual.",
  ai_not_understood:
    "Kalimat ini belum terbaca sebagai transaksi. Coba tulis nominal dan barangnya, atau isi form manual.",
  internal: "Terjadi kesalahan. Silakan isi form manual.",
};

/** Body gagal standar. `message` hanya boleh diganti dengan pesan milik kita sendiri (mis. pesan Zod kustom). */
export function parseFailure(code: ParseErrorCode, prefill?: AiPrefill, message = MESSAGES[code]): ParseFailure {
  return prefill ? { ok: false, error: { code, message }, prefill } : { ok: false, error: { code, message } };
}

/** Prefill form manual, HANYA dari kode deterministik (bukan output provider). */
export function buildPrefill(text: string, ctx: UserAiContext | null): AiPrefill {
  const prefill: AiPrefill = { description: text.slice(0, DESCRIPTION_MAX).trim() };
  const { candidates, ambiguous } = extractAmounts(text);
  if (candidates.length === 1 && ambiguous.length === 0) prefill.amount = candidates[0];
  if (ctx) {
    const date = resolveRelativeDate(text, ctx.today, ctx.nowLocal);
    if (date !== null && date !== "ambiguous") prefill.occurredAt = date;
  }
  return prefill;
}

function validTimezone(timeZone: string): string {
  try {
    new Intl.DateTimeFormat(undefined, { timeZone });
    return timeZone;
  } catch {
    return FALLBACK_TIMEZONE;
  }
}

/** Kategori/dompet aktif dan zona waktu pengguna, dibaca di bawah RLS. */
async function loadAiContext(tx: RlsTx, userId: string): Promise<UserAiContext> {
  const categories = await tx.category.findMany({
    where: { isArchived: false },
    select: { id: true, name: true, kind: true },
    orderBy: [{ kind: "asc" }, { name: "asc" }],
  });
  const wallets = await tx.wallet.findMany({
    where: { isArchived: false },
    select: { id: true, name: true, isDefault: true },
    orderBy: [{ isDefault: "desc" }, { name: "asc" }],
  });
  const user = await tx.user.findUnique({ where: { id: userId }, select: { timezone: true } });
  const timezone = validTimezone(user?.timezone ?? FALLBACK_TIMEZONE);
  const now = new Date();
  const nowLocal = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(now);
  return { today: todayIn(timezone, now), nowLocal, timezone, categories, wallets };
}

type FailureLog = { code: string; level: AiLogLevel; status?: number; stop_reason?: AiLogEvent["stop_reason"] };

const STOP_REASONS = new Set<AiError["detail"]>(["refusal", "max_tokens", "length", "content_filter", "budget"]);

let envNotConfiguredWarned = false;

/** AiError → HTTP + kode respons + log (tabel design §9.2). */
function mapAiError(err: AiError): { status: number; code: ParseErrorCode; log: FailureLog } {
  // Hanya nilai enum SDK yang tetap (tanpa PII) yang dicatat sebagai stop_reason (§13).
  const stop_reason = STOP_REASONS.has(err.detail) ? (err.detail as AiLogEvent["stop_reason"]) : undefined;
  switch (err.code) {
    case "not_configured": {
      if (err.detail === "empty_enum") {
        return { status: 503, code: "ai_unavailable", log: { code: "empty_enum", level: "error" } };
      }
      // Env yang hilang/tidak valid sudah dicatat env.ts; di sini cukup warn sekali per proses.
      const level: AiLogLevel = envNotConfiguredWarned ? "info" : "warn";
      envNotConfiguredWarned = true;
      return { status: 503, code: "ai_unavailable", log: { code: err.detail ?? "not_configured", level } };
    }
    case "rate_limited":
      return { status: 503, code: "ai_busy", log: { code: err.code, level: "warn", status: err.status } };
    case "provider_error": {
      // 400/401/403/404 = salah konfigurasi kita sendiri.
      const ours = err.status !== undefined && [400, 401, 403, 404].includes(err.status);
      return {
        status: 503,
        code: "ai_unavailable",
        log: { code: err.code, level: ours ? "error" : "warn", status: err.status, stop_reason },
      };
    }
    case "timeout":
      return { status: 504, code: "ai_timeout", log: { code: err.code, level: "warn" } };
    case "invalid_output":
      return { status: 502, code: "ai_invalid_output", log: { code: err.code, level: "warn", stop_reason } };
  }
}

type LogMeta = { provider?: AiProviderId; model?: string; latency_ms?: number; attempts?: number };

function fail(
  status: number,
  code: ParseErrorCode,
  log: FailureLog,
  prefill: AiPrefill | undefined,
  meta: LogMeta = {},
): ParseResult {
  // Setiap parse yang tidak "ok" menghasilkan satu event ai_fallback (metrik rasio fallback).
  logAiEvent(
    {
      evt: "ai_fallback",
      outcome: code,
      code: log.code,
      ...meta,
      prompt: PROMPT_VERSION,
      status: log.status,
      stop_reason: log.stop_reason,
    },
    log.level,
  );
  return { status, body: parseFailure(code, prefill) };
}

/** Error tak terduga (bug, DB mati): hanya nama/kode yang dicatat, tidak pernah pesan atau stack. */
function internalFailure(err: unknown, prefill: AiPrefill, meta: LogMeta = {}): ParseResult {
  const code = pgCode(err) ?? (err instanceof Error ? err.name : "unknown");
  return fail(500, "internal", { code, level: "error" }, prefill, meta);
}

function failFromError(err: unknown, prefill: AiPrefill, meta: LogMeta = {}): ParseResult {
  if (!(err instanceof AiError)) return internalFailure(err, prefill, meta);
  const mapped = mapAiError(err);
  return fail(mapped.status, mapped.code, mapped.log, prefill, meta);
}

export async function parseTransactionText(
  claims: JwtClaims,
  text: string,
  clientSignal: AbortSignal,
): Promise<ParseResult> {
  // 1. Selector dulu: AI mati → gagal tanpa memakai kuota.
  let parser: TextParser;
  try {
    parser = getTextParser();
  } catch (err) {
    return failFromError(err, buildPrefill(text, null));
  }

  // 2. Satu transaksi RLS: konteks dibaca dan dicek, lalu kuota dipakai. Commit sebelum LLM dipanggil,
  //    jadi tidak ada koneksi DB yang ditahan selama ≤ 8 dtk dan kuota tetap terpakai bila AI gagal.
  const limit = getAiDailyLimit();
  // Objek holder, bukan `let`: analisis alur TS mengabaikan assignment di dalam callback.
  const loadedCtx: { value: UserAiContext | null } = { value: null };
  try {
    await withRls(claims, async (tx) => {
      const loaded = await loadAiContext(tx, claims.sub);
      assertUsableContext(loaded); // melempar sebelum kuota → rollback, tidak ada yang terpakai
      loadedCtx.value = loaded;
      await tx.$queryRaw`select public.consume_ai_quota('parse', ${limit}::int) as remaining`;
    });
  } catch (err) {
    const prefill = buildPrefill(text, loadedCtx.value);
    if (err instanceof AiError) return failFromError(err, prefill);
    switch (pgCode(err)) {
      case "53400":
        return fail(429, "quota_exceeded", { code: "quota_exceeded", level: "info" }, prefill);
      case "28000":
        return fail(401, "unauthorized", { code: "no_profile", level: "warn" }, undefined);
      case "22023":
        // consume_ai_quota mengevaluasi zona waktu tersimpan; nilai tidak valid memunculkan 22023.
        return fail(503, "ai_unavailable", { code: "invalid_timezone", level: "error" }, prefill);
      default:
        return internalFailure(err, prefill);
    }
  }
  const ctx = loadedCtx.value!; // non-null: semua jalur gagal di atas sudah return

  // 3–7. Panggil provider di bawah deadline 8 dtk, normalisasi, tanda tangani draft.
  const meta: LogMeta = { provider: parser.provider, model: parser.model };
  const prefill = () => buildPrefill(text, ctx);
  try {
    const started = performance.now();
    const deadline = createDeadline(AI_DEADLINE_MS, clientSignal);
    let outcome: ParseOutcome;
    try {
      outcome = await parser.parse(text, ctx, deadline);
    } finally {
      deadline.dispose();
    }
    const latencyMs = Math.round(performance.now() - started);
    const okMeta: LogMeta = { ...meta, model: outcome.servedModel, latency_ms: latencyMs, attempts: outcome.attempts };

    const result = normalize(outcome.data, ctx, text);
    const { proposal } = result;
    if (proposal.confidence < NOT_UNDERSTOOD_CONFIDENCE) {
      return fail(422, "ai_not_understood", { code: "low_confidence", level: "info" }, prefill(), okMeta);
    }

    const draft = signDraft({
      sub: claims.sub,
      raw: text,
      parsed: result.parsedResult,
      ids: { categoryId: proposal.categoryId, walletId: proposal.walletId },
      modelVersion: buildModelVersion(parser.provider, outcome.servedModel),
      latencyMs,
      confidence: proposal.confidence,
    });
    if (draft === null) {
      return fail(503, "ai_unavailable", { code: "draft_secret_missing", level: "error" }, prefill(), okMeta);
    }

    logAiEvent({ evt: "ai_parse", outcome: "ok", ...okMeta, prompt: PROMPT_VERSION, flags: Object.keys(result.flags) });
    const body: ParseSuccess = {
      ok: true,
      proposal,
      flags: result.flags,
      ...(result.amountOptions ? { amountOptions: result.amountOptions } : {}),
      walletInferred: result.walletInferred,
      draft,
    };
    return { status: 200, body };
  } catch (err) {
    return failFromError(err, prefill(), meta);
  }
}
