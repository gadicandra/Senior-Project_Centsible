"use client";

import { ChartLineIcon, HouseIcon, ListIcon, PiggyBankIcon, SettingsIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

// Urutan tetap (desain #31 dan redesain 16 Nov). Di ponsel tampil sebagai bilah bawah dengan
// tombol + di tengah; dari `md` sebagai baris tautan di header.
export const LINKS = [
  { href: "/", label: "Beranda", icon: HouseIcon },
  { href: "/ringkasan", label: "Ringkasan", icon: ChartLineIcon },
  { href: "/transaksi", label: "Transaksi", icon: ListIcon },
  { href: "/anggaran", label: "Anggaran", icon: PiggyBankIcon },
  { href: "/pengaturan", label: "Pengaturan", icon: SettingsIcon },
] as const;

export const isActive = (href: string, pathname: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

/** Navigasi header (desktop). */
export function NavLinks({ className }: { className?: string }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Navigasi utama" className={cn("flex items-center gap-1 text-sm", className)}>
      {LINKS.map(({ href, label }) => {
        const active = isActive(href, pathname);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-full px-3 py-1.5 text-muted-foreground transition-colors hover:text-foreground",
              active && "bg-secondary font-semibold text-secondary-foreground",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
