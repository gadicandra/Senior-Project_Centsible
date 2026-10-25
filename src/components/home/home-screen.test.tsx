import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { HomeScreen } from "./home-screen";

vi.mock("@/server/actions/transactions", () => ({ saveAiTransaction: vi.fn(), saveTransaction: vi.fn() }));

afterEach(() => {
  cleanup();
});

// Base UI hanya mencatat peringatan ini sekali per proses, jadi tes ini harus merender paling awal.
test("HomeScreen merender Lihat transaksi sebagai tautan tanpa peringatan nativeButton", () => {
  const error = vi.spyOn(console, "error").mockImplementation(() => {});
  try {
    render(<HomeScreen displayName="Adi" wallets={[]} categories={[]} today="2026-09-23" />);
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
      categories={[{ id: "c", name: "Makan", kind: "expense", icon: null, isArchived: false }]}
      today="2026-09-23"
    />,
  );
  expect(screen.getByRole("heading", { level: 1, name: "Halo, Adi" })).toBeDefined();
  expect(screen.getByText(/1\.250\.000/)).toBeDefined();
  expect(screen.getByLabelText("Ketik transaksi")).toBeDefined();
});
