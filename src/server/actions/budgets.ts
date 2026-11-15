"use server";

import { revalidatePath } from "next/cache";
import { todayIn } from "@/lib/dates";
import { formValues, invalid, type FormState } from "@/lib/form-state";
import { BUDGET_NOT_FOUND, budgetCreateSchema, budgetUpdateSchema } from "@/lib/schemas/budget";
import { uuid } from "@/lib/schemas/fields";
import { requireClaims } from "@/server/auth/session";
import { isUniqueViolation } from "@/server/db/errors";
import { BudgetError, createBudget, deleteBudget, duplicateMessage, updateBudgetLimit } from "@/server/services/budgets";
import { getTimezone } from "@/server/services/profile";

const SAVE_FAILED = "Gagal menyimpan anggaran. Coba lagi.";

function done(message: string): FormState {
  revalidatePath("/anggaran");
  revalidatePath("/");
  return { ok: true, message };
}

function failure(error: unknown, fallback: string, values?: Record<string, string>): FormState {
  if (error instanceof BudgetError) {
    return error.field
      ? { ok: false, fieldErrors: { [error.field]: [error.message] }, values }
      : { ok: false, message: error.message, values };
  }
  console.error(error);
  return { ok: false, message: fallback, values };
}

export async function saveBudget(_prev: FormState, formData: FormData): Promise<FormState> {
  const claims = await requireClaims();
  const values = formValues(formData);
  const rawId = formData.get("id");

  if (rawId) {
    const id = uuid.safeParse(rawId);
    if (!id.success) return { ok: false, message: BUDGET_NOT_FOUND, values };
    const parsed = budgetUpdateSchema.safeParse(values);
    if (!parsed.success) return invalid(parsed.error, values);
    try {
      await updateBudgetLimit(claims, id.data, parsed.data.amountLimit);
    } catch (error) {
      // Kartu basi (dihapus di tab lain): segarkan daftar supaya kartunya hilang.
      if (error instanceof BudgetError && error.message === BUDGET_NOT_FOUND) revalidatePath("/anggaran");
      return failure(error, SAVE_FAILED, values);
    }
    return done("Anggaran diperbarui.");
  }

  const parsed = budgetCreateSchema.safeParse(values);
  if (!parsed.success) return invalid(parsed.error, values);
  try {
    // getTimezone membuka withRls sendiri; kegagalannya harus jadi SAVE_FAILED, bukan error.tsx.
    const today = todayIn(await getTimezone(claims));
    await createBudget(claims, parsed.data, today);
  } catch (error) {
    if (isUniqueViolation(error)) {
      return { ok: false, fieldErrors: { categoryId: [duplicateMessage(parsed.data.period)] }, values };
    }
    return failure(error, SAVE_FAILED, values);
  }
  return done("Anggaran ditambahkan.");
}

export async function removeBudget(id: string): Promise<FormState> {
  const claims = await requireClaims();
  const parsed = uuid.safeParse(id);
  if (!parsed.success) return { ok: false, message: BUDGET_NOT_FOUND };
  try {
    await deleteBudget(claims, parsed.data);
  } catch (error) {
    revalidatePath("/anggaran");
    return failure(error, "Gagal menghapus anggaran. Coba lagi.");
  }
  return done("Anggaran dihapus.");
}
