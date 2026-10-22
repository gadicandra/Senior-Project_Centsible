"use client";

import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FormState } from "@/lib/form-state";

export type Option = { value: string; label: string };

/** Select yang ikut terkirim di FormData (hidden input dari Base UI lewat `name`). */
export function FormSelect({
  name,
  label,
  options,
  state,
  defaultValue,
  placeholder = "Pilih…",
  disabled,
  hint,
}: {
  name: string;
  label: string;
  options: Option[];
  state: FormState;
  defaultValue?: string;
  placeholder?: string;
  disabled?: boolean;
  /** Petunjuk yang dibacakan bersama kontrol (aria-describedby → `${name}-hint`). */
  hint?: React.ReactNode;
}) {
  const errors = state.fieldErrors?.[name];
  const initial = state.values?.[name] ?? defaultValue ?? null;
  const hintId = hint ? `${name}-hint` : undefined;
  return (
    <Field data-invalid={!!errors || undefined}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Select name={name} items={options} defaultValue={initial} disabled={disabled}>
        <SelectTrigger id={name} aria-invalid={!!errors || undefined} aria-describedby={hintId} className="w-full">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {hint && <FieldDescription id={hintId}>{hint}</FieldDescription>}
      <FieldError errors={errors?.map((message) => ({ message }))} />
    </Field>
  );
}
