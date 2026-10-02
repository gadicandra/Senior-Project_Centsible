import Link from "next/link";
import { AuthCard } from "./auth-card";
import { GoogleButton } from "./google-button";
import { OrSeparator } from "./or-separator";
import { RegisterForm } from "./register-form";

export function RegisterScreen() {
  return (
    <AuthCard
      title="Buat akun"
      description="Kategori dan dompet bawaan langsung disiapkan untukmu."
      footer={
        <span>
          Sudah punya akun?{" "}
          <Link href="/login" className="font-medium text-foreground hover:underline">
            Masuk
          </Link>
        </span>
      }
    >
      <RegisterForm />
      <OrSeparator />
      <GoogleButton />
    </AuthCard>
  );
}
