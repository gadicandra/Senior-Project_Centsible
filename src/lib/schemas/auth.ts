import { z } from "zod";

// Pangkas dulu baru validasi: email yang ditempel dengan spasi di ujung tetap diterima.
const email = z.string().trim().toLowerCase().pipe(z.email("Email tidak valid"));
const password = z.string().min(8, "Kata sandi minimal 8 karakter").max(72, "Kata sandi maksimal 72 karakter");

export const signInSchema = z.object({
  email,
  password: z.string().min(1, "Kata sandi wajib diisi"),
});

export const signUpSchema = z
  .object({
    fullName: z.string().trim().min(1, "Nama wajib diisi").max(80),
    email,
    password,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Konfirmasi kata sandi tidak sama",
  });

export const resetPasswordSchema = z.object({ email });

export const updatePasswordSchema = z
  .object({ password, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, {
    path: ["confirmPassword"],
    message: "Konfirmasi kata sandi tidak sama",
  });

export const deleteAccountSchema = z.object({
  confirmation: z.literal("HAPUS", { error: 'Ketik "HAPUS" untuk melanjutkan' }),
});
