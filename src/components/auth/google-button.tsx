import { SubmitButton } from "@/components/form/submit-button";
import { signInWithGoogle } from "@/server/actions/auth";

export function GoogleButton({ next }: { next?: string }) {
  return (
    <form action={signInWithGoogle}>
      <input type="hidden" name="next" value={next ?? "/"} />
      <SubmitButton variant="outline" className="w-full" pendingText="Mengalihkan…">
        Lanjutkan dengan Google
      </SubmitButton>
    </form>
  );
}
