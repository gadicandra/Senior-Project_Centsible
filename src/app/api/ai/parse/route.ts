import { AI_BODY_MAX_BYTES } from "@/lib/ai/limits";
import { parseRequestSchema } from "@/lib/ai/request";
import type { ParseErrorCode, ParseFailure, ParseSuccess } from "@/lib/ai/types";
import { logAiEvent } from "@/server/ai/log";
import { isSameOriginRequest } from "@/server/auth/origin";
import { getClaims } from "@/server/auth/session";
import { parseFailure, parseTransactionText } from "@/server/services/ai-parse";

// POST /api/ai/parse (design §9.1): kalimat → usulan transaksi. Tidak pernah menyimpan transaksi.
// Hanya POST yang diekspor, jadi metode lain dijawab 405 oleh Next.

/** Pengaman tingkat platform; deadline AI sendiri 8 dtk. */
export const maxDuration = 15;

const respond = (body: ParseSuccess | ParseFailure, status: number) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const reject = (status: number, code: ParseErrorCode, message?: string) =>
  respond(parseFailure(code, undefined, message), status);

/** Baca body maksimal `max` byte, termasuk body chunked tanpa Content-Length. `null` = terlalu besar. */
async function readBodyCapped(request: Request, max: number): Promise<string | null> {
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  // fatal: UTF-8 rusak melempar TypeError (→ 400).
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

/** Pesan 400: pesan Indonesia milik skema untuk `text`, selain itu pesan umum (tanpa pesan bawaan Zod). */
function invalidBodyMessage(issue: { path: PropertyKey[]; code: string; message: string } | undefined) {
  if (issue && issue.path[0] === "text" && (issue.code === "too_small" || issue.code === "too_big")) {
    return issue.message;
  }
  return undefined;
}

export async function POST(request: Request) {
  // 1. CSRF: Origin wajib dan sama host, sebelum menyentuh sesi.
  if (!isSameOriginRequest(request)) {
    logAiEvent({ evt: "ai_parse", outcome: "rejected", code: "forbidden_origin" }, "warn");
    return reject(403, "forbidden_origin");
  }

  try {
    // 2. Sesi (JWT diverifikasi). Proxy juga memeriksa, tetapi ini gerbang yang menentukan.
    const claims = await getClaims();
    if (!claims) return reject(401, "unauthorized");

    // 3. Content-Type.
    const mediaType = request.headers.get("content-type")?.split(";")[0].trim().toLowerCase();
    if (mediaType !== "application/json") return reject(415, "unsupported_media_type");

    // 4. Ukuran body: tolak dari header bila bisa, lalu baca dengan batas keras.
    const declared = request.headers.get("content-length");
    if (declared !== null && Number(declared) > AI_BODY_MAX_BYTES) return reject(413, "payload_too_large");
    let raw: string | null;
    try {
      raw = await readBodyCapped(request, AI_BODY_MAX_BYTES);
    } catch {
      return reject(400, "invalid_body");
    }
    if (raw === null) return reject(413, "payload_too_large");

    // 5. JSON + skema (normalisasi teks, 1–500 karakter, tanpa key lain).
    let json: unknown;
    try {
      json = JSON.parse(raw);
    } catch {
      return reject(400, "invalid_body");
    }
    const parsed = parseRequestSchema.safeParse(json);
    if (!parsed.success) return reject(400, "invalid_body", invalidBodyMessage(parsed.error.issues[0]));

    // 6. Layanan: kuota → konteks → AI → normalisasi → draft bertanda tangan.
    const result = await parseTransactionText(claims, parsed.data.text, request.signal);
    return respond(result.body, result.status);
  } catch (err) {
    // Hanya nama error yang dicatat; isi/stack tidak pernah masuk log atau respons.
    logAiEvent({ evt: "ai_fallback", outcome: "internal", code: err instanceof Error ? err.name : "unknown" }, "error");
    return reject(500, "internal");
  }
}
