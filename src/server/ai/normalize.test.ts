// @vitest-environment node
import { describe, expect, test } from "vitest";
import { NOT_UNDERSTOOD_CONFIDENCE } from "@/lib/ai/limits";
import { AiError, type ParsedTransaction, type UserAiContext } from ".";
import { normalize } from "./normalize";

const ctx: UserAiContext = {
  today: "2026-09-23",
  nowLocal: "12:00",
  timezone: "Asia/Jakarta",
  categories: [
    { id: "e-transport", name: "Transport", kind: "expense" },
    { id: "e-makan", name: "Makan", kind: "expense" },
    { id: "e-lain", name: "Lain-lain", kind: "expense" },
    { id: "i-saku", name: "Uang Saku", kind: "income" },
    { id: "i-lain", name: "Lain-lain", kind: "income" },
  ],
  wallets: [
    { id: "w-gopay", name: "GoPay", isDefault: false },
    { id: "w-tunai", name: "Tunai", isDefault: true },
  ],
};

const base: ParsedTransaction = {
  amount: 50000,
  type: "expense",
  category: "Transport",
  wallet: "GoPay",
  description: "beli bensin",
  occurred_at: "2026-09-22",
  confidence: 0.95,
};
const TEXT = "beli bensin gocap kemarin pake gopay";

const run = (over: Partial<ParsedTransaction> = {}, text = TEXT) => normalize({ ...base, ...over }, ctx, text);

describe("normalize: pemetaan", () => {
  test("usulan bersih tanpa tanda", () => {
    const r = run();
    expect(r.proposal).toEqual({
      amount: 50000,
      type: "expense",
      categoryId: "e-transport",
      walletId: "w-gopay",
      description: "beli bensin",
      occurredAt: "2026-09-22",
      confidence: 0.95,
    });
    expect(r.flags).toEqual({});
    expect(r.walletInferred).toBe(false);
    expect(r.amountOptions).toBeUndefined();
  });

  test("nama → ID berdasarkan (nama, jenis): 'Lain-lain' income vs expense", () => {
    expect(run({ type: "income", category: "Lain-lain", amount: 50000 }).proposal.categoryId).toBe("i-lain");
    expect(run({ type: "expense", category: "Lain-lain" }).proposal.categoryId).toBe("e-lain");
  });

  test("jenis tidak cocok → categoryId null + tanda mismatch", () => {
    const r = run({ type: "income", category: "Transport" });
    expect(r.proposal.categoryId).toBeNull();
    expect(r.flags.category).toBe("mismatch");
  });

  test("dompet null → dompet utama + walletInferred", () => {
    const r = run({ wallet: null });
    expect(r.proposal.walletId).toBe("w-tunai");
    expect(r.walletInferred).toBe(true);
    expect(r.flags.wallet).toBeUndefined();
    expect(r.parsedResult.wallet).toBe("Tunai");
  });

  test("parsedResult memakai key kontrak §10", () => {
    const r = run({ wallet: null });
    expect(Object.keys(r.parsedResult).sort()).toEqual(
      ["amount", "category", "confidence", "description", "occurred_at", "type", "wallet"],
    );
    expect(r.parsedResult).toEqual({
      amount: 50000,
      type: "expense",
      category: "Transport",
      wallet: "Tunai",
      description: "beli bensin",
      occurred_at: "2026-09-22",
      confidence: 0.95,
    });
  });
});

describe("normalize: keterangan", () => {
  test("300 karakter → 200 di proposal dan parsedResult", () => {
    const r = run({ description: "a".repeat(300) });
    expect(r.proposal.description).toHaveLength(200);
    expect(r.parsedResult.description).toBe(r.proposal.description);
  });

  test("hanya spasi → kosong", () => {
    expect(run({ description: "   " }).proposal.description).toBe("");
  });

  test("spasi dirapatkan", () => {
    const r = run({ description: "  beli   bensin " });
    expect(r.proposal.description).toBe("beli bensin");
    expect(r.parsedResult.description).toBe("beli bensin");
  });
});

describe("normalize: nominal", () => {
  test("cepek → ambiguous + amountOptions", () => {
    const r = run({ amount: 100000, category: "Lain-lain", occurred_at: "2026-09-23" }, "beli sepatu cepek");
    expect(r.flags.amount).toBe("ambiguous");
    expect(r.amountOptions).toEqual([100, 100000]);
  });

  test("beda dengan regex → mismatch, nominal AI tidak diganti", () => {
    const r = run({ amount: 5000 });
    expect(r.flags.amount).toBe("mismatch");
    expect(r.proposal.amount).toBe(5000);
  });

  test("> 100 juta → large", () => {
    const r = run({ amount: 150_000_000, occurred_at: "2026-09-23" }, "beli motor");
    expect(r.flags.amount).toBe("large");
  });

  test.each([0, -5, 1_000_000_000_001])("nominal %d → invalid_output", (amount) => {
    expect(() => run({ amount })).toThrow(AiError);
    try {
      run({ amount });
    } catch (e) {
      expect((e as AiError).code).toBe("invalid_output");
    }
  });
});

describe("normalize: tanggal", () => {
  test("masa depan → hari ini + future", () => {
    const r = run({ occurred_at: "2026-09-30" }, "beli bensin gocap");
    expect(r.proposal.occurredAt).toBe("2026-09-23");
    expect(r.parsedResult.occurred_at).toBe("2026-09-23");
    expect(r.flags.occurredAt).toBe("future");
  });

  test("< 2020 → hari ini + invalid", () => {
    const r = run({ occurred_at: "2019-12-31" }, "beli bensin gocap");
    expect(r.proposal.occurredAt).toBe("2026-09-23");
    expect(r.flags.occurredAt).toBe("invalid");
  });

  test("format tidak valid → tanggal resolver menggantikan + invalid", () => {
    const r = run({ occurred_at: "kemarin" });
    expect(r.proposal.occurredAt).toBe("2026-09-22");
    expect(r.flags.occurredAt).toBe("invalid");
    const noPhrase = run({ occurred_at: "2026-13-45" }, "beli bensin gocap");
    expect(noPhrase.proposal.occurredAt).toBe("2026-09-23");
    expect(noPhrase.flags.occurredAt).toBe("invalid");
  });

  test("> 365 hari lalu → tetap + old", () => {
    const r = run({ occurred_at: "2025-09-01" }, "beli bensin gocap");
    expect(r.proposal.occurredAt).toBe("2025-09-01");
    expect(r.flags.occurredAt).toBe("old");
  });

  test("beda dengan resolver → mismatch", () => {
    const r = run({ occurred_at: "2026-09-20" });
    expect(r.proposal.occurredAt).toBe("2026-09-20");
    expect(r.flags.occurredAt).toBe("mismatch");
  });

  test("resolver ambiguous → ambiguous", () => {
    expect(run({ occurred_at: "2026-09-20" }, "minggu lalu beli bensin gocap").flags.occurredAt).toBe("ambiguous");
  });
});

describe("normalize: confidence", () => {
  test("< 0.6 → low_confidence pada field tanpa tanda yang lebih kuat", () => {
    const r = run({ confidence: 0.5, amount: 5000 });
    expect(r.flags).toEqual({
      amount: "mismatch",
      category: "low_confidence",
      wallet: "low_confidence",
      occurredAt: "low_confidence",
    });
  });

  test.each([
    [1.2, 1],
    [95, 1],
    [-0.3, 0],
    [0.95, 0.95],
    [Number.NaN, 0],
    [Number.POSITIVE_INFINITY, 0],
    [Number.NEGATIVE_INFINITY, 0],
  ])("clamp %d → %d", (input, expected) => {
    const r = run({ confidence: input });
    expect(r.proposal.confidence).toBe(expected);
    expect(r.parsedResult.confidence).toBe(r.proposal.confidence);
    if (expected >= 0.6) expect(r.flags).toEqual({});
    else expect(r.flags.category).toBe("low_confidence");
  });

  test("-0.3 → 0, di bawah NOT_UNDERSTOOD_CONFIDENCE", () => {
    expect(run({ confidence: -0.3 }).proposal.confidence).toBeLessThan(NOT_UNDERSTOOD_CONFIDENCE);
  });
});
