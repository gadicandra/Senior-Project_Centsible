import { expect, test } from "vitest";
import { render, screen } from "@testing-library/react";
import { HomeHero } from "./home-hero";

test("HomeHero merender heading utama", () => {
  render(<HomeHero />);
  expect(screen.getByRole("heading", { level: 1 })).toBeDefined();
});
