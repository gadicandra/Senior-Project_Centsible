/** Penilaian murni untuk eval AI (#29): exact match per isian, target ≥ 85% nominal & kategori. */
export const TARGET = 0.85;

export type Case = { text: string; amount: number; type: "income" | "expense"; category: string };
export type Result = Case & {
  got: { amount: number; type: "income" | "expense"; category: string } | null;
  error?: string;
  ms: number;
};

const pct = (n: number, d: number) => (d ? `${((100 * n) / d).toFixed(1)}%` : "-");

export function score(results: Result[], modelVersion: string, date: string) {
  const n = results.length;
  const ok = (f: (r: Result) => boolean) => results.filter(f).length;
  const amount = ok((r) => r.got?.amount === r.amount);
  const type = ok((r) => r.got?.type === r.type);
  const category = ok((r) => r.got?.type === r.type && r.got?.category === r.category);
  // Definisi target (arsitektur §10.2): nominal DAN kategori benar sekaligus, tanpa koreksi.
  const both = ok((r) => r.got?.amount === r.amount && r.got?.type === r.type && r.got?.category === r.category);
  const errors = ok((r) => r.got === null);
  const ms = results.map((r) => r.ms).sort((a, b) => a - b);
  const p = (q: number) => Math.round(ms[Math.min(ms.length - 1, Math.floor(q * ms.length))] ?? 0);
  const pass = n > 0 && both / n >= TARGET;

  const misses = results.filter((r) => !(r.got?.amount === r.amount && r.got?.type === r.type && r.got?.category === r.category));
  const cell = (s: string) => s.replaceAll("|", "\\|");
  const markdown = [
    `# Evaluasi AI — ${modelVersion}`,
    "",
    `Tanggal: ${date} · Dataset: ${n} kalimat (\`eval/ai-dataset.jsonl\`) · Target: nominal **dan** kategori benar ≥ ${TARGET * 100}%`,
    "",
    "| Isian | Benar | Akurasi |",
    "|---|---|---|",
    `| Nominal | ${amount}/${n} | ${pct(amount, n)} |`,
    `| Jenis | ${type}/${n} | ${pct(type, n)} |`,
    `| Kategori | ${category}/${n} | ${pct(category, n)} |`,
    `| **Nominal + kategori** | **${both}/${n}** | **${pct(both, n)}** ${pass ? "✅" : "❌"} |`,
    `| Gagal dibaca (fallback form manual) | ${errors}/${n} | ${pct(errors, n)} |`,
    "",
    `Latensi per kalimat: p50 ${p(0.5)} ms · p95 ${p(0.95)} ms`,
    "",
    `## Salah (${misses.length})`,
    "",
    "| Kalimat | Harapan | Hasil |",
    "|---|---|---|",
    ...misses.map(
      (r) =>
        `| ${cell(r.text)} | ${r.amount} · ${r.category} | ${r.got ? `${r.got.amount} · ${r.got.type === r.type ? r.got.category : `${r.got.type}/${r.got.category}`}` : `error: ${r.error}`} |`,
    ),
    "",
  ].join("\n");
  return { pass, markdown, summary: `nominal ${pct(amount, n)} · kategori ${pct(category, n)} · keduanya ${pct(both, n)} (target ${TARGET * 100}%)` };
}
