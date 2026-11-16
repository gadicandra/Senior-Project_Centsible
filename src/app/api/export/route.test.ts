// @vitest-environment node
import { beforeEach, expect, test, vi } from "vitest";
import { getClaims } from "@/server/auth/session";
import { exportTransactions } from "@/server/services/transactions";
import { GET } from "./route";

vi.mock("@/server/auth/session", () => ({ getClaims: vi.fn(), requireClaims: vi.fn() }));
vi.mock("@/server/services/profile", () => ({ getTimezone: vi.fn(async () => "Asia/Jakarta") }));
vi.mock("@/server/services/transactions", () => ({ exportTransactions: vi.fn(async () => []) }));

const CLAIMS = { sub: "11111111-1111-4111-8111-111111111111" };
const CAT = "22222222-2222-4222-8222-222222222222";
const get = (qs = "") => GET(new Request(`http://localhost:3000/api/export${qs}`));

beforeEach(() => vi.clearAllMocks());

test("tanpa sesi → 401, service tidak dipanggil", async () => {
  vi.mocked(getClaims).mockResolvedValueOnce(null);
  expect((await get()).status).toBe(401);
  expect(exportTransactions).not.toHaveBeenCalled();
});

test("filter diteruskan, nilai tidak valid & page dibuang", async () => {
  vi.mocked(getClaims).mockResolvedValueOnce(CLAIMS);
  await get(`?from=2026-10-01&to=2026-10-31&type=expense&categoryId=${CAT}&walletId=bukan-uuid&page=3`);
  expect(exportTransactions).toHaveBeenCalledWith(CLAIMS, {
    from: "2026-10-01",
    to: "2026-10-31",
    type: "expense",
    categoryId: CAT,
    walletId: undefined,
  });
});

test("isi CSV, header unduhan, dan sel rumus dinetralkan", async () => {
  vi.mocked(getClaims).mockResolvedValueOnce(CLAIMS);
  vi.mocked(exportTransactions).mockResolvedValueOnce([
    { occurredAt: "2026-10-02", type: "expense", amount: 25_000, category: "Makan", wallet: "Tunai", description: "nasi, telur" },
    { occurredAt: "2026-10-03", type: "income", amount: 1_000_000, category: "Uang Saku", wallet: "BCA", description: "=SUM(A1)" },
  ]);
  const res = await get("?from=2026-10-01&to=2026-10-31");
  expect(res.headers.get("content-type")).toBe("text/csv; charset=utf-8");
  expect(res.headers.get("content-disposition")).toBe('attachment; filename="centsible-transaksi-2026-10-01-sd-2026-10-31.csv"');
  expect(res.headers.get("cache-control")).toBe("no-store");
  const bytes = new Uint8Array(await res.arrayBuffer());
  expect([...bytes.slice(0, 3)]).toEqual([0xef, 0xbb, 0xbf]); // BOM UTF-8 untuk Excel
  expect(new TextDecoder().decode(bytes.slice(3))).toBe(
    "Tanggal,Jenis,Nominal,Kategori,Dompet,Keterangan\r\n" +
      '2026-10-02,Pengeluaran,25000,Makan,Tunai,"nasi, telur"\r\n' +
      "2026-10-03,Pemasukan,1000000,Uang Saku,BCA,'=SUM(A1)\r\n",
  );
});
