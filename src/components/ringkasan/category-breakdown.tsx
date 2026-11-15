import Link from "next/link";
import { formatRupiah } from "@/lib/money";
import type { CategoryShare } from "@/lib/summary";

const FALLBACK_COLOR = "#64748B";

export function CategoryBreakdown({ items, from, to }: { items: CategoryShare[]; from: string; to: string }) {
  if (items.length === 0) return <p className="text-sm text-muted-foreground">Belum ada pengeluaran di bulan ini.</p>;
  return (
    <ol className="flex flex-col divide-y rounded-lg border">
      {items.map((c) => {
        const color = c.color ?? FALLBACK_COLOR;
        const href = `/transaksi?${new URLSearchParams({ type: "expense", categoryId: c.id, from, to })}`;
        return (
          <li key={c.id}>
            <Link href={href} className="flex flex-col gap-1.5 px-4 py-3 hover:bg-muted/50">
              <span className="flex min-w-0 items-center gap-2">
                <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
                {c.icon && <span aria-hidden="true">{c.icon}</span>}
                <span className="truncate font-medium">
                  {c.name}
                  {c.isArchived && " · arsip"}
                </span>
              </span>
              <span className="text-sm text-muted-foreground tabular-nums">
                {formatRupiah(c.amount)} · {c.percent}%
              </span>
              <span aria-hidden="true" className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                <span className="block h-full rounded-full" style={{ width: `${c.percent}%`, backgroundColor: color }} />
              </span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}
