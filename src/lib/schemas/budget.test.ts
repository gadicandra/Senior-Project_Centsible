import { describe, expect, test } from "vitest";
import { budgetCreateSchema, budgetUpdateSchema } from "./budget";

const CAT = "22222222-2222-4222-8222-222222222222";
const create = (over: Record<string, string> = {}) =>
  budgetCreateSchema.safeParse({ categoryId: CAT, period: "monthly", amountLimit: "500.000", ...over });
const firstError = (r: ReturnType<typeof create>, field: string) =>
  r.success ? undefined : r.error.issues.find((i) => i.path[0] === field)?.message;

describe("budgetCreateSchema", () => {
  test("500.000 → 500000", () => {
    expect(create()).toMatchObject({ success: true, data: { amountLimit: 500_000 } });
  });

  test.each(["999", "0", "-5", "abc", "", "1.000.000.000.001"])("batas %j ditolak", (amountLimit) => {
    expect(firstError(create({ amountLimit }), "amountLimit")).toBeDefined();
  });

  test.each(["1.000", "1.000.000.000.000"])("batas %j diterima", (amountLimit) => {
    expect(create({ amountLimit }).success).toBe(true);
  });

  test("pesan kategori dan periode", () => {
    expect(firstError(create({ period: "daily" }), "period")).toBe("Pilih periode");
    expect(firstError(create({ categoryId: "" }), "categoryId")).toBe("Pilih kategori");
    expect(firstError(create({ categoryId: "x" }), "categoryId")).toBe("ID tidak valid");
  });
});

test("budgetUpdateSchema membuang field lain", () => {
  const r = budgetUpdateSchema.parse({ amountLimit: "2.000", categoryId: CAT, period: "weekly", userId: CAT });
  expect(r).toEqual({ amountLimit: 2_000 });
});
