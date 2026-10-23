import "server-only";
import { z } from "zod";
import { DRAFT_SECRET_MIN } from "@/lib/ai/limits";
import type { AiProviderId } from "@/server/ai";

// Env AI yang tervalidasi (design §12). Hanya modul ini yang membaca rahasia AI dari process.env.
// Nilai env tidak pernah dicatat atau dikembalikan dalam pesan error; log hanya memuat NAMA variabel.

export type AiConfig = {
  provider: AiProviderId;
  model: string;
  apiKey: string;
  baseURL?: string;
  dailyLimit: number;
};

type AiEnvName =
  | "AI_TEXT_PROVIDER"
  | "AI_TEXT_MODEL"
  | "ANTHROPIC_API_KEY"
  | "AI_TEXT_BASE_URL"
  | "AI_TEXT_API_KEY"
  | "AI_PARSE_DAILY_LIMIT"
  | "AI_DRAFT_SECRET";

const DEFAULT_DAILY_LIMIT = 100;
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1"]);

/** `.env.example` berisi `X=` kosong; string kosong diperlakukan sama dengan tidak di-set. */
const emptyToUndefined = (v: unknown) => (v === "" ? undefined : v);
const optional = <T extends z.ZodType>(schema: T) => z.preprocess(emptyToUndefined, schema.optional());

const providerSchema = optional(z.enum(["anthropic", "openai-compatible", "azure"]));
const modelSchema = z
  .string()
  .min(1)
  .max(100)
  .regex(/^[\w.:\/-]+$/);
const anthropicKeySchema = z.string().min(20);
// https wajib kecuali gateway lokal (arsitektur §0.2.3).
const baseUrlSchema = z.url().refine((value) => {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || (url.protocol === "http:" && LOCAL_HOSTS.has(url.hostname));
  } catch {
    return false;
  }
});
const apiKeySchema = z.string().min(1);
const dailyLimitSchema = optional(
  z
    .string()
    .regex(/^\d{1,5}$/)
    .transform(Number)
    .pipe(z.number().int().min(1).max(10000)),
);

/** Variabel yang wajib untuk tiap provider, beserta aturannya. */
const REQUIRED: Record<AiProviderId, [AiEnvName, z.ZodType][]> = {
  anthropic: [
    ["AI_TEXT_MODEL", modelSchema],
    ["ANTHROPIC_API_KEY", anthropicKeySchema],
  ],
  "openai-compatible": [
    ["AI_TEXT_MODEL", modelSchema],
    ["AI_TEXT_BASE_URL", baseUrlSchema],
    ["AI_TEXT_API_KEY", apiKeySchema],
  ],
  // Azure belum diimplementasikan (Fase 2); bentuknya mengikuti endpoint + key OpenAI.
  azure: [
    ["AI_TEXT_MODEL", modelSchema],
    ["AI_TEXT_BASE_URL", baseUrlSchema],
    ["AI_TEXT_API_KEY", apiKeySchema],
  ],
};

function logInvalidEnv(level: "error" | "warn", name: AiEnvName) {
  console[level](JSON.stringify({ evt: "ai_config", code: "invalid_env", var: name }));
}

let cachedConfig: { value: AiConfig | null } | undefined;
let dailyLimitWarned = false;

/**
 * Konfigurasi provider teks, di-memo per proses. `null` = AI mati (form manual tetap jalan).
 * Provider kosong/tidak di-set → null tanpa log; nilai tidak valid → null + satu log error per nama.
 */
export function getAiConfig(): AiConfig | null {
  if (!cachedConfig) cachedConfig = { value: readAiConfig() };
  return cachedConfig.value;
}

function readAiConfig(): AiConfig | null {
  const provider = providerSchema.safeParse(process.env.AI_TEXT_PROVIDER);
  if (!provider.success) {
    logInvalidEnv("error", "AI_TEXT_PROVIDER");
    return null;
  }
  if (provider.data === undefined) return null;

  const values = new Map<AiEnvName, string>();
  const invalid: AiEnvName[] = [];
  for (const [name, schema] of REQUIRED[provider.data]) {
    // Variabel untuk provider lain tidak dibaca sama sekali, jadi nilai kosongnya tidak berpengaruh.
    const parsed = z.preprocess(emptyToUndefined, schema).safeParse(process.env[name]);
    if (parsed.success) values.set(name, parsed.data as string);
    else invalid.push(name);
  }
  if (getDraftSecret() === null) invalid.push("AI_DRAFT_SECRET");
  if (invalid.length > 0) {
    invalid.forEach((name) => logInvalidEnv("error", name));
    return null;
  }

  const anthropic = provider.data === "anthropic";
  return {
    provider: provider.data,
    model: values.get("AI_TEXT_MODEL")!,
    apiKey: anthropic ? values.get("ANTHROPIC_API_KEY")! : values.get("AI_TEXT_API_KEY")!,
    ...(anthropic ? {} : { baseURL: values.get("AI_TEXT_BASE_URL")! }),
    dailyLimit: getAiDailyLimit(),
  };
}

/**
 * Kunci HMAC draft token. Dibaca setiap panggilan, tidak bergantung pada AI_TEXT_PROVIDER.
 * `null` bila tidak di-set atau < 32 karakter; tidak pernah ada nilai bawaan.
 */
export function getDraftSecret(): string | null {
  const value = emptyToUndefined(process.env.AI_DRAFT_SECRET);
  return typeof value === "string" && value.length >= DRAFT_SECRET_MIN ? value : null;
}

/** AI_PARSE_DAILY_LIMIT tervalidasi (int 1–10000); bawaan 100; tidak valid → 100 + satu warn (nama saja). */
export function getAiDailyLimit(): number {
  const parsed = dailyLimitSchema.safeParse(process.env.AI_PARSE_DAILY_LIMIT);
  if (parsed.success) return parsed.data ?? DEFAULT_DAILY_LIMIT;
  if (!dailyLimitWarned) {
    dailyLimitWarned = true;
    logInvalidEnv("warn", "AI_PARSE_DAILY_LIMIT");
  }
  return DEFAULT_DAILY_LIMIT;
}

/** Khusus test: lupakan memo supaya process.env dibaca ulang. */
export function resetAiConfigForTests(): void {
  cachedConfig = undefined;
  dailyLimitWarned = false;
}
