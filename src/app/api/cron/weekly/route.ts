import { timingSafeEqual } from "node:crypto";
import { generateWeeklySummaries } from "@/server/services/weekly";

// GET /api/cron/weekly — dipanggil Vercel Cron Senin 06:00 WIB (vercel.json). Dilindungi CRON_SECRET (arsitektur §0.2).
// ponytail: semua pengguna diproses berurutan dalam satu invokasi (cukup untuk uji coba ±10–50 pengguna).
// Pecah per batch/queue bila jumlah pengguna membuat durasi mendekati maxDuration.
export const maxDuration = 300;

function authorized(header: string | null): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret || secret.length < 16 || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (!authorized(request.headers.get("authorization"))) {
    return new Response("Unauthorized", { status: 401, headers: { "Cache-Control": "no-store" } });
  }
  const result = await generateWeeklySummaries();
  console.info(JSON.stringify({ evt: "weekly_done", ...result }));
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
