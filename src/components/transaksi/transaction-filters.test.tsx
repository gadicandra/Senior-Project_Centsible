import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { TransactionFilters } from "./transaction-filters";

const replace = vi.hoisted(() => vi.fn());
const search = vi.hoisted(() => ({ value: "" }));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ replace }),
  usePathname: () => "/transaksi",
  useSearchParams: () => new URLSearchParams(search.value),
}));

const categories = [
  { id: "c-makan", name: "Makan", kind: "expense" as const, icon: "🍜", isArchived: false },
  { id: "c-gaji", name: "Gaji", kind: "income" as const, icon: null, isArchived: false },
  { id: "c-lama", name: "Lama", kind: "expense" as const, icon: null, isArchived: true },
];
const wallets = [{ id: "w1", name: "Tunai", isDefault: true, isArchived: false }];

beforeEach(() => {
  replace.mockClear();
  search.value = "";
});
afterEach(cleanup);

// Base UI Select memilih lewat pointer event, bukan click biasa.
async function choose(label: string, option: string) {
  await act(async () => fireEvent.click(screen.getByLabelText(label)));
  const el = await screen.findByRole("option", { name: option });
  await act(async () => {
    fireEvent.pointerDown(el, { pointerType: "mouse" });
    fireEvent.pointerUp(el, { pointerType: "mouse" });
    fireEvent.click(el);
  });
}

test("tanggal ditulis ke URL dan nomor halaman direset", () => {
  search.value = "page=3&type=expense";
  render(<TransactionFilters filters={{ type: "expense" }} categories={categories} wallets={wallets} />);
  fireEvent.change(screen.getByLabelText("Dari"), { target: { value: "2026-10-01" } });
  expect(replace).toHaveBeenCalledWith("/transaksi?type=expense&from=2026-10-01", { scroll: false });
});

test("ganti jenis membuang kategori yang tidak cocok; kategori arsip ditandai", async () => {
  search.value = "categoryId=c-makan";
  render(<TransactionFilters filters={{ categoryId: "c-makan" }} categories={categories} wallets={wallets} />);
  await act(async () => fireEvent.click(screen.getByLabelText("Kategori")));
  expect(screen.getByRole("option", { name: "Lama (arsip)" })).toBeDefined();
  await act(async () => fireEvent.keyDown(document.activeElement!, { key: "Escape" }));
  await choose("Jenis", "Pemasukan");
  expect(replace).toHaveBeenLastCalledWith("/transaksi?type=income", { scroll: false });
});

test("Semua = parameter dihapus; Reset nonaktif tanpa filter", async () => {
  search.value = "walletId=w1";
  const { rerender } = render(<TransactionFilters filters={{ walletId: "w1" }} categories={categories} wallets={wallets} />);
  await choose("Dompet", "Semua dompet");
  expect(replace).toHaveBeenLastCalledWith("/transaksi?", { scroll: false });
  fireEvent.click(screen.getByRole("button", { name: "Reset" }));
  expect(replace).toHaveBeenLastCalledWith("/transaksi", { scroll: false });
  rerender(<TransactionFilters filters={{}} categories={categories} wallets={wallets} />);
  expect((screen.getByRole("button", { name: "Reset" }) as HTMLButtonElement).disabled).toBe(true);
});
