"use server";

import { revalidatePath } from "next/cache";
import { formValues, invalid, type FormState } from "@/lib/form-state";
import { categorySchema, walletSchema } from "@/lib/schemas/settings";
import { uuid } from "@/lib/schemas/fields";
import { requireClaims } from "@/server/auth/session";
import { isUniqueViolation } from "@/server/db/errors";
import {
  CategoryError,
  createCategory,
  deleteCategory,
  setCategoryArchived,
  updateCategory,
} from "@/server/services/categories";
import {
  WalletError,
  createWallet,
  deleteWallet,
  setDefaultWallet,
  setWalletArchived,
  updateWallet,
} from "@/server/services/wallets";

const SETTINGS_PATH = "/pengaturan";

function done(message: string): FormState {
  revalidatePath(SETTINGS_PATH);
  revalidatePath("/transaksi");
  return { ok: true, message };
}

function failure(error: unknown, duplicateMessage: string, values?: Record<string, string>): FormState {
  if (error instanceof WalletError || error instanceof CategoryError) return { ok: false, message: error.message, values };
  if (isUniqueViolation(error)) return { ok: false, fieldErrors: { name: [duplicateMessage] }, values };
  console.error(error);
  return { ok: false, message: "Terjadi kesalahan. Coba lagi.", values };
}

// --- Dompet -----------------------------------------------------------------

export async function saveWallet(_prev: FormState, formData: FormData): Promise<FormState> {
  const claims = await requireClaims();
  const values = formValues(formData);
  const parsed = walletSchema.safeParse(values);
  if (!parsed.success) return invalid(parsed.error, values);

  const id = formData.get("id");
  try {
    if (id) await updateWallet(claims, uuid.parse(id), parsed.data);
    else await createWallet(claims, parsed.data);
  } catch (error) {
    return failure(error, "Nama dompet sudah dipakai", values);
  }
  return done(id ? "Dompet diperbarui." : "Dompet ditambahkan.");
}

export async function makeDefaultWallet(id: string): Promise<FormState> {
  const claims = await requireClaims();
  try {
    await setDefaultWallet(claims, uuid.parse(id));
  } catch (error) {
    return failure(error, "");
  }
  return done("Dompet utama diganti.");
}

export async function archiveWallet(id: string, archived: boolean): Promise<FormState> {
  const claims = await requireClaims();
  try {
    await setWalletArchived(claims, uuid.parse(id), archived);
  } catch (error) {
    return failure(error, "Sudah ada dompet aktif dengan nama yang sama");
  }
  return done(archived ? "Dompet diarsipkan." : "Dompet diaktifkan kembali.");
}

export async function removeWallet(id: string): Promise<FormState> {
  const claims = await requireClaims();
  try {
    await deleteWallet(claims, uuid.parse(id));
  } catch (error) {
    return failure(error, "");
  }
  return done("Dompet dihapus.");
}

// --- Kategori ---------------------------------------------------------------

export async function saveCategory(_prev: FormState, formData: FormData): Promise<FormState> {
  const claims = await requireClaims();
  const values = formValues(formData);
  const parsed = categorySchema.safeParse(values);
  if (!parsed.success) return invalid(parsed.error, values);

  const id = formData.get("id");
  try {
    if (id) await updateCategory(claims, uuid.parse(id), parsed.data);
    else await createCategory(claims, parsed.data);
  } catch (error) {
    return failure(error, "Nama kategori sudah dipakai untuk jenis ini", values);
  }
  return done(id ? "Kategori diperbarui." : "Kategori ditambahkan.");
}

export async function archiveCategory(id: string, archived: boolean): Promise<FormState> {
  const claims = await requireClaims();
  try {
    await setCategoryArchived(claims, uuid.parse(id), archived);
  } catch (error) {
    return failure(error, "Sudah ada kategori aktif dengan nama yang sama");
  }
  return done(archived ? "Kategori diarsipkan." : "Kategori diaktifkan kembali.");
}

export async function removeCategory(id: string): Promise<FormState> {
  const claims = await requireClaims();
  try {
    await deleteCategory(claims, uuid.parse(id));
  } catch (error) {
    return failure(error, "");
  }
  return done("Kategori dihapus.");
}
