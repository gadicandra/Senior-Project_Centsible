import type { Metadata } from "next";
import { UpdatePasswordScreen } from "@/components/auth/update-password-screen";
import { requireClaims } from "@/server/auth/session";

export const metadata: Metadata = { title: "Kata sandi baru · Centsible" };

export default async function Page() {
  await requireClaims();
  return <UpdatePasswordScreen />;
}
