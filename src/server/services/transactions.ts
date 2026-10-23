import "server-only";
import type { Prisma } from "@/generated/prisma/client";
import { diffCorrections } from "@/lib/ai/corrections";
import { dateOnlyToDate, dateToDateOnly } from "@/lib/dates";
import { TRANSACTION_PAGE_SIZE, type TransactionFilter, type TransactionInput } from "@/lib/schemas/transaction";
import type { VerifiedDraft } from "@/server/ai/draft-token";
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
  return { wallet, category };
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

/**
 * Simpan dari kartu konfirmasi AI (design §10.3): transaksi `source='text'` dan baris ai_extractions
 * dalam SATU transaksi RLS, jadi gagal di salah satu insert membatalkan keduanya. Metadata AI hanya
 * dari draft yang sudah diverifikasi HMAC; ID kategori/dompet pilihan pengguna dicek ulang di sini.
 */
export async function createTransactionFromAi(claims: JwtClaims, input: TransactionInput, draft: VerifiedDraft) {
  return withRls(claims, async (tx) => {
    const { wallet, category } = await assertActiveRefs(tx, input);
    const trx = await tx.transaction.create({
      data: {
        userId: claims.sub,
        type: input.type,
        amount: BigInt(input.amount),
        categoryId: input.categoryId,
        walletId: input.walletId,
        description: input.description,
        occurredAt: dateOnlyToDate(input.occurredAt),
        source: "text",
      },
    });
    const userCorrections = diffCorrections(
      { ...draft.parsed, categoryId: draft.ids.categoryId, walletId: draft.ids.walletId },
      {
        amount: input.amount,
        type: input.type,
        categoryId: category.id,
        category: category.name,
        walletId: wallet.id,
        wallet: wallet.name,
        description: input.description,
        occurred_at: input.occurredAt,
      },
    );
    // ai_extractions hanya boleh di-insert oleh `authenticated`; kode ini tidak pernah mengubahnya.
    await tx.aiExtraction.create({
      data: {
        userId: claims.sub,
        transactionId: trx.id,
        rawInput: draft.raw,
        inputMode: "text",
        parsedResult: draft.parsed,
        userCorrections,
        confidence: draft.conf,
        modelVersion: draft.mv,
        latencyMs: draft.lat,
      },
    });
    return trx.id;
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
