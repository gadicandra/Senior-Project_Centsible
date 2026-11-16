import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { budgetUsage, type BudgetView } from "@/lib/budget";
import { HomeScreen } from "./home-screen";

vi.mock("@/server/actions/transactions", () => ({ saveAiTransaction: vi.fn(), saveTransaction: vi.fn() }));

afterEach(() => {
  cleanup();
});

// Base UI hanya mencatat peringatan ini sekali per proses, jadi tes ini harus merender paling awal.
test("HomeScreen: tautan ke transaksi & ringkasan berupa tautan sungguhan, tanpa peringatan nativeButton", () => {
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    render(<HomeScreen displayName="Adi" wallets={[]} today="2026-09-23" budgets={null} />);
    expect(screen.getByRole("link", { name: "Lihat transaksi" }).getAttribute("href")).toBe("/transaksi");
    expect(screen.getByRole("link", { name: "Lihat ringkasan" }).getAttribute("href")).toBe("/ringkasan");
    expect(error.mock.calls.some((args) => args.some((a) => String(a).includes("nativeButton")))).toBe(false);
  } finally {
    error.mockRestore();
  }
});

test("HomeScreen menyapa pengguna dan menjumlah saldo dompet", () => {
  render(
    <HomeScreen
      displayName="Adi"
      wallets={[
        { id: "1", name: "Tunai", balance: 50_000, isDefault: true, isArchived: false },
        { id: "2", name: "BCA", balance: 1_200_000, isDefault: false, isArchived: false },
      ]}
            today="2026-09-23"
      budgets={null}
    />,
  );
  expect(screen.getByText("Halo, Adi")).toBeDefined();
  expect(screen.getByRole("heading", { level: 1, name: "Pengeluaran bulan ini" })).toBeDefined();
  expect(screen.getByText(/Saldo semua dompet Rp\s1\.250\.000/)).toBeDefined();
});

describe("kartu Anggaran di Beranda", () => {
  const home = (budgets: Parameters<typeof HomeScreen>[0]["budgets"]) =>
    render(<HomeScreen displayName="Adi" wallets={[]} today="2026-10-15" budgets={budgets} />);
  const week = { from: "2026-10-12", to: "2026-10-18" };
  const month = { from: "2026-10-01", to: "2026-10-31" };

  test("gagal dimuat: Beranda tetap tampil", () => {
    home(null);
    expect(screen.getByText("Anggaran tidak bisa dimuat saat ini.")).toBeDefined();
    expect(screen.getByRole("heading", { level: 1, name: "Pengeluaran bulan ini" })).toBeDefined();
  });

  test("kosong: tautan Atur anggaran", () => {
    home({ today: "2026-10-15", week, month, budgets: [] });
    expect(screen.getByText("Belum ada anggaran.")).toBeDefined();
    expect(screen.getByRole("link", { name: "Atur anggaran" }).getAttribute("href")).toBe("/anggaran");
  });

  test("lima anggaran → tiga ditampilkan", () => {
    const budgets: BudgetView[] = [0, 1, 2, 3, 4].map((i) => ({
      id: String(i),
      categoryId: `c${i}`,
      name: `Kat ${i}`,
      icon: null,
      color: null,
      isArchived: false,
      period: "monthly",
      ...month,
      ...budgetUsage(i * 10_000, 100_000),
    }));
    home({ today: "2026-10-15", week, month, budgets });
    expect(screen.getAllByRole("progressbar")).toHaveLength(3);
    expect(screen.getByRole("link", { name: "Lihat semua anggaran (5)" }).getAttribute("href")).toBe("/anggaran");
  });
});

describe("peringatan pengeluaran tidak biasa (FR 14)", () => {
  const base = { categoryId: "c1", name: "Makan", icon: null, from: "2026-10-12", to: "2026-10-15" };

  test("teks nominal & frekuensi, tautan ke transaksi minggu ini", () => {
    render(
      <HomeScreen
        displayName="Adi"
        wallets={[]}
       
        today="2026-10-15"
        budgets={null}
        anomalies={[
          { ...base, kind: "amount", current: 400_000, median: 100_000, ratio: 4 },
          { ...base, categoryId: "c2", name: "Jajan", kind: "count", current: 12, median: 4, ratio: 3 },
        ]}
      />,
    );
    expect(screen.getByRole("heading", { name: "Pengeluaran tidak biasa" })).toBeDefined();
    const items = screen.getAllByRole("listitem").map((li) => li.textContent?.replace(/ /g, " "));
    expect(items).toContain("Pengeluaran Makan minggu ini Rp 400.000, biasanya sekitar Rp 100.000 (4× biasanya). Lihat");
    expect(items).toContain("12 transaksi Jajan minggu ini, biasanya sekitar 4 (3× biasanya). Lihat");
    expect(screen.getAllByRole("link", { name: "Lihat" })[0].getAttribute("href")).toBe(
      "/transaksi?type=expense&categoryId=c1&from=2026-10-12&to=2026-10-15",
    );
  });

  test("tanpa anomali: kartu tidak tampil", () => {
    render(<HomeScreen displayName="Adi" wallets={[]} today="2026-10-15" budgets={null} anomalies={[]} />);
    expect(screen.queryByRole("heading", { name: "Pengeluaran tidak biasa" })).toBeNull();
  });
});

test("kartu ringkasan minggu lalu (FR 13) tampil bila ada; tidak tampil bila belum ada", () => {
  const { rerender } = render(
    <HomeScreen displayName="Adi" wallets={[]} today="2026-11-16" budgets={null}
      weekly={{ id: "i1", content: "Minggu lalu hemat. Saran: pasang anggaran Makan.", periodStart: "2026-11-09", periodEnd: "2026-11-15", isRead: false }} />,
  );
  expect(screen.getByRole("heading", { name: /Ringkasan minggu lalu.*9 Nov – 15 Nov/ })).toBeDefined();
  expect(screen.getByText(/Saran: pasang anggaran Makan/)).toBeDefined();
  rerender(<HomeScreen displayName="Adi" wallets={[]} today="2026-11-16" budgets={null} weekly={null} />);
  expect(screen.queryByRole("heading", { name: /Ringkasan minggu lalu/ })).toBeNull();
});
