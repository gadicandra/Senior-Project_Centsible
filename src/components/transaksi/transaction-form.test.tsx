import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { TransactionForm } from "./transaction-form";

vi.mock("@/server/actions/transactions", () => ({ saveTransaction: vi.fn(async () => ({})) }));
afterEach(cleanup);

const categories = [
  { id: "c-makan", name: "Makan", kind: "expense" as const, icon: "🍚", isArchived: false },
  { id: "c-lama", name: "Lama", kind: "expense" as const, icon: null, isArchived: true },
  { id: "c-saku", name: "Uang Saku", kind: "income" as const, icon: "💸", isArchived: false },
];
const wallets = [{ id: "w", name: "Tunai", isDefault: true, isArchived: false }];
const hidden = (name: string) => (document.querySelector(`input[type="hidden"][name="${name}"]`) as HTMLInputElement).value;

test("grid kategori: hanya kategori aktif sesuai jenis; pilihan ditulis ke field tersembunyi", () => {
  render(<TransactionForm categories={categories} wallets={wallets} today="2026-11-16" onDone={() => {}} />);
  expect(screen.getAllByRole("radio", { name: /Makan|Lama|Uang Saku/ }).map((r) => r.textContent)).toEqual(["🍚Makan"]);
  fireEvent.click(screen.getByRole("radio", { name: /Makan/ }));
  expect(screen.getByRole("radio", { name: /Makan/ }).getAttribute("aria-checked")).toBe("true");
  expect(hidden("categoryId")).toBe("c-makan");

  // Ganti jenis: daftar berganti dan pilihan lama dibuang (tidak boleh kategori pengeluaran untuk pemasukan).
  fireEvent.click(screen.getByRole("radio", { name: "Pemasukan" }));
  expect(hidden("type")).toBe("income");
  expect(hidden("categoryId")).toBe("");
  expect(screen.getByRole("radio", { name: /Uang Saku/ })).toBeDefined();
  expect(screen.queryByRole("radio", { name: /Makan/ })).toBeNull();
});

test("nominal besar berlabel; isian awal dari AI dipakai", () => {
  render(<TransactionForm categories={categories} wallets={wallets} today="2026-11-16" prefill={{ amount: "25000", categoryId: "c-makan" }} onDone={() => {}} />);
  expect((screen.getByLabelText("Nominal") as HTMLInputElement).value).toBe("25000");
  expect(hidden("categoryId")).toBe("c-makan");
});
