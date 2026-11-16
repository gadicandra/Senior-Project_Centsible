"use client";

import { MicIcon, SquareIcon } from "lucide-react";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useIsOnline } from "@/components/offline/offline-sync";
import { Button } from "@/components/ui/button";

/** Diisi layout aplikasi dari server: fitur suara aktif? (AI_STT_ENABLED, FR 6/FR 7). */
export const VoiceEnabled = createContext(false);

const MAX_SECONDS = 30;
const NETWORK_ERROR = "Gagal mengirim rekaman. Silakan ketik.";

/**
 * Tombol rekam (FR 6): rekam ≤ 30 dtk → /api/ai/transcribe → `onText(teks)`. Teksnya lalu diproses
 * seperti ketikan biasa, jadi tetap lewat kartu konfirmasi. Saat offline tombol tidak tampil (arsitektur §7.4).
 */
export function VoiceButton({ onText, disabled }: { onText: (text: string) => void; disabled?: boolean }) {
  const enabled = useContext(VoiceEnabled);
  // Suara butuh internet (arsitektur §7.4): sembunyikan saat offline, muncul lagi saat online.
  const online = useIsOnline();
  const [state, setState] = useState<"idle" | "recording" | "sending">("idle");
  const [seconds, setSeconds] = useState(0);
  const recorder = useRef<MediaRecorder | null>(null);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => () => stop(true), []);

  if (!enabled || typeof window === "undefined" || !("MediaRecorder" in window) || !online) return null;

  function stop(discard = false) {
    if (timer.current) clearInterval(timer.current);
    timer.current = null;
    const r = recorder.current;
    if (r && r.state !== "inactive") {
      if (discard) r.ondataavailable = null;
      r.stop();
    }
    r?.stream.getTracks().forEach((t) => t.stop());
  }

  async function start() {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast.error("Izin mikrofon ditolak. Silakan ketik transaksinya.");
      return;
    }
    const chunks: Blob[] = [];
    const r = new MediaRecorder(stream);
    recorder.current = r;
    r.ondataavailable = (e) => chunks.push(e.data);
    r.onstop = () => {
      if (r.ondataavailable) void send(new Blob(chunks, { type: r.mimeType || "audio/webm" }));
    };
    r.start();
    setSeconds(0);
    setState("recording");
    timer.current = setInterval(() => {
      setSeconds((s) => {
        if (s + 1 >= MAX_SECONDS) stop();
        return s + 1;
      });
    }, 1000);
  }

  async function send(audio: Blob) {
    setState("sending");
    try {
      const body = new FormData();
      body.append("audio", audio, "rekaman.webm");
      const res = await fetch("/api/ai/transcribe", { method: "POST", body, credentials: "same-origin" });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; text?: string; error?: { message?: string } } | null;
      if (res.ok && data?.ok && data.text) onText(data.text);
      else toast.error(data?.error?.message ?? NETWORK_ERROR);
    } catch {
      toast.error(NETWORK_ERROR);
    } finally {
      setState("idle");
    }
  }

  const recording = state === "recording";
  return (
    <>
      <Button
        type="button"
        variant={recording ? "destructive" : "outline"}
        aria-label={recording ? `Berhenti merekam (${seconds} detik)` : "Rekam suara"}
        aria-pressed={recording}
        disabled={disabled || state === "sending"}
        aria-busy={state === "sending"}
        onClick={() => (recording ? stop() : void start())}
        className="size-11 shrink-0"
      >
        {recording ? <SquareIcon aria-hidden="true" /> : <MicIcon aria-hidden="true" />}
      </Button>
      <span aria-live="polite" className="sr-only">
        {recording ? "Merekam" : state === "sending" ? "Mengubah suara jadi teks…" : ""}
      </span>
    </>
  );
}
