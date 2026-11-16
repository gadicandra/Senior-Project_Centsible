import "server-only";
import OpenAI, { toFile } from "openai";
import { z } from "zod";

// Suara → teks (FR 6, arsitektur §0.1): Whisper lewat endpoint OpenAI-compatible
// (Speaches/faster-whisper lokal sekarang, Azure OpenAI Whisper di Fase 2; cukup ganti env).

/** Kamus slang dikirim sebagai prompt supaya Whisper menulis "gocap", bukan "go cap". */
const SLANG_PROMPT = "gocap, ceban, goceng, gopek, seceng, cepek, 25rb, 50 ribu, 1,5jt, ojol, gofood, kos, UKT";

const envSchema = z.object({
  AI_STT_BASE_URL: z.url(),
  AI_STT_MODEL: z.string().min(1).max(100),
  AI_STT_API_KEY: z.string().min(1).default("none"),
});

/** null = fitur suara mati (tombol mikrofon disembunyikan, FR 7). */
export function sttConfig() {
  if (process.env.AI_STT_ENABLED !== "true") return null;
  const parsed = envSchema.safeParse({
    AI_STT_BASE_URL: process.env.AI_STT_BASE_URL,
    AI_STT_MODEL: process.env.AI_STT_MODEL,
    AI_STT_API_KEY: process.env.AI_STT_API_KEY || undefined,
  });
  if (!parsed.success) {
    console.error(JSON.stringify({ evt: "ai_config", code: "invalid_env", var: "AI_STT_*" }));
    return null;
  }
  return parsed.data;
}

export async function transcribe(audio: Blob, signal?: AbortSignal): Promise<string> {
  const config = sttConfig();
  if (!config) throw new Error("stt_disabled");
  const client = new OpenAI({ apiKey: config.AI_STT_API_KEY, baseURL: config.AI_STT_BASE_URL, maxRetries: 0, timeout: 20_000 });
  const res = await client.audio.transcriptions.create(
    {
      file: await toFile(audio, "rekaman.webm", { type: audio.type || "audio/webm" }),
      model: config.AI_STT_MODEL,
      language: "id",
      prompt: SLANG_PROMPT,
      response_format: "json",
    },
    { signal },
  );
  return res.text.trim().replace(/\s+/g, " ");
}
