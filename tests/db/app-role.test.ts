import { afterAll, beforeAll, expect, test } from "vitest";
import { prisma } from "@/server/db/client";
import { pgCode } from "@/server/db/errors";
import { createTestUser, deleteTestUser } from "./helpers";

// Migrasi 06 (database.md §7.4): `centsible_app` tidak punya hak tabel langsung. Tes memakai `set local role`
// dari koneksi owner — hak yang dihasilkan sama dengan login sebagai centsible_app, tanpa butuh password.
let a: Awaited<ReturnType<typeof createTestUser>>;
const asApp = <T>(fn: (tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0]) => Promise<T>) =>
  prisma.$transaction(async (tx) => {
    await tx.$executeRawUnsafe("set local role centsible_app");
    return fn(tx);
  });

beforeAll(async () => {
  a = await createTestUser("approle");
});
afterAll(async () => {
  await Promise.allSettled([a && deleteTestUser(a.id)]);
  await prisma.$disconnect();
});

test("role: bisa login, bukan superuser, tanpa BYPASSRLS, NOINHERIT, anggota authenticated & service_role", async () => {
  const [r] = await prisma.$queryRaw<{ login: boolean; su: boolean; bypass: boolean; inherit: boolean; auth: boolean; svc: boolean }[]>`
    select rolcanlogin as login, rolsuper as su, rolbypassrls as bypass, rolinherit as inherit,
           pg_has_role('centsible_app', 'authenticated', 'member') as auth,
           pg_has_role('centsible_app', 'service_role', 'member') as svc
    from pg_roles where rolname = 'centsible_app'`;
  expect(r).toEqual({ login: true, su: false, bypass: false, inherit: false, auth: true, svc: true });
});

test("query yang lupa withRls() GAGAL 42501, bukan membocorkan data", async () => {
  for (const q of [
    () => asApp((tx) => tx.transaction.findMany({ take: 1 })),
    () => asApp((tx) => tx.user.findMany({ take: 1 })),
    () => asApp((tx) => tx.insight.findMany({ take: 1 })),
  ]) {
    await expect(q().catch((e) => pgCode(e))).resolves.toBe("42501");
  }
});

test("jalur withRls (authenticated + klaim) tetap jalan dan hanya melihat data sendiri", async () => {
  const rows = await asApp(async (tx) => {
    await tx.$executeRaw`select set_config('request.jwt.claims', ${JSON.stringify(a.claims)}, true)`;
    await tx.$executeRawUnsafe("set local role authenticated");
    return tx.wallet.findMany({ select: { userId: true } });
  });
  expect(rows.length).toBeGreaterThan(0);
  expect(new Set(rows.map((r) => r.userId))).toEqual(new Set([a.id]));
});

test("jalur job terjadwal (service_role) bisa membaca lintas pengguna untuk ringkasan mingguan", async () => {
  const n = await asApp(async (tx) => {
    await tx.$executeRawUnsafe("set local role service_role");
    return tx.user.count();
  });
  expect(n).toBeGreaterThan(0);
});
