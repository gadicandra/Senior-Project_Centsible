import "server-only";
import { z } from "zod";
import { extractAmounts } from "@/lib/ai/amount";
import { DESCRIPTION_MAX, LOW_CONFIDENCE, PLAUSIBLE_MAX_AMOUNT } from "@/lib/ai/limits";
import { resolveRelativeDate, shiftDate } from "@/lib/ai/relative-date";
import type { AiFlags, AiProposal } from "@/lib/ai/types";
import { AiError, type ParsedTransaction, type UserAiContext } from ".";

// Validasi lanjutan dan normalisasi output AI menjadi usulan kartu (design §5.3, §5.4, §6, §7).

const MAX_AMOUNT = 1_000_000_000_000;
const MIN_DATE = "2020-01-01";
const isoDate = z.iso.date();

/** Kontrak `parsed_result` (database.md §10): usulan yang tampil di kartu setelah normalisasi (design §11). */
export type ParsedResult = {
  amount: number;
  type: "income" | "expense";
  category: string;
  wallet: string;
  description: string;
  occurred_at: string;
  confidence: number;
};

export type NormalizeResult = {
  proposal: AiProposal;
  flags: AiFlags;
  amountOptions?: number[];
  walletInferred: boolean;
  parsedResult: ParsedResult;
};

const lower = (s: string) => s.toLowerCase();

export function normalize(data: ParsedTransaction, ctx: UserAiContext, text: string): NormalizeResult {
  // 1. Clamp confidence dulu; nilai ini dipakai di semua langkah berikutnya.
  const confidence = Number.isFinite(data.confidence) ? Math.min(1, Math.max(0, data.confidence)) : 0;
  const flags: AiFlags = {};

  // 2. Nominal: tidak pernah diganti diam-diam, hanya diberi tanda.
  if (!Number.isFinite(data.amount) || data.amount <= 0 || data.amount > MAX_AMOUNT) {
    throw new AiError("invalid_output");
  }
  const extracted = extractAmounts(text);
  let amountOptions: number[] | undefined;
  if (extracted.ambiguous.length > 0) {
    flags.amount = "ambiguous";
    amountOptions = [...new Set(extracted.ambiguous.flatMap((a) => a.options))];
  } else if (extracted.candidates.length > 0 && !extracted.candidates.includes(data.amount)) {
    flags.amount = "mismatch";
  } else if (data.amount > PLAUSIBLE_MAX_AMOUNT) {
    flags.amount = "large";
  }

  // 3. Kategori: nama → ID berdasarkan (nama, jenis). ID hanya dari ctx (dimuat di bawah RLS).
  const name = lower(data.category);
  const category = ctx.categories.find((c) => c.kind === data.type && lower(c.name) === name);
  if (!category) flags.category = "mismatch";

  // 4. Dompet: null → dompet utama.
  const defaultWallet = ctx.wallets.find((w) => w.isDefault) ?? ctx.wallets[0];
  const aiWallet = data.wallet;
  const named = aiWallet === null ? undefined : ctx.wallets.find((w) => lower(w.name) === lower(aiWallet));
  const wallet = named ?? defaultWallet;
  if (!wallet) throw new AiError("not_configured", undefined, "empty_enum");
  const walletInferred = named === undefined;

  // 5. Keterangan: rapikan spasi dan batasi panjang (nilai sama untuk kartu dan parsed_result).
  const description = data.description.trim().replace(/\s+/g, " ").slice(0, DESCRIPTION_MAX);

  // 6. Tanggal.
  const today = ctx.today;
  const resolved = resolveRelativeDate(text, today, ctx.nowLocal);
  let occurredAt: string;
  if (!isoDate.safeParse(data.occurred_at).success) {
    occurredAt = resolved !== null && resolved !== "ambiguous" ? resolved : today;
    flags.occurredAt = "invalid";
  } else if (data.occurred_at > today) {
    occurredAt = today;
    flags.occurredAt = "future";
  } else if (data.occurred_at < MIN_DATE) {
    occurredAt = today;
    flags.occurredAt = "invalid";
  } else {
    occurredAt = data.occurred_at;
    if (resolved === "ambiguous") flags.occurredAt = "ambiguous";
    else if (resolved !== null && resolved !== occurredAt) flags.occurredAt = "mismatch";
    else if (occurredAt < shiftDate(today, -365)) flags.occurredAt = "old";
  }

  // 7. Confidence rendah → tandai field yang belum punya tanda yang lebih kuat.
  if (confidence < LOW_CONFIDENCE) {
    flags.amount ??= "low_confidence";
    flags.category ??= "low_confidence";
    flags.wallet ??= "low_confidence";
    flags.occurredAt ??= "low_confidence";
  }

  const proposal: AiProposal = {
    amount: data.amount,
    type: data.type,
    categoryId: category?.id ?? null,
    walletId: wallet.id,
    description,
    occurredAt,
    confidence,
  };
  const parsedResult: ParsedResult = {
    amount: data.amount,
    type: data.type,
    category: category?.name ?? data.category,
    wallet: wallet.name,
    description,
    occurred_at: occurredAt,
    confidence,
  };
  return { proposal, flags, ...(amountOptions ? { amountOptions } : {}), walletInferred, parsedResult };
}
