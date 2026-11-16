import { BellIcon } from "lucide-react";
import Link from "next/link";
import type { WalletOption } from "@/components/transaksi/types";
import type { AnomalyView } from "@/lib/anomaly";
import type { BudgetOverview } from "@/lib/budget";
import { formatRupiah } from "@/lib/money";
import type { SummaryView } from "@/lib/summary";
import { formatMonthLabel } from "@/lib/summary";
import type { WeeklyInsight } from "@/lib/weekly";
import { AnomalyAlert } from "./anomaly-alert";
import { BudgetGlance } from "./budget-glance";
import { SpendingSparkline } from "./spending-sparkline";
import { WeeklyCard } from "./weekly-card";

type WalletBalance = WalletOption & { balance: number };

/**
 * Beranda (redesain 16 Nov, mengikuti referensi): kartu gradien berisi pengeluaran bulan ini dan tiga
 * statistik, lalu tren, peringatan, ringkasan mingguan, anggaran, dan dompet. Mencatat lewat tombol +.
 */
export function HomeScreen({
  displayName,
  wallets,
  budgets,
  anomalies = [],
  weekly = null,
  summary = null,
  today,
}: {
  displayName: string;
  wallets: WalletBalance[];
  budgets: BudgetOverview | null;
  anomalies?: AnomalyView[];
  weekly?: WeeklyInsight | null;
  /** Ringkasan bulan berjalan; null = gagal dimuat (kartu angka disembunyikan). */
  summary?: SummaryView | null;
  today: string;
}) {
  const total = wallets.reduce((sum, w) => sum + w.balance, 0);
  const elapsed = Number(today.slice(8, 10));
  const daysInMonth = summary?.daily.length ?? 30;
  const largest = summary?.categories[0];

  return (
    <div className="flex flex-col gap-5">
      <section
        aria-labelledby="home-hero"
        className="-mx-4 -mt-4 rounded-b-[2rem] bg-gradient-to-b from-hero-from to-hero-to px-5 pt-5 pb-6 text-hero-foreground md:mx-0 md:mt-0 md:rounded-[2rem]"
      >
        <div className="flex items-center justify-between gap-3">
          <p className="min-w-0 truncate text-sm text-hero-foreground/85">Halo, {displayName}</p>
          <span className="shrink-0 rounded-full bg-white/15 px-3 py-1 text-xs font-medium">
            {formatMonthLabel(today.slice(0, 7))}
          </span>
          <Link href="/ringkasan" aria-label="Lihat ringkasan" className="flex size-9 shrink-0 items-center justify-center rounded-full bg-white/15">
            <BellIcon className="size-4" aria-hidden />
          </Link>
        </div>
        <h1 id="home-hero" className="mt-5 text-center text-sm text-hero-foreground/85">
          Pengeluaran bulan ini
        </h1>
        <p className="mt-1 text-center text-4xl font-bold tracking-tight tabular-nums break-words">
          {formatRupiah(summary?.expense ?? 0)}
        </p>
        <p className="mt-1 text-center text-xs text-hero-foreground/80">
          Saldo semua dompet {formatRupiah(total)} · hari ke-{elapsed} dari {daysInMonth}
        </p>
        {summary && (
          <dl className="mt-5 grid grid-cols-3 gap-2 rounded-2xl bg-white/12 p-3 text-center backdrop-blur-sm">
            <div className="min-w-0">
              <dt className="text-[11px] text-hero-foreground/75">Rata-rata harian</dt>
              <dd className="truncate text-base font-semibold tabular-nums">{formatRupiah(Math.round(summary.expense / Math.max(1, elapsed)))}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[11px] text-hero-foreground/75">Transaksi</dt>
              <dd className="text-base font-semibold tabular-nums">{summary.transactionCount}</dd>
            </div>
            <div className="min-w-0">
              <dt className="text-[11px] text-hero-foreground/75">Terbesar</dt>
              <dd className="truncate text-base font-semibold">{largest ? largest.name : "—"}</dd>
            </div>
          </dl>
        )}
      </section>

      {summary && summary.daily.some((d) => d.expense > 0) && <SpendingSparkline daily={summary.daily} today={today} />}
      <AnomalyAlert anomalies={anomalies} />
      <WeeklyCard insight={weekly} />
      <BudgetGlance overview={budgets} />

      <section aria-labelledby="wallets-title" className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <h2 id="wallets-title" className="text-lg font-semibold">
            Dompet
          </h2>
          <Link href="/transaksi" className="text-sm font-medium text-primary">
            Lihat transaksi
          </Link>
        </div>
        <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {wallets.map((w) => (
            <li key={w.id} className="rounded-2xl bg-card p-4 shadow-sm ring-1 ring-border">
              <p className="text-sm text-muted-foreground">
                {w.name}
                {w.isDefault && " · utama"}
              </p>
              <p className="text-xl font-semibold tabular-nums">{formatRupiah(w.balance)}</p>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
