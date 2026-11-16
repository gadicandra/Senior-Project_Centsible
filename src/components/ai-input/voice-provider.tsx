"use client";

import { VoiceEnabled } from "./voice-button";

/** Batas server → klien untuk flag suara; flag dibaca di server dari AI_STT_ENABLED. */
export function VoiceProvider({ enabled, children }: { enabled: boolean; children: React.ReactNode }) {
  return <VoiceEnabled.Provider value={enabled}>{children}</VoiceEnabled.Provider>;
}
