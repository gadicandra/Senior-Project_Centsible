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
import type { BudgetView } from "@/lib/budget";
import { initialFormState, type FormState } from "@/lib/form-state";
import { BUDGET_NOT_FOUND, BUDGET_PERIOD_LABEL, BUDGET_PERIODS } from "@/lib/schemas/budget";
import { saveBudget } from "@/server/actions/budgets";
import { categoryOptionLabel, type ExpenseCategoryOption } from "./types";

const PERIOD_OPTIONS = BUDGET_PERIODS.map((value) => ({ value, label: BUDGET_PERIOD_LABEL[value] }));

export function BudgetFormDialog({
  budget,
  categories = [],
  trigger,
  open: controlledOpen,
  onOpenChange,
}: {
  budget?: BudgetView;
  categories?: ExpenseCategoryOption[];
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
        {open && <BudgetForm key={budget?.id ?? "new"} budget={budget} categories={categories} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function BudgetForm({
  budget,
  categories,
  onDone,
}: {
  budget?: BudgetView;
  categories: ExpenseCategoryOption[];
  onDone: () => void;
}) {
  const [state, action] = useActionState(async (prev: FormState, fd: FormData) => {
    const result = await saveBudget(prev, fd);
    // Kartu ini mungkin sudah hilang setelah revalidate; toast tetap tampil walau dialog ikut di-unmount.
    if (!result.ok && result.message === BUDGET_NOT_FOUND) toast.error(result.message);
    return result;
  }, initialFormState);
  useEffect(() => {
    if (state.ok) {
      toast.success(state.message);
      onDone();
    }
  }, [state, onDone]);

  return (
    <form action={action} noValidate>
      {budget && <input type="hidden" name="id" value={budget.id} />}
      <DialogHeader>
        <DialogTitle>{budget ? "Ubah anggaran" : "Tambah anggaran"}</DialogTitle>
        {budget && (
          <DialogDescription>
            {budget.name} · {BUDGET_PERIOD_LABEL[budget.period]}. Kategori dan periode tidak bisa diubah. Hapus lalu buat
            anggaran baru bila perlu.
          </DialogDescription>
        )}
      </DialogHeader>
      <FieldGroup className="py-4">
        <FormMessage state={state.ok ? {} : state} />
        {!budget && (
          <>
            <FormSelect
              name="categoryId"
              label="Kategori"
              options={categories.map((c) => ({ value: c.id, label: categoryOptionLabel(c) }))}
              state={state}
            />
            <FormSelect name="period" label="Periode" options={PERIOD_OPTIONS} defaultValue="monthly" state={state} />
          </>
        )}
        <FormField
          name="amountLimit"
          label="Batas (Rp)"
          inputMode="numeric"
          autoComplete="off"
          placeholder="500.000"
          hint="Minimal Rp 1.000"
          defaultValue={budget?.amountLimit.toLocaleString("id-ID")}
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
