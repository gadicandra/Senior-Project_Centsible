"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/form/form-field";
import { FormMessage } from "@/components/form/form-message";
import { FormSelect } from "@/components/form/form-select";
import { SubmitButton } from "@/components/form/submit-button";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { useIsOnline, useOutboxUser } from "@/components/offline/offline-sync";
import { formValues, initialFormState, type FormState } from "@/lib/form-state";
import { enqueue } from "@/lib/outbox";
import { ENTRY_KIND_LABEL, ENTRY_KINDS } from "@/lib/schemas/settings";
import { cn } from "@/lib/utils";
import { saveTransaction } from "@/server/actions/transactions";
import type { CategoryOption, EntryKind, TransactionRow, WalletOption } from "./types";

/** Isian awal form baru (mis. dari jalur AI). `amount` berupa string, sama seperti isi field. */
export type TransactionPrefill = {
  type?: (typeof ENTRY_KINDS)[number];
  amount?: string;
  categoryId?: string;
  walletId?: string;
  description?: string;
  occurredAt?: string;
};

/**
 * Form manual (FR 7): tidak bergantung pada AI sama sekali, jadi selalu bisa dipakai.
 * Pilihan kategori mengikuti jenis transaksi yang dipilih.
 */
export function TransactionForm({
  transaction,
  prefill: prefillProp,
  categories,
  wallets,
  today,
  onDone,
}: {
  transaction?: TransactionRow;
  /** Dipakai hanya saat membuat transaksi baru (`transaction` kosong). */
  prefill?: TransactionPrefill;
  categories: CategoryOption[];
  wallets: WalletOption[];
  today: string;
  onDone: () => void;
}) {
  const online = useIsOnline();
  const userId = useOutboxUser();
  const [state, action] = useActionState(async (prev: FormState, fd: FormData): Promise<FormState> => {
    // Offline (FR 16): transaksi baru masuk antrean perangkat; validasi penuh terjadi di /api/sync.
    // Mengubah transaksi lama butuh data server terbaru, jadi tidak diantrekan.
    if (!navigator.onLine && userId) {
      if (transaction) return { ok: false, message: "Mengubah transaksi butuh internet. Coba lagi saat online.", values: formValues(fd) };
      try {
        enqueue(userId, formValues(fd));
      } catch {
        return { ok: false, message: "Penyimpanan perangkat penuh atau diblokir. Transaksi belum tersimpan.", values: formValues(fd) };
      }
      return { ok: true, message: "Offline: transaksi disimpan di perangkat dan akan dikirim saat online." };
    }
    return saveTransaction(prev, fd);
  }, initialFormState);
  const prefill = transaction ? undefined : prefillProp;
  const [type, setType] = useState<EntryKind>(
    (state.values?.type as EntryKind) ?? transaction?.type ?? prefill?.type ?? "expense",
  );

  useEffect(() => {
    if (state.ok) {
      toast.success(state.message);
      onDone();
    }
  }, [state, onDone]);

  // Opsi aktif + opsi arsip yang sedang dipakai transaksi ini (supaya tidak hilang saat diubah).
  const categoryOptions = categories
    .filter((c) => c.kind === type && (!c.isArchived || c.id === transaction?.category.id))
    .map((c) => ({ value: c.id }));
  const walletOptions = wallets
    .filter((w) => !w.isArchived || w.id === transaction?.wallet.id)
    .map((w) => ({ value: w.id, label: w.name }));
  const prefillWallet = walletOptions.some((o) => o.value === prefill?.walletId) ? prefill?.walletId : undefined;
  const defaultWallet = transaction?.wallet.id ?? prefillWallet ?? wallets.find((w) => w.isDefault)?.id;
  // Kategori isian awal hanya dipakai bila cocok dengan jenis yang sedang dipilih.
  const prefillCategory = categoryOptions.some((o) => o.value === prefill?.categoryId) ? prefill?.categoryId : undefined;
  const defaultCategory = transaction ? (transaction.type === type ? transaction.category.id : undefined) : prefillCategory;

  const [categoryId, setCategoryId] = useState<string | undefined>(state.values?.categoryId ?? defaultCategory);
  const shownCategories = categories.filter((c) => c.kind === type && (!c.isArchived || c.id === transaction?.category.id));
  const amountError = state.fieldErrors?.amount?.[0];
  const categoryError = state.fieldErrors?.categoryId?.[0];

  return (
    <form action={action} noValidate>
      {transaction && <input type="hidden" name="id" value={transaction.id} />}
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="categoryId" value={categoryId ?? ""} />
      <FieldGroup className="gap-5">
        <FormMessage state={state.ok ? {} : state} />
        <div role="radiogroup" aria-label="Jenis transaksi" className="grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
          {ENTRY_KINDS.map((k) => (
            <button
              key={k}
              type="button"
              role="radio"
              aria-checked={type === k}
              onClick={() => {
                setType(k);
                setCategoryId(undefined);
              }}
              className={cn(
                "rounded-full py-2 text-sm font-semibold text-muted-foreground transition-colors",
                type === k && "bg-card text-foreground shadow-sm",
                type === k && k === "income" && "text-emerald-700 dark:text-emerald-400",
              )}
            >
              {ENTRY_KIND_LABEL[k]}
            </button>
          ))}
        </div>

        {/* Nominal besar seperti referensi; tetap satu input teks (format "50.000" diterima server). */}
        <div className="flex flex-col items-center gap-1">
          <label htmlFor="amount" className="text-sm font-medium text-muted-foreground">
            Nominal
          </label>
          <div className="flex items-baseline justify-center gap-1.5 text-4xl font-bold tabular-nums">
            <span aria-hidden className="text-2xl text-muted-foreground">
              Rp
            </span>
            <input
              id="amount"
              name="amount"
              inputMode="numeric"
              autoComplete="off"
              placeholder="0"
              aria-invalid={!!amountError || undefined}
              aria-describedby={amountError ? "amount-error" : undefined}
              defaultValue={state.values?.amount ?? (transaction ? String(transaction.amount) : prefill?.amount)}
              className="field-sizing-content min-w-[2ch] max-w-[12ch] bg-transparent text-left outline-none placeholder:text-muted-foreground/40 focus-visible:underline focus-visible:decoration-primary focus-visible:decoration-2 focus-visible:underline-offset-8"
            />
          </div>
          {amountError && (
            <p id="amount-error" role="alert" className="text-sm text-destructive">
              {amountError}
            </p>
          )}
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="mb-2 text-sm font-semibold">Kategori</legend>
          <div role="radiogroup" aria-label="Kategori" aria-invalid={!!categoryError || undefined} className="grid grid-cols-3 gap-2">
            {shownCategories.map((c) => {
              const selected = categoryId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  onClick={() => setCategoryId(c.id)}
                  className={cn(
                    "flex min-h-18 flex-col items-center justify-center gap-1 rounded-xl border bg-card px-1 py-2 text-xs font-medium transition-colors",
                    selected ? "border-primary bg-secondary text-secondary-foreground" : "text-muted-foreground hover:border-primary/40",
                  )}
                >
                  <span aria-hidden className="text-xl leading-none">
                    {c.icon ?? "•"}
                  </span>
                  <span className="line-clamp-1">
                    {c.name}
                    {c.isArchived && " (arsip)"}
                  </span>
                </button>
              );
            })}
          </div>
          {categoryError && (
            <p role="alert" className="text-sm text-destructive">
              {categoryError}
            </p>
          )}
        </fieldset>

        <div className="grid grid-cols-2 gap-3">
          <FormField name="occurredAt" label="Tanggal" type="date" max={today} defaultValue={transaction?.occurredAt ?? prefill?.occurredAt ?? today} state={state} />
          <FormSelect name="walletId" label="Dompet" options={walletOptions} defaultValue={defaultWallet} state={state} />
        </div>
        <FormField
          name="description"
          label="Catatan"
          placeholder="Opsional, mis. makan siang bareng teman"
          maxLength={200}
          autoComplete="off"
          defaultValue={transaction?.description ?? prefill?.description}
          state={state}
        />
        <div className="flex flex-col gap-2">
          <SubmitButton size="lg" className="h-12 w-full rounded-full text-base">
            {online || transaction ? (transaction ? "Simpan perubahan" : "Simpan") : "Simpan offline"}
          </SubmitButton>
          <Button type="button" variant="ghost" onClick={onDone}>
            Batal
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
