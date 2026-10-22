import { z } from "zod";
import { AI_TEXT_MAX_CHARS } from "./limits";

/**
 * Normalisasi kalimat masukan (dipakai server dan UI): NFKC, tab/baris baru → spasi,
 * buang karakter kontrol C0/C1 lain dan karakter lebar-nol, rapatkan spasi, trim.
 */
export function normalizeInputText(text: string): string {
  return text
    .normalize("NFKC")
    .replace(/[\r\n\t]/g, " ")
    .replace(/[\u0000-\u001F\u007F-\u009F\u200B-\u200D\uFEFF]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** Body POST /api/ai/parse. Key lain ditolak. */
export const parseRequestSchema = z.strictObject({
  text: z
    .string()
    .transform(normalizeInputText)
    .pipe(
      z
        .string()
        .min(1, "Tulis transaksinya dulu.")
        .max(AI_TEXT_MAX_CHARS, "Kalimat terlalu panjang (maks 500 karakter)."),
    ),
});

export type ParseRequest = z.infer<typeof parseRequestSchema>;
