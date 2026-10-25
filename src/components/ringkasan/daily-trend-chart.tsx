import { useId } from "react";
import { dateOnlyToDate, formatDateOnly } from "@/lib/dates";
import { formatRupiah } from "@/lib/money";
import type { DailyPoint } from "@/lib/summary";

const SLOT = 12;
const HEIGHT = 120;
const MAX_BAR = 100;
const shortDate = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });

function barHeight(value: number, max: number) {
  return value ? Math.min(MAX_BAR, Math.max(1, Math.round((value / max) * MAX_BAR))) : 0;
}

/** Grafik batang harian (SVG polos, tanpa JS klien). Pemasukan polos di kiri, pengeluaran bergaris di kanan. */
export function DailyTrendChart({ daily, monthLabel, today }: { daily: DailyPoint[]; monthLabel: string; today: string }) {
  const id = useId();
  const hatchId = `${id}-hatch`;
  const titleId = `${id}-title`;
  const captionId = `${id}-caption`;

  const n = daily.length;
  const max = Math.max(1, ...daily.map((d) => d.income), ...daily.map((d) => d.expense));
  const todayIndex = n > 0 && daily[0].date <= today && today <= daily[n - 1].date ? daily.findIndex((d) => d.date === today) : -1;
  const elapsedDays = todayIndex >= 0 ? todayIndex + 1 : n;
  const totalExpense = daily.reduce((s, d) => s + d.expense, 0);
  // Hari pertama dengan pengeluaran terbesar (urut tanggal) menang bila seri.
  const peak = daily.reduce<DailyPoint | null>((best, d) => (d.expense > (best?.expense ?? 0) ? d : best), null);
  const nonZero = daily.filter((d) => d.income || d.expense);
  const labels = [1, 8, 15, 22, n].filter((d, i, all) => d <= n && all.indexOf(d) === i);

  return (
    <figure className="flex flex-col gap-2">
      <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
        <li className="flex items-center gap-1.5">
          <span aria-hidden="true" className="size-3 rounded-sm bg-emerald-600 dark:bg-emerald-400" />
          Pemasukan (batang kiri, polos)
        </li>
        <li className="flex items-center gap-1.5">
          <svg aria-hidden="true" width="12" height="12" className="rounded-sm">
            <rect width="12" height="12" fill={`url(#${hatchId})`} />
          </svg>
          Pengeluaran (batang kanan, bergaris)
        </li>
      </ul>
      <div className="flex flex-col gap-1">
        <p className="text-xs text-muted-foreground tabular-nums">{formatRupiah(max)}</p>
        <svg
          role="img"
          aria-labelledby={titleId}
          aria-describedby={captionId}
          viewBox={`0 0 ${n * SLOT} ${HEIGHT}`}
          preserveAspectRatio="none"
          className="h-40 w-full"
        >
          <title id={titleId}>{`Tren harian ${monthLabel}`}</title>
          <defs>
            <pattern id={hatchId} width="3" height="3" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
              <rect width="3" height="3" className="fill-rose-600 dark:fill-rose-400" />
              <line x1="0" y1="0" x2="0" y2="3" className="stroke-background" strokeWidth="1" />
            </pattern>
          </defs>
          {todayIndex >= 0 && (
            <line
              aria-hidden="true"
              x1={todayIndex * SLOT + SLOT / 2}
              x2={todayIndex * SLOT + SLOT / 2}
              y1="0"
              y2={HEIGHT}
              className="stroke-muted-foreground"
              strokeDasharray="4 3"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {daily.map((d, i) => {
            const hi = barHeight(d.income, max);
            const he = barHeight(d.expense, max);
            return (
              <g key={d.date}>
                <title>{`${shortDate.format(dateOnlyToDate(d.date))}: pemasukan ${formatRupiah(d.income)}, pengeluaran ${formatRupiah(d.expense)}`}</title>
                <rect
                  data-kind="income"
                  x={i * SLOT + 1}
                  y={HEIGHT - hi}
                  width="4"
                  height={hi}
                  className="fill-emerald-600 dark:fill-emerald-400"
                />
                <rect data-kind="expense" x={i * SLOT + 6} y={HEIGHT - he} width="4" height={he} fill={`url(#${hatchId})`} />
              </g>
            );
          })}
        </svg>
        <p className="text-xs text-muted-foreground tabular-nums">{formatRupiah(0)}</p>
        <div aria-hidden="true" className="relative h-4 text-xs text-muted-foreground tabular-nums">
          {labels.map((d) => (
            <span key={d} className="absolute -translate-x-1/2" style={{ left: `${((d - 0.5) / n) * 100}%` }}>
              {d}
            </span>
          ))}
        </div>
      </div>
      <figcaption id={captionId} className="text-sm text-muted-foreground">
        {peak
          ? `Pengeluaran tertinggi ${formatRupiah(peak.expense)} pada ${formatDateOnly(peak.date)}. Rata-rata pengeluaran per hari ${formatRupiah(Math.round(totalExpense / elapsedDays))}.`
          : "Belum ada pengeluaran di bulan ini."}
      </figcaption>
      <details className="text-sm">
        <summary className="cursor-pointer text-muted-foreground">Lihat data per hari</summary>
        <table className="mt-2 w-full text-left tabular-nums">
          <thead>
            <tr className="text-muted-foreground">
              <th scope="col" className="py-1 font-normal">Tanggal</th>
              <th scope="col" className="py-1 text-right font-normal">Pemasukan</th>
              <th scope="col" className="py-1 text-right font-normal">Pengeluaran</th>
            </tr>
          </thead>
          <tbody>
            {nonZero.map((d) => (
              <tr key={d.date} className="border-t">
                <td className="py-1">{formatDateOnly(d.date)}</td>
                <td className="py-1 text-right">{formatRupiah(d.income)}</td>
                <td className="py-1 text-right">{formatRupiah(d.expense)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </figure>
  );
}
