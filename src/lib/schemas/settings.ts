import { z } from "zod";
import { rupiahField } from "./fields";

// Batas di sini sama dengan CHECK constraint di migrasi 01, supaya pengguna
// mendapat pesan yang jelas sebelum basis data menolak.
const name = z.string().trim().min(1, "Nama wajib diisi").max(40, "Nama maksimal 40 karakter");

export const WALLET_TYPES = ["cash", "bank", "ewallet"] as const;
export const WALLET_TYPE_LABEL: Record<(typeof WALLET_TYPES)[number], string> = {
  cash: "Tunai",
  bank: "Bank",
  ewallet: "E-wallet",
};

export const walletSchema = z.object({
  name,
  type: z.enum(WALLET_TYPES, { error: "Jenis dompet tidak valid" }),
  initialBalance: rupiahField({ label: "Saldo awal", min: -1_000_000_000_000, max: 1_000_000_000_000 }),
});
export type WalletInput = z.infer<typeof walletSchema>;

export const ENTRY_KINDS = ["expense", "income"] as const;
export const ENTRY_KIND_LABEL: Record<(typeof ENTRY_KINDS)[number], string> = {
  expense: "Pengeluaran",
  income: "Pemasukan",
};

export const categorySchema = z.object({
  name,
  kind: z.enum(ENTRY_KINDS, { error: "Jenis kategori tidak valid" }),
  icon: z
    .string()
    .trim()
    .max(8, "Ikon terlalu panjang")
    .transform((v) => v || null),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Warna harus berformat #RRGGBB")
    .or(z.literal("").transform(() => null)),
});
export type CategoryInput = z.infer<typeof categorySchema>;
