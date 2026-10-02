import { z } from "zod";

const email = z.email("Email tidak valid").trim().toLowerCase();
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
