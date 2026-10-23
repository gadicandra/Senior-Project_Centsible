import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { FormState } from "@/lib/form-state";

type Props = React.ComponentProps<typeof Input> & {
  name: string;
  label: string;
  description?: string;
  /** Petunjuk yang dibacakan bersama kontrol (aria-describedby → `${name}-hint`). */
  hint?: React.ReactNode;
  state: FormState;
};

/** Input + label + pesan error dari Server Action, dengan nilai terakhir dipertahankan. */
export function FormField({ name, label, description, hint, state, defaultValue, "aria-describedby": describedBy, ...props }: Props) {
  const errors = state.fieldErrors?.[name];
  const hintId = hint ? `${name}-hint` : undefined;
  const ariaDescribedBy = [describedBy, hintId].filter(Boolean).join(" ") || undefined;
  // Kontrol terkontrol (`value`) tidak boleh menerima `defaultValue` juga (peringatan React).
  const controlled = props.value !== undefined;
  return (
    <Field data-invalid={!!errors || undefined}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Input
        id={name}
        name={name}
        aria-invalid={!!errors || undefined}
        aria-describedby={ariaDescribedBy}
        defaultValue={controlled ? undefined : (state.values?.[name] ?? defaultValue)}
        {...props}
      />
      {description && <FieldDescription>{description}</FieldDescription>}
      {hint && <FieldDescription id={hintId}>{hint}</FieldDescription>}
      <FieldError errors={errors?.map((message) => ({ message }))} />
    </Field>
  );
}
