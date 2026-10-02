import { describe, expect, test } from "vitest";
import { categorySchema, walletSchema } from "./settings";

describe("walletSchema", () => {
  test("mengubah saldo awal bertitik jadi integer", () => {
    expect(walletSchema.parse({ name: " BCA ", type: "bank", initialBalance: "1.250.000" })).toEqual({
      name: "BCA",
      type: "bank",
      initialBalance: 1_250_000,
    });
  });
  test("menolak nama kosong dan jenis tak dikenal", () => {
    const r = walletSchema.safeParse({ name: "  ", type: "kripto", initialBalance: "0" });
    expect(r.success).toBe(false);
    expect(r.error?.issues.map((i) => i.path[0])).toEqual(["name", "type"]);
  });
});

describe("categorySchema", () => {
  test("ikon & warna kosong menjadi null", () => {
    expect(categorySchema.parse({ name: "Jajan", kind: "expense", icon: "", color: "" })).toMatchObject({
      icon: null,
      color: null,
    });
  });
  test("menolak warna bukan hex", () => {
    expect(categorySchema.safeParse({ name: "X", kind: "income", icon: "", color: "merah" }).success).toBe(false);
  });
});
