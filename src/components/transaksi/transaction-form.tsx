"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/form/form-field";
import { FormMessage } from "@/components/form/form-message";
import { FormSelect } from "@/components/form/form-select";
import { SubmitButton } from "@/components/form/submit-button";
import { Button } from "@/components/ui/button";
import { FieldGroup } from "@/components/ui/field";
import { initialFormState } from "@/lib/form-state";
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
  const [state, action] = useActionState(saveTransaction, initialFormState);
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
    .map((c) => ({ value: c.id, label: `${c.icon ? `${c.icon} ` : ""}${c.name}` }));
  const walletOptions = wallets
    .filter((w) => !w.isArchived || w.id === transaction?.wallet.id)
    .map((w) => ({ value: w.id, label: w.name }));
  const prefillWallet = walletOptions.some((o) => o.value === prefill?.walletId) ? prefill?.walletId : undefined;
  const defaultWallet = transaction?.wallet.id ?? prefillWallet ?? wallets.find((w) => w.isDefault)?.id;
  // Kategori isian awal hanya dipakai bila cocok dengan jenis yang sedang dipilih.
  const prefillCategory = categoryOptions.some((o) => o.value === prefill?.categoryId) ? prefill?.categoryId : undefined;
  const defaultCategory = transaction ? (transaction.type === type ? transaction.category.id : undefined) : prefillCategory;

  return (
    <form action={action} noValidate>
      {transaction && <input type="hidden" name="id" value={transaction.id} />}
      <input type="hidden" name="type" value={type} />
      <FieldGroup>
        <FormMessage state={state.ok ? {} : state} />
        <div role="radiogroup" aria-label="Jenis transaksi" className="grid grid-cols-2 gap-2">
          {ENTRY_KINDS.map((k) => (
            <Button
              key={k}
              type="button"
              role="radio"
              aria-checked={type === k}
              variant={type === k ? "default" : "outline"}
              className={cn(type === k && k === "income" && "bg-emerald-600 hover:bg-emerald-600/90")}
              onClick={() => setType(k)}
            >
              {ENTRY_KIND_LABEL[k]}
            </Button>
          ))}
        </div>
        <FormField
          name="amount"
          label="Nominal (Rp)"
          inputMode="numeric"
          autoComplete="off"
          placeholder="50.000"
          defaultValue={transaction ? String(transaction.amount) : prefill?.amount}
          state={state}
        />
        {/* key: daftar kategori berganti saat jenis berganti, jadi pilihan lama di-reset. */}
        <FormSelect
          key={type}
          name="categoryId"
          label="Kategori"
          options={categoryOptions}
          defaultValue={defaultCategory}
          placeholder="Pilih kategori"
          state={type === state.values?.type ? state : { ...state, values: undefined }}
        />
        <FormSelect name="walletId" label="Dompet" options={walletOptions} defaultValue={defaultWallet} state={state} />
        <FormField name="occurredAt" label="Tanggal" type="date" max={today} defaultValue={transaction?.occurredAt ?? prefill?.occurredAt ?? today} state={state} />
        <FormField
          name="description"
          label="Keterangan"
          placeholder="Opsional, mis. beli bensin"
          maxLength={200}
          autoComplete="off"
          defaultValue={transaction?.description ?? prefill?.description}
          state={state}
        />
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onDone}>
            Batal
          </Button>
          <SubmitButton>Simpan</SubmitButton>
        </div>
      </FieldGroup>
    </form>
  );
}
