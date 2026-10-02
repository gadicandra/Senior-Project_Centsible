import { HomeScreen } from "@/components/home/home-screen";
import { requireClaims } from "@/server/auth/session";
import { getProfile } from "@/server/services/profile";

export default async function Page() {
  const claims = await requireClaims();
  const profile = await getProfile(claims);
  return <HomeScreen displayName={profile?.fullName ?? profile?.email ?? "Pengguna"} />;
}
