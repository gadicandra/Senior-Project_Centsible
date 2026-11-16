import { AI_TEXT_UI_MAX_CHARS } from "@/lib/ai/limits";
import { isSameOriginRequest } from "@/server/auth/origin";
import { getClaims } from "@/server/auth/session";
import { pgCode } from "@/server/db/errors";
import { withRls } from "@/server/db/with-rls";
import { getAiDailyLimit } from "@/server/env";
import { sttConfig, transcribe } from "@/server/ai/transcribe";

// POST /api/ai/transcribe (FR 6): rekaman suara → teks. Hanya transkripsi; teksnya dimasukkan ke kolom
// input lalu dikirim ke /api/ai/parse seperti ketikan biasa, jadi tetap berakhir di kartu konfirmasi (FR 4).
// Audio tidak disimpan dan tidak dicatat (arsitektur §8.1).

export const maxDuration = 30;
/** ±30 dtk Opus/WebM jauh di bawah ini; di bawah batas body Vercel 4,5 MB. */
const MAX_BYTES = 2 * 1024 * 1024;

const json = (body: unknown, status: number) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
const fail = (status: number, code: string, message: string) => json({ ok: false, error: { code, message } }, status);

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return fail(403, "forbidden_origin", "Permintaan ditolak.");
  const claims = await getClaims();
  if (!claims) return fail(401, "unauthorized", "Sesi berakhir. Silakan masuk lagi.");
  if (!sttConfig()) return fail(503, "stt_unavailable", "Input suara sedang tidak tersedia. Silakan ketik.");

  const declared = Number(request.headers.get("content-length") ?? 0);
  if (declared > MAX_BYTES) return fail(413, "payload_too_large", "Rekaman terlalu panjang. Maksimal 30 detik.");
  let audio: Blob;
  try {
    const form = await request.formData();
    const file = form.get("audio");
    if (!(file instanceof Blob) || file.size === 0) return fail(400, "invalid_body", "Rekaman kosong.");
    if (file.size > MAX_BYTES) return fail(413, "payload_too_large", "Rekaman terlalu panjang. Maksimal 30 detik.");
    if (!/^audio\//.test(file.type)) return fail(415, "unsupported_media_type", "Format rekaman tidak didukung.");
    audio = file;
  } catch {
    return fail(400, "invalid_body", "Rekaman tidak terbaca.");
  }

  try {
    await withRls(claims, (tx) => tx.$queryRaw`select public.consume_ai_quota('transcribe', ${getAiDailyLimit()}::int)`);
  } catch (err) {
    if (pgCode(err) === "53400") return fail(429, "quota_exceeded", "Kuota AI hari ini sudah habis. Silakan ketik.");
    console.error(JSON.stringify({ evt: "stt_failed", code: pgCode(err) ?? "quota_error" }));
    return fail(500, "internal", "Terjadi kesalahan. Silakan ketik.");
  }

  try {
    const text = (await transcribe(audio, request.signal)).slice(0, AI_TEXT_UI_MAX_CHARS);
    if (!text) return fail(422, "no_speech", "Suara tidak terdengar jelas. Coba rekam ulang atau ketik.");
    console.info(JSON.stringify({ evt: "stt_ok", bytes: audio.size, chars: text.length }));
    return json({ ok: true, text }, 200);
  } catch (err) {
    console.error(JSON.stringify({ evt: "stt_failed", code: (err as Error)?.name ?? "unknown" }));
    return fail(503, "stt_unavailable", "Input suara sedang tidak tersedia. Silakan ketik.");
  }
}
