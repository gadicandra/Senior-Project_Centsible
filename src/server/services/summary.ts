import "server-only";
import { dateOnlyToDate, dateToDateOnly } from "@/lib/dates";
import { categoryShares, monthBounds, zeroFillDaily, type SummaryView } from "@/lib/summary";
import { withRls, type JwtClaims } from "@/server/db/with-rls";

/**
 * Ringkasan satu bulan (FR 12). `month` ("YYYY-MM") harus sudah dinormalisasi oleh
 * `resolveMonth` di halaman; service ini tidak memvalidasinya ulang.
 */
export async function getSummary(claims: JwtClaims, month: string): Promise<SummaryView> {
  const { from, to } = monthBounds(month);
  // user_id sengaja tidak ditulis: RLS yang membatasi baris (FR 17).
  // Belum ada konsep transfer di skema (entry_kind = income|expense). Bila transfer ditambahkan,
  // kecualikan di `period` di bawah (lihat design #30 §B3).
  const period = { occurredAt: { gte: dateOnlyToDate(from), lte: dateOnlyToDate(to) } };

  const { daily, byCategory, categories, balance } = await withRls(claims, async (tx) => {
    // Tiga kueri independen paralel, seperti listTransactions (satu koneksi, diantrikan driver).
    const [daily, byCategory, balance] = await Promise.all([
      tx.transaction.groupBy({
        by: ["occurredAt", "type"],
        where: period,
        _sum: { amount: true },
        _count: { _all: true },
      }),
      tx.transaction.groupBy({
        by: ["categoryId"],
        where: { ...period, type: "expense" },
        _sum: { amount: true },
      }),
      tx.$queryRaw<{ total: bigint }[]>`
        select coalesce(sum(balance), 0)::bigint as total
        from public.wallet_balances
        where not is_archived`,
    ]);
    const categories = byCategory.length
      ? await tx.category.findMany({
          where: { id: { in: byCategory.map((r) => r.categoryId) } },
          select: { id: true, name: true, icon: true, color: true, isArchived: true },
        })
      : [];
    return { daily, byCategory, categories, balance };
  });

  // BigInt diubah ke Number di batas service (database.md §17.2).
  const meta = new Map(categories.map((c) => [c.id, c]));
  const categoryTotals = byCategory.map((r) => {
    const c = meta.get(r.categoryId);
    if (!c) throw new Error("summary: kategori tidak ditemukan");
    return { ...c, amount: Number(r._sum.amount ?? 0) };
  });
  const rows = daily.map((r) => ({
    date: dateToDateOnly(r.occurredAt),
    type: r.type,
    amount: Number(r._sum.amount ?? 0),
  }));
  const sumOf = (type: "income" | "expense") => rows.filter((r) => r.type === type).reduce((s, r) => s + r.amount, 0);

  return {
    month,
    from,
    to,
    totalBalance: Number(balance[0]?.total ?? 0),
    income: sumOf("income"),
    expense: sumOf("expense"),
    transactionCount: daily.reduce((n, r) => n + r._count._all, 0),
    categories: categoryShares(categoryTotals),
    daily: zeroFillDaily(rows, from, to),
  };
}
