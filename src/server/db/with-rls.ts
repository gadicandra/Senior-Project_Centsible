import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { prisma } from "./client";

export type RlsTx = Prisma.TransactionClient;
export type JwtClaims = { sub: string } & Record<string, unknown>;

/**
 * Menjalankan fn() sebagai role `authenticated` dengan klaim JWT pengguna,
 * sehingga policy RLS di basis data yang menentukan baris mana yang terlihat.
 * `set local` + set_config(..., true) otomatis kembali saat transaksi selesai,
 * jadi tidak ada kebocoran antar-request. Lihat docs/database.md §7.4.
 */
export async function withRls<T>(claims: JwtClaims, fn: (tx: RlsTx) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`select set_config('request.jwt.claims', ${JSON.stringify(claims)}, true)`;
    // Konstanta, bukan input pengguna — `set local role` tidak bisa memakai parameter.
    await tx.$executeRawUnsafe("set local role authenticated");
    return fn(tx);
  });
}
