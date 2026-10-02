"use client";

import { useActionState } from "react";
import { FormField } from "@/components/form/form-field";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/form/submit-button";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { initialFormState } from "@/lib/form-state";
import { deleteAccount } from "@/server/actions/auth";

export function DeleteAccountDialog() {
  const [state, action] = useActionState(deleteAccount, initialFormState);
  return (
    <AlertDialog>
      <AlertDialogTrigger render={<Button variant="destructive" />}>Hapus akun saya</AlertDialogTrigger>
      <AlertDialogContent>
        <form action={action} className="flex flex-col gap-4" noValidate>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus akun permanen?</AlertDialogTitle>
            <AlertDialogDescription>
              Tindakan ini tidak bisa dibatalkan. Ketik <strong>HAPUS</strong> untuk melanjutkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <FormMessage state={state} />
          <FormField name="confirmation" label="Konfirmasi" autoComplete="off" state={state} />
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <SubmitButton variant="destructive" pendingText="Menghapus…">
              Hapus
            </SubmitButton>
          </AlertDialogFooter>
        </form>
      </AlertDialogContent>
    </AlertDialog>
  );
}
