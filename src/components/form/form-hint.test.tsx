import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { FormField } from "./form-field";
import { FormSelect } from "./form-select";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const options = [
  { value: "a", label: "Makan" },
  { value: "b", label: "Transport" },
];

describe("FormField hint", () => {
  test("dengan hint: kontrol menunjuk ke elemen hint", () => {
    render(<FormField name="amount" label="Nominal" hint="⚠ Periksa nominal" state={{}} />);
    const input = screen.getByLabelText("Nominal");
    expect(input.getAttribute("aria-describedby")).toBe("amount-hint");
    expect(document.getElementById("amount-hint")?.textContent).toContain("Periksa nominal");
  });

  test("hint digabung dengan aria-describedby milik pemanggil", () => {
    render(<FormField name="amount" label="Nominal" hint="x" aria-describedby="other" state={{}} />);
    expect(screen.getByLabelText("Nominal").getAttribute("aria-describedby")).toBe("other amount-hint");
  });

  test("tanpa hint: tidak ada aria-describedby dan tidak ada elemen hint", () => {
    render(<FormField name="amount" label="Nominal" defaultValue="5" state={{}} />);
    const input = screen.getByLabelText("Nominal") as HTMLInputElement;
    expect(input.hasAttribute("aria-describedby")).toBe(false);
    expect(document.getElementById("amount-hint")).toBeNull();
    expect(input.value).toBe("5");
  });

  test("terkontrol + state.values: memakai value tanpa peringatan value/defaultValue", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <FormField
        name="amount"
        label="Nominal"
        value="100.000"
        onChange={() => {}}
        state={{ ok: false, values: { amount: "1" } }}
      />,
    );
    expect((screen.getByLabelText("Nominal") as HTMLInputElement).value).toBe("100.000");
    expect(error).not.toHaveBeenCalled();
  });
});

describe("FormSelect hint", () => {
  test("dengan hint: trigger menunjuk ke elemen hint", () => {
    render(<FormSelect name="categoryId" label="Kategori" options={options} hint="⚠ Periksa kategori" state={{}} />);
    const trigger = screen.getByLabelText("Kategori");
    expect(trigger.getAttribute("aria-describedby")).toBe("categoryId-hint");
    expect(document.getElementById("categoryId-hint")?.textContent).toContain("Periksa kategori");
  });

  test("tanpa hint: tidak ada aria-describedby", () => {
    render(<FormSelect name="categoryId" label="Kategori" options={options} state={{}} />);
    expect(screen.getByLabelText("Kategori").hasAttribute("aria-describedby")).toBe(false);
    expect(document.getElementById("categoryId-hint")).toBeNull();
  });
});
