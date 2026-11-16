import "server-only";
import { detectAnomalies, historyWindow, type AnomalyView } from "@/lib/anomaly";
import { dateOnlyToDate, dateToDateOnly, todayIn } from "@/lib/dates";
import { withRls, type JwtClaims } from "@/server/db/with-rls";

/** Pengeluaran tidak wajar minggu ini (FR 14). Satu `withRls`: zona waktu, lalu agregat harian 9 minggu. */
export async function getAnomalies(claims: JwtClaims, now: Date = new Date()): Promise<AnomalyView[]> {
  const { today, rows, categories } = await withRls(claims, async (tx) => {
    const user = await tx.user.findUnique({ where: { id: claims.sub }, select: { timezone: true } });
    const today = todayIn(user?.timezone ?? "Asia/Jakarta", now);
    const [rows, categories] = await Promise.all([
      // user_id sengaja tidak ditulis: RLS yang membatasi baris (FR 17).
      tx.transaction.groupBy({
        by: ["categoryId", "occurredAt"],
        where: { type: "expense", occurredAt: { gte: dateOnlyToDate(historyWindow(today).from), lte: dateOnlyToDate(today) } },
        _sum: { amount: true },
        _count: { _all: true },
      }),
      tx.category.findMany({ where: { kind: "expense" }, select: { id: true, name: true, icon: true } }),
    ]);
    return { today, rows, categories };
  });

  const found = detectAnomalies(
    rows.map((r) => ({ categoryId: r.categoryId, date: dateToDateOnly(r.occurredAt), amount: Number(r._sum.amount ?? 0), count: r._count._all })),
    today,
  );
  const byId = new Map(categories.map((c) => [c.id, c]));
  const { current } = historyWindow(today);
  return found.flatMap((a) => {
    const c = byId.get(a.categoryId);
    return c ? [{ ...a, name: c.name, icon: c.icon, from: current, to: today }] : [];
  });
}
