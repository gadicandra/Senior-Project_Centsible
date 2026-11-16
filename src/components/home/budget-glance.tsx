import Link from "next/link";
import { BudgetMeter } from "@/components/anggaran/budget-meter";
import { buttonVariants } from "@/components/ui/button";
import type { BudgetOverview } from "@/lib/budget";
import { cn } from "@/lib/utils";

const linkClass = cn(buttonVariants({ variant: "outline", size: "sm" }), "self-start");

/** Kartu Beranda: 3 anggaran paling dekat ke batas. `null` = gagal dimuat, Beranda tetap tampil. */
export function BudgetGlance({ overview }: { overview: BudgetOverview | null }) {
  return (
    <section aria-labelledby="budget-glance-title" className="flex flex-col gap-3 rounded-2xl bg-card shadow-sm ring-1 ring-border p-4">
      <h2 id="budget-glance-title" className="font-semibold">
        Anggaran
      </h2>
      {overview === null ? (
        <>
          <p className="text-sm text-muted-foreground">Anggaran tidak bisa dimuat saat ini.</p>
          <Link href="/anggaran" className={linkClass}>
            Buka anggaran
          </Link>
        </>
      ) : overview.budgets.length === 0 ? (
        <>
          <p className="text-sm text-muted-foreground">Belum ada anggaran.</p>
          <Link href="/anggaran" className={linkClass}>
            Atur anggaran
          </Link>
        </>
      ) : (
        <>
          <ul className="flex flex-col gap-4">
            {overview.budgets.slice(0, 3).map((b) => (
              <li key={b.id}>
                <BudgetMeter budget={b} compact />
              </li>
            ))}
          </ul>
          <Link href="/anggaran" className={linkClass}>
            Lihat semua anggaran ({overview.budgets.length})
          </Link>
        </>
      )}
    </section>
  );
}
