"use client";

import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { useCapture } from "@/components/ai-input/capture-context";
import { Button } from "@/components/ui/button";
import { BottomNav } from "./bottom-nav";
import { NavLinks } from "./nav-links";
import { SignOutButton } from "./sign-out-button";

/**
 * Kerangka aplikasi (redesain 16 Nov). Ponsel: navigasi bawah dengan tombol + di tengah, tanpa header
 * (tiap halaman punya judul/hero sendiri). Desktop (`md`): header dengan tautan dan tombol "Tambah".
 */
export function AppShell({ displayName, children }: { displayName: string; children: React.ReactNode }) {
  const { openAdd } = useCapture();
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-20 hidden border-b bg-card/90 backdrop-blur md:block">
        <div className="mx-auto flex h-16 w-full max-w-5xl items-center gap-6 px-6">
          <Link href="/" className="text-lg font-bold text-primary">
            Centsible
          </Link>
          <NavLinks />
          <div className="ml-auto flex items-center gap-2">
            <Button onClick={openAdd} className="rounded-full px-4">
              <PlusIcon aria-hidden />
              Tambah
            </Button>
            <Link href="/akun" className="max-w-40 truncate text-sm text-muted-foreground hover:underline">
              {displayName}
            </Link>
            <SignOutButton />
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-4 pb-28 md:px-6 md:pt-8 md:pb-12">{children}</main>
      <BottomNav onAdd={openAdd} />
    </div>
  );
}
