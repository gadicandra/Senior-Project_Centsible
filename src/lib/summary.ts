import { z } from "zod";
import { dateOnlyToDate, dateToDateOnly, monthRange } from "@/lib/dates";

/** Batas bawah `transactions_occurred_at_chk`. */
export const MIN_MONTH = "2020-01";

export const summaryQuerySchema = z.object({
  month: z
    .string()
    .regex(/^\d{4}-(0[1-9]|1[0-2])$/)
    .optional()
    .catch(undefined),
});

/** "YYYY-MM" yang ditampilkan: `raw` bila valid & dalam rentang, selain itu bulan dari `today`. */
export function resolveMonth(raw: string | undefined, today: string): string {
  const current = today.slice(0, 7);
  // Perbandingan string benar untuk YYYY-MM yang zero-padded.
  return raw && raw >= MIN_MONTH && raw <= current ? raw : current;
}

/** Rentang tanggal (YYYY-MM-DD) bulan `month`. */
export function monthBounds(month: string): { from: string; to: string } {
  return monthRange(`${month}-01`);
}

/** Bulan tetangga; null bila di luar [MIN_MONTH, currentMonth]. */
export function shiftMonth(month: string, delta: -1 | 1, currentMonth: string): string | null {
  const [y, m] = month.split("-").map(Number);
  const next = dateToDateOnly(new Date(Date.UTC(y, m - 1 + delta, 1))).slice(0, 7);
  return next < MIN_MONTH || next > currentMonth ? null : next;
}

const monthLabel = new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "UTC" });

/** "Oktober 2026". */
export function formatMonthLabel(month: string): string {
  return monthLabel.format(dateOnlyToDate(`${month}-01`));
}

export type DailyPoint = { date: string; income: number; expense: number };

const DAY_MS = 86_400_000;

/** Satu entri per hari dalam [from, to], urut naik; hari tanpa data = 0. */
export function zeroFillDaily(
  rows: { date: string; type: "income" | "expense"; amount: number }[],
  from: string,
  to: string,
): DailyPoint[] {
  const days = new Map<string, DailyPoint>();
  const end = dateOnlyToDate(to).getTime();
  for (let t = dateOnlyToDate(from).getTime(); t <= end; t += DAY_MS) {
    const date = dateToDateOnly(new Date(t));
    days.set(date, { date, income: 0, expense: 0 });
  }
  for (const r of rows) {
    const day = days.get(r.date);
    if (day) day[r.type] += r.amount; // baris di luar rentang diabaikan
  }
  return [...days.values()];
}

export type CategoryTotal = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  isArchived: boolean;
  amount: number;
};
export type CategoryShare = CategoryTotal & { percent: number };

// Nama kategori unik hanya di antara yang aktif, jadi id dipakai sebagai penentu terakhir.
const byRank = (a: CategoryTotal, b: CategoryTotal) =>
  b.amount - a.amount || a.name.localeCompare(b.name, "id") || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** Urut amount desc, name asc, id asc; persen bulat largest-remainder → total tepat 100 (0 item → []). */
export function categoryShares(items: CategoryTotal[]): CategoryShare[] {
  const sorted = items.filter((i) => i.amount > 0).sort(byRank);
  const total = sorted.reduce((s, i) => s + i.amount, 0);
  if (total === 0) return [];
  const shares = sorted.map((item) => {
    const exact = (item.amount * 100) / total;
    return { item, percent: Math.floor(exact), remainder: exact - Math.floor(exact) };
  });
  let left = 100 - shares.reduce((s, x) => s + x.percent, 0);
  const byRemainder = [...shares].sort((a, b) => b.remainder - a.remainder || byRank(a.item, b.item));
  for (const s of byRemainder) {
    if (left <= 0) break;
    s.percent += 1;
    left -= 1;
  }
  return shares.map(({ item, percent }) => ({ ...item, percent }));
}

export type SummaryView = {
  month: string;
  from: string;
  to: string;
  totalBalance: number;
  income: number;
  expense: number;
  transactionCount: number;
  categories: CategoryShare[];
  daily: DailyPoint[];
};
