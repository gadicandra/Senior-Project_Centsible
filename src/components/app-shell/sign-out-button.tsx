"use client";

import { Button } from "@/components/ui/button";
import { signOut } from "@/server/actions/auth";

/** Keluar + minta Service Worker membuang salinan halaman (berisi data pribadi) dari cache. */
export function SignOutButton() {
  return (
    <form action={signOut} onSubmit={() => navigator.serviceWorker?.controller?.postMessage("clear-pages")}>
      <Button type="submit" variant="ghost" size="sm">
        Keluar
      </Button>
    </form>
  );
}
