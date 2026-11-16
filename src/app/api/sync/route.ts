import { z } from "zod";
import { todayIn } from "@/lib/dates";
import { uuid } from "@/lib/schemas/fields";
import { transactionSchema } from "@/lib/schemas/transaction";
import { isSameOriginRequest } from "@/server/auth/origin";
import { getClaims } from "@/server/auth/session";
import { isUniqueViolation } from "@/server/db/errors";
import { getTimezone } from "@/server/services/profile";
import { TransactionError, createTransaction } from "@/server/services/transactions";

// POST /api/sync (FR 16, arsitektur §7.4): kirim antrean transaksi form manual yang dicatat offline.
// Tiap item divalidasi ulang dengan skema yang sama dengan form; `clientId` membuat kirim ulang aman.

const MAX_ITEMS = 50;
const bodySchema = z.object({
  items: z
    .array(z.object({ clientId: uuid, values: z.record(z.string(), z.string().max(500)) }))
    .min(1)
    .max(MAX_ITEMS),
});

/** done = sudah ada di server (hapus dari antrean). rejected = tidak akan pernah valid (hapus + beri tahu). */
export type SyncResult = { clientId: string; status: "done" | "rejected"; message?: string };

const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: Request) {
  if (!isSameOriginRequest(request)) return json({ error: "forbidden_origin" }, 403);
  const claims = await getClaims();
  if (!claims) return json({ error: "unauthorized" }, 401);

  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "invalid_body" }, 400);

  const schema = transactionSchema(todayIn(await getTimezone(claims)));
  const results: SyncResult[] = [];
  // Berurutan: urutan pencatatan dipertahankan dan koneksi DB tidak dibanjiri.
  for (const { clientId, values } of parsed.data.items) {
    const input = schema.safeParse(values);
    if (!input.success) {
      results.push({ clientId, status: "rejected", message: input.error.issues[0]?.message });
      continue;
    }
    try {
      await createTransaction(claims, input.data, clientId);
      results.push({ clientId, status: "done" });
    } catch (error) {
      // Balapan dua tab mengirim item yang sama: baris sudah ada, jadi anggap selesai.
      if (isUniqueViolation(error)) results.push({ clientId, status: "done" });
      else if (error instanceof TransactionError) results.push({ clientId, status: "rejected", message: error.message });
      // Error lain (DB putus, timeout): hentikan, sisanya dicoba lagi nanti tanpa hilang.
      else {
        console.error("sync_failed", error);
        break;
      }
    }
  }
  return json({ results });
}
