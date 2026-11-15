// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { BUDGET_NOT_FOUND } from "@/lib/schemas/budget";
import { BudgetError, createBudget, updateBudgetLimit, deleteBudget } from "@/server/services/budgets";
import { getTimezone } from "@/server/services/profile";
import { removeBudget, saveBudget } from "./budgets";

const CLAIMS = { sub: "11111111-1111-4111-8111-111111111111", role: "authenticated" };
vi.mock("@/server/auth/session", () => ({ requireClaims: vi.fn(async () => CLAIMS) }));
vi.mock("@/server/services/profile", () => ({ getTimezone: vi.fn(async () => "Asia/Jakarta") }));
vi.mock("@/server/services/budgets", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/services/budgets")>()),
  createBudget: vi.fn(),
  updateBudgetLimit: vi.fn(),
  deleteBudget: vi.fn(),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

const CAT = "22222222-2222-4222-8222-222222222222";
const ID = "33333333-3333-4333-8333-333333333333";

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
}
const createForm = (over: Record<string, string> = {}) =>
  form({ categoryId: CAT, period: "monthly", amountLimit: "500.000", ...over });

let consoleError: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  vi.clearAllMocks();
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => consoleError.mockRestore());

describe("saveBudget: tambah", () => {
  test("nominal tidak valid → field error, service tidak dipanggil", async () => {
    const r = await saveBudget({}, createForm({ amountLimit: "999" }));
    expect(r.fieldErrors?.amountLimit).toBeDefined();
    expect(r.values?.amountLimit).toBe("999");
    expect(createBudget).not.toHaveBeenCalled();
  });

  test("berhasil → revalidate /anggaran dan /", async () => {
    expect(await saveBudget({}, createForm())).toEqual({ ok: true, message: "Anggaran ditambahkan." });
    expect(vi.mocked(revalidatePath).mock.calls.map((c) => c[0])).toEqual(["/anggaran", "/"]);
  });

  test("BudgetError ber-field → fieldErrors", async () => {
    vi.mocked(createBudget).mockRejectedValueOnce(new BudgetError("Kategori tidak ditemukan.", "categoryId"));
    expect((await saveBudget({}, createForm())).fieldErrors).toEqual({ categoryId: ["Kategori tidak ditemukan."] });
  });

  test("unique violation (balapan) → pesan duplikat", async () => {
    vi.mocked(createBudget).mockRejectedValueOnce({ code: "23505" });
    expect((await saveBudget({}, createForm())).fieldErrors).toEqual({
      categoryId: ["Kategori ini sudah punya anggaran bulanan."],
    });
  });

  test("error lain → pesan umum + log", async () => {
    vi.mocked(createBudget).mockRejectedValueOnce(new Error("db"));
    expect((await saveBudget({}, createForm())).message).toBe("Gagal menyimpan anggaran. Coba lagi.");
    expect(consoleError).toHaveBeenCalled();
  });

  test("getTimezone gagal → pesan umum, createBudget tidak dipanggil", async () => {
    vi.mocked(getTimezone).mockRejectedValueOnce(new Error("P2028"));
    const r = await saveBudget({}, createForm());
    expect(r).toMatchObject({ ok: false, message: "Gagal menyimpan anggaran. Coba lagi.", values: { amountLimit: "500.000" } });
    expect(createBudget).not.toHaveBeenCalled();
    expect(consoleError).toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("saveBudget: ubah", () => {
  test("id tidak valid → BUDGET_NOT_FOUND", async () => {
    expect((await saveBudget({}, form({ id: "x", amountLimit: "1.000" }))).message).toBe(BUDGET_NOT_FOUND);
    expect(updateBudgetLimit).not.toHaveBeenCalled();
  });

  test("hanya nominal yang dipakai; categoryId palsu diabaikan", async () => {
    expect((await saveBudget({}, form({ id: ID, amountLimit: "2.000", categoryId: CAT }))).ok).toBe(true);
    expect(updateBudgetLimit).toHaveBeenCalledWith(CLAIMS, ID, 2_000);
  });

  test("kartu basi → BUDGET_NOT_FOUND, hanya /anggaran direvalidasi", async () => {
    vi.mocked(updateBudgetLimit).mockRejectedValueOnce(new BudgetError(BUDGET_NOT_FOUND));
    const r = await saveBudget({}, form({ id: ID, amountLimit: "2.000" }));
    expect(r).toMatchObject({ ok: false, message: BUDGET_NOT_FOUND, values: { amountLimit: "2.000" } });
    expect(vi.mocked(revalidatePath).mock.calls.map((c) => c[0])).toEqual(["/anggaran"]);
  });

  test("error lain → SAVE_FAILED tanpa revalidate", async () => {
    vi.mocked(updateBudgetLimit).mockRejectedValueOnce(new Error("db"));
    expect((await saveBudget({}, form({ id: ID, amountLimit: "2.000" }))).message).toBe("Gagal menyimpan anggaran. Coba lagi.");
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});

describe("removeBudget", () => {
  test("id tidak valid", async () => {
    expect(await removeBudget("not-a-uuid")).toEqual({ ok: false, message: BUDGET_NOT_FOUND });
    expect(deleteBudget).not.toHaveBeenCalled();
  });

  test("sudah dihapus → ok:false dan /anggaran direvalidasi", async () => {
    vi.mocked(deleteBudget).mockRejectedValueOnce(new BudgetError(BUDGET_NOT_FOUND));
    expect(await removeBudget(ID)).toMatchObject({ ok: false, message: BUDGET_NOT_FOUND });
    expect(revalidatePath).toHaveBeenCalledWith("/anggaran");
  });
});
