import { AiCapture } from "@/components/ai-input/ai-capture";
import { VoiceProvider } from "@/components/ai-input/voice-provider";
import { AppShell } from "@/components/app-shell/app-shell";
import { OfflineSync } from "@/components/offline/offline-sync";
import { todayIn } from "@/lib/dates";
import { sttConfig } from "@/server/ai/transcribe";
import { requireClaims } from "@/server/auth/session";
import { listCategories } from "@/server/services/categories";
import { getProfile } from "@/server/services/profile";
import { listWallets } from "@/server/services/wallets";

// Layar tambah transaksi (tombol + di navigasi) tersedia di semua halaman, jadi datanya dimuat sekali di sini.
export default async function Layout({ children }: LayoutProps<"/">) {
  const claims = await requireClaims();
  const [profile, categories, wallets] = await Promise.all([getProfile(claims), listCategories(claims), listWallets(claims)]);
  return (
    <OfflineSync userId={claims.sub}>
      <VoiceProvider enabled={sttConfig() !== null}>
        <AiCapture
          categories={categories}
          wallets={wallets.map(({ id, name, isDefault, isArchived }) => ({ id, name, isDefault, isArchived }))}
          today={todayIn(profile?.timezone ?? "Asia/Jakarta")}
        >
          <AppShell displayName={profile?.fullName ?? profile?.email ?? "Pengguna"}>{children}</AppShell>
        </AiCapture>
      </VoiceProvider>
    </OfflineSync>
  );
}
