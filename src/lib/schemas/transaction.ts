import { z } from "zod";
import { ENTRY_KINDS } from "./settings";
import { rupiahField, uuid } from "./fields";

const dateOnly = z.iso.date("Tanggal tidak valid");

/**
 * Skema transaksi bersama: form manual sekarang, kartu konfirmasi AI nanti (FR 4).
 * `today` dihitung di zona waktu pengguna, sehingga "tidak di masa depan" benar
 * walau server berjalan di UTC. Batas lain mengikuti CHECK di migrasi 01.
 */
export function transactionSchema(today: string) {
  return z.object({
    type: z.enum(ENTRY_KINDS, { error: "Pilih jenis transaksi" }),
    amount: rupiahField({ label: "Nominal", min: 1, max: 1_000_000_000_000 }),
    categoryId: z.string().min(1, "Pilih kategori").pipe(uuid),
    walletId: z.string().min(1, "Pilih dompet").pipe(uuid),
    description: z.string().trim().max(200, "Keterangan maksimal 200 karakter").default(""),
    occurredAt: dateOnly
      .refine((d) => d >= "2020-01-01", "Tanggal terlalu lama")
      .refine((d) => d <= today, "Tanggal tidak boleh di masa depan"),
  });
}
export type TransactionInput = z.infer<ReturnType<typeof transactionSchema>>;

export const TRANSACTION_PAGE_SIZE = 20;

/** Filter daftar transaksi dari searchParams (FR 8). Nilai tidak valid diabaikan, bukan error. */
export const transactionFilterSchema = z.object({
  from: dateOnly.optional().catch(undefined),
  to: dateOnly.optional().catch(undefined),
  type: z.enum(ENTRY_KINDS).optional().catch(undefined),
  categoryId: uuid.optional().catch(undefined),
  walletId: uuid.optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(10_000).optional().catch(undefined),
});
export type TransactionFilter = z.infer<typeof transactionFilterSchema>;
