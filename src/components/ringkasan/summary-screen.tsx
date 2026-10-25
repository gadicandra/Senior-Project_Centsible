import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { formatRupiah } from "@/lib/money";
import { formatMonthLabel, type SummaryView } from "@/lib/summary";
import { CategoryBreakdown } from "./category-breakdown";
import { DailyTrendChart } from "./daily-trend-chart";
import { MonthNav } from "./month-nav";

/** Ringkasan bulanan (FR 12): saldo, pemasukan/pengeluaran, pengeluaran per kategori, tren harian. */
export function SummaryScreen({ summary, currentMonth, today }: { summary: SummaryView; currentMonth: string; today: string }) {
  const label = formatMonthLabel(summary.month);
  const totals = [
    { label: "Pemasukan", value: summary.income, className: "text-emerald-600 dark:text-emerald-400" },
    { label: "Pengeluaran", value: summary.expense, className: "" },
    { label: "Selisih", value: summary.income - summary.expense, className: "" },
  ];
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Ringkasan</h1>
        <MonthNav month={summary.month} currentMonth={currentMonth} />
      </div>
      <Card>
        <CardContent className="flex flex-col gap-1">
          <p className="text-muted-foreground">Total saldo</p>
          <p className="text-3xl font-semibold break-words tabular-nums">{formatRupiah(summary.totalBalance)}</p>
          <p className="text-xs text-muted-foreground">Saldo saat ini, semua dompet aktif</p>
        </CardContent>
      </Card>
      <dl className="grid grid-cols-1 gap-3 rounded-lg border p-4 text-sm sm:grid-cols-3">
        {totals.map((t) => (
          <div key={t.label} className="flex justify-between gap-2 sm:flex-col sm:justify-start">
            <dt className="text-muted-foreground">{t.label}</dt>
            <dd className={`font-semibold break-words tabular-nums ${t.className}`}>{formatRupiah(t.value)}</dd>
          </div>
        ))}
      </dl>
      {summary.transactionCount === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          <p>Belum ada transaksi di {label}.</p>
          <Link href="/" className={buttonVariants()}>
            Catat transaksi
          </Link>
        </div>
      ) : (
        <>
          <section aria-labelledby="ringkasan-kategori" className="flex flex-col gap-3">
            <h2 id="ringkasan-kategori" className="text-lg font-semibold">
              Pengeluaran per kategori
            </h2>
            <CategoryBreakdown items={summary.categories} from={summary.from} to={summary.to} />
          </section>
          <section aria-labelledby="ringkasan-tren" className="flex flex-col gap-3">
            <h2 id="ringkasan-tren" className="text-lg font-semibold">
              Tren harian
            </h2>
            <DailyTrendChart daily={summary.daily} monthLabel={label} today={today} />
          </section>
        </>
      )}
    </div>
  );
}
