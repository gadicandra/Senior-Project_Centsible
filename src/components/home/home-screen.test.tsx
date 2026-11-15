import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { budgetUsage, type BudgetView } from "@/lib/budget";
import { HomeScreen } from "./home-screen";

vi.mock("@/server/actions/transactions", () => ({ saveAiTransaction: vi.fn(), saveTransaction: vi.fn() }));

afterEach(() => {
  cleanup();
});

// Base UI hanya mencatat peringatan ini sekali per proses, jadi tes ini harus merender paling awal.
test("HomeScreen merender Lihat transaksi sebagai tautan tanpa peringatan nativeButton", () => {
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    render(<HomeScreen displayName="Adi" wallets={[]} categories={[]} today="2026-09-23" budgets={null} />);
    expect(screen.getByRole("link", { name: "Lihat transaksi" }).getAttribute("href")).toBe("/transaksi");
    expect(screen.getByRole("link", { name: "Lihat ringkasan" }).getAttribute("href")).toBe("/ringkasan");
    // Varian outline harus bergaris tepi: cn() membuang border-transparent dari kelas dasar.
    const outline = screen.getByRole("link", { name: "Lihat ringkasan" }).className.split(/\s+/);
    expect(outline).toContain("border-border");
    expect(outline).not.toContain("border-transparent");
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
      categories={[{ id: "c", name: "Makan", kind: "expense", icon: null, isArchived: false }]}
      today="2026-09-23"
      budgets={null}
    />,
  );
  expect(screen.getByRole("heading", { level: 1, name: "Halo, Adi" })).toBeDefined();
  expect(screen.getByText(/1\.250\.000/)).toBeDefined();
  expect(screen.getByLabelText("Ketik transaksi")).toBeDefined();
});

describe("kartu Anggaran di Beranda", () => {
  const home = (budgets: Parameters<typeof HomeScreen>[0]["budgets"]) =>
    render(<HomeScreen displayName="Adi" wallets={[]} categories={[]} today="2026-10-15" budgets={budgets} />);
  const week = { from: "2026-10-12", to: "2026-10-18" };
  const month = { from: "2026-10-01", to: "2026-10-31" };

  test("gagal dimuat: Beranda tetap tampil", () => {
    home(null);
    expect(screen.getByText("Anggaran tidak bisa dimuat saat ini.")).toBeDefined();
    expect(screen.getByLabelText("Ketik transaksi")).toBeDefined();
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
