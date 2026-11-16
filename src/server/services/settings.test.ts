// @vitest-environment node
import { beforeEach, expect, test, vi } from "vitest";
import { withRls, type RlsTx } from "@/server/db/with-rls";
import { CategoryError, deleteCategory, setCategoryArchived, updateCategory } from "./categories";

vi.mock("@/server/db/with-rls", () => ({ withRls: vi.fn() }));
const CLAIMS = { sub: "u1" };

function fakeTx(o: { target?: object; remaining?: number }) {
  const tx = {
    category: {
      update: vi.fn(async () => ({})),
      delete: vi.fn(async () => ({})),
      count: vi.fn(async () => o.remaining ?? 3),
      findUniqueOrThrow: vi.fn(async () => o.target),
    },
  };
  vi.mocked(withRls).mockImplementation((_c, fn) => fn(tx as unknown as RlsTx));
  return tx;
}
beforeEach(() => {
  vi.mocked(withRls).mockReset();
});

test("updateCategory tidak pernah menulis kind (FK majemuk transaksi bergantung padanya)", async () => {
  const tx = fakeTx({});
  await updateCategory(CLAIMS, "c1", { name: "Kopi", icon: null, color: null, kind: "income" } as never);
  expect(tx.category.update).toHaveBeenCalledWith({ where: { id: "c1" }, data: { name: "Kopi", icon: null, color: null } });
});

test("kategori aktif terakhir per jenis tidak bisa diarsipkan atau dihapus (enum AI tidak boleh kosong)", async () => {
  fakeTx({ target: { kind: "expense", isArchived: false, _count: { transactions: 0, budgets: 0 } }, remaining: 0 });
  await expect(setCategoryArchived(CLAIMS, "c1", true)).rejects.toBeInstanceOf(CategoryError);
  await expect(deleteCategory(CLAIMS, "c1")).rejects.toThrow("Harus ada minimal satu kategori aktif");
});

test("kategori yang sudah dipakai transaksi tidak bisa dihapus", async () => {
  const tx = fakeTx({ target: { kind: "expense", isArchived: false, _count: { transactions: 2, budgets: 0 } } });
  await expect(deleteCategory(CLAIMS, "c1")).rejects.toThrow(/Arsipkan saja/);
  expect(tx.category.delete).not.toHaveBeenCalled();
});
