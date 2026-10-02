"use client";

import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/money";
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Transaksi</h1>
        <TransactionDialog
          categories={categories}
          wallets={wallets}
          today={today}
          open={creating}
          onOpenChange={setCreating}
          trigger={<Button>Catat manual</Button>}
        />
      </div>

      <TransactionFilters filters={filters} categories={categories} wallets={wallets} />

      <dl className="grid grid-cols-3 gap-3 rounded-lg border p-4 text-sm">
        <div>
          <dt className="text-muted-foreground">Pemasukan</dt>
          <dd className="font-semibold text-emerald-600 tabular-nums dark:text-emerald-400">{formatRupiah(totals.income)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Pengeluaran</dt>
          <dd className="font-semibold tabular-nums">{formatRupiah(totals.expense)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Selisih</dt>
          <dd className="font-semibold tabular-nums">{formatRupiah(totals.income - totals.expense)}</dd>
        </div>
      </dl>

      {items.length === 0 ? (
        <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          {Object.values(filters).some(Boolean)
            ? "Tidak ada transaksi yang cocok dengan filter."
            : "Belum ada transaksi. Mulai dengan tombol “Catat manual”."}
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
