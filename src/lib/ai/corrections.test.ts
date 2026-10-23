import { describe, expect, test } from "vitest";
import { diffCorrections, type CorrectionSide } from "./corrections";

const LAIN_EXPENSE = "22222222-2222-4222-8222-222222222223";
const LAIN_INCOME = "22222222-2222-4222-8222-222222222225";
const MAKAN = "22222222-2222-4222-8222-222222222222";
const TUNAI = "33333333-3333-4333-8333-333333333333";
const GOPAY = "33333333-3333-4333-8333-333333333334";

const proposal: CorrectionSide = {
  amount: 50_000,
  type: "expense",
  category: "Makan",
  categoryId: MAKAN,
  wallet: "Tunai",
  walletId: TUNAI,
  description: "beli bensin",
  occurred_at: "2026-09-22",
};

describe("diffCorrections (design §11)", () => {
  test("identik → {}", () => {
    expect(diffCorrections(proposal, { ...proposal })).toEqual({});
  });

  test("nominal diubah", () => {
    expect(diffCorrections(proposal, { ...proposal, amount: 45_000 })).toEqual({
      amount: { from: 50_000, to: 45_000 },
    });
  });

  test("kategori bernama sama tapi ID beda (jenis dibalik, Lain-lain) → dicatat", () => {
    const from = { ...proposal, category: "Lain-lain", categoryId: LAIN_EXPENSE };
    const to = { ...from, type: "income" as const, categoryId: LAIN_INCOME };
    expect(diffCorrections(from, to)).toEqual({
      type: { from: "expense", to: "income" },
      category: { from: "Lain-lain", to: "Lain-lain" },
    });
  });

  test("categoryId usulan null → selalu dicatat", () => {
    const from = { ...proposal, category: "Uang Saku", categoryId: null };
    expect(diffCorrections(from, { ...proposal })).toEqual({ category: { from: "Uang Saku", to: "Makan" } });
  });

  test("dompet bawaan diterima → {}", () => {
    // Sisi usulan sudah berisi dompet bawaan yang tampil di kartu ketika AI memberi null.
    expect(diffCorrections(proposal, { ...proposal, wallet: "Tunai", walletId: TUNAI })).toEqual({});
  });

  test("dompet diganti → dicatat per nama", () => {
    expect(diffCorrections(proposal, { ...proposal, wallet: "GoPay", walletId: GOPAY })).toEqual({
      wallet: { from: "Tunai", to: "GoPay" },
    });
  });

  test("hanya beda spasi di keterangan → {}", () => {
    expect(diffCorrections(proposal, { ...proposal, description: "  beli bensin " })).toEqual({});
  });

  test("keterangan diubah", () => {
    expect(diffCorrections(proposal, { ...proposal, description: "isi bensin" })).toEqual({
      description: { from: "beli bensin", to: "isi bensin" },
    });
  });

  test("tanggal diubah", () => {
    expect(diffCorrections(proposal, { ...proposal, occurred_at: "2026-09-21" })).toEqual({
      occurred_at: { from: "2026-09-22", to: "2026-09-21" },
    });
  });

  test("confidence tidak pernah muncul, urutan kunci tetap", () => {
    const withConfidence = { ...proposal, confidence: 0.3 } as CorrectionSide;
    const result = diffCorrections(withConfidence, {
      amount: 1,
      type: "income",
      category: "Uang Saku",
      categoryId: LAIN_INCOME,
      wallet: "GoPay",
      walletId: GOPAY,
      description: "x",
      occurred_at: "2026-09-01",
      confidence: 1,
    } as CorrectionSide);
    expect(Object.keys(result)).toEqual(["amount", "type", "category", "wallet", "description", "occurred_at"]);
    expect(result).not.toHaveProperty("confidence");
  });
});
