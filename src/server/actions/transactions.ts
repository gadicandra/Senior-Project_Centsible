"use server";

import { revalidatePath } from "next/cache";
import { todayIn } from "@/lib/dates";
import { formValues, invalid, type FormState } from "@/lib/form-state";
import { uuid } from "@/lib/schemas/fields";
import { transactionSchema } from "@/lib/schemas/transaction";
import { requireClaims } from "@/server/auth/session";
import { getTimezone } from "@/server/services/profile";
import {
  TransactionError,
  createTransaction,
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
