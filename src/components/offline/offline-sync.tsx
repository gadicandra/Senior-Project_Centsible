"use client";

import { CloudOffIcon, RefreshCwIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { createContext, useCallback, useContext, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { toast } from "sonner";
import type { SyncResult } from "@/app/api/sync/route";
import { OUTBOX_EVENT, readOutbox, removeFromOutbox } from "@/lib/outbox";

const UserContext = createContext<string | null>(null);
/** id pengguna yang sedang masuk; antrean offline dipisah per pengguna. */
export const useOutboxUser = () => useContext(UserContext);

const subscribeOnline = (cb: () => void) => {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
};
export const useIsOnline = () =>
  useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);

const subscribeOutbox = (cb: () => void) => {
  window.addEventListener(OUTBOX_EVENT, cb);
  window.addEventListener("storage", cb); // tab lain
  return () => {
    window.removeEventListener(OUTBOX_EVENT, cb);
    window.removeEventListener("storage", cb);
  };
};

/**
 * Daftarkan Service Worker, tampilkan status offline/antrean, dan kirim antrean ke /api/sync
 * saat online (saat dimuat, saat event `online`, dan lewat tombol). FR 16, arsitektur §7.4.
 */
export function OfflineSync({ userId, children }: { userId: string; children: React.ReactNode }) {
  const router = useRouter();
  const online = useIsOnline();
  const pending = useSyncExternalStore(subscribeOutbox, () => readOutbox(userId).length, () => 0);
  const [syncing, setSyncing] = useState(false);
  const busy = useRef(false);

  const sync = useCallback(async () => {
    const items = readOutbox(userId);
    if (busy.current || !items.length || !navigator.onLine) return;
    busy.current = true;
    setSyncing(true);
    try {
      const res = await fetch("/api/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        body: JSON.stringify({ items: items.slice(0, 50).map(({ clientId, values }) => ({ clientId, values })) }),
      });
      if (!res.ok) return; // 401/5xx: antrean tetap, dicoba lagi nanti
      const { results } = (await res.json()) as { results: SyncResult[] };
      removeFromOutbox(userId, results.map((r) => r.clientId));
      const done = results.filter((r) => r.status === "done").length;
      const rejected = results.filter((r) => r.status === "rejected");
      if (done) toast.success(`${done} transaksi offline tersinkron.`);
      for (const r of rejected) toast.error(`Transaksi offline tidak bisa disimpan: ${r.message ?? "data tidak valid"}`);
      if (done) router.refresh();
    } catch {
      // Jaringan putus lagi di tengah jalan: biarkan antrean.
    } finally {
      busy.current = false;
      setSyncing(false);
    }
  }, [userId, router]);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {});
    }
  }, []);

  useEffect(() => {
    if (online) void sync();
  }, [online, sync]);

  return (
    <UserContext.Provider value={userId}>
      {(!online || pending > 0) && (
        <div role="status" className="border-b bg-muted px-4 py-2 text-sm">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-1">
            {!online && (
              <span className="flex items-center gap-1.5">
                <CloudOffIcon className="size-4 shrink-0" aria-hidden />
                Offline. Transaksi dari form manual disimpan di perangkat dan dikirim saat online.
              </span>
            )}
            {pending > 0 && (
              <span className="flex items-center gap-2">
                {pending} transaksi menunggu sinkron.
                {online && (
                  <button
                    type="button"
                    onClick={() => void sync()}
                    disabled={syncing}
                    className="inline-flex items-center gap-1 font-medium underline underline-offset-2 disabled:opacity-50"
                  >
                    <RefreshCwIcon className="size-3.5" aria-hidden />
                    {syncing ? "Menyinkron…" : "Sinkron sekarang"}
                  </button>
                )}
              </span>
            )}
          </div>
        </div>
      )}
      {children}
    </UserContext.Provider>
  );
}
