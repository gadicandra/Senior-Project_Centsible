"use server";

import { revalidatePath } from "next/cache";
import { todayIn } from "@/lib/dates";
import { formValues, invalid, type FormState } from "@/lib/form-state";
import { uuid } from "@/lib/schemas/fields";
import { transactionSchema } from "@/lib/schemas/transaction";
import { verifyDraft } from "@/server/ai/draft-token";
import { logAiEvent } from "@/server/ai/log";
import { requireClaims } from "@/server/auth/session";
import { pgCode } from "@/server/db/errors";
import { getTimezone } from "@/server/services/profile";
import {
  TransactionError,
  createTransaction,
  createTransactionFromAi,
  deleteTransaction,
  updateTransaction,
} from "@/server/services/transactions";

function revalidate() {
  // Saldo dompet & ringkasan ikut berubah.
  revalidatePath("/transaksi");
  revalidatePath("/pengaturan");
  revalidatePath("/");
}

export async function saveTransaction(_prev: FormState, formData: FormData): Promise<FormState> {
  const claims = await requireClaims();
  const values = formValues(formData);
  const today = todayIn(await getTimezone(claims));
  const parsed = transactionSchema(today).safeParse(values);
  if (!parsed.success) return invalid(parsed.error, values);

  const id = formData.get("id");
  try {
    if (id) await updateTransaction(claims, uuid.parse(id), parsed.data);
    else await createTransaction(claims, parsed.data);
  } catch (error) {
    if (error instanceof TransactionError) {
      return error.field
        ? { ok: false, fieldErrors: { [error.field]: [error.message] }, values }
        : { ok: false, message: error.message, values };
    }
    console.error(error);
    return { ok: false, message: "Gagal menyimpan transaksi. Coba lagi.", values };
  }
  revalidate();
  return { ok: true, message: id ? "Transaksi diperbarui." : "Transaksi disimpan." };
}

const DRAFT_REJECTED =
  "Usulan AI sudah kedaluwarsa atau tidak valid. Kirim ulang kalimatnya, atau simpan lewat form manual.";

/**
 * Simpan dari kartu konfirmasi AI (design §10.1). Skema sama dengan form manual; metadata AI
 * (source, raw_input, parsed_result, confidence, model_version, latency_ms) hanya diambil dari
 * draft bertanda tangan, tidak pernah dari field form.
 */
export async function saveAiTransaction(_prev: FormState, formData: FormData): Promise<FormState> {
  const claims = await requireClaims();
  // Token draft tidak pernah dikembalikan ke klien lewat `values`.
  const values = formValues(formData, ["draft"]);
  const today = todayIn(await getTimezone(claims));
  const parsed = transactionSchema(today).safeParse(values);
  if (!parsed.success) return invalid(parsed.error, values);

  const verification = verifyDraft(formData.get("draft"), claims.sub);
  if (!verification.ok) {
    logAiEvent({ evt: "ai_save", outcome: "rejected", code: verification.reason }, "warn");
    return { ok: false, message: DRAFT_REJECTED, values };
  }

  try {
    // parsed.data hanya berisi kunci TransactionInput: field form palsu sudah dibuang Zod.
    await createTransactionFromAi(claims, parsed.data, verification.draft);
  } catch (error) {
    if (error instanceof TransactionError) {
      return error.field
        ? { ok: false, fieldErrors: { [error.field]: [error.message] }, values }
        : { ok: false, message: error.message, values };
    }
    // Hanya nama/kode error: pesan Prisma bisa memuat nilai yang dikirim.
    logAiEvent({ evt: "ai_save", outcome: "error", code: pgCode(error) ?? errorName(error) }, "error");
    return { ok: false, message: "Gagal menyimpan transaksi. Coba lagi.", values };
  }
  logAiEvent({ evt: "ai_save", outcome: "ok" });
  revalidate();
  return { ok: true, message: "Transaksi disimpan." };
}

function errorName(error: unknown): string {
  return error instanceof Error ? error.name : "unknown";
}

export async function removeTransaction(id: string): Promise<FormState> {
  const claims = await requireClaims();
  try {
    await deleteTransaction(claims, uuid.parse(id));
  } catch (error) {
    if (error instanceof TransactionError) return { ok: false, message: error.message };
    console.error(error);
    return { ok: false, message: "Gagal menghapus transaksi." };
  }
  revalidate();
  return { ok: true, message: "Transaksi dihapus." };
}
