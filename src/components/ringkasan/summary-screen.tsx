import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import { PageHero } from "@/components/layout/page-hero";
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
      <PageHero
        title="Ringkasan"
        actions={<MonthNav month={summary.month} currentMonth={currentMonth} hero />}
        valueLabel="Total saldo · semua dompet aktif"
        value={formatRupiah(summary.totalBalance)}
      />
      <dl className="grid grid-cols-1 gap-3 rounded-2xl bg-card shadow-sm ring-1 ring-border p-4 text-sm sm:grid-cols-3">
        {totals.map((t) => (
          <div key={t.label} className="flex justify-between gap-2 sm:flex-col sm:justify-start">
            <dt className="text-muted-foreground">{t.label}</dt>
            <dd className={`font-semibold break-words tabular-nums ${t.className}`}>{formatRupiah(t.value)}</dd>
          </div>
        ))}
      </dl>
      {summary.transactionCount === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center text-muted-foreground">
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
