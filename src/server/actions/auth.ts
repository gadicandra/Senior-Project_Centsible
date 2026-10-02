"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { formValues, invalid, type FormState } from "@/lib/form-state";
import {
  deleteAccountSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  updatePasswordSchema,
} from "@/lib/schemas/auth";
import { requestOrigin, safeNext } from "@/server/auth/origin";
import { requireClaims } from "@/server/auth/session";
import { createAdminClient } from "@/server/supabase/admin";
import { createClient } from "@/server/supabase/server";

const SECRET_FIELDS = ["password", "confirmPassword"];

export async function signIn(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, SECRET_FIELDS);
  const parsed = signInSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, values);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) {
    const message =
      error.code === "email_not_confirmed"
        ? "Email belum dikonfirmasi. Cek kotak masuk Anda."
        : "Email atau kata sandi salah.";
    return { ok: false, message, values };
  }

  revalidatePath("/", "layout");
  redirect(safeNext(formData.get("next") as string | null));
}

export async function signUp(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData, SECRET_FIELDS);
  const parsed = signUpSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, values);

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      // Dibaca trigger handle_new_user() untuk mengisi public.users.
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${await requestOrigin()}/auth/confirm?next=/`,
    },
  });
  if (error) {
    const message =
      error.code === "weak_password"
        ? "Kata sandi terlalu lemah."
        : error.code === "user_already_exists"
          ? "Email sudah terdaftar. Silakan masuk."
          : "Pendaftaran gagal. Coba lagi.";
    return { ok: false, message, values };
  }

  // Konfirmasi email aktif → belum ada sesi; minta pengguna cek email.
  if (!data.session) {
    return { ok: true, message: "Cek email Anda untuk mengonfirmasi akun, lalu masuk." };
  }
  revalidatePath("/", "layout");
  redirect("/");
}

export async function signInWithGoogle(formData: FormData) {
  const next = safeNext(formData.get("next") as string | null);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${await requestOrigin()}/auth/callback?next=${encodeURIComponent(next)}` },
  });
  if (error || !data.url) redirect("/login?error=oauth");
  redirect(data.url);
}

export async function requestPasswordReset(_prev: FormState, formData: FormData): Promise<FormState> {
  const values = formValues(formData);
  const parsed = resetPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error, values);

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${await requestOrigin()}/auth/confirm?next=/update-password`,
  });
  // Pesan sama apa pun hasilnya, supaya tidak membocorkan email mana yang terdaftar.
  return { ok: true, message: "Jika email terdaftar, tautan atur ulang kata sandi sudah dikirim." };
}

export async function updatePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireClaims();
  const parsed = updatePasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);

  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    const message =
      error.code === "same_password" ? "Kata sandi baru harus berbeda dari yang lama." : "Gagal mengubah kata sandi.";
    return { ok: false, message };
  }
  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function deleteAccount(_prev: FormState, formData: FormData): Promise<FormState> {
  const claims = await requireClaims();
  const parsed = deleteAccountSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return invalid(parsed.error);

  // FK public.users → auth.users ON DELETE CASCADE menghapus seluruh data pengguna (FR 1).
  const { error } = await createAdminClient().auth.admin.deleteUser(claims.sub);
  if (error) return { ok: false, message: "Gagal menghapus akun. Coba lagi." };

  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login?deleted=1");
}
