import { describe, expect, test } from "vitest";
import { extractAmounts } from "./amount";

describe("extractAmounts: satu nominal", () => {
  test.each([
    ["parkir gopek", 500],
    ["seceng aja", 1_000],
    ["ceceng", 1_000],
    ["fotokopi goceng", 5_000],
    ["ceban", 10_000],
    ["bensin gocap", 50_000],
    ["nonton 2 ceban", 20_000],
    ["nonton dua ceban", 20_000],
    ["4 ceban kemarin lusa", 40_000],
    ["seceban", 10_000],
    ["makan 25rb", 25_000],
    ["makan 25 ribu", 25_000],
    ["makan 25k", 25_000],
    ["uang saku 1,5jt", 1_500_000],
    ["1,25jt", 1_250_000],
    ["2.5k", 2_500],
    ["1.500rb", 1_500_000],
    ["1,500k", 1_500_000],
    ["laptop 1 juta", 1_000_000],
    ["bayar Rp25.000", 25_000],
    ["bayar 25.000", 25_000],
    ["bayar 25000", 25_000],
    ["BENSIN GOCAP", 50_000],
    ["bensin ｇｏｃａｐ", 50_000], // NFKC: huruf lebar penuh
  ])("%s → %d", (text, expected) => {
    expect(extractAmounts(text)).toEqual({ candidates: [expected], ambiguous: [] });
  });
});

describe("extractAmounts: kasus khusus", () => {
  test("cepek ambigu: Rp100 atau Rp100.000, keduanya jadi kandidat", () => {
    expect(extractAmounts("beli sepatu cepek")).toEqual({
      candidates: [100, 100_000],
      ambiguous: [{ token: "cepek", options: [100, 100_000] }],
    });
  });

  test("bilangan kecil tanpa satuan diabaikan (hitungan, jam)", () => {
    expect(extractAmounts("makan 2 kali")).toEqual({ candidates: [], ambiguous: [] });
    expect(extractAmounts("jam 7 tadi")).toEqual({ candidates: [], ambiguous: [] });
  });

  test("tanpa nominal → kosong", () => {
    expect(extractAmounts("beli bensin kemarin")).toEqual({ candidates: [], ambiguous: [] });
    expect(extractAmounts("")).toEqual({ candidates: [], ambiguous: [] });
  });

  test("dua nominal → keduanya kandidat, urut kiri ke kanan", () => {
    expect(extractAmounts("makan 25rb sama parkir gopek").candidates).toEqual([25_000, 500]);
  });

  test("tanpa batas kata (gocapan) → tidak cocok", () => {
    expect(extractAmounts("gocapan")).toEqual({ candidates: [], ambiguous: [] });
  });

  test("lebih dari 1e12 dibuang", () => {
    expect(extractAmounts("2000000jt").candidates).toEqual([]);
    expect(extractAmounts("9999999999999").candidates).toEqual([]);
  });

  test("angka tanggal bukan nominal", () => {
    expect(extractAmounts("makan 25rb tgl 23/09/2026").candidates).toEqual([25_000]);
  });
});
