import { afterAll, beforeAll, expect, test } from "vitest";
import { historyWindow } from "@/lib/anomaly";
import { prisma } from "@/server/db/client";
import { getAnomalies } from "@/server/services/anomalies";
import { listCategories } from "@/server/services/categories";
import { createTransaction } from "@/server/services/transactions";
import { listWallets } from "@/server/services/wallets";
import { createTestUser, deleteTestUser } from "./helpers";

// Kamis 15 Okt 2026 (Asia/Jakarta) → minggu berjalan 12–18 Okt, riwayat 17 Agu..5 Okt.
const NOW = new Date("2026-10-15T05:00:00Z");
let a: Awaited<ReturnType<typeof createTestUser>>;
let b: Awaited<ReturnType<typeof createTestUser>>;
let makan: string;

beforeAll(async () => {
  [a, b] = await Promise.all([createTestUser("anom-a"), createTestUser("anom-b")]);
  const walletId = (await listWallets(a.claims)).find((w) => w.isDefault)!.id;
  const cats = await listCategories(a.claims);
  makan = cats.find((c) => c.name === "Makan" && c.kind === "expense")!.id;
  const uangSaku = cats.find((c) => c.name === "Uang Saku")!.id;
  const tx = (type: "income" | "expense", amount: number, categoryId: string, occurredAt: string) =>
    createTransaction(a.claims, { type, amount, categoryId, occurredAt, walletId, description: "" });
  for (const week of historyWindow("2026-10-15").weeks) await tx("expense", 100_000, makan, week);
  await tx("expense", 450_000, makan, "2026-10-13");
  await tx("income", 5_000_000, uangSaku, "2026-10-13"); // pemasukan tidak pernah dihitung
});

afterAll(async () => {
  await Promise.allSettled([a && deleteTestUser(a.id), b && deleteTestUser(b.id)]);
  await prisma.$disconnect();
});

test("Makan minggu ini 4,5× kebiasaan → satu anomali nominal (FR 14)", async () => {
  expect(await getAnomalies(a.claims, NOW)).toEqual([
    { categoryId: makan, kind: "amount", current: 450_000, median: 100_000, ratio: 4.5, name: "Makan", icon: expect.anything(), from: "2026-10-12", to: "2026-10-15" },
  ]);
});

test("RLS: pengguna lain tidak melihat anomali A", async () => {
  expect(await getAnomalies(b.claims, NOW)).toEqual([]);
});
