// @vitest-environment node
import { describe, expect, test } from "vitest";
import { AiError, type UserAiContext } from ".";
import { assertUsableContext, buildWireJsonSchema, canonicalize, categoryNames, validateWire, walletNames } from "./schema";

// ctx berisi baris aktif saja (loadAiContext memfilter isArchived:false).
const ctx: UserAiContext = {
  today: "2026-09-23",
  nowLocal: "12:00",
  timezone: "Asia/Jakarta",
  categories: [
    { id: "e1", name: "Transport", kind: "expense" },
    { id: "e2", name: "Makan", kind: "expense" },
    { id: "e3", name: "Lain-lain", kind: "expense" },
    { id: "i1", name: "Uang Saku", kind: "income" },
    { id: "i2", name: "lain-lain", kind: "income" },
  ],
  wallets: [
    { id: "w1", name: "Tunai", isDefault: true },
    { id: "w2", name: "GoPay", isDefault: false },
  ],
};

const valid = {
  amount: 50000,
  type: "expense",
  category: "Transport",
  wallet: "GoPay",
  description: "beli bensin",
  occurred_at: "2026-09-22",
  confidence: 0.95,
};

function collectKeys(value: unknown, out = new Set<string>()): Set<string> {
  if (Array.isArray(value)) value.forEach((v) => collectKeys(v, out));
  else if (value && typeof value === "object") {
    for (const [k, v] of Object.entries(value)) {
      out.add(k);
      collectKeys(v, out);
    }
  }
  return out;
}

function expectAiError(fn: () => unknown, code: string, detail?: string) {
  try {
    fn();
  } catch (e) {
    expect(e).toBeInstanceOf(AiError);
    expect((e as AiError).code).toBe(code);
    if (detail) expect((e as AiError).detail).toBe(detail);
    return;
  }
  throw new Error("expected AiError");
}

describe("enum", () => {
  test("nama kategori: kedua jenis, de-dupe 'Lain-lain' (ejaan pertama), urutan stabil", () => {
    expect(categoryNames(ctx)).toEqual(["Lain-lain", "Makan", "Transport", "Uang Saku"]);
    const shuffled = { ...ctx, categories: [...ctx.categories].reverse() };
    expect(categoryNames(shuffled)).toEqual(["Makan", "Transport", "Uang Saku", "lain-lain"].sort());
  });

  test("nama dompet", () => {
    expect(walletNames(ctx)).toEqual(["GoPay", "Tunai"]);
  });
});

describe("buildWireJsonSchema", () => {
  test("enum nyata di category dan wallet.anyOf[0]; tanpa minimum/maximum/pattern/$schema (regresi §2.1-2)", () => {
    const schema = buildWireJsonSchema(ctx);
    expect(Array.isArray(schema.properties.category.enum)).toBe(true);
    expect(schema.properties.category.enum).toEqual(categoryNames(ctx));
    expect(Array.isArray(schema.properties.wallet.anyOf[0].enum)).toBe(true);
    expect(schema.properties.wallet.anyOf[0].enum).toEqual(["GoPay", "Tunai"]);
    expect(schema.properties.wallet.anyOf[1]).toEqual({ type: "null" });
    expect(schema.properties.type.enum).toEqual(["income", "expense"]);
    const keys = collectKeys(JSON.parse(JSON.stringify(schema)));
    for (const banned of ["minimum", "maximum", "minLength", "maxLength", "pattern", "$schema"]) {
      expect(keys.has(banned)).toBe(false);
    }
    expect(schema.additionalProperties).toBe(false);
    expect([...schema.required].sort()).toEqual(
      ["amount", "category", "confidence", "description", "occurred_at", "type", "wallet"],
    );
    expect(Object.keys(schema.properties).sort()).toEqual([...schema.required].sort());
  });
});

describe("validateWire", () => {
  test("output valid diterima", () => {
    expect(validateWire(valid, ctx)).toEqual(valid);
  });

  test("kanonikalisasi huruf dan trim", () => {
    const out = validateWire({ ...valid, category: " lain-lain ", wallet: "GOPAY", type: "Expense" }, ctx);
    expect(out.category).toBe("Lain-lain");
    expect(out.wallet).toBe("GoPay");
    expect(out.type).toBe("expense");
    expect(canonicalize("bukan objek", ctx)).toBe("bukan objek");
  });

  test("wallet null diterima", () => {
    expect(validateWire({ ...valid, wallet: null }, ctx).wallet).toBeNull();
  });

  test.each([
    ["kategori tak dikenal", { ...valid, category: "Kategori Palsu" }],
    ["dompet tak dikenal", { ...valid, wallet: "OVO" }],
    ["key tambahan", { ...valid, extra: 1 }],
    ["nominal bukan bilangan bulat", { ...valid, amount: 1.5 }],
    ["field hilang", { ...valid, confidence: undefined }],
    ["keterangan > 500", { ...valid, description: "a".repeat(501) }],
    ["bukan objek", "teks"],
    ["null", null],
  ])("%s → invalid_output", (_label, raw) => {
    expectAiError(() => validateWire(raw, ctx), "invalid_output");
  });
});

describe("assertUsableContext", () => {
  test.each([
    ["tanpa kategori pengeluaran", { ...ctx, categories: ctx.categories.filter((c) => c.kind !== "expense") }],
    ["tanpa kategori pemasukan", { ...ctx, categories: ctx.categories.filter((c) => c.kind !== "income") }],
    ["tanpa dompet", { ...ctx, wallets: [] }],
  ])("%s → not_configured/empty_enum", (_label, bad) => {
    expectAiError(() => assertUsableContext(bad), "not_configured", "empty_enum");
    expectAiError(() => buildWireJsonSchema(bad), "not_configured", "empty_enum");
  });

  test("konteks lengkap tidak melempar", () => {
    expect(() => assertUsableContext(ctx)).not.toThrow();
  });
});
