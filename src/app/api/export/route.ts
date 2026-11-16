import { toCsv } from "@/lib/csv";
import { todayIn } from "@/lib/dates";
import { transactionFilterSchema } from "@/lib/schemas/transaction";
import { getClaims } from "@/server/auth/session";
import { getTimezone } from "@/server/services/profile";
import { exportTransactions } from "@/server/services/transactions";

const TYPE_LABEL = { income: "Pemasukan", expense: "Pengeluaran" } as const;
const HEADER = ["Tanggal", "Jenis", "Nominal", "Kategori", "Dompet", "Keterangan"];

// GET /api/export?from&to&type&categoryId&walletId → CSV (FR 15). Filter sama dengan /transaksi.
// Hanya membaca, jadi GET aman: situs lain bisa memicu unduhan tapi tidak bisa membaca isinya.
export async function GET(request: Request) {
  const claims = await getClaims();
  if (!claims) return new Response("Unauthorized", { status: 401, headers: { "Cache-Control": "no-store" } });

  const params = Object.fromEntries(new URL(request.url).searchParams);
  const filter = transactionFilterSchema.omit({ page: true }).parse(params);
  const [rows, timezone] = await Promise.all([exportTransactions(claims, filter), getTimezone(claims)]);

  const csv = toCsv(
    HEADER,
    rows.map((r) => [r.occurredAt, TYPE_LABEL[r.type], r.amount, r.category, r.wallet, r.description]),
  );
  const name = `centsible-transaksi-${filter.from ?? "awal"}-sd-${filter.to ?? todayIn(timezone)}.csv`;
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${name}"`,
      "Cache-Control": "no-store",
    },
  });
}
