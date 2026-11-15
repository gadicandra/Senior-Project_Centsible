import { CircleCheckIcon, OctagonAlertIcon, TriangleAlertIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { formatPercent, statusText, type BudgetStatus, type BudgetView } from "@/lib/budget";
import { formatRupiah } from "@/lib/money";
import { BUDGET_PERIOD_LABEL } from "@/lib/schemas/budget";
import { cn } from "@/lib/utils";

// amber-700 (bukan 600): 600 hanya 2,93:1 terhadap trek bg-muted.
const FILL: Record<BudgetStatus, string> = {
  normal: "bg-emerald-600 dark:bg-emerald-400",
  warning: "bg-amber-700 dark:bg-amber-400",
  over: "bg-red-600 dark:bg-red-400",
};
const TEXT: Record<BudgetStatus, string> = {
  normal: "text-emerald-700 dark:text-emerald-400",
  warning: "text-amber-700 dark:text-amber-400",
  over: "text-red-700 dark:text-red-400",
};
const ICON = { normal: CircleCheckIcon, warning: TriangleAlertIcon, over: OctagonAlertIcon } as const;

/** Angka + bar + status. Status selalu ikon + teks, tidak hanya warna. */
export function BudgetMeter({ budget, compact = false }: { budget: BudgetView; compact?: boolean }) {
  const { name, period, percent, status } = budget;
  const periodLabel = BUDGET_PERIOD_LABEL[period];
  const text = statusText(budget);
  const Icon = ICON[status];
  const width = Math.min(percent, 100);
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center justify-between gap-x-2 text-sm tabular-nums">
        {compact ? (
          <span className="flex min-w-0 items-center gap-1.5">
            <span className="truncate font-medium">{name}</span>
            <Badge variant="secondary">{periodLabel}</Badge>
          </span>
        ) : (
          <span>
            {formatRupiah(budget.used)} dari {formatRupiah(budget.amountLimit)}
          </span>
        )}
        <span className="font-medium">{formatPercent(percent)}</span>
      </div>
      <div
        role="progressbar"
        aria-label={`Pemakaian anggaran ${name} (${periodLabel.toLowerCase()})`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={width}
        aria-valuetext={`${formatPercent(percent)} terpakai. ${text}`}
        className="h-2 w-full overflow-hidden rounded-full bg-muted"
      >
        <div className={cn("h-full rounded-full", FILL[status])} style={{ width: `${width}%` }} />
      </div>
      <p className={cn("flex items-center gap-1.5 text-sm font-medium", TEXT[status])}>
        <Icon className="size-4 shrink-0" aria-hidden />
        {text}
      </p>
    </div>
  );
}
