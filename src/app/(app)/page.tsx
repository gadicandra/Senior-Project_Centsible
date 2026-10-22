import { HomeScreen } from "@/components/home/home-screen";
import { todayIn } from "@/lib/dates";
import { requireClaims } from "@/server/auth/session";
import { listCategories } from "@/server/services/categories";
import { getProfile } from "@/server/services/profile";
import { listWallets } from "@/server/services/wallets";

export default async function Page() {
  const claims = await requireClaims();
  const [profile, wallets, categories] = await Promise.all([getProfile(claims), listWallets(claims), listCategories(claims)]);
  return (
    <HomeScreen
      displayName={profile?.fullName ?? profile?.email ?? "Pengguna"}
      wallets={wallets.filter((w) => !w.isArchived)}
      categories={categories}
      today={todayIn(profile?.timezone ?? "Asia/Jakarta")}
    />
  );
}
