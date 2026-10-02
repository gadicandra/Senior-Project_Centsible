import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { FormState } from "@/lib/form-state";

type Props = React.ComponentProps<typeof Input> & {
  name: string;
  label: string;
  description?: string;
  state: FormState;
};

/** Input + label + pesan error dari Server Action, dengan nilai terakhir dipertahankan. */
export function FormField({ name, label, description, state, defaultValue, ...props }: Props) {
  const errors = state.fieldErrors?.[name];
  return (
    <Field data-invalid={!!errors || undefined}>
      <FieldLabel htmlFor={name}>{label}</FieldLabel>
      <Input
        id={name}
        name={name}
        aria-invalid={!!errors || undefined}
        defaultValue={state.values?.[name] ?? defaultValue}
        {...props}
      />
      {description && <FieldDescription>{description}</FieldDescription>}
      <FieldError errors={errors?.map((message) => ({ message }))} />
    </Field>
  );
}
