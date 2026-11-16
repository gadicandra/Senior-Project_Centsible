// pnpm eval:ai (Issue #29, arsitektur §10.2): kirim tiap kalimat di dataset ke parser AI yang sama dengan produksi
// (getTextParser + normalize), lalu hitung exact match nominal, jenis, dan kategori. Hasil: eval/results/<model>.md.
// Butuh AI_TEXT_PROVIDER dkk. di .env.local (mis. 9router lokal). Tidak menyentuh database.
import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { test } from "vitest";
import { createDeadline, getTextParser, buildModelVersion, type UserAiContext } from "@/server/ai";
import { normalize } from "@/server/ai/normalize";
import { AI_DEADLINE_MS } from "@/lib/ai/limits";
import { score, type Case, type Result } from "@/lib/ai/eval-score";

const DATASET = new URL("./ai-dataset.jsonl", import.meta.url);
const OUT = new URL("./results/", import.meta.url);

// Kategori & dompet bawaan pengguna baru (migrasi 02, bootstrap_user). ID tidak penting untuk evaluasi.
const CTX: UserAiContext = {
  today: "2026-11-16",
  nowLocal: "12:00",
  timezone: "Asia/Jakarta",
  categories: [
    ...["Makan", "Transport", "Kos", "Kuliah", "Hiburan", "Kesehatan", "Lain-lain"].map((n) => ({ id: `e:${n}`, name: n, kind: "expense" as const })),
    ...["Uang Saku", "Freelance", "Lain-lain"].map((n) => ({ id: `i:${n}`, name: n, kind: "income" as const })),
  ],
  wallets: [{ id: "w:tunai", name: "Tunai", isDefault: true }],
};

// Dijalankan lewat Vitest (alias @/ dan server-only sama dengan tes lain), bukan bagian dari `pnpm test`.
test("evaluasi akurasi AI", async () => {
  const cases: Case[] = readFileSync(DATASET, "utf8").trim().split("\n").map((l) => JSON.parse(l));
  const parser = getTextParser();
  const results: Result[] = [];
  for (const [i, c] of cases.entries()) {
    const deadline = createDeadline(AI_DEADLINE_MS);
    const t0 = performance.now();
    try {
      const { data } = await parser.parse(c.text, CTX, deadline);
      const { proposal } = normalize(data, CTX, c.text);
      const category = CTX.categories.find((x) => x.id === proposal.categoryId)?.name ?? data.category;
      results.push({ ...c, got: { amount: proposal.amount, type: proposal.type, category }, ms: performance.now() - t0 });
    } catch (e) {
      results.push({ ...c, got: null, error: (e as Error).message, ms: performance.now() - t0 });
    } finally {
      deadline.dispose();
    }
    process.stdout.write(`\r${i + 1}/${cases.length}`);
  }
  const report = score(results, buildModelVersion(parser.provider, parser.model), new Date().toISOString().slice(0, 10));
  mkdirSync(OUT, { recursive: true });
  const file = new URL(`${parser.model.replace(/[^\w.-]+/g, "_")}.md`, OUT);
  writeFileSync(file, report.markdown);
  console.log(`\n${report.summary}\n→ ${file.pathname}`);
  if (!report.pass) throw new Error(`Di bawah target: ${report.summary}`);
});
