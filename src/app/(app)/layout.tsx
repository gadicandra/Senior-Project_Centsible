import { VoiceProvider } from "@/components/ai-input/voice-provider";
import { AppShell } from "@/components/app-shell/app-shell";
import { OfflineSync } from "@/components/offline/offline-sync";
import { sttConfig } from "@/server/ai/transcribe";
import { requireClaims } from "@/server/auth/session";
import { getProfile } from "@/server/services/profile";

export default async function Layout({ children }: LayoutProps<"/">) {
  const claims = await requireClaims();
  const profile = await getProfile(claims);
  return (
    <OfflineSync userId={claims.sub}>
      <VoiceProvider enabled={sttConfig() !== null}>
        <AppShell displayName={profile?.fullName ?? profile?.email ?? "Pengguna"}>{children}</AppShell>
      </VoiceProvider>
    </OfflineSync>
  );
}
