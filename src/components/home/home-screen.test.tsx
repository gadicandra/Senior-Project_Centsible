import { render, screen } from "@testing-library/react";
import { expect, test, vi } from "vitest";
import { HomeScreen } from "./home-screen";

vi.mock("@/server/actions/transactions", () => ({ saveAiTransaction: vi.fn(), saveTransaction: vi.fn() }));

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
