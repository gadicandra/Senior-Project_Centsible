import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { budgetUsage, type BudgetView } from "@/lib/budget";
import { BudgetMeter } from "./budget-meter";
import { categoryOptionLabel } from "./types";

afterEach(cleanup);

function budget(used: number, over: Partial<BudgetView> = {}): BudgetView {
  return {
    id: "b1",
    categoryId: "c1",
    name: "Makan",
    icon: null,
    color: null,
    isArchived: false,
    period: "monthly",
    from: "2026-10-01",
    to: "2026-10-31",
    ...budgetUsage(used, over.amountLimit ?? 500_000),
    ...over,
  };
}

describe("BudgetMeter", () => {
  test.each([
    [325_000, "65", "65%", "bg-emerald-600", "Aman · sisa Rp 175.000"],
    [400_000, "80", "80%", "bg-amber-700", "Hampir habis · sisa Rp 100.000"],
    [6_250_000, "100", "100%", "bg-red-600", "Melebihi Rp 5.750.000"],
  ])("used %i", (used, now, width, fill, text) => {
    render(<BudgetMeter budget={budget(used)} />);
    const bar = screen.getByRole("progressbar", { name: "Pemakaian anggaran Makan (bulanan)" });
    expect(bar.getAttribute("aria-valuenow")).toBe(now);
    const pct = budget(used).percent.toLocaleString("id-ID");
    expect(bar.getAttribute("aria-valuetext")).toBe(`${pct}% terpakai. ${text}`);
    const fillEl = bar.firstElementChild as HTMLElement;
    expect(fillEl.style.width).toBe(width);
    expect(fillEl.className).toContain(fill);
    // Normalizer bawaan mengubah U+00A0 jadi spasi biasa; bandingkan teks apa adanya.
    const status = screen.getByText(text, { normalizer: (s) => s.trim() });
    expect(status.querySelector("svg")?.getAttribute("aria-hidden")).toBe("true");
    expect(screen.getByText(`${pct}%`)).toBeDefined();
  });

  test("mingguan & compact", () => {
    render(<BudgetMeter budget={budget(0, { period: "weekly" })} compact />);
    expect(screen.getByRole("progressbar", { name: "Pemakaian anggaran Makan (mingguan)" })).toBeDefined();
    expect(screen.getByText("Makan")).toBeDefined();
    expect(screen.getByText("Mingguan")).toBeDefined();
    expect(screen.queryByText(/dari/)).toBeNull();
  });
});

test("categoryOptionLabel", () => {
  expect(categoryOptionLabel({ icon: "🍜", name: "Makan" })).toBe("🍜 Makan");
  expect(categoryOptionLabel({ icon: null, name: "Hobi" })).toBe("Hobi");
});
