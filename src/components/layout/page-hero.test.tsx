import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { PageHero } from "./page-hero";

afterEach(cleanup);

test("judul h1, subjudul, angka utama, dan aksi", () => {
  render(<PageHero title="Ringkasan" subtitle="sub" valueLabel="Total saldo" value="Rp 1" actions={<button type="button">Aksi</button>} />);
  expect(screen.getByRole("heading", { level: 1, name: "Ringkasan" })).toBeDefined();
  expect(screen.getByText("sub")).toBeDefined();
  expect(screen.getByText("Total saldo")).toBeDefined();
  expect(screen.getByText("Rp 1")).toBeDefined();
  expect(screen.getByRole("button", { name: "Aksi" })).toBeDefined();
});
