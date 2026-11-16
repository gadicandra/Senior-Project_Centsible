import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import type { WeeklyStats } from "@/lib/weekly";
import { getAiConfig } from "@/server/env";

// Ringkasan mingguan dari AI (FR 13, arsitektur §6.6): model menerima ANGKA RINGKAS (bukan transaksi
// mentah), menulis 2–4 kalimat + ≥ 1 saran. Gagal/AI mati → null, pemanggil memakai templat.

const PROMPT = [
  "Kamu asisten keuangan untuk mahasiswa Indonesia. Tulis ringkasan pengeluaran minggu lalu dalam 2–4 kalimat,",
  "bahasa Indonesia santai tapi sopan, sapa dengan 'kamu'. WAJIB diakhiri tepat satu kalimat yang diawali 'Saran:'",
  "berisi satu langkah konkret dengan nominal rupiah. Pakai HANYA angka dari data; jangan mengarang angka,",
  "jangan menghitung ulang, jangan pakai markdown atau emoji. Format rupiah: Rp 150.000.",
].join(" ");

const TIMEOUT_MS = 15_000;
const MAX_CHARS = 1_000;

/** Data yang dikirim ke model: nama kategori + angka; tanpa id, deskripsi, atau data pribadi lain. */
export function promptData(s: WeeklyStats) {
  return JSON.stringify({
    minggu: `${s.week_start} s.d. ${s.week_end}`,
    total_pengeluaran: s.total_expense,
    rata_rata_4_minggu: s.avg4_expense,
    total_pemasukan: s.total_income,
    per_kategori: s.per_category.slice(0, 6).map((c) => ({ kategori: c.name, total: c.total, rata_rata_4_minggu: c.avg4, perubahan_persen: c.delta_pct })),
    saran_dari_sistem: s.suggestion && { kategori: s.suggestion.name, batas_mingguan: s.suggestion.suggested_limit, alasan: s.suggestion.reason },
  });
}

/** Teks AI yang lolos aturan dasar, atau null. */
export function acceptSummary(text: string | null | undefined): string | null {
  const t = text?.trim().replace(/\s+/g, " ");
  if (!t || t.length > MAX_CHARS || !/Saran:/.test(t)) return null;
  return t;
}

export async function summarizeWeek(stats: WeeklyStats): Promise<{ text: string; model: string } | null> {
  const config = getAiConfig();
  if (!config) return null;
  const data = promptData(stats);
  try {
    if (config.provider === "anthropic") {
      const client = new Anthropic({ apiKey: config.apiKey, maxRetries: 1, timeout: TIMEOUT_MS });
      const res = await client.messages.create({
        model: config.model,
        max_tokens: 400,
        system: PROMPT,
        messages: [{ role: "user", content: data }],
      });
      const text = res.content.flatMap((b) => (b.type === "text" ? [b.text] : [])).join(" ");
      const ok = acceptSummary(text);
      return ok ? { text: ok, model: `anthropic:${config.model}` } : null;
    }
    if (config.provider === "openai-compatible") {
      const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL, maxRetries: 1, timeout: TIMEOUT_MS });
      const res = await client.chat.completions.create({
        model: config.model,
        temperature: 0.3,
        max_tokens: 400,
        messages: [
          { role: "system", content: PROMPT },
          { role: "user", content: data },
        ],
      });
      const ok = acceptSummary(res.choices[0]?.message?.content);
      return ok ? { text: ok, model: `openai-compatible:${config.model}` } : null;
    }
    return null; // azure: Fase 2
  } catch (error) {
    // Hanya nama error: pesan SDK bisa memuat isi request.
    console.warn(JSON.stringify({ evt: "weekly_ai_failed", code: (error as Error)?.name ?? "unknown" }));
    return null;
  }
}
