"use client";

import Link from "next/link";
import { useState } from "react";
import { DownloadIcon } from "lucide-react";
import { PageHero } from "@/components/layout/page-hero";
import { Button, buttonVariants } from "@/components/ui/button";
import { formatRupiah } from "@/lib/money";
import { cn } from "@/lib/utils";
import { TransactionDialog } from "./transaction-dialog";
import { TransactionFilters } from "./transaction-filters";
import { TransactionList } from "./transaction-list";
import type { CategoryOption, FilterValues, TransactionRow, WalletOption } from "./types";

export type TransactionsScreenProps = {
  items: TransactionRow[];
  total: number;
  page: number;
  pageCount: number;
  totals: { income: number; expense: number };
  filters: FilterValues;
  categories: CategoryOption[];
  wallets: WalletOption[];
  today: string;
  query: string;
};

/** Parameter halaman tidak ikut: unduhan selalu semua halaman. */
export function exportHref(query: string): string {
  const params = new URLSearchParams(query);
  params.delete("page");
  const qs = params.toString();
  return qs ? `/api/export?${qs}` : "/api/export";
}

export function TransactionsScreen(props: TransactionsScreenProps) {
  const { items, total, page, pageCount, totals, filters, categories, wallets, today, query } = props;
  const [creating, setCreating] = useState(false);
  const pageHref = (p: number) => {
    const params = new URLSearchParams(query);
    if (p > 1) params.set("page", String(p));
    else params.delete("page");
    const qs = params.toString();
    return qs ? `/transaksi?${qs}` : "/transaksi";
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHero
        title="Transaksi"
        actions={
          <TransactionDialog
            categories={categories}
            wallets={wallets}
            today={today}
            open={creating}
            onOpenChange={setCreating}
            trigger={<Button className="rounded-full bg-white/15 text-hero-foreground hover:bg-white/25">Catat manual</Button>}
          />
        }
        valueLabel={`Selisih · ${total} transaksi`}
        value={formatRupiah(totals.income - totals.expense)}
      >
        <dl className="mt-4 grid grid-cols-2 gap-2 rounded-2xl bg-white/12 p-3 text-sm">
          <div>
            <dt className="text-hero-foreground/75">Pemasukan</dt>
            <dd className="font-semibold tabular-nums">{formatRupiah(totals.income)}</dd>
          </div>
          <div>
            <dt className="text-hero-foreground/75">Pengeluaran</dt>
            <dd className="font-semibold tabular-nums">{formatRupiah(totals.expense)}</dd>
          </div>
        </dl>
      </PageHero>

      <TransactionFilters filters={filters} categories={categories} wallets={wallets} />

      {/* Unduhan memakai filter yang sedang aktif (FR 15); <a download> karena ini file, bukan halaman. */}
      <a
        href={exportHref(query)}
        download
        className={cn(buttonVariants({ variant: "outline", size: "sm" }), "self-start rounded-full")}
      >
        <DownloadIcon aria-hidden />
        Unduh CSV
      </a>


      {items.length === 0 ? (
        <div className="rounded-2xl border-2 border-dashed p-10 text-center text-muted-foreground">
          {Object.values(filters).some(Boolean)
            ? "Tidak ada transaksi yang cocok dengan filter."
            : "Belum ada transaksi. Ketik di kolom bawah, mis. “makan siang 25rb”, atau pakai tombol “Catat manual”."}
        </div>
      ) : (
        <TransactionList items={items} categories={categories} wallets={wallets} today={today} />
      )}

      {pageCount > 1 && (
        <nav aria-label="Halaman" className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Halaman {page} dari {pageCount} · {total} transaksi
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} render={page > 1 ? <Link href={pageHref(page - 1)} /> : undefined}>
              Sebelumnya
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= pageCount}
              render={page < pageCount ? <Link href={pageHref(page + 1)} /> : undefined}
            >
              Berikutnya
            </Button>
          </div>
        </nav>
      )}
    </div>
  );
}
