import Link from "next/link";
import { AuthCard } from "./auth-card";
import { ResetPasswordForm } from "./reset-password-form";

export function ResetPasswordScreen() {
  return (
    <AuthCard
      title="Atur ulang kata sandi"
      description="Kami kirim tautan untuk membuat kata sandi baru."
      footer={
        <Link href="/login" className="hover:underline">
          Kembali ke halaman masuk
        </Link>
      }
    >
      <ResetPasswordForm />
    </AuthCard>
  );
}
