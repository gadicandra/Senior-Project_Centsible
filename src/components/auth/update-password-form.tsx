"use client";

import { useActionState } from "react";
import { FormField } from "@/components/form/form-field";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/form/submit-button";
import { FieldGroup } from "@/components/ui/field";
import { initialFormState } from "@/lib/form-state";
import { updatePassword } from "@/server/actions/auth";

export function UpdatePasswordForm() {
  const [state, action] = useActionState(updatePassword, initialFormState);
  return (
    <form action={action} noValidate>
      <FieldGroup>
        <FormMessage state={state} />
        <FormField name="password" label="Kata sandi baru" type="password" autoComplete="new-password" required state={state} />
        <FormField name="confirmPassword" label="Ulangi kata sandi" type="password" autoComplete="new-password" required state={state} />
        <SubmitButton className="w-full">Simpan kata sandi</SubmitButton>
      </FieldGroup>
    </form>
  );
}
