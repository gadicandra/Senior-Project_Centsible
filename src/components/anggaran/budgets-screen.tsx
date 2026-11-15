"use client";

import { PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatRange, type BudgetOverview, type BudgetView } from "@/lib/budget";
import { formatMonthLabel } from "@/lib/summary";
import { BudgetFormDialog } from "./budget-form-dialog";
import { BudgetItem } from "./budget-item";
import type { ExpenseCategoryOption } from "./types";

/** Anggaran per kategori (FR 11): periode berjalan saja, bulanan lalu mingguan. */
export function BudgetsScreen({ overview, categories }: { overview: BudgetOverview; categories: ExpenseCategoryOption[] }) {
  const { budgets, week, today } = overview;
  // Kategori yang sudah punya anggaran mingguan dan bulanan tidak bisa dipilih lagi.
  const available = categories.filter((c) => budgets.filter((b) => b.categoryId === c.id).length < 2);
  const full = available.length === 0;
  const addButton = (
    <BudgetFormDialog
      categories={available}
      trigger={
        <Button size="sm" disabled={full}>
          <PlusIcon aria-hidden />
          Tambah anggaran
        </Button>
      }
    />
  );
  const sections: { id: string; title: string; items: BudgetView[] }[] = [
    { id: "anggaran-bulanan", title: `Bulanan · ${formatMonthLabel(today.slice(0, 7))}`, items: budgets.filter((b) => b.period === "monthly") },
    { id: "anggaran-mingguan", title: `Mingguan · ${formatRange(week)}`, items: budgets.filter((b) => b.period === "weekly") },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <h1 className="text-2xl font-semibold">Anggaran</h1>
          {addButton}
        </div>
        {full && categories.length > 0 && (
          <p className="text-sm text-muted-foreground">Semua kategori pengeluaran sudah punya anggaran mingguan dan bulanan.</p>
        )}
        <p className="text-muted-foreground">
          Batas pengeluaran per kategori. Dihitung dari transaksi pengeluaran di minggu dan bulan berjalan.
        </p>
      </div>
      {budgets.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-lg border border-dashed p-10 text-center text-muted-foreground">
          <p className="font-medium text-foreground">Belum ada anggaran.</p>
          <p>Tetapkan batas pengeluaran per kategori supaya tahu kapan harus berhemat.</p>
          {addButton}
        </div>
      ) : (
        sections
          .filter((s) => s.items.length > 0)
          .map((s) => (
            <section key={s.id} aria-labelledby={s.id} className="flex flex-col gap-3">
              <h2 id={s.id} className="text-lg font-semibold">
                {s.title}
              </h2>
              <ul className="flex flex-col gap-3">
                {s.items.map((b) => (
                  <BudgetItem key={b.id} budget={b} />
                ))}
              </ul>
            </section>
          ))
      )}
    </div>
  );
}
