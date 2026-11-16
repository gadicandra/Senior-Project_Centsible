// @vitest-environment node
import { beforeEach, describe, expect, test, vi } from "vitest";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/server/supabase/admin";
import { createClient } from "@/server/supabase/server";
import { deleteAccount, requestPasswordReset, signIn, signInWithGoogle, signUp, updatePassword } from "./auth";

// redirect() Next melempar; tiru supaya alur berhenti seperti aslinya.
class Redirect extends Error {
  constructor(readonly to: string) {
    super(to);
  }
}
vi.mock("next/navigation", () => ({ redirect: vi.fn((to: string) => { throw new Redirect(to); }) }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("@/server/auth/session", () => ({ requireClaims: vi.fn(async () => ({ sub: "u1" })) }));
vi.mock("@/server/auth/origin", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/auth/origin")>()),
  requestOrigin: vi.fn(async () => "https://app.test"),
}));
vi.mock("@/server/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/server/supabase/admin", () => ({ createAdminClient: vi.fn() }));

const auth = {
  signInWithPassword: vi.fn(),
  signUp: vi.fn(),
  signInWithOAuth: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  updateUser: vi.fn(),
  signOut: vi.fn(),
};
const adminDelete = vi.fn();

function form(fields: Record<string, string>) {
  const fd = new FormData();
  for (const [k, v] of Object.entries(fields)) fd.append(k, v);
  return fd;
}
const redirectedTo = async (p: Promise<unknown>) => {
  const e = await p.catch((x: unknown) => x);
  expect(e).toBeInstanceOf(Redirect);
  return (e as Redirect).to;
};

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(createClient).mockResolvedValue({ auth } as never);
  vi.mocked(createAdminClient).mockReturnValue({ auth: { admin: { deleteUser: adminDelete } } } as never);
});

describe("signIn", () => {
  test("input tidak valid: tidak memanggil Supabase, kata sandi tidak dikembalikan", async () => {
    const r = await signIn({}, form({ email: "bukan-email", password: "rahasia123" }));
    expect(r.fieldErrors?.email).toEqual(["Email tidak valid"]);
    expect(r.values).toEqual({ email: "bukan-email" });
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
  });

  test("gagal: pesan umum (tidak membocorkan email terdaftar) atau belum dikonfirmasi", async () => {
    auth.signInWithPassword.mockResolvedValueOnce({ error: { code: "invalid_credentials" } });
    expect((await signIn({}, form({ email: "a@b.co", password: "x" }))).message).toBe("Email atau kata sandi salah.");
    auth.signInWithPassword.mockResolvedValueOnce({ error: { code: "email_not_confirmed" } });
    expect((await signIn({}, form({ email: "a@b.co", password: "x" }))).message).toMatch(/belum dikonfirmasi/);
  });

  test("berhasil: email dinormalisasi, redirect ke next internal saja (cegah open redirect)", async () => {
    auth.signInWithPassword.mockResolvedValue({ error: null });
    expect(await redirectedTo(signIn({}, form({ email: " A@B.CO ", password: "x", next: "/ringkasan" })))).toBe("/ringkasan");
    expect(auth.signInWithPassword).toHaveBeenCalledWith({ email: "a@b.co", password: "x" });
    expect(await redirectedTo(signIn({}, form({ email: "a@b.co", password: "x", next: "//jahat.example" })))).toBe("/");
    expect(await redirectedTo(signIn({}, form({ email: "a@b.co", password: "x", next: "https://jahat.example" })))).toBe("/");
  });
});

describe("signUp", () => {
  const valid = { fullName: "Adi", email: "a@b.co", password: "rahasia123", confirmPassword: "rahasia123" };

  test("konfirmasi kata sandi beda → field error", async () => {
    const r = await signUp({}, form({ ...valid, confirmPassword: "lain12345" }));
    expect(r.fieldErrors?.confirmPassword).toEqual(["Konfirmasi kata sandi tidak sama"]);
    expect(auth.signUp).not.toHaveBeenCalled();
  });

  test("tanpa sesi → minta cek email; nama & URL konfirmasi dikirim", async () => {
    auth.signUp.mockResolvedValueOnce({ data: { session: null }, error: null });
    expect(await signUp({}, form(valid))).toEqual({ ok: true, message: "Cek email Anda untuk mengonfirmasi akun, lalu masuk." });
    expect(auth.signUp).toHaveBeenCalledWith({
      email: "a@b.co",
      password: "rahasia123",
      options: { data: { full_name: "Adi" }, emailRedirectTo: "https://app.test/auth/confirm?next=/" },
    });
  });

  test("pesan error dipetakan", async () => {
    auth.signUp.mockResolvedValueOnce({ data: {}, error: { code: "user_already_exists" } });
    expect((await signUp({}, form(valid))).message).toBe("Email sudah terdaftar. Silakan masuk.");
    auth.signUp.mockResolvedValueOnce({ data: {}, error: { code: "weak_password" } });
    expect((await signUp({}, form(valid))).message).toBe("Kata sandi terlalu lemah.");
  });
});

test("signInWithGoogle: next dibersihkan dan di-encode", async () => {
  auth.signInWithOAuth.mockResolvedValueOnce({ data: { url: "https://accounts.google.com/x" }, error: null });
  expect(await redirectedTo(signInWithGoogle(form({ next: "//jahat.example" })))).toBe("https://accounts.google.com/x");
  expect(auth.signInWithOAuth.mock.calls[0][0].options.redirectTo).toBe("https://app.test/auth/callback?next=%2F");
  auth.signInWithOAuth.mockResolvedValueOnce({ data: {}, error: { message: "x" } });
  expect(await redirectedTo(signInWithGoogle(form({})))).toBe("/login?error=oauth");
});

test("requestPasswordReset: pesan sama walau email tidak terdaftar", async () => {
  auth.resetPasswordForEmail.mockResolvedValue({ error: { message: "not found" } });
  const r = await requestPasswordReset({}, form({ email: "tidakada@b.co" }));
  expect(r).toEqual({ ok: true, message: "Jika email terdaftar, tautan atur ulang kata sandi sudah dikirim." });
});

test("updatePassword: kata sandi sama ditolak dengan pesan jelas", async () => {
  auth.updateUser.mockResolvedValueOnce({ error: { code: "same_password" } });
  const r = await updatePassword({}, form({ password: "rahasia123", confirmPassword: "rahasia123" }));
  expect(r.message).toBe("Kata sandi baru harus berbeda dari yang lama.");
});

describe("deleteAccount (FR 1)", () => {
  test("tanpa ketik HAPUS: tidak menghapus apa pun", async () => {
    const r = await deleteAccount({}, form({ confirmation: "hapus" }));
    expect(r.fieldErrors?.confirmation).toBeDefined();
    expect(adminDelete).not.toHaveBeenCalled();
  });

  test("menghapus akun milik sesi sendiri lalu keluar", async () => {
    adminDelete.mockResolvedValueOnce({ error: null });
    expect(await redirectedTo(deleteAccount({}, form({ confirmation: "HAPUS" })))).toBe("/login?deleted=1");
    expect(adminDelete).toHaveBeenCalledWith("u1");
    expect(auth.signOut).toHaveBeenCalled();
  });

  test("gagal di Supabase: tetap masuk, pesan error", async () => {
    adminDelete.mockResolvedValueOnce({ error: { message: "x" } });
    expect(await deleteAccount({}, form({ confirmation: "HAPUS" }))).toEqual({ ok: false, message: "Gagal menghapus akun. Coba lagi." });
    expect(auth.signOut).not.toHaveBeenCalled();
    expect(redirect).not.toHaveBeenCalled();
  });
});
