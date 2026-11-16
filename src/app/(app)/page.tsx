import { HomeScreen } from "@/components/home/home-screen";
import { todayIn } from "@/lib/dates";
import { requireClaims } from "@/server/auth/session";
import { getAnomalies } from "@/server/services/anomalies";
import { getBudgetOverview } from "@/server/services/budgets";
import { listCategories } from "@/server/services/categories";
import { getProfile } from "@/server/services/profile";
import { getLatestWeekly } from "@/server/services/weekly";
import { listWallets } from "@/server/services/wallets";

export default async function Page() {
  const claims = await requireClaims();
  const [profile, wallets, categories, budgets, anomalies, weekly] = await Promise.all([
    getProfile(claims),
    listWallets(claims),
    listCategories(claims),
    // Beranda tetap tampil walau anggaran gagal dimuat.
    getBudgetOverview(claims).catch((error: unknown) => {
      console.error("budget_overview_failed", error);
      return null;
    }),
    // Peringatan bersifat tambahan: gagal dihitung = tidak ditampilkan.
    getAnomalies(claims).catch((error: unknown) => {
      console.error("anomalies_failed", error);
      return [];
    }),
    // Ringkasan bersifat tambahan: gagal dimuat = tidak ditampilkan.
    getLatestWeekly(claims).catch((error: unknown) => {
      console.error("weekly_load_failed", error);
      return null;
    }),
  ]);
  return (
    <HomeScreen
      displayName={profile?.fullName ?? profile?.email ?? "Pengguna"}
      wallets={wallets.filter((w) => !w.isArchived)}
      categories={categories}
      today={todayIn(profile?.timezone ?? "Asia/Jakarta")}
      budgets={budgets}
      anomalies={anomalies}
      weekly={weekly}
    />
  );
}
