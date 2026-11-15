// @vitest-environment node
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { revalidatePath } from "next/cache";
import { CategoryError, createCategory, deleteCategory, updateCategory } from "@/server/services/categories";
import { WalletError, createWallet, setDefaultWallet, updateWallet } from "@/server/services/wallets";
import { archiveCategory, makeDefaultWallet, removeCategory, saveCategory, saveWallet } from "./settings";

const CLAIMS = { sub: "11111111-1111-4111-8111-111111111111" };
const ID = "22222222-2222-4222-8222-222222222222";
vi.mock("@/server/auth/session", () => ({ requireClaims: vi.fn(async () => CLAIMS) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/services/wallets", async (o) => ({
  ...(await o<typeof import("@/server/services/wallets")>()),
  createWallet: vi.fn(),
  updateWallet: vi.fn(),
  setDefaultWallet: vi.fn(),
}));
vi.mock("@/server/services/categories", async (o) => ({
  ...(await o<typeof import("@/server/services/categories")>()),
  createCategory: vi.fn(),
  updateCategory: vi.fn(),
  setCategoryArchived: vi.fn(),
  deleteCategory: vi.fn(),
}));

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
}

let consoleError: ReturnType<typeof vi.spyOn>;
beforeEach(() => {
  vi.clearAllMocks();
  consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
});
afterEach(() => consoleError.mockRestore());

describe("saveWallet", () => {
  test("tambah: saldo awal boleh negatif, ribuan diurai, revalidate pengaturan & transaksi", async () => {
    expect(await saveWallet({}, form({ name: "BCA", type: "bank", initialBalance: "-1.500.000" }))).toEqual({
      ok: true,
      message: "Dompet ditambahkan.",
    });
    expect(createWallet).toHaveBeenCalledWith(CLAIMS, { name: "BCA", type: "bank", initialBalance: -1_500_000 });
    expect(vi.mocked(revalidatePath).mock.calls.map((c) => c[0])).toEqual(["/pengaturan", "/transaksi"]);
  });

  test("ubah memakai id; field palsu dibuang skema", async () => {
    await saveWallet({}, form({ id: ID, name: "BCA", type: "bank", initialBalance: "0", userId: "orang-lain" }));
    expect(updateWallet).toHaveBeenCalledWith(CLAIMS, ID, { name: "BCA", type: "bank", initialBalance: 0 });
  });

  test("input tidak valid & nama duplikat", async () => {
    expect((await saveWallet({}, form({ name: "", type: "kripto", initialBalance: "x" }))).fieldErrors).toMatchObject({
      name: ["Nama wajib diisi"],
      type: ["Jenis dompet tidak valid"],
    });
    vi.mocked(createWallet).mockRejectedValueOnce({ code: "23505" });
    expect((await saveWallet({}, form({ name: "Tunai", type: "cash", initialBalance: "0" }))).fieldErrors).toEqual({
      name: ["Nama dompet sudah dipakai"],
    });
  });

  test("error aturan bisnis diteruskan; error lain disembunyikan dan dicatat", async () => {
    vi.mocked(setDefaultWallet).mockRejectedValueOnce(new WalletError("Dompet arsip tidak bisa jadi utama."));
    expect(await makeDefaultWallet(ID)).toMatchObject({ ok: false, message: "Dompet arsip tidak bisa jadi utama." });
    vi.mocked(setDefaultWallet).mockRejectedValueOnce(new Error("koneksi putus: postgres://..."));
    expect(await makeDefaultWallet(ID)).toMatchObject({ ok: false, message: "Terjadi kesalahan. Coba lagi." });
    expect(consoleError).toHaveBeenCalled();
  });
});

describe("kategori", () => {
  test("tambah: ikon/warna kosong jadi null", async () => {
    await saveCategory({}, form({ name: "Kopi", kind: "expense", icon: "", color: "" }));
    expect(createCategory).toHaveBeenCalledWith(CLAIMS, { name: "Kopi", kind: "expense", icon: null, color: null });
  });

  test("warna salah format ditolak", async () => {
    expect((await saveCategory({}, form({ name: "Kopi", kind: "expense", icon: "", color: "merah" }))).fieldErrors?.color).toEqual([
      "Warna harus berformat #RRGGBB",
    ]);
  });

  test("id bukan UUID tidak sampai ke service", async () => {
    expect((await archiveCategory("bukan-uuid", true)).ok).toBe(false);
    expect(consoleError).toHaveBeenCalled();
  });

  test("hapus kategori terpakai → pesan dari service", async () => {
    vi.mocked(deleteCategory).mockRejectedValueOnce(new CategoryError("Kategori ini sudah dipakai transaksi."));
    expect(await removeCategory(ID)).toMatchObject({ ok: false, message: "Kategori ini sudah dipakai transaksi." });
  });
});
