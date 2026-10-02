import { AuthCard } from "./auth-card";
import { UpdatePasswordForm } from "./update-password-form";

export function UpdatePasswordScreen() {
  return (
    <AuthCard title="Kata sandi baru" description="Masukkan kata sandi baru untuk akunmu.">
      <UpdatePasswordForm />
    </AuthCard>
  );
}
