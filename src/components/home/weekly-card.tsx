import { SparklesIcon } from "lucide-react";
import type { WeeklyInsight } from "@/lib/weekly";

const fmt = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", timeZone: "UTC" });
const label = (d: string) => fmt.format(new Date(`${d}T00:00:00Z`));

/** Ringkasan mingguan terbaru (FR 13). Tidak tampil sebelum job pertama jalan. */
export function WeeklyCard({ insight }: { insight: WeeklyInsight | null }) {
  if (!insight) return null;
  return (
    <section aria-labelledby="weekly-title" className="flex flex-col gap-2 rounded-lg border p-4">
      <h2 id="weekly-title" className="flex items-center gap-1.5 font-semibold">
        <SparklesIcon className="size-4 shrink-0" aria-hidden />
        Ringkasan minggu lalu
        <span className="text-sm font-normal text-muted-foreground">
          · {label(insight.periodStart)} – {label(insight.periodEnd)}
        </span>
      </h2>
      <p className="text-sm leading-relaxed">{insight.content}</p>
    </section>
  );
}
