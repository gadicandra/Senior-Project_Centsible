import type { z } from "zod";

/** Bentuk state yang dikembalikan Server Action ke useActionState. */
export type FormState = {
  ok?: boolean;
  message?: string;
  fieldErrors?: Record<string, string[] | undefined>;
  /** Nilai terakhir yang dikirim, agar form tidak kosong lagi saat gagal. */
  values?: Record<string, string>;
};

export const initialFormState: FormState = {};

export function formValues(formData: FormData, omit: string[] = []): Record<string, string> {
  const values: Record<string, string> = {};
  for (const [key, value] of formData) {
    if (typeof value === "string" && !key.startsWith("$ACTION") && !omit.includes(key)) values[key] = value;
  }
  return values;
}

export function invalid(error: z.ZodError, values?: Record<string, string>): FormState {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_form";
    (fieldErrors[key] ??= []).push(issue.message);
  }
  return { ok: false, fieldErrors, values };
}
