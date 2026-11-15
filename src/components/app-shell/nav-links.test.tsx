import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { NavLinks } from "./nav-links";

vi.mock("next/navigation", () => ({ usePathname: vi.fn(() => "/ringkasan") }));

afterEach(() => {
  cleanup();
});

test("Ringkasan ada setelah Beranda dan aktif di /ringkasan", () => {
  render(<NavLinks />);
  const links = screen.getAllByRole("link");
  expect(links.map((l) => l.textContent)).toEqual(["Beranda", "Ringkasan", "Transaksi", "Pengaturan"]);
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
