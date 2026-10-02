import type { Metadata } from "next";
import { AccountScreen } from "@/components/akun/account-screen";
import { requireClaims } from "@/server/auth/session";
import { getProfile } from "@/server/services/profile";

export const metadata: Metadata = { title: "Akun · Centsible" };

export default async function Page() {
  const claims = await requireClaims();
  const profile = await getProfile(claims);
  return <AccountScreen email={profile?.email ?? ""} fullName={profile?.fullName ?? null} />;
}
