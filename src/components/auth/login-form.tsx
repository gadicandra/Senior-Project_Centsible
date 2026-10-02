"use client";

import Link from "next/link";
import { useActionState } from "react";
import { FormField } from "@/components/form/form-field";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/form/submit-button";
import { FieldGroup } from "@/components/ui/field";
import { initialFormState } from "@/lib/form-state";
import { signIn } from "@/server/actions/auth";

export function LoginForm({ next, notice }: { next?: string; notice?: string }) {
  const [state, action] = useActionState(signIn, initialFormState);
  return (
    <form action={action} noValidate>
      <input type="hidden" name="next" value={next ?? "/"} />
      <FieldGroup>
        <FormMessage state={state.message ? state : { ok: true, message: notice }} />
        <FormField name="email" label="Email" type="email" autoComplete="email" required state={state} />
        <FormField name="password" label="Kata sandi" type="password" autoComplete="current-password" required state={state} />
        <Link href="/reset-password" className="-mt-2 text-right text-sm text-muted-foreground hover:underline">
          Lupa kata sandi?
        </Link>
        <SubmitButton className="w-full">Masuk</SubmitButton>
      </FieldGroup>
    </form>
  );
}
