import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { SpendingSparkline } from "./spending-sparkline";

afterEach(cleanup);

test("garis kumulatif sampai hari ini, label aksesibel memuat total & hari terbesar", () => {
  const daily = ["2026-11-01", "2026-11-02", "2026-11-03", "2026-11-04"].map((date, i) => ({ date, income: 0, expense: [10_000, 0, 30_000, 99_000][i] }));
  render(<SpendingSparkline daily={daily} today="2026-11-03" />);
  const img = screen.getByRole("img");
  // 4 Nov setelah hari ini tidak dihitung.
  expect(img.getAttribute("aria-label")?.replace(/ /g, " ")).toBe("Pengeluaran kumulatif bulan ini Rp 40.000; hari terbesar 3 Nov Rp 30.000.");
  expect(img.querySelectorAll("path")[1].getAttribute("d")?.split("L")).toHaveLength(3);
  expect(screen.getByRole("link", { name: "Detail" }).getAttribute("href")).toBe("/ringkasan");
});
