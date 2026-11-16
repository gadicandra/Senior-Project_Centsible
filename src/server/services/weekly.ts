import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { weekRange } from "@/lib/budget";
import { dateOnlyToDate, todayIn } from "@/lib/dates";
import { templateSummary, weeklyStats, type WeeklyInsight, type WeeklyStats } from "@/lib/weekly";
import { summarizeWeek } from "@/server/ai/weekly";
import { prisma } from "@/server/db/client";
import { withRls, type JwtClaims } from "@/server/db/with-rls";

const DAY_MS = 86_400_000;
const shift = (d: string, days: number) => new Date(dateOnlyToDate(d).getTime() + days * DAY_MS).toISOString().slice(0, 10);

/** Minggu penuh terakhir (Senin–Minggu) sebelum minggu berjalan, menurut zona waktu pengguna. */
export function lastWeek(timezone: string, now: Date = new Date()) {
  const from = shift(weekRange(todayIn(timezone, now)).from, -7);
  return { from, to: shift(from, 6) };
}

export const dedupeKey = (weekStart: string) => `weekly_summary:${weekStart}`;

/**
 * Job terjadwal (Vercel Cron, Senin pagi): satu insight `weekly_summary` per pengguna yang punya transaksi
 * di 5 minggu terakhir. Memakai klien owner (bukan withRls) karena membaca semua pengguna (arsitektur §8.2);
 * tiap query tetap memfilter `user_id` secara eksplisit. Idempoten lewat UNIQUE (user_id, dedupe_key).
 */
export async function generateWeeklySummaries(now: Date = new Date()) {
  const users = await prisma.user.findMany({
    where: { transactions: { some: { occurredAt: { gte: new Date(now.getTime() - 40 * DAY_MS) } } } },
    select: { id: true, timezone: true },
  });
  const result = { users: users.length, created: 0, skipped: 0, ai: 0, failed: 0 };
  for (const u of users) {
    try {
      const range = lastWeek(u.timezone, now);
      const key = dedupeKey(range.from);
      if (await prisma.insight.findUnique({ where: { userId_dedupeKey: { userId: u.id, dedupeKey: key } }, select: { id: true } })) {
        result.skipped++;
        continue;
      }
      const stats = await statsFor(u.id, range);
      const ai = await summarizeWeek(stats);
      if (ai) result.ai++;
      await prisma.insight.create({
        data: {
          userId: u.id,
          kind: "weekly_summary",
          dedupeKey: key,
          content: ai?.text ?? templateSummary(stats),
          payload: { ...stats, model: ai?.model ?? "template" } as unknown as Prisma.InputJsonValue,
          periodStart: dateOnlyToDate(range.from),
          periodEnd: dateOnlyToDate(range.to),
        },
      });
      result.created++;
    } catch (error) {
      // Balapan dua run: baris sudah ada.
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") result.skipped++;
      else {
        result.failed++;
        console.error(JSON.stringify({ evt: "weekly_failed", code: (error as Error)?.name ?? "unknown" }));
      }
    }
  }
  return result;
}

async function statsFor(userId: string, range: { from: string; to: string }): Promise<WeeklyStats> {
  const start = shift(range.from, -28);
  const [rows, categories] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["categoryId", "type", "occurredAt"],
      where: { userId, occurredAt: { gte: dateOnlyToDate(start), lte: dateOnlyToDate(range.to) } },
      _sum: { amount: true },
    }),
    prisma.category.findMany({ where: { userId, kind: "expense" }, select: { id: true, name: true } }),
  ]);
  const name = new Map(categories.map((c) => [c.id, c.name]));
  const cats = new Map<string, { week: number; prev4: number[] }>();
  let income = 0;
  for (const r of rows) {
    const date = r.occurredAt.toISOString().slice(0, 10);
    const amount = Number(r._sum.amount ?? 0);
    const inWeek = date >= range.from;
    if (r.type === "income") {
      if (inWeek) income += amount;
      continue;
    }
    const c = cats.get(r.categoryId) ?? { week: 0, prev4: [0, 0, 0, 0] };
    if (inWeek) c.week += amount;
    else c.prev4[Math.floor((dateOnlyToDate(date).getTime() - dateOnlyToDate(start).getTime()) / (7 * DAY_MS))] += amount;
    cats.set(r.categoryId, c);
  }
  return weeklyStats(
    range,
    income,
    [...cats].map(([categoryId, c]) => ({ categoryId, name: name.get(categoryId) ?? "Lain-lain", ...c })),
  );
}

/** Ringkasan terbaru milik pengguna (RLS). */
export async function getLatestWeekly(claims: JwtClaims): Promise<WeeklyInsight | null> {
  const row = await withRls(claims, (tx) =>
    tx.insight.findFirst({
      where: { kind: "weekly_summary" },
      orderBy: { periodStart: "desc" },
      select: { id: true, content: true, periodStart: true, periodEnd: true, isRead: true },
    }),
  );
  return row && {
    id: row.id,
    content: row.content,
    periodStart: row.periodStart!.toISOString().slice(0, 10),
    periodEnd: row.periodEnd!.toISOString().slice(0, 10),
    isRead: row.isRead,
  };
}
