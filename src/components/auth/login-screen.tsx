import Link from "next/link";
import { AuthCard } from "./auth-card";
import { GoogleButton } from "./google-button";
import { LoginForm } from "./login-form";
import { OrSeparator } from "./or-separator";

const NOTICES: Record<string, string> = {
  oauth: "Masuk dengan Google gagal. Coba lagi.",
  link: "Tautan sudah kedaluwarsa atau tidak valid. Minta tautan baru.",
};

export function LoginScreen({ next, error, deleted }: { next?: string; error?: string; deleted?: boolean }) {
  const notice = deleted ? "Akun dan seluruh datanya sudah dihapus." : error ? NOTICES[error] : undefined;
  return (
    <AuthCard
      title="Masuk"
      description="Catat keuanganmu cukup dengan satu kalimat."
      footer={
        <span>
          Belum punya akun?{" "}
          <Link href="/register" className="font-medium text-foreground hover:underline">
            Daftar
          </Link>
        </span>
      }
    >
      <LoginForm next={next} notice={notice} />
      <OrSeparator />
      <GoogleButton next={next} />
    </AuthCard>
  );
}
