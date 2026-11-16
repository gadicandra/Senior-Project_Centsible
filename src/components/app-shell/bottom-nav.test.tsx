import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { BottomNav } from "./bottom-nav";

const pathname = vi.hoisted(() => ({ value: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.value }));
afterEach(() => {
  cleanup();
  pathname.value = "/";
});

test("4 tujuan + tombol tambah di tengah; halaman aktif ditandai", () => {
  pathname.value = "/anggaran";
  const onAdd = vi.fn();
  render(<BottomNav onAdd={onAdd} />);
  const items = screen.getAllByRole("listitem").map((li) => li.textContent);
  expect(items).toEqual(["Beranda", "Ringkasan", "", "Anggaran", "Pengaturan"]);
  expect(screen.getByRole("link", { name: "Anggaran" }).getAttribute("aria-current")).toBe("page");
  expect(screen.getByRole("link", { name: "Beranda" }).hasAttribute("aria-current")).toBe(false);
  fireEvent.click(screen.getByRole("button", { name: "Tambah transaksi" }));
  expect(onAdd).toHaveBeenCalledTimes(1);
});
