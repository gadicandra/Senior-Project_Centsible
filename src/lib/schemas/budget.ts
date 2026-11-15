import { z } from "zod";
import { rupiahField, uuid } from "./fields";

export const BUDGET_PERIODS = ["monthly", "weekly"] as const; // urutan pilihan di form
export const BUDGET_PERIOD_LABEL = { monthly: "Bulanan", weekly: "Mingguan" } as const;
// Batas atas sama dengan budgets_amount_chk (migrasi 01); batas bawah adalah batas produk (AS-4).
export const BUDGET_LIMIT_MIN = 1_000;
export const BUDGET_LIMIT_MAX = 1_000_000_000_000;

const amountLimit = rupiahField({ label: "Batas anggaran", min: BUDGET_LIMIT_MIN, max: BUDGET_LIMIT_MAX });

export const budgetCreateSchema = z.object({
  categoryId: z.string().min(1, "Pilih kategori").pipe(uuid),
  period: z.enum(BUDGET_PERIODS, { error: "Pilih periode" }),
  amountLimit,
});
export const budgetUpdateSchema = z.object({ amountLimit });
export type BudgetCreateInput = z.infer<typeof budgetCreateSchema>;

// Aman untuk klien: dipakai service, action, dan BudgetFormDialog (toast saat kartu sudah hilang).
export const BUDGET_NOT_FOUND = "Anggaran tidak ditemukan. Mungkin sudah dihapus.";
