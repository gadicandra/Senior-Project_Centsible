import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { HomeScreen } from "./home-screen";

test("HomeScreen menyapa pengguna dan menjumlah saldo dompet", () => {
  render(
    <HomeScreen
      displayName="Adi"
      wallets={[
        { id: "1", name: "Tunai", balance: 50_000, isDefault: true },
        { id: "2", name: "BCA", balance: 1_200_000, isDefault: false },
      ]}
    />,
  );
  expect(screen.getByRole("heading", { level: 1, name: "Halo, Adi" })).toBeDefined();
  expect(screen.getByText(/1\.250\.000/)).toBeDefined();
});
