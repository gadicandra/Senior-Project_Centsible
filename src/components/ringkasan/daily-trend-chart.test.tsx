import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, test } from "vitest";
import { zeroFillDaily } from "@/lib/summary";
import { DailyTrendChart } from "./daily-trend-chart";

afterEach(() => {
  cleanup();
});

type Row = { date: string; type: "income" | "expense"; amount: number };
const october = (rows: Row[]) => zeroFillDaily(rows, "2026-10-01", "2026-10-31");
const september = (rows: Row[]) => zeroFillDaily(rows, "2026-09-01", "2026-09-30");

function renderChart(daily = october([]), today = "2026-10-25", monthLabel = "Oktober 2026") {
  return render(<DailyTrendChart daily={daily} monthLabel={monthLabel} today={today} />);
}

describe("DailyTrendChart", () => {
  test("nama dan deskripsi aksesibel dari judul dan figcaption", () => {
    renderChart(october([{ date: "2026-10-12", type: "expense", amount: 25_000 }]));
    const svg = screen.getByRole("img", { name: /Tren harian Oktober 2026/ });
    expect(svg.querySelector("desc")).toBeNull();
    const caption = document.getElementById(svg.getAttribute("aria-describedby")!);
    expect(caption?.tagName).toBe("FIGCAPTION");
    expect(caption?.textContent).toMatch(/Pengeluaran tertinggi/);
  });

  test("figcaption menyebut hari pengeluaran tertinggi; seri → tanggal paling awal", () => {
    renderChart(
      october([
        { date: "2026-10-03", type: "expense", amount: 40_000 },
        { date: "2026-10-09", type: "expense", amount: 40_000 },
        { date: "2026-10-05", type: "expense", amount: 1_000 },
      ]),
    );
    const caption = document.querySelector("figcaption")!.textContent!;
    expect(caption).toMatch(/Pengeluaran tertinggi Rp\s40\.000 pada .*3 Okt 2026/);
  });

  test("bulan tanpa pengeluaran", () => {
    renderChart(october([{ date: "2026-10-03", type: "income", amount: 1_000 }]));
    expect(document.querySelector("figcaption")!.textContent).toBe("Belum ada pengeluaran di bulan ini.");
  });

  test("tabel hanya berisi hari tidak nol", () => {
    renderChart(
      october([
        { date: "2026-10-01", type: "income", amount: 1_000 },
        { date: "2026-10-01", type: "expense", amount: 500 },
        { date: "2026-10-12", type: "expense", amount: 25_000 },
      ]),
    );
    expect(document.querySelectorAll("tbody tr")).toHaveLength(2);
  });

  test("batang: 2 per hari, pengeluaran bergaris, pemasukan hanya kelas", () => {
    renderChart(october([{ date: "2026-10-12", type: "expense", amount: 25_000 }]));
    const svg = screen.getByRole("img");
    const bars = svg.querySelectorAll("rect[data-kind]");
    expect(bars).toHaveLength(62);
    const expense = [...svg.querySelectorAll('rect[data-kind="expense"]')];
    const fill = expense[0].getAttribute("fill")!;
    expect(expense.every((r) => /^url\(#.+-hatch\)$/.test(r.getAttribute("fill") ?? ""))).toBe(true);
    expect([...svg.querySelectorAll('rect[data-kind="income"]')].every((r) => !r.hasAttribute("fill"))).toBe(true);
    const patternId = fill.slice(5, -1);
    expect(document.getElementById(patternId)?.tagName.toLowerCase()).toBe("pattern");
  });

  test("judul batang memakai tanggal pendek", () => {
    renderChart(october([{ date: "2026-10-12", type: "expense", amount: 25_000 }]));
    const titles = [...screen.getByRole("img").querySelectorAll("g > title")].map((t) => t.textContent);
    expect(titles[11]).toMatch(/^12 Okt: pemasukan Rp\s0, pengeluaran Rp\s25\.000$/);
  });

  test("legenda menyebut posisi dan tekstur", () => {
    renderChart();
    expect(screen.getByText("Pemasukan (batang kiri, polos)")).toBeDefined();
    expect(screen.getByText("Pengeluaran (batang kanan, bergaris)")).toBeDefined();
  });

  test("geometri: batang tertinggi tinggi 100, y 20", () => {
    renderChart(october([{ date: "2026-10-05", type: "income", amount: 70_000 }]));
    const bar = screen.getByRole("img").querySelectorAll('rect[data-kind="income"]')[4];
    expect(bar.getAttribute("height")).toBe("100");
    expect(bar.getAttribute("y")).toBe("20");
  });

  test("label hari diposisikan di tengah slot", () => {
    renderChart(september([]), "2026-10-25", "September 2026");
    const label = [...document.querySelectorAll("span.absolute")].find((s) => s.textContent === "22") as HTMLElement;
    expect(label.style.left).toBe(`${(21.5 / 30) * 100}%`);
  });

  test("rata-rata bulan berjalan dibagi hari yang sudah lewat", () => {
    renderChart(october([{ date: "2026-10-02", type: "expense", amount: 100_000 }]), "2026-10-10");
    expect(document.querySelector("figcaption")!.textContent).toMatch(/Rata-rata pengeluaran per hari Rp\s10\.000\./);
  });

  test("rata-rata bulan lalu dibagi jumlah hari bulan itu", () => {
    renderChart(september([{ date: "2026-09-02", type: "expense", amount: 300_000 }]), "2026-10-10", "September 2026");
    expect(document.querySelector("figcaption")!.textContent).toMatch(/Rata-rata pengeluaran per hari Rp\s10\.000\./);
  });

  test("garis hari ini hanya untuk bulan berjalan", () => {
    renderChart(october([]), "2026-10-10");
    expect(screen.getByRole("img").querySelector("line[stroke-dasharray]")).not.toBeNull();
    cleanup();
    renderChart(september([]), "2026-10-10", "September 2026");
    expect(screen.getByRole("img").querySelector("line[stroke-dasharray]")).toBeNull();
  });
});
