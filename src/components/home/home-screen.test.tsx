import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import { HomeScreen } from "./home-screen";

test("HomeScreen menyapa pengguna", () => {
  render(<HomeScreen displayName="Adi" />);
  expect(screen.getByRole("heading", { level: 1, name: "Halo, Adi" })).toBeDefined();
});
