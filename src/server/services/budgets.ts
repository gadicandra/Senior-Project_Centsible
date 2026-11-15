import "server-only";
import { budgetUsage, periodRange, sortBudgets, weekRange, type BudgetOverview, type DateRange } from "@/lib/budget";
import { dateOnlyToDate, monthRange, todayIn } from "@/lib/dates";
import { BUDGET_NOT_FOUND, BUDGET_PERIOD_LABEL, type BudgetCreateInput } from "@/lib/schemas/budget";
import { withRls, type JwtClaims, type RlsTx } from "@/server/db/with-rls";

export class BudgetError extends Error {
  constructor(
    message: string,
    readonly field?: "categoryId" | "amountLimit",
  ) {
    super(message);
  }
}

const expenseByCategory = (tx: RlsTx, r: DateRange) =>
  // user_id sengaja tidak ditulis: RLS yang membatasi baris (FR 17).
  // Belum ada konsep transfer (entry_kind = income|expense). Bila ditambahkan, kecualikan di sini.
  tx.transaction.groupBy({
    by: ["categoryId"],
    where: { type: "expense", occurredAt: { gte: dateOnlyToDate(r.from), lte: dateOnlyToDate(r.to) } },
    _sum: { amount: true },
  });

export async function getBudgetOverview(claims: JwtClaims, now: Date = new Date()): Promise<BudgetOverview> {
  const { today, week, month, rows, weekly, monthly } = await withRls(claims, async (tx) => {
    const user = await tx.user.findUnique({ where: { id: claims.sub }, select: { timezone: true } });
    const today = todayIn(user?.timezone ?? "Asia/Jakarta", now);
    const week = weekRange(today);
    const month = monthRange(today);
    const [rows, weekly, monthly] = await Promise.all([
      tx.budget.findMany({
        where: { isActive: true },
        select: {
          id: true,
          categoryId: true,
          period: true,
          amountLimit: true,
          category: { select: { name: true, icon: true, color: true, isArchived: true } },
        },
      }),
      expenseByCategory(tx, week),
      expenseByCategory(tx, month),
    ]);
    return { today, week, month, rows, weekly, monthly };
  });

  const toMap = (g: typeof weekly) => new Map(g.map((r) => [r.categoryId, Number(r._sum.amount ?? 0)]));
  const used = { weekly: toMap(weekly), monthly: toMap(monthly) };
  const budgets = rows.map((b) => ({
    id: b.id,
    categoryId: b.categoryId,
    period: b.period,
    ...b.category,
    ...(b.period === "weekly" ? week : month),
    ...budgetUsage(used[b.period].get(b.categoryId) ?? 0, Number(b.amountLimit)),
  }));
  return { today, week, month, budgets: sortBudgets(budgets) };
}

export const duplicateMessage = (period: BudgetCreateInput["period"]) =>
  `Kategori ini sudah punya anggaran ${BUDGET_PERIOD_LABEL[period].toLowerCase()}.`;

/** `today` = todayIn(zona pengguna), dihitung di Server Action. */
export async function createBudget(claims: JwtClaims, input: BudgetCreateInput, today: string) {
  await withRls(claims, async (tx) => {
    const category = await tx.category.findUnique({
      where: { id: input.categoryId },
      select: { kind: true, isArchived: true },
    });
    // Kategori milik pengguna lain tidak terlihat karena RLS → null.
    if (!category) throw new BudgetError("Kategori tidak ditemukan.", "categoryId");
    if (category.kind !== "expense") throw new BudgetError("Anggaran hanya untuk kategori pengeluaran.", "categoryId");
    if (category.isArchived) throw new BudgetError("Kategori ini sudah diarsipkan.", "categoryId");

    const key = { userId: claims.sub, categoryId: input.categoryId, period: input.period };
    const data = {
      amountLimit: BigInt(input.amountLimit),
      startDate: dateOnlyToDate(periodRange(input.period, today).from),
      isActive: true,
    };
    const existing = await tx.budget.findUnique({
      where: { userId_categoryId_period: key },
      select: { id: true, isActive: true },
    });
    if (existing?.isActive) throw new BudgetError(duplicateMessage(input.period), "categoryId");
    // Baris nonaktif masih memegang kunci unik: hidupkan lagi, jangan buat baru.
    if (existing) await tx.budget.update({ where: { id: existing.id }, data });
    else await tx.budget.create({ data: { ...key, ...data } });
  });
}

export async function updateBudgetLimit(claims: JwtClaims, id: string, amountLimit: number) {
  const { count } = await withRls(claims, (tx) =>
    tx.budget.updateMany({ where: { id, isActive: true }, data: { amountLimit: BigInt(amountLimit) } }),
  );
  if (count === 0) throw new BudgetError(BUDGET_NOT_FOUND);
}

export async function deleteBudget(claims: JwtClaims, id: string) {
  const { count } = await withRls(claims, (tx) => tx.budget.deleteMany({ where: { id } }));
  if (count === 0) throw new BudgetError(BUDGET_NOT_FOUND);
}
