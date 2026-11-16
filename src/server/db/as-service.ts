import "server-only";
import { prisma } from "./client";
import type { RlsTx } from "./with-rls";

/**
 * Untuk job terjadwal yang memang membaca semua pengguna (arsitektur §8.2): satu transaksi sebagai
 * `service_role`. Sejak migrasi 06 aplikasi login sebagai `centsible_app` yang tidak punya hak tabel
 * langsung, jadi query tanpa withRls()/asService() gagal (42501), bukan membocorkan data.
 * Setiap query di dalamnya WAJIB memfilter `userId` secara eksplisit.
 */
export function asService<T>(fn: (tx: RlsTx) => Promise<T>): Promise<T> {
  return prisma.$transaction(async (tx) => {
    // Konstanta, bukan input pengguna — `set local role` tidak bisa memakai parameter.
    await tx.$executeRawUnsafe("set local role service_role");
    return fn(tx);
  });
}
