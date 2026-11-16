import { TriangleAlertIcon } from "lucide-react";
import Link from "next/link";
import { formatRupiah } from "@/lib/money";
import type { AnomalyView } from "@/lib/anomaly";

/** Kalimat peringatan (FR 14). Angka dari statistik, bukan AI; teks AI bisa menggantikannya nanti. */
export function anomalyText(a: Pick<AnomalyView, "kind" | "name" | "current" | "median" | "ratio">): string {
  const times = a.ratio === null ? "" : ` (${a.ratio.toLocaleString("id-ID")}× biasanya)`;
  return a.kind === "amount"
    ? `Pengeluaran ${a.name} minggu ini ${formatRupiah(a.current)}, biasanya sekitar ${formatRupiah(Math.round(a.median))}${times}.`
    : `${a.current} transaksi ${a.name} minggu ini, biasanya sekitar ${Math.round(a.median)}${times}.`;
}

export function AnomalyAlert({ anomalies }: { anomalies: AnomalyView[] }) {
  if (!anomalies.length) return null;
  return (
    <section
      aria-labelledby="anomaly-title"
      className="flex flex-col gap-2 rounded-2xl border border-amber-700/30 bg-amber-50 p-4 dark:border-amber-400/40 dark:bg-amber-950/40"
    >
      <h2 id="anomaly-title" className="flex items-center gap-1.5 font-semibold text-amber-800 dark:text-amber-300">
        <TriangleAlertIcon className="size-4 shrink-0" aria-hidden />
        Pengeluaran tidak biasa
      </h2>
      <ul className="flex flex-col gap-1.5 text-sm">
        {anomalies.slice(0, 3).map((a) => (
          <li key={`${a.categoryId}:${a.kind}`}>
            {anomalyText(a)}{" "}
            <Link
              href={`/transaksi?${new URLSearchParams({ type: "expense", categoryId: a.categoryId, from: a.from, to: a.to })}`}
              className="font-medium underline underline-offset-2"
            >
              Lihat
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
