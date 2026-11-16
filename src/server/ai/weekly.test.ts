// @vitest-environment node
import { expect, test } from "vitest";
import { weeklyStats } from "@/lib/weekly";
import { acceptSummary, promptData } from "./weekly";

test("hanya angka & nama kategori yang dikirim ke AI (tanpa id)", () => {
  const s = weeklyStats({ from: "2026-11-09", to: "2026-11-15" }, 0, [
    { categoryId: "rahasia-uuid", name: "Makan", week: 300_000, prev4: [200_000, 200_000, 200_000, 200_000] },
  ]);
  const data = promptData(s);
  expect(data).not.toContain("rahasia-uuid");
  expect(JSON.parse(data)).toMatchObject({ total_pengeluaran: 300_000, per_kategori: [{ kategori: "Makan", perubahan_persen: 50 }] });
});

test("teks AI wajib berisi 'Saran:' dan tidak kepanjangan", () => {
  expect(acceptSummary("  Minggu lalu   hemat.\nSaran: kurangi jajan. ")).toBe("Minggu lalu hemat. Saran: kurangi jajan.");
  expect(acceptSummary("Minggu lalu hemat.")).toBeNull();
  expect(acceptSummary(`Saran: ${"x".repeat(1000)}`)).toBeNull();
  expect(acceptSummary(null)).toBeNull();
});
