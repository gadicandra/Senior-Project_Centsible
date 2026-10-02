"use client";

import { useActionState, useEffect, useState } from "react";
import { toast } from "sonner";
import { FormField } from "@/components/form/form-field";
import { FormMessage } from "@/components/form/form-message";
import { FormSelect } from "@/components/form/form-select";
import { SubmitButton } from "@/components/form/submit-button";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { FieldGroup } from "@/components/ui/field";
import { initialFormState } from "@/lib/form-state";
import { ENTRY_KIND_LABEL, ENTRY_KINDS } from "@/lib/schemas/settings";
import { saveCategory } from "@/server/actions/settings";
import type { CategoryRow } from "./types";

const KIND_OPTIONS = ENTRY_KINDS.map((value) => ({ value, label: ENTRY_KIND_LABEL[value] }));

export function CategoryFormDialog({
  category,
  defaultKind = "expense",
  trigger,
  open: controlledOpen,
  onOpenChange,
}: {
  category?: CategoryRow;
  defaultKind?: CategoryRow["kind"];
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
        {open && (
          <CategoryForm key={category?.id ?? "new"} category={category} defaultKind={defaultKind} onDone={() => setOpen(false)} />
        )}
      </DialogContent>
    </Dialog>
  );
}

function CategoryForm({
  category,
  defaultKind,
  onDone,
}: {
  category?: CategoryRow;
  defaultKind: CategoryRow["kind"];
  onDone: () => void;
}) {
  const [state, action] = useActionState(saveCategory, initialFormState);
  useEffect(() => {
    if (state.ok) {
      toast.success(state.message);
      onDone();
    }
  }, [state, onDone]);

  const kind = category?.kind ?? defaultKind;
  return (
    <form action={action} noValidate>
      {category && <input type="hidden" name="id" value={category.id} />}
      {/* Jenis tidak bisa diubah setelah dibuat; tetap dikirim agar lolos validasi skema. */}
      {category && <input type="hidden" name="kind" value={kind} />}
      <DialogHeader>
        <DialogTitle>{category ? "Ubah kategori" : "Tambah kategori"}</DialogTitle>
        {category && <DialogDescription>Jenis kategori tidak bisa diubah setelah dibuat.</DialogDescription>}
      </DialogHeader>
      <FieldGroup className="py-4">
        <FormMessage state={state.ok ? {} : state} />
        <FormField name="name" label="Nama" defaultValue={category?.name} maxLength={40} autoComplete="off" state={state} />
        {!category && <FormSelect name="kind" label="Jenis" options={KIND_OPTIONS} defaultValue={kind} state={state} />}
        <div className="grid grid-cols-2 gap-4">
          <FormField name="icon" label="Ikon (emoji)" defaultValue={category?.icon ?? ""} maxLength={8} state={state} />
          <FormField
            name="color"
            label="Warna"
            type="color"
            className="h-9 p-1"
            defaultValue={category?.color ?? "#64748B"}
            state={state}
          />
        </div>
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
