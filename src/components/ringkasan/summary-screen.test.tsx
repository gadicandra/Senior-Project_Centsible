import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { categoryShares, monthBounds, zeroFillDaily, type CategoryTotal, type SummaryView } from "@/lib/summary";
import { SummaryScreen } from "./summary-screen";

afterEach(() => {
  cleanup();
});

function summary(month: string, opts: Partial<Omit<SummaryView, "month" | "from" | "to" | "categories">> & { categories?: CategoryTotal[] } = {}) {
  const { from, to } = monthBounds(month);
  const s: SummaryView = {
    month,
    from,
    to,
    totalBalance: 0,
    income: 0,
    expense: 0,
    transactionCount: 0,
    daily: zeroFillDaily([], from, to),
    ...opts,
    categories: categoryShares(opts.categories ?? []),
  };
  return s;
}

const cat = (id: string, name: string, amount: number, isArchived = false): CategoryTotal => ({
  id,
  name,
  icon: null,
  color: null,
  isArchived,
  amount,
});

describe("SummaryScreen", () => {
  test("judul, bulan, saldo, dan total dengan selisih negatif", () => {
    render(
      <SummaryScreen
        summary={summary("2026-10", { totalBalance: 1_250_000, expense: 50_000, transactionCount: 1, categories: [cat("t", "Transport", 50_000)] })}
        currentMonth="2026-10"
        today="2026-10-25"
      />,
    );
    expect(screen.getByRole("heading", { level: 1, name: "Ringkasan" })).toBeDefined();
    expect(screen.getByText("Oktober 2026")).toBeDefined();
    expect(screen.getByText(/1\.250\.000/)).toBeDefined();
    expect(screen.getByText("Saldo saat ini, semua dompet aktif")).toBeDefined();
    const dl = document.querySelector("dl")!;
    expect(within(dl).getByText("Selisih").nextElementSibling?.textContent).toMatch(/-Rp\s50\.000/);
  });

  test("bulan kosong: pesan + tautan ke Beranda, tanpa grafik dan daftar", () => {
    render(<SummaryScreen summary={summary("2026-10")} currentMonth="2026-10" today="2026-10-25" />);
    expect(screen.getByText("Belum ada transaksi di Oktober 2026.")).toBeDefined();
    expect(screen.getByRole("link", { name: "Catat transaksi" }).getAttribute("href")).toBe("/");
    expect(screen.queryByRole("img")).toBeNull();
    expect(document.querySelector("ol")).toBeNull();
  });

  test("hanya pemasukan: pesan kategori kosong, grafik tetap tampil", () => {
    render(
      <SummaryScreen summary={summary("2026-10", { income: 1_000, transactionCount: 1 })} currentMonth="2026-10" today="2026-10-25" />,
    );
    const section = screen.getByRole("region", { name: "Pengeluaran per kategori" });
    expect(within(section).getByText("Belum ada pengeluaran di bulan ini.")).toBeDefined();
    expect(screen.getByRole("img", { name: /Tren harian Oktober 2026/ })).toBeDefined();
  });

  describe("navigasi bulan", () => {
    test("bulan berjalan: tidak ada tautan berikutnya", () => {
      render(<SummaryScreen summary={summary("2026-10")} currentMonth="2026-10" today="2026-10-25" />);
      expect(screen.queryByRole("link", { name: "Bulan berikutnya" })).toBeNull();
      expect(screen.getByRole("link", { name: "Bulan sebelumnya" }).getAttribute("href")).toBe("/ringkasan?month=2026-09");
    });
    test("bulan lalu: berikutnya kembali ke /ringkasan tanpa parameter", () => {
      render(<SummaryScreen summary={summary("2026-09")} currentMonth="2026-10" today="2026-10-25" />);
      expect(screen.getByRole("link", { name: "Bulan berikutnya" }).getAttribute("href")).toBe("/ringkasan");
      expect(screen.getByRole("link", { name: "Bulan sebelumnya" }).getAttribute("href")).toBe("/ringkasan?month=2026-08");
    });
    test("2020-01: tidak ada tautan sebelumnya", () => {
      render(<SummaryScreen summary={summary("2020-01")} currentMonth="2026-10" today="2026-10-25" />);
      expect(screen.queryByRole("link", { name: "Bulan sebelumnya" })).toBeNull();
      expect(screen.getByRole("link", { name: "Bulan berikutnya" }).getAttribute("href")).toBe("/ringkasan?month=2020-02");
    });
  });

  test("daftar kategori: urutan, persen, tautan, dan label arsip", () => {
    render(
      <SummaryScreen
        summary={summary("2026-09", {
          expense: 3,
          transactionCount: 3,
          categories: [cat("c3", "Transport", 1), cat("c1", "Makan", 1, true), cat("c2", "Belanja", 1)],
        })}
        currentMonth="2026-10"
        today="2026-10-25"
      />,
    );
    const links = within(document.querySelector("ol")!).getAllByRole("link");
    expect(links.map((l) => l.textContent)).toEqual([
      expect.stringMatching(/^Belanja.*34%$/),
      expect.stringMatching(/^Makan · arsip.*33%$/),
      expect.stringMatching(/^Transport.*33%$/),
    ]);
    const params = new URL(links[0].getAttribute("href")!, "http://x").searchParams;
    expect(new URL(links[0].getAttribute("href")!, "http://x").pathname).toBe("/transaksi");
    expect(Object.fromEntries(params)).toEqual({ type: "expense", categoryId: "c2", from: "2026-09-01", to: "2026-09-30" });
  });
});
