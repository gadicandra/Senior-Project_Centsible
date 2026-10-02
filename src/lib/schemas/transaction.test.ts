import { describe, expect, test } from "vitest";
import { transactionFilterSchema, transactionSchema } from "./transaction";

const schema = transactionSchema("2026-10-02");
const valid = {
  type: "expense",
  amount: "50.000",
  categoryId: "3f2a6e2b-7c1d-4f51-9a39-0c8f8c6a1b11",
  walletId: "9b1d7c3e-2a4f-4d6b-8e2a-5f7c9d1e3a22",
  description: " beli bensin ",
  occurredAt: "2026-10-02",
};

describe("transactionSchema", () => {
  test("menormalkan nominal & keterangan", () => {
    expect(schema.parse(valid)).toMatchObject({ amount: 50_000, description: "beli bensin" });
  });
  test("menolak tanggal masa depan relatif ke hari ini pengguna", () => {
    const r = schema.safeParse({ ...valid, occurredAt: "2026-10-03" });
    expect(r.error?.issues[0]).toMatchObject({ path: ["occurredAt"], message: "Tanggal tidak boleh di masa depan" });
  });
  test("menolak nominal nol dan kategori kosong", () => {
    const r = schema.safeParse({ ...valid, amount: "0", categoryId: "" });
    expect(r.error?.issues.map((i) => i.path[0]).sort()).toEqual(["amount", "categoryId"]);
  });
});

test("filter mengabaikan nilai tidak valid", () => {
  expect(transactionFilterSchema.parse({ from: "kemarin", type: "income", page: "abc", walletId: "x" })).toEqual({
    from: undefined,
    to: undefined,
    type: "income",
    categoryId: undefined,
    walletId: undefined,
    page: undefined,
  });
});
