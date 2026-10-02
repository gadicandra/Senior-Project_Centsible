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

/**
 * Form manual (FR 7): tidak bergantung pada AI sama sekali, jadi selalu bisa dipakai.
 * Pilihan kategori mengikuti jenis transaksi yang dipilih.
 */
export function TransactionForm({
  transaction,
  categories,
  wallets,
  today,
  onDone,
}: {
  transaction?: TransactionRow;
  categories: CategoryOption[];
  wallets: WalletOption[];
  today: string;
  onDone: () => void;
}) {
  const [state, action] = useActionState(saveTransaction, initialFormState);
  const [type, setType] = useState<EntryKind>((state.values?.type as EntryKind) ?? transaction?.type ?? "expense");

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
  const defaultWallet = transaction?.wallet.id ?? wallets.find((w) => w.isDefault)?.id;
  const defaultCategory = transaction?.type === type ? transaction.category.id : undefined;

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
          defaultValue={transaction ? String(transaction.amount) : undefined}
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
        <FormField name="occurredAt" label="Tanggal" type="date" max={today} defaultValue={transaction?.occurredAt ?? today} state={state} />
        <FormField
          name="description"
          label="Keterangan"
          placeholder="Opsional, mis. beli bensin"
          maxLength={200}
          autoComplete="off"
          defaultValue={transaction?.description}
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
