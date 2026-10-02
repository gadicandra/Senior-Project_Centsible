import { AppShell } from "@/components/app-shell/app-shell";
import { requireClaims } from "@/server/auth/session";
import { getProfile } from "@/server/services/profile";

export default async function Layout({ children }: LayoutProps<"/">) {
  const claims = await requireClaims();
  const profile = await getProfile(claims);
  return <AppShell displayName={profile?.fullName ?? profile?.email ?? "Pengguna"}>{children}</AppShell>;
}
