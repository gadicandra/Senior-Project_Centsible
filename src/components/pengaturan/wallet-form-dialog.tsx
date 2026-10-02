"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/form/form-field";
import { FormMessage } from "@/components/form/form-message";
import { FormSelect } from "@/components/form/form-select";
import { SubmitButton } from "@/components/form/submit-button";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { initialFormState } from "@/lib/form-state";
import { WALLET_TYPE_LABEL, WALLET_TYPES } from "@/lib/schemas/settings";
import { saveWallet } from "@/server/actions/settings";
import type { WalletRow } from "./types";

const TYPE_OPTIONS = WALLET_TYPES.map((value) => ({ value, label: WALLET_TYPE_LABEL[value] }));

export function WalletFormDialog({
  wallet,
  trigger,
  open: controlledOpen,
  onOpenChange,
}: {
  wallet?: WalletRow;
  trigger?: React.ReactElement;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
}) {
  const [uncontrolledOpen, setUncontrolledOpen] = useState(false);
  const open = controlledOpen ?? uncontrolledOpen;
  const setOpen = onOpenChange ?? setUncontrolledOpen;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent>
        {/* key: form di-mount ulang tiap dialog dibuka, sehingga state lama tidak tersisa. */}
        {open && <WalletForm key={wallet?.id ?? "new"} wallet={wallet} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function WalletForm({ wallet, onDone }: { wallet?: WalletRow; onDone: () => void }) {
  const [state, action] = useActionState(saveWallet, initialFormState);
  useEffect(() => {
    if (state.ok) {
      toast.success(state.message);
      onDone();
    }
  }, [state, onDone]);

  return (
    <form action={action} noValidate>
      {wallet && <input type="hidden" name="id" value={wallet.id} />}
      <DialogHeader>
        <DialogTitle>{wallet ? "Ubah dompet" : "Tambah dompet"}</DialogTitle>
      </DialogHeader>
      <FieldGroup className="py-4">
        <FormMessage state={state.ok ? {} : state} />
        <FormField name="name" label="Nama" defaultValue={wallet?.name} maxLength={40} autoComplete="off" state={state} />
        <FormSelect name="type" label="Jenis" options={TYPE_OPTIONS} defaultValue={wallet?.type ?? "cash"} state={state} />
        <FormField
          name="initialBalance"
          label="Saldo awal (Rp)"
          inputMode="numeric"
          defaultValue={String(wallet?.initialBalance ?? 0)}
          description="Saldo sebelum mulai mencatat di Centsible. Saldo sekarang dihitung otomatis dari transaksi."
          state={state}
        />
      </FieldGroup>
      <DialogFooter>
        <Button type="button" variant="outline" onClick={onDone}>
          Batal
        </Button>
        <SubmitButton>Simpan</SubmitButton>
      </DialogFooter>
    </form>
  );
}
