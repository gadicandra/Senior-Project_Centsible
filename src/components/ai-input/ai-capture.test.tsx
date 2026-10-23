import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { ParseFailure, ParseSuccess } from "@/lib/ai/types";
import { AiCapture } from "./ai-capture";

vi.mock("@/server/actions/transactions", () => ({
  saveAiTransaction: vi.fn(async () => ({ ok: true, message: "Transaksi disimpan." })),
  saveTransaction: vi.fn(async () => ({})),
}));

const categories = [
  { id: "c-food", name: "Makan", kind: "expense" as const, icon: null, isArchived: false },
  { id: "c-salary", name: "Gaji", kind: "income" as const, icon: null, isArchived: false },
];
const wallets = [{ id: "w-cash", name: "Tunai", isDefault: true, isArchived: false }];

const success: ParseSuccess = {
  ok: true,
  proposal: {
    amount: 25000,
    type: "expense",
    categoryId: "c-food",
    walletId: "w-cash",
    description: "makan siang",
    occurredAt: "2026-09-22",
    confidence: 0.9,
  },
  flags: {},
  walletInferred: true,
  draft: "signed.token",
};

const quota: ParseFailure = {
  ok: false,
  error: { code: "quota_exceeded", message: "Kuota AI harian kamu sudah habis." },
  prefill: { description: "makan siang 20rb", amount: 20000 },
};

const respond = (status: number, body: unknown) => ({ status, json: async () => body }) as Response;

/** fetch yang tidak pernah selesai, kecuali ditolak saat signal dibatalkan. */
const hanging = (_url: RequestInfo | URL, init?: RequestInit) =>
  new Promise<Response>((_, reject) => {
    init?.signal?.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")));
  });

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

function renderCapture() {
  render(<AiCapture categories={categories} wallets={wallets} today="2026-09-23" />);
  const input = screen.getByLabelText("Ketik transaksi") as HTMLInputElement;
  const form = screen.getByRole("form", { name: "Catat transaksi dengan kalimat" });
  const send = (text: string) => {
    fireEvent.change(input, { target: { value: text } });
    fireEvent.submit(form);
  };
  return { input, form, send };
}

const manualDialog = () => screen.queryByRole("dialog", { name: "Catat transaksi" });
const card = () => screen.queryByRole("dialog", { name: "Periksa hasil baca AI" });

describe("AiCapture", () => {
  test("input berlabel, maxLength 300, tanpa tombol mic", () => {
    const { input } = renderCapture();
    expect(input.maxLength).toBe(300);
    expect(input.getAttribute("enterkeyhint")).toBe("send");
    expect(screen.getByRole("button", { name: "Kirim" })).toBeDefined();
    expect(screen.queryByRole("button", { name: /mic|suara|rekam/i })).toBeNull();
  });

  test("kirim kosong menampilkan pesan dan tidak memanggil fetch", () => {
    const { input, send } = renderCapture();
    send("   ");
    const error = screen.getByText("Tulis transaksinya dulu.");
    expect(input.getAttribute("aria-describedby")).toBe(error.id);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  test("selama menunggu: 'Membaca transaksi…' di region aria-live, tombol disabled + aria-busy", async () => {
    fetchMock.mockImplementation(hanging);
    const { send } = renderCapture();
    send("makan siang 25rb");
    const live = document.querySelector('[aria-live="polite"]')!;
    await waitFor(() => expect(live.textContent).toBe("Membaca transaksi…"));
    const button = screen.getByRole("button", { name: "Kirim" }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    expect(button.getAttribute("aria-busy")).toBe("true");
  });

  test("200 membuka kartu konfirmasi; request POST JSON same-origin", async () => {
    fetchMock.mockResolvedValue(respond(200, success));
    const { send } = renderCapture();
    send("makan siang 25rb");
    await waitFor(() => expect(card()).not.toBeNull());
    expect(manualDialog()).toBeNull();
    expect(document.querySelector("blockquote")?.textContent).toBe("makan siang 25rb");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/ai/parse");
    expect(init?.method).toBe("POST");
    expect(init?.credentials).toBe("same-origin");
    expect(JSON.parse(String(init?.body))).toEqual({ text: "makan siang 25rb" });
  });

  test("Simpan sukses menutup kartu dan mengosongkan input", async () => {
    fetchMock.mockResolvedValue(respond(200, success));
    const { input, send } = renderCapture();
    send("makan siang 25rb");
    await waitFor(() => expect(card()).not.toBeNull());
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    await waitFor(() => expect(input.value).toBe(""));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Simpan" })).toBeNull());
  });

  test("429 membuka form manual berisi deskripsi, nominal (angka → string) dan notice", async () => {
    fetchMock.mockResolvedValue(respond(429, quota));
    const { send } = renderCapture();
    send("makan siang 20rb");
    await waitFor(() => expect(manualDialog()).not.toBeNull());
    expect(card()).toBeNull();
    expect((screen.getByLabelText("Keterangan") as HTMLInputElement).value).toBe("makan siang 20rb");
    expect((screen.getByLabelText("Nominal (Rp)") as HTMLInputElement).value).toBe("20000");
    expect(screen.getByRole("status").textContent).toBe("Kuota AI harian kamu sudah habis.");
  });

  test.each([400, 413, 500, 502, 503, 504])("%i tanpa body JSON tetap membuka form manual", async (status) => {
    fetchMock.mockResolvedValue({ status, json: async () => Promise.reject(new SyntaxError("x")) } as unknown as Response);
    const { send } = renderCapture();
    send("bensin 30rb");
    await waitFor(() => expect(manualDialog()).not.toBeNull());
    expect((screen.getByLabelText("Keterangan") as HTMLInputElement).value).toBe("bensin 30rb");
    expect(screen.getByRole("status").textContent).toBe("Gagal menghubungi AI. Silakan isi form manual.");
  });

  test("200 dengan body tidak valid jatuh ke form manual", async () => {
    fetchMock.mockResolvedValue(respond(200, { ok: true }));
    const { send } = renderCapture();
    send("bensin 30rb");
    await waitFor(() => expect(manualDialog()).not.toBeNull());
    expect(card()).toBeNull();
  });

  test("error jaringan membuka form manual", async () => {
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"));
    const { send } = renderCapture();
    send("bensin 30rb");
    await waitFor(() => expect(manualDialog()).not.toBeNull());
    expect((screen.getByLabelText("Keterangan") as HTMLInputElement).value).toBe("bensin 30rb");
    expect(screen.getByRole("status").textContent).toBe("Gagal menghubungi AI. Silakan isi form manual.");
  });

  test("kiriman kedua membatalkan yang pertama; hanya respons kedua yang membuka kartu", async () => {
    let resolveSecond: (r: Response) => void = () => {};
    fetchMock
      .mockImplementationOnce(hanging)
      .mockImplementationOnce(() => new Promise<Response>((resolve) => (resolveSecond = resolve)));
    const { send } = renderCapture();
    send("makan 20rb");
    send("makan siang 25rb");
    // AbortError milik kiriman pertama sudah diproses di sini dan tidak membuka apa pun.
    await act(async () => {});
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(manualDialog()).toBeNull();
    expect(card()).toBeNull();
    await act(async () => resolveSecond(respond(200, success)));
    await waitFor(() => expect(card()).not.toBeNull());
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
    expect(fetchMock.mock.calls[1][1]?.signal?.aborted).toBe(false);
    expect(manualDialog()).toBeNull();
    expect(document.querySelector("blockquote")?.textContent).toBe("makan siang 25rb");
  });

  test("respons pertama yang terlambat diabaikan", async () => {
    let resolveFirst: (r: Response) => void = () => {};
    fetchMock
      .mockImplementationOnce(() => new Promise<Response>((resolve) => (resolveFirst = resolve)))
      .mockImplementationOnce(hanging);
    const { send } = renderCapture();
    send("makan 20rb");
    send("makan siang 25rb");
    await act(async () => resolveFirst(respond(429, quota)));
    expect(manualDialog()).toBeNull();
    expect(card()).toBeNull();
  });

  test("timeout klien 12 dtk membuka form manual dengan deskripsi", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    fetchMock.mockImplementation(hanging);
    const { send } = renderCapture();
    send("makan siang 25rb");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(11_999);
    });
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(false);
    expect(manualDialog()).toBeNull();
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });
    expect(fetchMock.mock.calls[0][1]?.signal?.aborted).toBe(true);
    await act(async () => {
      await vi.advanceTimersByTimeAsync(500);
    });
    expect(manualDialog()).not.toBeNull();
    expect((screen.getByLabelText("Keterangan") as HTMLInputElement).value).toBe("makan siang 25rb");
  });

  test("tetap berfungsi tanpa AbortSignal.any / AbortSignal.timeout", async () => {
    // Browser lama: AbortSignal tanpa static any/timeout. AbortController tetap memakai signal asli.
    function LegacyAbortSignal() {}
    LegacyAbortSignal.prototype = globalThis.AbortSignal.prototype;
    vi.stubGlobal("AbortSignal", LegacyAbortSignal);
    expect((globalThis.AbortSignal as unknown as { any?: unknown }).any).toBeUndefined();
    fetchMock.mockResolvedValue(respond(200, success));
    const { send } = renderCapture();
    send("makan siang 25rb");
    await waitFor(() => expect(card()).not.toBeNull());
  });
});
