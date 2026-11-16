"use client";

import { PlusIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { isActive, LINKS } from "./nav-links";

// Ponsel: 4 tujuan + tombol tambah di tengah (referensi desain). "Transaksi" pindah ke Beranda
// ("Lihat semua") dan ke header Ringkasan supaya bilah tetap 5 slot.
const ITEMS = [LINKS[0], LINKS[1], null, LINKS[3], LINKS[4]] as const;

/** Bilah navigasi bawah (di bawah `md`). Tombol + membuka layar tambah transaksi lewat `onAdd`. */
export function BottomNav({ onAdd }: { onAdd: () => void }) {
  const pathname = usePathname();
  return (
    <nav
      aria-label="Navigasi utama"
      className="fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      <ul className="mx-auto grid max-w-md grid-cols-5 items-end px-2">
        {ITEMS.map((item) =>
          item === null ? (
            <li key="add" className="flex justify-center">
              <button
                type="button"
                onClick={onAdd}
                aria-label="Tambah transaksi"
                className="-mt-6 flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg shadow-primary/30 ring-4 ring-background transition-transform active:scale-95"
              >
                <PlusIcon className="size-7" aria-hidden />
              </button>
            </li>
          ) : (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={isActive(item.href, pathname) ? "page" : undefined}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2 text-[11px] font-medium text-muted-foreground",
                  isActive(item.href, pathname) && "text-primary",
                )}
              >
                <item.icon className="size-5" aria-hidden />
                {item.label}
              </Link>
            </li>
          ),
        )}
      </ul>
    </nav>
  );
}
