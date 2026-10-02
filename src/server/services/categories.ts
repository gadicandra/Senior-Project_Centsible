import "server-only";
import type { CategoryInput } from "@/lib/schemas/settings";
import { withRls, type JwtClaims } from "@/server/db/with-rls";

export type CategoryView = {
  id: string;
  name: string;
  kind: "income" | "expense";
  icon: string | null;
  color: string | null;
  isSystem: boolean;
  isArchived: boolean;
  transactionCount: number;
};

export async function listCategories(claims: JwtClaims): Promise<CategoryView[]> {
  const rows = await withRls(claims, (tx) =>
    tx.category.findMany({
      orderBy: [{ isArchived: "asc" }, { kind: "asc" }, { name: "asc" }],
      include: { _count: { select: { transactions: true } } },
    }),
  );
  return rows.map(({ _count, ...c }) => ({
    id: c.id,
    name: c.name,
    kind: c.kind,
    icon: c.icon,
    color: c.color,
    isSystem: c.isSystem,
    isArchived: c.isArchived,
    transactionCount: _count.transactions,
  }));
}

export async function createCategory(claims: JwtClaims, input: CategoryInput) {
  await withRls(claims, (tx) => tx.category.create({ data: { userId: claims.sub, ...input } }));
}

/** Jenis (income/expense) tidak bisa diubah setelah dibuat: transaksi lama terikat ke jenisnya (FK majemuk). */
export async function updateCategory(claims: JwtClaims, id: string, input: Omit<CategoryInput, "kind">) {
  await withRls(claims, (tx) =>
    tx.category.update({ where: { id }, data: { name: input.name, icon: input.icon, color: input.color } }),
  );
}

export async function setCategoryArchived(claims: JwtClaims, id: string, archived: boolean) {
  await withRls(claims, async (tx) => {
    if (archived) {
      const target = await tx.category.findUniqueOrThrow({ where: { id } });
      const remaining = await tx.category.count({ where: { kind: target.kind, isArchived: false, id: { not: id } } });
      // Skema AI butuh minimal satu kategori aktif per jenis (enum tidak boleh kosong).
      if (remaining === 0) throw new CategoryError("Harus ada minimal satu kategori aktif untuk jenis ini.");
    }
    await tx.category.update({ where: { id }, data: { isArchived: archived } });
  });
}

export async function deleteCategory(claims: JwtClaims, id: string) {
  await withRls(claims, async (tx) => {
    const category = await tx.category.findUniqueOrThrow({
      where: { id },
      include: { _count: { select: { transactions: true, budgets: true } } },
    });
    if (category._count.transactions > 0) {
      throw new CategoryError("Kategori ini sudah dipakai transaksi. Arsipkan saja agar riwayat tetap utuh.");
    }
    const remaining = await tx.category.count({ where: { kind: category.kind, isArchived: false, id: { not: id } } });
    if (!category.isArchived && remaining === 0) {
      throw new CategoryError("Harus ada minimal satu kategori aktif untuk jenis ini.");
    }
    await tx.category.delete({ where: { id } });
  });
}

export class CategoryError extends Error {}
