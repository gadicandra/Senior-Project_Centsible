import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import type { ParseSuccess } from "@/lib/ai/types";
import { saveAiTransaction } from "@/server/actions/transactions";
import { ConfirmCard } from "./confirm-card";

vi.mock("@/server/actions/transactions", () => ({
  saveAiTransaction: vi.fn(async () => ({ ok: true, message: "Transaksi disimpan." })),
  saveTransaction: vi.fn(),
}));

const save = vi.mocked(saveAiTransaction);

const categories = [
  { id: "c-food", name: "Makan", kind: "expense" as const, icon: null, isArchived: false },
  { id: "c-salary", name: "Gaji", kind: "income" as const, icon: null, isArchived: false },
  { id: "c-old", name: "Lama", kind: "expense" as const, icon: null, isArchived: true },
];
const wallets = [
  { id: "w-cash", name: "Tunai", isDefault: true, isArchived: false },
  { id: "w-bca", name: "BCA", isDefault: false, isArchived: false },
];

function result(over: Partial<ParseSuccess> = {}, proposal: Partial<ParseSuccess["proposal"]> = {}): ParseSuccess {
  return {
    ok: true,
    proposal: {
      amount: 25000,
      type: "expense",
      categoryId: "c-food",
      walletId: "w-cash",
      description: "makan siang",
      occurredAt: "2026-09-22",
      confidence: 0.9,
      ...proposal,
    },
    flags: {},
    walletInferred: false,
    draft: "signed.token",
    ...over,
  };
}

function renderCard(r: ParseSuccess, raw = "makan siang 25rb kemarin") {
  const props = {
    onCancel: vi.fn(),
    onDone: vi.fn(),
    onSwitchToManual: vi.fn(),
  };
  render(
    <ConfirmCard result={r} raw={raw} open categories={categories} wallets={wallets} today="2026-09-23" {...props} />,
  );
  return props;
}

const hidden = (name: string) => document.querySelector<HTMLInputElement>(`input[name="${name}"]`);
const describedText = (el: HTMLElement) =>
  (el.getAttribute("aria-describedby") ?? "")
    .split(" ")
    .map((id) => document.getElementById(id)?.textContent ?? "")
    .join(" ");

const SAVED = { ok: true as const, message: "Transaksi disimpan." };
let release: (() => void) | undefined;

/** Simpan berikutnya menggantung sampai `finish()`; selalu dilepas di afterEach supaya transisi React tidak tertahan. */
function holdSave() {
  save.mockImplementationOnce(() => new Promise((resolve) => (release = () => resolve(SAVED))));
  return () => act(async () => release?.());
}

beforeEach(() => save.mockClear());
afterEach(async () => {
  await act(async () => release?.());
  release = undefined;
  cleanup();
});

describe("ConfirmCard", () => {
  test("judul, teks mentah sebagai text node, dan kontrol berlabel", () => {
    renderCard(result(), "<b>makan</b> 25rb");
    expect(screen.getByRole("dialog", { name: "Periksa hasil baca AI" })).toBeDefined();
    const quote = document.querySelector("blockquote")!;
    expect(quote.textContent).toBe("<b>makan</b> 25rb");
    expect(quote.querySelector("b")).toBeNull();
    for (const label of [/^Nominal/, "Jenis transaksi", "Kategori", "Dompet", "Tanggal", "Keterangan"]) {
      expect(screen.getByLabelText(label)).toBeDefined();
    }
    expect((screen.getByLabelText(/^Nominal/) as HTMLInputElement).value).toBe("25.000");
    expect((screen.getByLabelText("Tanggal") as HTMLInputElement).max).toBe("2026-09-23");
    expect((screen.getByLabelText("Keterangan") as HTMLInputElement).maxLength).toBe(200);
  });

  test("draft tersembunyi ada di form", () => {
    renderCard(result());
    expect(hidden("draft")?.value).toBe("signed.token");
    expect(hidden("type")?.value).toBe("expense");
  });

  test("field tanpa flag tidak punya aria-describedby", () => {
    renderCard(result());
    for (const label of [/^Nominal/, "Kategori", "Dompet", "Tanggal", "Keterangan"]) {
      expect(screen.getByLabelText(label).hasAttribute("aria-describedby")).toBe(false);
    }
    expect(screen.queryByText("Periksa")).toBeNull();
  });

  test("kategori mismatch: kosong, ⚠ Periksa + alasan terhubung lewat aria-describedby", () => {
    renderCard(result({ flags: { category: "mismatch" } }, { categoryId: null }));
    const trigger = screen.getByLabelText("Kategori");
    const text = describedText(trigger);
    expect(text).toContain("Periksa");
    expect(text).toContain("Kategori tidak cocok dengan jenis");
    expect(hidden("categoryId")?.value).toBe("");
  });

  test("nominal ambigu: alasan menyebut kedua pilihan dan tombol pilihan mengubah nilai terkirim", async () => {
    renderCard(result({ flags: { amount: "ambiguous" }, amountOptions: [100, 100000] }, { amount: 100 }));
    const amount = screen.getByLabelText(/^Nominal/) as HTMLInputElement;
    const text = describedText(amount);
    expect(text).toContain("Periksa");
    expect(text).toContain("Rp100 ");
    expect(text).toContain("Rp100.000");
    expect(amount.value).toBe("100");

    fireEvent.click(screen.getByRole("button", { name: "Rp100.000" }));
    expect(amount.value).toBe("100.000");

    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    const formData = save.mock.calls[0][1];
    expect(formData.get("amount")).toBe("100.000");
    expect(formData.get("draft")).toBe("signed.token");
  });

  test("dompet tersirat memberi petunjuk biasa tanpa ⚠", () => {
    renderCard(result({ walletInferred: true }));
    const text = describedText(screen.getByLabelText("Dompet"));
    expect(text).toBe("Dompet utama (tidak disebut di kalimat)");
  });

  test("Batal menutup tanpa memanggil saveAiTransaction", () => {
    const { onCancel } = renderCard(result());
    fireEvent.click(screen.getByRole("button", { name: "Batal" }));
    expect(onCancel).toHaveBeenCalledTimes(1);
    expect(save).not.toHaveBeenCalled();
  });

  test("Esc menutup kartu bila tidak sedang menyimpan", () => {
    const { onCancel } = renderCard(result());
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onCancel).toHaveBeenCalledTimes(1);
  });

  test("selama menyimpan: Batal/manual disabled, Esc diabaikan, status diumumkan", async () => {
    const finish = holdSave();
    const { onCancel, onDone } = renderCard(result());
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));

    const batal = (await screen.findByRole("button", { name: "Batal" })) as HTMLButtonElement;
    await waitFor(() => expect(batal.disabled).toBe(true));
    expect((screen.getByRole("button", { name: "Ubah ke form manual" }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByRole("button", { name: "Menyimpan…" }).getAttribute("aria-busy")).toBe("true");
    expect(document.querySelector("form")!.getAttribute("aria-busy")).toBe("true");
    expect(document.querySelector('form [aria-live="polite"]')!.textContent).toContain("tidak bisa ditutup");

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    fireEvent.click(batal);
    expect(onCancel).not.toHaveBeenCalled();

    await finish();
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(batal.disabled).toBe(false);
    expect(document.querySelector('form [aria-live="polite"]')!.textContent).toBe("");
  });

  test("Simpan tidak bisa dikirim dua kali selama pending", async () => {
    const finish = holdSave();
    const { onDone } = renderCard(result());
    const simpan = screen.getByRole("button", { name: "Simpan" });
    // Dua klik di tick yang sama (sebelum tombol sempat disabled) + submit langsung (mis. Enter).
    fireEvent.click(simpan);
    fireEvent.click(simpan);
    fireEvent.submit(document.querySelector("form")!);
    await waitFor(() => expect(screen.getByRole("button", { name: "Menyimpan…" })).toBeDefined());
    fireEvent.submit(document.querySelector("form")!);

    await finish();
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(save).toHaveBeenCalledTimes(1);
  });

  test("Simpan adalah satu-satunya jalan simpan; sukses memanggil onDone", async () => {
    const { onDone } = renderCard(result());
    expect(save).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    await waitFor(() => expect(onDone).toHaveBeenCalledTimes(1));
    expect(save).toHaveBeenCalledTimes(1);
  });

  test("ganti Jenis mengosongkan Kategori yang tidak cocok", async () => {
    renderCard(result());
    expect(hidden("categoryId")?.value).toBe("c-food");
    await act(async () => fireEvent.click(screen.getByRole("radio", { name: "Pemasukan" })));
    expect(hidden("type")?.value).toBe("income");
    expect(hidden("categoryId")?.value).toBe("");
  });

  test("Ubah ke form manual mengirim nilai terkini tanpa draft", () => {
    const { onSwitchToManual } = renderCard(result());
    fireEvent.change(screen.getByLabelText("Keterangan"), { target: { value: "makan bakso" } });
    fireEvent.change(screen.getByLabelText(/^Nominal/), { target: { value: "30.000" } });
    fireEvent.click(screen.getByRole("button", { name: "Ubah ke form manual" }));
    expect(onSwitchToManual).toHaveBeenCalledWith({
      type: "expense",
      amount: "30.000",
      categoryId: "c-food",
      walletId: "w-cash",
      description: "makan bakso",
      occurredAt: "2026-09-22",
    });
    expect(save).not.toHaveBeenCalled();
  });

  test("deskripsi 200 karakter tampil dan terkirim utuh", async () => {
    const long = "a".repeat(200);
    renderCard(result({}, { description: long }));
    expect((screen.getByLabelText("Keterangan") as HTMLInputElement).value).toBe(long);
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    await waitFor(() => expect(save).toHaveBeenCalledTimes(1));
    expect(save.mock.calls[0][1].get("description")).toBe(long);
  });

  test("pesan error server tampil di atas form", async () => {
    save.mockResolvedValueOnce({ ok: false, message: "Usulan AI sudah kedaluwarsa atau tidak valid." });
    const { onDone } = renderCard(result());
    fireEvent.click(screen.getByRole("button", { name: "Simpan" }));
    expect(await screen.findByRole("alert")).toBeDefined();
    expect(screen.getByRole("alert").textContent).toContain("kedaluwarsa");
    expect(onDone).not.toHaveBeenCalled();
  });
});
