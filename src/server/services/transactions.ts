import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { dateOnlyToDate, dateToDateOnly } from "@/lib/dates";
import { TRANSACTION_PAGE_SIZE, type TransactionFilter, type TransactionInput } from "@/lib/schemas/transaction";
import { withRls, type JwtClaims, type RlsTx } from "@/server/db/with-rls";

export type TransactionView = {
  id: string;
  type: "income" | "expense";
  amount: number;
  description: string;
  occurredAt: string;
  source: "text" | "voice" | "manual";
  category: { id: string; name: string; icon: string | null; color: string | null };
  wallet: { id: string; name: string };
};

export type TransactionPage = {
  items: TransactionView[];
  total: number;
  page: number;
  pageCount: number;
  totals: { income: number; expense: number };
};

function whereFrom(filter: TransactionFilter): Prisma.TransactionWhereInput {
  // user_id sengaja tidak ditulis: RLS yang membatasi baris (FR 17).
  return {
    type: filter.type,
    categoryId: filter.categoryId,
    walletId: filter.walletId,
    occurredAt: {
      gte: filter.from ? dateOnlyToDate(filter.from) : undefined,
      lte: filter.to ? dateOnlyToDate(filter.to) : undefined,
    },
  };
}

export async function listTransactions(claims: JwtClaims, filter: TransactionFilter): Promise<TransactionPage> {
  const page = filter.page ?? 1;
  const where = whereFrom(filter);
  const [rows, total, sums] = await withRls(claims, (tx) =>
    Promise.all([
      tx.transaction.findMany({
        where,
        // Sesuai indeks transactions_user_occurred_idx (occurred_at desc, created_at desc).
        orderBy: [{ occurredAt: "desc" }, { createdAt: "desc" }],
        skip: (page - 1) * TRANSACTION_PAGE_SIZE,
        take: TRANSACTION_PAGE_SIZE,
        include: {
          category: { select: { id: true, name: true, icon: true, color: true } },
          wallet: { select: { id: true, name: true } },
        },
      }),
      tx.transaction.count({ where }),
      tx.transaction.groupBy({ by: ["type"], where, _sum: { amount: true } }),
    ]),
  );

  const sumOf = (type: "income" | "expense") => Number(sums.find((s) => s.type === type)?._sum.amount ?? 0);
  return {
    items: rows.map((t) => ({
      id: t.id,
      type: t.type,
      amount: Number(t.amount),
      description: t.description,
      occurredAt: dateToDateOnly(t.occurredAt),
      source: t.source,
      category: t.category,
      wallet: t.wallet,
    })),
    total,
    page,
    pageCount: Math.max(1, Math.ceil(total / TRANSACTION_PAGE_SIZE)),
    totals: { income: sumOf("income"), expense: sumOf("expense") },
  };
}

/** Dompet & kategori nonaktif tidak boleh dipakai transaksi baru/ubahan (database.md §17.1). */
async function assertActiveRefs(tx: RlsTx, input: TransactionInput, keep?: { walletId: string; categoryId: string }) {
  const [wallet, category] = await Promise.all([
    tx.wallet.findUnique({ where: { id: input.walletId } }),
    tx.category.findUnique({ where: { id: input.categoryId } }),
  ]);
  if (!wallet) throw new TransactionError("Dompet tidak ditemukan.", "walletId");
  if (!category) throw new TransactionError("Kategori tidak ditemukan.", "categoryId");
  // Saat mengubah transaksi lama, dompet/kategori arsip yang sudah terpasang boleh dipertahankan.
  if (wallet.isArchived && wallet.id !== keep?.walletId) throw new TransactionError("Dompet ini sudah diarsipkan.", "walletId");
  if (category.isArchived && category.id !== keep?.categoryId) {
    throw new TransactionError("Kategori ini sudah diarsipkan.", "categoryId");
  }
  if (category.kind !== input.type) throw new TransactionError("Kategori tidak sesuai dengan jenis transaksi.", "categoryId");
}

export async function createTransaction(claims: JwtClaims, input: TransactionInput) {
  await withRls(claims, async (tx) => {
    await assertActiveRefs(tx, input);
    await tx.transaction.create({
      data: {
        userId: claims.sub,
        type: input.type,
        amount: BigInt(input.amount),
        categoryId: input.categoryId,
        walletId: input.walletId,
        description: input.description,
        occurredAt: dateOnlyToDate(input.occurredAt),
        source: "manual",
      },
    });
  });
}

export async function updateTransaction(claims: JwtClaims, id: string, input: TransactionInput) {
  await withRls(claims, async (tx) => {
    const current = await tx.transaction.findUnique({ where: { id } });
    if (!current) throw new TransactionError("Transaksi tidak ditemukan.");
    await assertActiveRefs(tx, input, { walletId: current.walletId, categoryId: current.categoryId });
    await tx.transaction.update({
      where: { id },
      data: {
        type: input.type,
        amount: BigInt(input.amount),
        categoryId: input.categoryId,
        walletId: input.walletId,
        description: input.description,
        occurredAt: dateOnlyToDate(input.occurredAt),
      },
    });
  });
}

export async function deleteTransaction(claims: JwtClaims, id: string) {
  const { count } = await withRls(claims, (tx) => tx.transaction.deleteMany({ where: { id } }));
  if (count === 0) throw new TransactionError("Transaksi tidak ditemukan.");
}

export class TransactionError extends Error {
  constructor(
    message: string,
    readonly field?: "walletId" | "categoryId",
  ) {
    super(message);
  }
}
