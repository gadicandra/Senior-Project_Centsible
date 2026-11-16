import { formatRupiah } from "@/lib/money";

/**
 * Ringkasan mingguan (FR 13, arsitektur §6.6): angka dihitung di sini, AI hanya merangkai kalimat.
 * Bentuk `WeeklyStats` = `insights.payload` untuk kind `weekly_summary` (database.md §10).
 */
export type CategoryWeek = { category_id: string; name: string; total: number; avg4: number; delta_pct: number | null };
export type WeeklyStats = {
  week_start: string;
  week_end: string;
  total_expense: number;
  total_income: number;
  /** Rata-rata pengeluaran 4 minggu sebelumnya. */
  avg4_expense: number;
  per_category: CategoryWeek[];
  /** Saran anggaran yang bisa langsung dijalankan (≥ 1, FR 13). */
  suggestion: { category_id: string; name: string; suggested_limit: number; reason: string } | null;
};

export type WeeklyInsight = { id: string; content: string; periodStart: string; periodEnd: string; isRead: boolean };

export type CategoryTotals = { categoryId: string; name: string; week: number; prev4: number[] };

/** Delta dibulatkan; null bila rata-rata 0 (kategori baru minggu ini). */
const delta = (cur: number, avg: number) => (avg > 0 ? Math.round(((cur - avg) / avg) * 100) : null);
/** Dibulatkan ke atas ke Rp 10.000 supaya mudah diingat. */
const roundUp = (n: number) => Math.ceil(n / 10_000) * 10_000;

export function weeklyStats(
  range: { from: string; to: string },
  income: number,
  cats: CategoryTotals[],
): WeeklyStats {
  const per_category = cats
    .map((c) => {
      const avg4 = Math.round(c.prev4.reduce((a, b) => a + b, 0) / 4);
      return { category_id: c.categoryId, name: c.name, total: c.week, avg4, delta_pct: delta(c.week, avg4) };
    })
    .filter((c) => c.total > 0 || c.avg4 > 0)
    .sort((a, b) => b.total - a.total || a.name.localeCompare(b.name, "id"));

  // Saran: kategori dengan kenaikan rupiah terbesar dibanding rata-rata → batas mingguan = rata-rata 4 minggu.
  const rising = per_category
    .filter((c) => c.avg4 > 0 && c.total - c.avg4 >= 20_000 && (c.delta_pct ?? 0) >= 20)
    .sort((a, b) => b.total - b.avg4 - (a.total - a.avg4))[0];
  const suggestion = rising
    ? {
        category_id: rising.category_id,
        name: rising.name,
        suggested_limit: roundUp(rising.avg4),
        reason: `naik ${rising.delta_pct}% dari rata-rata 4 minggu`,
      }
    : null;

  return {
    week_start: range.from,
    week_end: range.to,
    total_expense: per_category.reduce((a, c) => a + c.total, 0),
    total_income: income,
    avg4_expense: per_category.reduce((a, c) => a + c.avg4, 0),
    per_category,
    suggestion,
  };
}

/** Kalimat cadangan tanpa AI. Selalu memuat ≥ 1 saran (FR 13), juga saat pengeluaran wajar. */
export function templateSummary(s: WeeklyStats): string {
  if (s.total_expense === 0 && s.total_income === 0) {
    return "Minggu lalu belum ada transaksi yang tercatat. Saran: catat setiap pengeluaran kecil (parkir, jajan) supaya ringkasan minggu depan lebih berguna.";
  }
  const parts: string[] = [];
  const d = delta(s.total_expense, s.avg4_expense);
  parts.push(
    `Minggu lalu kamu mengeluarkan ${formatRupiah(s.total_expense)}` +
      (d === null ? "." : `, ${d >= 0 ? `naik ${d}%` : `turun ${-d}%`} dibanding rata-rata 4 minggu sebelumnya.`),
  );
  const top = s.per_category[0];
  if (top) parts.push(`Pengeluaran terbesar di ${top.name} (${formatRupiah(top.total)}).`);
  if (s.total_income > 0) parts.push(`Pemasukan ${formatRupiah(s.total_income)}.`);
  parts.push(
    s.suggestion
      ? `Saran: buat anggaran mingguan ${s.suggestion.name} ${formatRupiah(s.suggestion.suggested_limit)} (${s.suggestion.reason}).`
      : top
        ? `Saran: pertahankan, dan pasang anggaran mingguan ${top.name} sekitar ${formatRupiah(roundUp(top.total))} supaya tetap terjaga.`
        : "Saran: pasang anggaran untuk kategori yang paling sering kamu pakai.",
  );
  return parts.join(" ");
}
