import { HomeScreen } from "@/components/home/home-screen";
import { requireClaims } from "@/server/auth/session";
import { getProfile } from "@/server/services/profile";
import { listWallets } from "@/server/services/wallets";

export default async function Page() {
  const claims = await requireClaims();
  const [profile, wallets] = await Promise.all([getProfile(claims), listWallets(claims)]);
  return (
    <HomeScreen
      displayName={profile?.fullName ?? profile?.email ?? "Pengguna"}
      wallets={wallets.filter((w) => !w.isArchived)}
    />
  );
}
