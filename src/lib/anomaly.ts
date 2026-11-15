import { weekRange } from "@/lib/budget";
import { dateOnlyToDate, dateToDateOnly } from "@/lib/dates";

/**
 * Deteksi pengeluaran tidak wajar (FR 14, database.md §12, arsitektur §6.6): per kategori, minggu berjalan
 * dibandingkan dengan 8 minggu penuh sebelumnya memakai median + MAD, jadi batasnya mengikuti kebiasaan
 * tiap pengguna dan tahan terhadap satu-dua minggu ekstrem. Dihitung saat render, tanpa job/tabel `insights`.
 */
export const HISTORY_WEEKS = 8;
/** Minimal minggu yang punya transaksi di kategori itu; kurang dari ini belum ada "kebiasaan". */
export const MIN_ACTIVE_WEEKS = 4;
const K = 3 * 1.4826; // ambang MAD yang lazim (database.md §12); disetel ulang setelah uji coba (#37)
/** Batas bawah supaya kebiasaan yang sangat stabil (MAD 0) tidak memicu peringatan untuk selisih kecil. */
const MIN_AMOUNT_JUMP = 50_000;
const MIN_COUNT_JUMP = 3;

const DAY_MS = 86_400_000;

export type DailyExpense = { categoryId: string; date: string; amount: number; count: number };
export type Anomaly = {
  categoryId: string;
  kind: "amount" | "count";
  current: number;
  median: number;
  /** Kelipatan dari median, dibulatkan 1 desimal; null bila median 0. */
  ratio: number | null;
};

export type AnomalyView = Anomaly & { name: string; icon: string | null; from: string; to: string };

export function median(values: number[]): number {
  const s = [...values].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Senin minggu berjalan dan 8 Senin sebelumnya (terlama dulu). */
export function historyWindow(today: string): { from: string; weeks: string[]; current: string } {
  const current = weekRange(today).from;
  const start = dateOnlyToDate(current).getTime();
  const weeks = Array.from({ length: HISTORY_WEEKS }, (_, i) => dateToDateOnly(new Date(start - (HISTORY_WEEKS - i) * 7 * DAY_MS)));
  return { from: weeks[0], weeks, current };
}

function isOutlier(current: number, history: number[], minJump: number) {
  const med = median(history);
  const mad = median(history.map((v) => Math.abs(v - med)));
  return current > med + K * mad && current - med >= minJump ? med : null;
}

export function detectAnomalies(rows: DailyExpense[], today: string): Anomaly[] {
  const { weeks, current } = historyWindow(today);
  const index = new Map(weeks.map((w, i) => [w, i]));
  const byCat = new Map<string, { amount: number[]; count: number[]; cur: { amount: number; count: number } }>();
  for (const r of rows) {
    const week = weekRange(r.date).from;
    let c = byCat.get(r.categoryId);
    if (!c) {
      c = { amount: Array(HISTORY_WEEKS).fill(0), count: Array(HISTORY_WEEKS).fill(0), cur: { amount: 0, count: 0 } };
      byCat.set(r.categoryId, c);
    }
    if (week === current) {
      c.cur.amount += r.amount;
      c.cur.count += r.count;
    } else if (index.has(week)) {
      // Minggu tanpa transaksi tetap 0 di array: median harus memperhitungkan minggu sepi.
      c.amount[index.get(week)!] += r.amount;
      c.count[index.get(week)!] += r.count;
    }
  }

  const out: Anomaly[] = [];
  for (const [categoryId, c] of byCat) {
    if (c.count.filter((n) => n > 0).length < MIN_ACTIVE_WEEKS) continue;
    const ratio = (cur: number, med: number) => (med > 0 ? Math.round((cur / med) * 10) / 10 : null);
    const amountMed = isOutlier(c.cur.amount, c.amount, MIN_AMOUNT_JUMP);
    if (amountMed !== null) out.push({ categoryId, kind: "amount", current: c.cur.amount, median: amountMed, ratio: ratio(c.cur.amount, amountMed) });
    const countMed = isOutlier(c.cur.count, c.count, MIN_COUNT_JUMP);
    if (countMed !== null) out.push({ categoryId, kind: "count", current: c.cur.count, median: countMed, ratio: ratio(c.cur.count, countMed) });
  }
  // Paling mencolok dulu.
  return out.sort((a, b) => (b.ratio ?? Infinity) - (a.ratio ?? Infinity));
}
