import type { Metadata } from "next";
import { RegisterScreen } from "@/components/auth/register-screen";

export const metadata: Metadata = { title: "Daftar · Centsible" };

export default function Page() {
  return <RegisterScreen />;
}
