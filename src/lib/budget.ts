import { dateOnlyToDate, dateToDateOnly, monthRange } from "@/lib/dates";
import { formatRupiah } from "@/lib/money";

export type BudgetPeriod = "weekly" | "monthly";
export type DateRange = { from: string; to: string }; // YYYY-MM-DD, inklusif
export type BudgetStatus = "normal" | "warning" | "over";

const DAY_MS = 86_400_000;
export const WARNING_PERCENT = 80;

/** Senin–Minggu yang memuat `today` (YYYY-MM-DD lokal pengguna). */
export function weekRange(today: string): DateRange {
  const d = dateOnlyToDate(today);
  const offset = (d.getUTCDay() + 6) % 7; // Senin = 0
  const from = new Date(d.getTime() - offset * DAY_MS);
  return { from: dateToDateOnly(from), to: dateToDateOnly(new Date(from.getTime() + 6 * DAY_MS)) };
}

export function periodRange(period: BudgetPeriod, today: string): DateRange {
  return period === "weekly" ? weekRange(today) : monthRange(today);
}

export type BudgetUsage = { used: number; amountLimit: number; remaining: number; percent: number; status: BudgetStatus };

/** percent = floor(used*100/limit); status dari percent yang sama, jadi angka & status selalu sejalan. */
export function budgetUsage(used: number, amountLimit: number): BudgetUsage {
  const percent = Math.floor((used * 100) / amountLimit);
  const status: BudgetStatus = percent >= 100 ? "over" : percent >= WARNING_PERCENT ? "warning" : "normal";
  return { used, amountLimit, remaining: amountLimit - used, percent, status };
}

/** "Aman · sisa Rp 175.000" | "Hampir habis · sisa Rp 1" | "Anggaran habis" | "Melebihi Rp 1" (spasi setelah "Rp" = U+00A0). */
export function statusText(u: BudgetUsage): string {
  if (u.status === "normal") return `Aman · sisa ${formatRupiah(u.remaining)}`;
  if (u.status === "warning") return `Hampir habis · sisa ${formatRupiah(u.remaining)}`;
  return u.remaining === 0 ? "Anggaran habis" : `Melebihi ${formatRupiah(-u.remaining)}`;
}

/** 80 → "80%", 1250 → "1.250%". Dipakai label terlihat dan aria-valuetext. */
export const formatPercent = (p: number) => `${p.toLocaleString("id-ID")}%`;

const rangeParts = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

function parts(value: string) {
  const p = Object.fromEntries(rangeParts.formatToParts(dateOnlyToDate(value)).map((x) => [x.type, x.value]));
  return { day: p.day, month: p.month, year: p.year };
}

/** "12–18 Okt 2026", "28 Sep – 4 Okt 2026", "28 Des 2026 – 3 Jan 2027" (id-ID, timeZone UTC). */
export function formatRange({ from, to }: DateRange): string {
  const a = parts(from);
  const b = parts(to);
  if (a.year !== b.year) return `${a.day} ${a.month} ${a.year} – ${b.day} ${b.month} ${b.year}`;
  if (a.month !== b.month) return `${a.day} ${a.month} – ${b.day} ${b.month} ${b.year}`;
  return `${a.day}–${b.day} ${b.month} ${b.year}`;
}

export type BudgetView = BudgetUsage & {
  id: string;
  categoryId: string;
  name: string;
  icon: string | null;
  color: string | null;
  isArchived: boolean;
  period: BudgetPeriod;
  from: string;
  to: string;
};

export type BudgetOverview = { today: string; week: DateRange; month: DateRange; budgets: BudgetView[] };

/** percent desc, name asc (id-ID), id asc. Tidak mengubah array masukan. */
export function sortBudgets(items: BudgetView[]): BudgetView[] {
  return [...items].sort(
    (a, b) => b.percent - a.percent || a.name.localeCompare(b.name, "id") || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );
}
