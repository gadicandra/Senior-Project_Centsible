import { z } from "zod";
import { parseRupiah } from "@/lib/money";

/** Nominal rupiah dari input teks (boleh berisi titik ribuan) menjadi bilangan bulat. */
export function rupiahField({ min, max, label }: { min: number; max: number; label: string }) {
  return z
    .string()
    .trim()
    .min(1, `${label} wajib diisi`)
    .transform((v, ctx) => {
      const n = parseRupiah(v);
      if (Number.isNaN(n)) {
        ctx.addIssue({ code: "custom", message: `${label} harus berupa angka` });
        return z.NEVER;
      }
      return n;
    })
    .pipe(z.number().int().min(min, `${label} minimal ${min.toLocaleString("id-ID")}`).max(max, `${label} terlalu besar`));
}

export const uuid = z.uuid("ID tidak valid");
