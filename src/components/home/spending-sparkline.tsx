import Link from "next/link";
import { formatRupiah } from "@/lib/money";
import type { DailyPoint } from "@/lib/summary";

const W = 300;
const H = 64;
const short = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });
const label = (d: string) => short.format(new Date(`${d}T00:00:00Z`));

/** Tren pengeluaran kumulatif bulan berjalan (garis + area), seperti "Spending Trend" di referensi. */
export function SpendingSparkline({ daily, today }: { daily: DailyPoint[]; today: string }) {
  const upTo = daily.filter((d) => d.date <= today);
  const cum = upTo.reduce<number[]>((out, d) => [...out, (out.at(-1) ?? 0) + d.expense], []);
  const acc = cum.at(-1) ?? 0;
  const max = Math.max(1, acc);
  const n = Math.max(1, daily.length - 1);
  const pts = cum.map((v, i) => [(i / n) * W, H - 4 - (v / max) * (H - 8)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`).join(" ");
  const area = pts.length ? `${line} L${pts.at(-1)![0].toFixed(1)},${H} L0,${H} Z` : "";
  const peak = upTo.reduce((b, d) => (d.expense > b.expense ? d : b), upTo[0] ?? { date: today, expense: 0, income: 0 });

  return (
    <section aria-labelledby="trend-title" className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="trend-title" className="font-semibold">
          Tren pengeluaran
        </h2>
        <Link href="/ringkasan" className="text-sm font-medium text-primary">
          Detail
        </Link>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="mt-3 h-16 w-full" role="img" aria-label={`Pengeluaran kumulatif bulan ini ${formatRupiah(acc)}; hari terbesar ${label(peak.date)} ${formatRupiah(peak.expense)}.`}>
        <path d={area} className="fill-primary/10" />
        <path d={line} fill="none" className="stroke-primary" strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
      </svg>
      <div className="mt-1 flex justify-between text-[11px] text-muted-foreground">
        <span>{label(daily[0].date)}</span>
        <span>Hari ini</span>
        <span>{label(daily.at(-1)!.date)}</span>
      </div>
    </section>
  );
}
