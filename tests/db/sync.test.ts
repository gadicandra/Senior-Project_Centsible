import { afterAll, beforeAll, expect, test } from "vitest";
import { prisma } from "@/server/db/client";
import { withRls } from "@/server/db/with-rls";
import { listCategories } from "@/server/services/categories";
import { createTransaction } from "@/server/services/transactions";
import { listWallets } from "@/server/services/wallets";
import { createTestUser, deleteTestUser } from "./helpers";

let a: Awaited<ReturnType<typeof createTestUser>>;
let b: Awaited<ReturnType<typeof createTestUser>>;
let input: Parameters<typeof createTransaction>[1];
const CLIENT = crypto.randomUUID();

beforeAll(async () => {
  [a, b] = await Promise.all([createTestUser("sync-a"), createTestUser("sync-b")]);
  const walletId = (await listWallets(a.claims)).find((w) => w.isDefault)!.id;
  const categoryId = (await listCategories(a.claims)).find((c) => c.name === "Makan" && c.kind === "expense")!.id;
  input = { type: "expense", amount: 25_000, categoryId, walletId, occurredAt: "2026-10-02", description: "offline" };
});

afterAll(async () => {
  await Promise.allSettled([a && deleteTestUser(a.id), b && deleteTestUser(b.id)]);
  await prisma.$disconnect();
});

test("clientId idempoten: kirim ulang tidak menggandakan (FR 16)", async () => {
  expect(await createTransaction(a.claims, input, CLIENT)).toBe(true);
  expect(await createTransaction(a.claims, input, CLIENT)).toBe(false);
  const rows = await withRls(a.claims, (tx) => tx.transaction.findMany({ where: { clientId: CLIENT } }));
  expect(rows).toHaveLength(1);
  expect(rows[0]).toMatchObject({ source: "manual", amount: 25_000n });
});

test("clientId sama milik pengguna lain tidak bentrok", async () => {
  const walletId = (await listWallets(b.claims)).find((w) => w.isDefault)!.id;
  const categoryId = (await listCategories(b.claims)).find((c) => c.name === "Makan" && c.kind === "expense")!.id;
  expect(await createTransaction(b.claims, { ...input, walletId, categoryId }, CLIENT)).toBe(true);
});

test("tanpa clientId tetap boleh berulang (form online biasa)", async () => {
  await createTransaction(a.claims, input);
  await createTransaction(a.claims, input);
  expect(await withRls(a.claims, (tx) => tx.transaction.count({ where: { clientId: null } }))).toBe(2);
});
