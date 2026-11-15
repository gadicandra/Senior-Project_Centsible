import type { Metadata } from "next";
import { SummaryScreen } from "@/components/ringkasan/summary-screen";
import { todayIn } from "@/lib/dates";
import { resolveMonth, summaryQuerySchema } from "@/lib/summary";
import { requireClaims } from "@/server/auth/session";
import { getTimezone } from "@/server/services/profile";
import { getSummary } from "@/server/services/summary";

export const metadata: Metadata = { title: "Ringkasan · Centsible" };

export default async function Page({ searchParams }: PageProps<"/ringkasan">) {
  const claims = await requireClaims();
  const { month: raw } = summaryQuerySchema.parse(await searchParams);
  // Bulan berjalan mengikuti zona waktu pengguna, bukan zona waktu server.
  const today = todayIn(await getTimezone(claims));
  const month = resolveMonth(raw, today);
  const summary = await getSummary(claims, month);
  return <SummaryScreen summary={summary} currentMonth={today.slice(0, 7)} today={today} />;
}
