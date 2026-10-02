import type { FormState } from "@/lib/form-state";
import { cn } from "@/lib/utils";

export function FormMessage({ state }: { state: FormState }) {
  if (!state.message) return null;
  return (
    <p
      role={state.ok ? "status" : "alert"}
      className={cn(
        "rounded-md px-3 py-2 text-sm",
        state.ok ? "bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-200" : "bg-destructive/10 text-destructive",
      )}
    >
      {state.message}
    </p>
  );
}
