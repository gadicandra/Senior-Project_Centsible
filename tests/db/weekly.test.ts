import { afterAll, beforeAll, expect, test } from "vitest";
import { prisma } from "@/server/db/client";
import { listCategories } from "@/server/services/categories";
import { createTransaction } from "@/server/services/transactions";
import { listWallets } from "@/server/services/wallets";
import { dedupeKey, generateWeeklySummaries, getLatestWeekly, lastWeek } from "@/server/services/weekly";
import { createTestUser, deleteTestUser } from "./helpers";

// Senin 16 Nov 2026 07:00 WIB → minggu lalu 9–15 Nov; 4 minggu sebelumnya 12 Okt–8 Nov.
const NOW = new Date("2026-11-16T00:00:00Z");
let a: Awaited<ReturnType<typeof createTestUser>>;
let b: Awaited<ReturnType<typeof createTestUser>>;
const saved = process.env.AI_TEXT_PROVIDER;

beforeAll(async () => {
  delete process.env.AI_TEXT_PROVIDER; // uji jalur templat; jalur AI dites terpisah tanpa DB
  [a, b] = await Promise.all([createTestUser("wk-a"), createTestUser("wk-b")]);
  const walletId = (await listWallets(a.claims)).find((w) => w.isDefault)!.id;
  const makan = (await listCategories(a.claims)).find((c) => c.name === "Makan" && c.kind === "expense")!.id;
  const tx = (amount: number, occurredAt: string) =>
    createTransaction(a.claims, { type: "expense", amount, categoryId: makan, walletId, occurredAt, description: "" });
  for (const d of ["2026-10-14", "2026-10-21", "2026-10-28", "2026-11-04"]) await tx(200_000, d);
  await tx(300_000, "2026-11-12");
});

afterAll(async () => {
  if (saved !== undefined) process.env.AI_TEXT_PROVIDER = saved;
  await Promise.allSettled([a && deleteTestUser(a.id), b && deleteTestUser(b.id)]);
  await prisma.$disconnect();
});

test("lastWeek mengikuti zona waktu pengguna", () => {
  expect(lastWeek("Asia/Jakarta", NOW)).toEqual({ from: "2026-11-09", to: "2026-11-15" });
  expect(lastWeek("UTC", new Date("2026-11-15T23:00:00Z"))).toEqual({ from: "2026-11-02", to: "2026-11-08" });
});

test("job membuat satu insight per pengguna aktif, idempoten, dan terbaca lewat RLS (FR 13)", async () => {
  const first = await generateWeeklySummaries(NOW);
  expect(first.failed).toBe(0);
  const row = await prisma.insight.findUniqueOrThrow({ where: { userId_dedupeKey: { userId: a.id, dedupeKey: dedupeKey("2026-11-09") } } });
  expect(row.kind).toBe("weekly_summary");
  expect(row.content).toContain("Saran: buat anggaran mingguan Makan");
  expect(row.payload).toMatchObject({ total_expense: 300_000, avg4_expense: 200_000, model: "template" });

  await generateWeeklySummaries(NOW);
  expect(await prisma.insight.count({ where: { userId: a.id, kind: "weekly_summary" } })).toBe(1);

  expect(await getLatestWeekly(a.claims)).toMatchObject({ periodStart: "2026-11-09", periodEnd: "2026-11-15" });
  expect(await getLatestWeekly(b.claims)).toBeNull();
  expect(await prisma.insight.count({ where: { userId: b.id } })).toBe(0); // B tidak punya transaksi
});
