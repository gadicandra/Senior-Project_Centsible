import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { NavLinks } from "./nav-links";

const pathname = vi.hoisted(() => ({ value: "/ringkasan" }));
vi.mock("next/navigation", () => ({ usePathname: () => pathname.value }));

afterEach(() => {
  cleanup();
  pathname.value = "/ringkasan";
});

test("Ringkasan ada setelah Beranda dan aktif di /ringkasan", () => {
  render(<NavLinks />);
  const links = screen.getAllByRole("link");
  expect(links.map((l) => l.textContent)).toEqual(["Beranda", "Ringkasan", "Transaksi", "Anggaran", "Pengaturan"]);
  expect(screen.getByRole("link", { name: "Ringkasan" }).getAttribute("href")).toBe("/ringkasan");
  expect(screen.getByRole("link", { name: "Ringkasan" }).getAttribute("aria-current")).toBe("page");
  expect(screen.getByRole("link", { name: "Beranda" }).hasAttribute("aria-current")).toBe(false);
});

test("className digabung ke <nav>", () => {
  render(<NavLinks className="order-last" />);
  const nav = screen.getByRole("navigation");
  expect(nav.classList.contains("order-last")).toBe(true);
  expect(nav.classList.contains("flex")).toBe(true);
});

test("Anggaran setelah Transaksi dan aktif di /anggaran", () => {
  pathname.value = "/anggaran";
  render(<NavLinks />);
  expect(screen.getByRole("link", { name: "Anggaran" }).getAttribute("href")).toBe("/anggaran");
  const current = screen.getAllByRole("link").filter((l) => l.getAttribute("aria-current") === "page");
  expect(current.map((l) => l.textContent)).toEqual(["Anggaran"]);
});
