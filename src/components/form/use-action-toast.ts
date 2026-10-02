"use client";

import { useTransition } from "react";
import { toast } from "sonner";
import type { FormState } from "@/lib/form-state";

/** Menjalankan Server Action tanpa form (arsip, hapus, dsb.) lalu menampilkan hasilnya sebagai toast. */
export function useActionToast() {
  const [pending, startTransition] = useTransition();
  const run = (action: () => Promise<FormState>, onSuccess?: () => void) =>
    startTransition(async () => {
      const result = await action();
      if (result.ok) {
        toast.success(result.message);
        onSuccess?.();
      } else {
        toast.error(result.message ?? "Terjadi kesalahan.");
      }
    });
  return { pending, run };
}
