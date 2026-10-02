"use client";

import { useActionState } from "react";
import { FormField } from "@/components/form/form-field";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/form/submit-button";
import { FieldGroup } from "@/components/ui/field";
import { initialFormState } from "@/lib/form-state";
import { signUp } from "@/server/actions/auth";

export function RegisterForm() {
  const [state, action] = useActionState(signUp, initialFormState);
  if (state.ok) return <FormMessage state={state} />;
  return (
    <form action={action} noValidate>
      <FieldGroup>
        <FormMessage state={state} />
        <FormField name="fullName" label="Nama" autoComplete="name" required state={state} />
        <FormField name="email" label="Email" type="email" autoComplete="email" required state={state} />
        <FormField
          name="password"
          label="Kata sandi"
          type="password"
          autoComplete="new-password"
          description="Minimal 8 karakter."
          required
          state={state}
        />
        <FormField name="confirmPassword" label="Ulangi kata sandi" type="password" autoComplete="new-password" required state={state} />
        <SubmitButton className="w-full">Daftar</SubmitButton>
      </FieldGroup>
    </form>
  );
}
