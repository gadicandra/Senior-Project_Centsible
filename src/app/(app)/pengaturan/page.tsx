import type { Metadata } from "next";
import { SettingsScreen } from "@/components/pengaturan/settings-screen";
import { requireClaims } from "@/server/auth/session";
import { listCategories } from "@/server/services/categories";
import { listWallets } from "@/server/services/wallets";

export const metadata: Metadata = { title: "Pengaturan · Centsible" };

export default async function Page() {
  const claims = await requireClaims();
  const [wallets, categories] = await Promise.all([listWallets(claims), listCategories(claims)]);
  return <SettingsScreen wallets={wallets} categories={categories} />;
}
