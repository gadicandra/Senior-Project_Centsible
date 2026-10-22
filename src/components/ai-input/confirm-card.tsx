"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/form/form-field";
import { FormMessage } from "@/components/form/form-message";
import { FormSelect } from "@/components/form/form-select";
import { SubmitButton } from "@/components/form/submit-button";
import type { TransactionPrefill } from "@/components/transaksi/transaction-form";
import type { CategoryOption, EntryKind, WalletOption } from "@/components/transaksi/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import type { AiFlags, ParseSuccess } from "@/lib/ai/types";
import { DESCRIPTION_MAX } from "@/lib/ai/limits";
import { initialFormState } from "@/lib/form-state";
import { ENTRY_KIND_LABEL, ENTRY_KINDS } from "@/lib/schemas/settings";
import { cn } from "@/lib/utils";
import { saveAiTransaction } from "@/server/actions/transactions";

const rupiah = (n: number) => `Rp${n.toLocaleString("id-ID")}`;

const LOW = "AI kurang yakin";

/** Alasan tetap per flag; tidak pernah memuat teks mentah atau output bebas dari AI. */
function amountReason(flag: NonNullable<AiFlags["amount"]>, options?: number[]): string {
  switch (flag) {
    case "ambiguous":
      return options && options.length > 1
        ? `Nominal bisa berarti ${options.map(rupiah).join(" atau ")}`
        : "Nominal di kalimat bisa dibaca lebih dari satu cara";
    case "mismatch":
      return "Nominal berbeda dengan angka di kalimat";
    case "large":
      return "Nominal sangat besar, pastikan sudah benar";
    case "low_confidence":
      return LOW;
  }
}

const CATEGORY_REASON: Record<NonNullable<AiFlags["category"]>, string> = {
  mismatch: "Kategori tidak cocok dengan jenis, pilih ulang",
  low_confidence: LOW,
};

const WALLET_REASON: Record<NonNullable<AiFlags["wallet"]>, string> = {
  low_confidence: LOW,
};

const DATE_REASON: Record<NonNullable<AiFlags["occurredAt"]>, string> = {
  future: "Tanggal di masa depan diganti hari ini",
  invalid: "Tanggal tidak terbaca, diganti hari ini",
  old: "Tanggal lebih dari setahun yang lalu",
  mismatch: "Tanggal berbeda dengan kata waktu di kalimat",
  ambiguous: "Tanggal di kalimat bisa berarti beberapa hari",
  low_confidence: LOW,
};

const WALLET_INFERRED = "Dompet utama (tidak disebut di kalimat)";

/** Petunjuk ⚠ Periksa: peringatan dibawa teks, bukan warna saja. */
function checkHint(reason: string | undefined) {
  if (!reason) return undefined;
  return (
    <>
      <Badge variant="outline" className="text-amber-700 dark:text-amber-300">
        <span aria-hidden="true">⚠</span> Periksa
      </Badge>{" "}
      {reason}
    </>
  );
}

/** Field form yang diteruskan ke form manual (draft sengaja tidak ikut). */
const MANUAL_KEYS = ["type", "amount", "categoryId", "walletId", "description", "occurredAt"] as const;

type Props = {
  result: ParseSuccess | null;
  raw: string;
  open: boolean;
  categories: CategoryOption[];
  wallets: WalletOption[];
  today: string;
  /** Batal / Esc / overlay: tidak menyimpan apa pun. */
  onCancel: () => void;
  /** Setelah Simpan berhasil. */
  onDone: () => void;
  onSwitchToManual: (prefill: TransactionPrefill) => void;
};

/** Kartu konfirmasi hasil baca AI (design §10.4). Satu-satunya jalan simpan adalah tombol Simpan. */
export function ConfirmCard({ result, raw, open, onCancel, ...rest }: Props) {
  return (
    <Dialog open={open} onOpenChange={(next) => !next && onCancel()}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Periksa hasil baca AI</DialogTitle>
        </DialogHeader>
        {open && result && (
          <>
            {/* Teks mentah selalu dirender sebagai text node. */}
            <blockquote className="border-l-2 pl-3 break-words text-muted-foreground italic">{raw}</blockquote>
            <ConfirmForm key={result.draft} result={result} onCancel={onCancel} {...rest} />
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function ConfirmForm({
  result,
  categories,
  wallets,
  today,
  onCancel,
  onDone,
  onSwitchToManual,
}: Omit<Props, "raw" | "open" | "result"> & { result: ParseSuccess }) {
  const { proposal, flags, amountOptions, walletInferred, draft } = result;
  const [state, formAction] = useActionState(saveAiTransaction, initialFormState);
  const formRef = useRef<HTMLFormElement>(null);
  const [type, setType] = useState<EntryKind>(() => (state.values?.type as EntryKind) ?? proposal.type);
  const [amount, setAmount] = useState(() => state.values?.amount ?? proposal.amount.toLocaleString("id-ID"));

  useEffect(() => {
    if (state.ok) {
      toast.success(state.message);
      onDone();
    }
  }, [state, onDone]);

  const categoryOptions = categories
    .filter((c) => c.kind === type && !c.isArchived)
    .map((c) => ({ value: c.id, label: `${c.icon ? `${c.icon} ` : ""}${c.name}` }));
  const walletOptions = wallets.filter((w) => !w.isArchived).map((w) => ({ value: w.id, label: w.name }));
  // Kategori usulan dikosongkan bila jenisnya tidak lagi cocok.
  const defaultCategory = categoryOptions.some((o) => o.value === proposal.categoryId)
    ? (proposal.categoryId ?? undefined)
    : undefined;

  const walletHint = flags.wallet
    ? checkHint(WALLET_REASON[flags.wallet])
    : walletInferred
      ? WALLET_INFERRED
      : undefined;

  function switchToManual() {
    if (!formRef.current) return;
    const data = new FormData(formRef.current);
    const prefill: TransactionPrefill = {};
    for (const key of MANUAL_KEYS) {
      const value = data.get(key);
      if (typeof value === "string") (prefill as Record<string, string>)[key] = value;
    }
    onSwitchToManual(prefill);
  }

  return (
    <form ref={formRef} action={formAction} noValidate>
      <input type="hidden" name="draft" value={draft} />
      <input type="hidden" name="type" value={type} />
      <FieldGroup className="gap-4">
        <FormMessage state={state.ok ? {} : state} />
        <div className="flex flex-col gap-2">
          <FormField
            name="amount"
            label="Nominal (Rp)"
            inputMode="numeric"
            autoComplete="off"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            hint={flags.amount ? checkHint(amountReason(flags.amount, amountOptions)) : undefined}
            state={state}
          />
          {amountOptions && amountOptions.length > 1 && (
            <div role="group" aria-label="Pilihan nominal" className="flex flex-wrap gap-2">
              {amountOptions.map((n) => (
                <Button
                  key={n}
                  type="button"
                  variant="outline"
                  className="min-h-11"
                  onClick={() => setAmount(n.toLocaleString("id-ID"))}
                >
                  {rupiah(n)}
                </Button>
              ))}
            </div>
          )}
        </div>
        <div role="radiogroup" aria-label="Jenis transaksi" className="grid grid-cols-2 gap-2">
          {ENTRY_KINDS.map((k) => (
            <Button
              key={k}
              type="button"
              role="radio"
              aria-checked={type === k}
              variant={type === k ? "default" : "outline"}
              className={cn("min-h-11", type === k && k === "income" && "bg-emerald-600 hover:bg-emerald-600/90")}
              onClick={() => setType(k)}
            >
              {ENTRY_KIND_LABEL[k]}
            </Button>
          ))}
        </div>
        {/* key: daftar kategori berganti saat jenis berganti, jadi pilihan lama di-reset. */}
        <FormSelect
          key={type}
          name="categoryId"
          label="Kategori"
          options={categoryOptions}
          defaultValue={defaultCategory}
          placeholder="Pilih kategori"
          hint={flags.category ? checkHint(CATEGORY_REASON[flags.category]) : undefined}
          state={type === state.values?.type ? state : { ...state, values: undefined }}
        />
        <FormSelect
          name="walletId"
          label="Dompet"
          options={walletOptions}
          defaultValue={proposal.walletId}
          hint={walletHint}
          state={state}
        />
        <FormField
          name="occurredAt"
          label="Tanggal"
          type="date"
          max={today}
          defaultValue={proposal.occurredAt}
          hint={flags.occurredAt ? checkHint(DATE_REASON[flags.occurredAt]) : undefined}
          state={state}
        />
        <FormField
          name="description"
          label="Keterangan"
          maxLength={DESCRIPTION_MAX}
          autoComplete="off"
          defaultValue={proposal.description}
          state={state}
        />
        <div className="flex flex-col gap-2">
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" className="min-h-11" onClick={onCancel}>
              Batal
            </Button>
            <SubmitButton pendingText="Menyimpan…" className="min-h-11">
              Simpan
            </SubmitButton>
          </div>
          <Button type="button" variant="link" className="min-h-11 self-end" onClick={switchToManual}>
            Ubah ke form manual
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}
