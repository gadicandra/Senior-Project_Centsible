import { expect, test } from "vitest";
import { score, type Result } from "./eval-score";

const r = (got: Result["got"], over: Partial<Result> = {}): Result => ({
  text: "makan 25rb",
  amount: 25_000,
  type: "expense",
  category: "Makan",
  got,
  ms: 100,
  ...over,
});

test("target dihitung dari nominal DAN kategori sekaligus; kategori jenis lain tidak dianggap benar", () => {
  const res = [
    r({ amount: 25_000, type: "expense", category: "Makan" }),
    r({ amount: 25_000, type: "expense", category: "Hiburan" }),
    r({ amount: 2_500, type: "expense", category: "Makan" }),
    r({ amount: 25_000, type: "income", category: "Makan" }),
    r(null, { error: "timeout" }),
  ];
  const s = score(res, "openai-compatible:m@p1", "2026-11-16");
  expect(s.summary).toBe("nominal 60.0% · kategori 40.0% · keduanya 20.0% (target 85%)");
  expect(s.pass).toBe(false);
  expect(s.markdown).toContain("| Gagal dibaca (fallback form manual) | 1/5 | 20.0% |");
  expect(s.markdown).toContain("## Salah (4)");
  expect(s.markdown).toContain("| makan 25rb | 25000 · Makan | 25000 · income/Makan |");
});

test("lulus di ≥ 85%", () => {
  const good = r({ amount: 25_000, type: "expense", category: "Makan" });
  const res = [...Array(17).fill(good), r(null), r(null), r(null)];
  expect(score(res, "m", "d").pass).toBe(true);
  expect(score([...Array(16).fill(good), r(null), r(null), r(null), r(null)], "m", "d").pass).toBe(false);
});
