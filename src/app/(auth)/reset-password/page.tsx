import type { Metadata } from "next";
import { ResetPasswordScreen } from "@/components/auth/reset-password-screen";

export const metadata: Metadata = { title: "Atur ulang kata sandi · Centsible" };

export default function Page() {
  return <ResetPasswordScreen />;
}
