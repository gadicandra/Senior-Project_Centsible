import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { toast } from "sonner";
import { budgetUsage, type BudgetOverview, type BudgetView } from "@/lib/budget";
import { BUDGET_NOT_FOUND } from "@/lib/schemas/budget";
import { removeBudget, saveBudget } from "@/server/actions/budgets";
import { BudgetsScreen } from "./budgets-screen";

const push = vi.hoisted(() => vi.fn()); // vi.mock diangkat ke atas; vi.hoisted membuat spy tersedia di factory
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/server/actions/budgets", () => ({
  saveBudget: vi.fn(async () => ({ ok: true, message: "ok" })),
  removeBudget: vi.fn(async () => ({ ok: true, message: "Anggaran dihapus." })),
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const MAKAN = { id: "c-makan", name: "Makan", icon: "🍜" };
const TRANSPORT = { id: "c-trans", name: "Transport", icon: null };
const WEEK = { from: "2026-10-12", to: "2026-10-18" };
const MONTH = { from: "2026-10-01", to: "2026-10-31" };

function b(id: string, cat: { id: string; name: string }, period: "weekly" | "monthly", used = 0, extra: Partial<BudgetView> = {}) {
  return {
    id,
    categoryId: cat.id,
    name: cat.name,
    icon: null,
    color: null,
    isArchived: false,
    period,
    ...(period === "weekly" ? WEEK : MONTH),
    ...budgetUsage(used, 500_000),
    ...extra,
  } satisfies BudgetView;
}
const overview = (budgets: BudgetView[]): BudgetOverview => ({ today: "2026-10-15", week: WEEK, month: MONTH, budgets });

beforeEach(() => vi.clearAllMocks());
afterEach(cleanup);

async function openMenu(name: string) {
  await act(async () => fireEvent.click(screen.getByRole("button", { name })));
}

describe("BudgetsScreen", () => {
  test("kosong: pesan dan dua tombol Tambah anggaran aktif", () => {
    render(<BudgetsScreen overview={overview([])} categories={[MAKAN]} />);
    expect(screen.getByText("Belum ada anggaran.")).toBeDefined();
    const buttons = screen.getAllByRole("button", { name: "Tambah anggaran" });
    expect(buttons).toHaveLength(2);
    expect(buttons.every((x) => !(x as HTMLButtonElement).disabled)).toBe(true);
  });

  test("bagian Bulanan & Mingguan; bagian kosong tidak tampil; arsip ditandai", () => {
    const { rerender } = render(
      <BudgetsScreen
        overview={overview([b("1", MAKAN, "monthly"), b("2", TRANSPORT, "weekly", 0, { isArchived: true })])}
        categories={[MAKAN]}
      />,
    );
    expect(screen.getByRole("heading", { name: "Bulanan · Oktober 2026" })).toBeDefined();
    expect(screen.getByRole("heading", { name: "Mingguan · 12–18 Okt 2026" })).toBeDefined();
    expect(screen.getByText(/Transport · arsip/)).toBeDefined();
    rerender(<BudgetsScreen overview={overview([b("1", MAKAN, "monthly")])} categories={[MAKAN]} />);
    expect(screen.queryByRole("heading", { name: /^Mingguan/ })).toBeNull();
  });

  test("tombol tambah nonaktif bila semua kategori punya dua anggaran", () => {
    const { rerender } = render(
      <BudgetsScreen overview={overview([b("1", MAKAN, "monthly"), b("2", MAKAN, "weekly")])} categories={[MAKAN]} />,
    );
    expect((screen.getByRole("button", { name: "Tambah anggaran" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText(/Semua kategori pengeluaran sudah punya/)).toBeDefined();
    rerender(<BudgetsScreen overview={overview([b("1", MAKAN, "monthly")])} categories={[MAKAN]} />);
    expect((screen.getByRole("button", { name: "Tambah anggaran" }) as HTMLButtonElement).disabled).toBe(false);
  });

  test("nama aksesibel unik per periode", () => {
    render(<BudgetsScreen overview={overview([b("1", MAKAN, "monthly"), b("2", MAKAN, "weekly")])} categories={[]} />);
    for (const p of ["mingguan", "bulanan"]) {
      expect(screen.getAllByRole("button", { name: `Aksi untuk anggaran Makan (${p})` })).toHaveLength(1);
      expect(screen.getAllByRole("progressbar", { name: `Pemakaian anggaran Makan (${p})` })).toHaveLength(1);
    }
  });

  test("Lihat transaksi membuka /transaksi dengan rentang bulan", async () => {
    render(<BudgetsScreen overview={overview([b("1", MAKAN, "monthly")])} categories={[]} />);
    await openMenu("Aksi untuk anggaran Makan (bulanan)");
    await act(async () => fireEvent.click(screen.getByRole("menuitem", { name: "Lihat transaksi" })));
    expect(push).toHaveBeenCalledWith("/transaksi?type=expense&categoryId=c-makan&from=2026-10-01&to=2026-10-31");
  });

  test("hapus: Batal tidak menghapus, Hapus memanggil removeBudget", async () => {
    render(<BudgetsScreen overview={overview([b("1", MAKAN, "monthly")])} categories={[]} />);
    await openMenu("Aksi untuk anggaran Makan (bulanan)");
    await act(async () => fireEvent.click(screen.getByRole("menuitem", { name: "Hapus" })));
    expect(screen.getByText("Hapus anggaran Makan (bulanan)?")).toBeDefined();
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Batal" })));
    expect(removeBudget).not.toHaveBeenCalled();

    await openMenu("Aksi untuk anggaran Makan (bulanan)");
    await act(async () => fireEvent.click(screen.getByRole("menuitem", { name: "Hapus" })));
    await act(async () => fireEvent.click(screen.getByRole("button", { name: "Hapus" })));
    expect(removeBudget).toHaveBeenCalledWith("1");
  });

  test("ubah: hanya nominal + id tersembunyi; kartu basi memunculkan toast", async () => {
    vi.mocked(saveBudget).mockResolvedValueOnce({ ok: false, message: BUDGET_NOT_FOUND });
    render(<BudgetsScreen overview={overview([b("1", MAKAN, "monthly")])} categories={[]} />);
    await openMenu("Aksi untuk anggaran Makan (bulanan)");
    await act(async () => fireEvent.click(screen.getByRole("menuitem", { name: "Ubah" })));

    const dialog = screen.getByRole("dialog");
    expect(dialog.querySelector('input[type="hidden"][name="id"]')?.getAttribute("value")).toBe("1");
    expect(screen.queryByLabelText("Kategori")).toBeNull();
    expect(screen.queryByLabelText("Periode")).toBeNull();
    expect((screen.getByLabelText("Batas (Rp)") as HTMLInputElement).value).toBe("500.000");

    await act(async () => fireEvent.submit(dialog.querySelector("form")!));
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith(BUDGET_NOT_FOUND));
  });
});
