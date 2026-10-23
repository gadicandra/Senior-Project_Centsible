import { describe, expect, test } from "vitest";
import { normalizeInputText, parseRequestSchema } from "./request";

describe("normalizeInputText", () => {
  test("trim dan rapatkan spasi", () => {
    expect(normalizeInputText("  beli   bensin \n\t gocap  ")).toBe("beli bensin gocap");
  });

  test("buang karakter kontrol dan lebar-nol", () => {
    expect(normalizeInputText("ma\u0000kan\u0007 25\u200Brb\uFEFF\u009F")).toBe("makan 25rb");
    expect(normalizeInputText("a\r\nb")).toBe("a b");
  });

  test("NFKC", () => {
    expect(normalizeInputText("ｇｏｃａｐ")).toBe("gocap");
  });
});

describe("parseRequestSchema", () => {
  test("menerima dan menormalisasi teks", () => {
    expect(parseRequestSchema.parse({ text: "  makan  25rb " })).toEqual({ text: "makan 25rb" });
  });

  test("menolak kosong atau hanya spasi", () => {
    for (const text of ["", "   ", "\u200B\n"]) {
      const r = parseRequestSchema.safeParse({ text });
      expect(r.success).toBe(false);
      expect(r.error?.issues[0].message).toBe("Tulis transaksinya dulu.");
    }
  });

  test("500 karakter OK, 501 ditolak", () => {
    expect(parseRequestSchema.safeParse({ text: "a".repeat(500) }).success).toBe(true);
    const r = parseRequestSchema.safeParse({ text: "a".repeat(501) });
    expect(r.success).toBe(false);
    expect(r.error?.issues[0].message).toBe("Kalimat terlalu panjang (maks 500 karakter).");
  });

  test("key tambahan ditolak", () => {
    expect(parseRequestSchema.safeParse({ text: "a", extra: 1 }).success).toBe(false);
  });

  test("bukan string ditolak", () => {
    expect(parseRequestSchema.safeParse({ text: 123 }).success).toBe(false);
    expect(parseRequestSchema.safeParse({ text: null }).success).toBe(false);
    expect(parseRequestSchema.safeParse({}).success).toBe(false);
  });
});
