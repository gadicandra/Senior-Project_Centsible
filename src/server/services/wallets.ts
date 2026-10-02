import "server-only";
import type { WalletInput } from "@/lib/schemas/settings";
import { withRls, type JwtClaims } from "@/server/db/with-rls";

export type WalletView = {
  id: string;
  name: string;
  type: "cash" | "bank" | "ewallet";
  initialBalance: number;
  balance: number;
  transactionCount: number;
  isDefault: boolean;
  isArchived: boolean;
};

type BalanceRow = {
  wallet_id: string;
  name: string;
  type: WalletView["type"];
  is_default: boolean;
  is_archived: boolean;
  initial_balance: bigint;
  balance: bigint;
  transaction_count: bigint;
};

// BigInt diubah ke Number di sini (batas service), bukan di komponen:
// nilai rupiah jauh di bawah Number.MAX_SAFE_INTEGER (database.md §17.2).
export async function listWallets(claims: JwtClaims): Promise<WalletView[]> {
  const rows = await withRls(claims, (tx) =>
    tx.$queryRaw<BalanceRow[]>`
      select wallet_id, name, type, is_default, is_archived, initial_balance, balance, transaction_count
      from public.wallet_balances
      order by is_archived, is_default desc, lower(name)`,
  );
  return rows.map((r) => ({
    id: r.wallet_id,
    name: r.name,
    type: r.type,
    initialBalance: Number(r.initial_balance),
    balance: Number(r.balance),
    transactionCount: Number(r.transaction_count),
    isDefault: r.is_default,
    isArchived: r.is_archived,
  }));
}

export async function createWallet(claims: JwtClaims, input: WalletInput) {
  await withRls(claims, (tx) =>
    tx.wallet.create({
      data: { userId: claims.sub, name: input.name, type: input.type, initialBalance: BigInt(input.initialBalance) },
    }),
  );
}

export async function updateWallet(claims: JwtClaims, id: string, input: WalletInput) {
  await withRls(claims, (tx) =>
    tx.wallet.update({
      where: { id },
      data: { name: input.name, type: input.type, initialBalance: BigInt(input.initialBalance) },
    }),
  );
}

/** Pindahkan status dompet utama dalam satu transaksi (indeks unik parsial: maks satu per user). */
export async function setDefaultWallet(claims: JwtClaims, id: string) {
  await withRls(claims, async (tx) => {
    const target = await tx.wallet.findUniqueOrThrow({ where: { id } });
    if (target.isArchived) throw new WalletError("Dompet yang diarsipkan tidak bisa jadi dompet utama.");
    await tx.wallet.updateMany({ where: { isDefault: true }, data: { isDefault: false } });
    await tx.wallet.update({ where: { id }, data: { isDefault: true } });
  });
}

export async function setWalletArchived(claims: JwtClaims, id: string, archived: boolean) {
  await withRls(claims, async (tx) => {
    const wallet = await tx.wallet.findUniqueOrThrow({ where: { id } });
    if (archived && wallet.isDefault) {
      throw new WalletError("Pilih dompet utama lain sebelum mengarsipkan dompet ini.");
    }
    await tx.wallet.update({ where: { id }, data: { isArchived: archived } });
  });
}

/** Hapus permanen hanya bila belum pernah dipakai; selain itu harus diarsipkan. */
export async function deleteWallet(claims: JwtClaims, id: string) {
  await withRls(claims, async (tx) => {
    const wallet = await tx.wallet.findUniqueOrThrow({ where: { id }, include: { _count: { select: { transactions: true } } } });
    if (wallet.isDefault) throw new WalletError("Dompet utama tidak bisa dihapus.");
    if (wallet._count.transactions > 0) {
      throw new WalletError("Dompet ini sudah dipakai transaksi. Arsipkan saja agar riwayat tetap utuh.");
    }
    await tx.wallet.delete({ where: { id } });
  });
}

export class WalletError extends Error {}
