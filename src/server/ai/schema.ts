import "server-only";
import { z } from "zod";
import { ENTRY_KINDS } from "@/lib/schemas/settings";
import { AiError, type ParsedTransaction, type UserAiContext } from ".";

// Skema output per pengguna (design §5). Kategori dan dompet adalah enum nama milik pengguna,
// dikirim apa adanya (transform:false) supaya grammar benar-benar membatasinya.

const byCodePoint = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

function uniqueSorted(names: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const name of names) {
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(name);
  }
  // Urutan stabil = kunci cache grammar yang stabil.
  return out.sort(byCodePoint);
}

/** Konteks tanpa kategori pengeluaran/pemasukan aktif atau tanpa dompet tidak bisa dipakai AI. */
export function assertUsableContext(ctx: UserAiContext): void {
  const hasExpense = ctx.categories.some((c) => c.kind === "expense");
  const hasIncome = ctx.categories.some((c) => c.kind === "income");
  if (!hasExpense || !hasIncome || ctx.wallets.length === 0) {
    throw new AiError("not_configured", undefined, "empty_enum");
  }
}

/** Nama kategori aktif kedua jenis, unik tanpa memandang huruf besar (ejaan pertama dipakai), terurut. */
export function categoryNames(ctx: UserAiContext): [string, ...string[]] {
  assertUsableContext(ctx);
  return uniqueSorted(ctx.categories.map((c) => c.name)) as [string, ...string[]];
}

/** Nama dompet aktif, terurut. */
export function walletNames(ctx: UserAiContext): [string, ...string[]] {
  assertUsableContext(ctx);
  return uniqueSorted(ctx.wallets.map((w) => w.name)) as [string, ...string[]];
}

/** JSON Schema wire. Hanya kata kunci yang didukung grammar (tanpa minimum/maximum/pattern/$schema). */
export type WireJsonSchema = {
  type: "object";
  additionalProperties: false;
  required: (keyof ParsedTransaction)[];
  properties: {
    amount: { type: "integer"; description: string };
    type: { type: "string"; enum: string[] };
    category: { type: "string"; enum: string[] };
    wallet: { anyOf: [{ type: "string"; enum: string[] }, { type: "null" }] };
    description: { type: "string"; description: string };
    occurred_at: { type: "string"; format: "date"; description: string };
    confidence: { type: "number"; description: string };
  };
};

export function buildWireJsonSchema(ctx: UserAiContext): WireJsonSchema {
  return {
    type: "object",
    additionalProperties: false,
    required: ["amount", "type", "category", "wallet", "description", "occurred_at", "confidence"],
    properties: {
      amount: { type: "integer", description: "Nominal rupiah, bilangan bulat > 0 (gocap = 50000)" },
      type: { type: "string", enum: ["income", "expense"] },
      category: { type: "string", enum: categoryNames(ctx) },
      wallet: { anyOf: [{ type: "string", enum: walletNames(ctx) }, { type: "null" }] },
      description: { type: "string", description: "Keterangan singkat, maks 60 karakter, tanpa nominal/tanggal/dompet" },
      occurred_at: { type: "string", format: "date", description: "YYYY-MM-DD" },
      confidence: { type: "number", description: "0 sampai 1" },
    },
  };
}

function canonical(value: unknown, members: readonly string[]): unknown {
  if (typeof value !== "string") return value;
  const key = value.trim().toLowerCase();
  return members.find((m) => m.toLowerCase() === key) ?? value;
}

/** Structured output tidak menjamin huruf besar/kecil enum: samakan dengan anggota enum (setelah trim). */
export function canonicalize(raw: unknown, ctx: UserAiContext): unknown {
  if (raw === null || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const obj = { ...(raw as Record<string, unknown>) };
  if ("type" in obj) obj.type = canonical(obj.type, ENTRY_KINDS);
  if ("category" in obj) obj.category = canonical(obj.category, categoryNames(ctx));
  if ("wallet" in obj) obj.wallet = canonical(obj.wallet, walletNames(ctx));
  return obj;
}

/** Validator wire. Batas rentang sengaja tidak di sini; normalize() yang menangani dan memberi tanda. */
export function wireZod(ctx: UserAiContext) {
  return z.strictObject({
    amount: z.number().int(),
    type: z.enum(ENTRY_KINDS),
    category: z.enum(categoryNames(ctx)),
    wallet: z.enum(walletNames(ctx)).nullable(),
    // Hanya pengaman sampah; normalize() memotong ke DESCRIPTION_MAX.
    description: z.string().max(500),
    occurred_at: z.string(),
    confidence: z.number(),
  });
}

/**
 * Validasi output model (sudah berupa nilai JSON). Gagal → AiError("invalid_output").
 * Isu Zod tidak dicatat di sini karena bisa memuat teks pengguna.
 */
export function validateWire(raw: unknown, ctx: UserAiContext): ParsedTransaction {
  const result = wireZod(ctx).safeParse(canonicalize(raw, ctx));
  if (!result.success) throw new AiError("invalid_output");
  return result.data;
}
