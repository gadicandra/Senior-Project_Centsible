"use client";

import { useActionState } from "react";
import { FormField } from "@/components/form/form-field";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/form/submit-button";
import { FieldGroup } from "@/components/ui/field";
import { initialFormState } from "@/lib/form-state";
import { requestPasswordReset } from "@/server/actions/auth";

export function ResetPasswordForm() {
  const [state, action] = useActionState(requestPasswordReset, initialFormState);
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={action} noValidate>
      <FieldGroup>
        <FormMessage state={state} />
        <FormField name="email" label="Email" type="email" autoComplete="email" required state={state} />
        <SubmitButton className="w-full">Kirim tautan</SubmitButton>
      </FieldGroup>
    </form>
  );
}
