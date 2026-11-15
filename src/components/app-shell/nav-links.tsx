"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Beranda" },
  { href: "/ringkasan", label: "Ringkasan" },
  { href: "/transaksi", label: "Transaksi" },
  { href: "/anggaran", label: "Anggaran" },
  { href: "/pengaturan", label: "Pengaturan" },
];

export function NavLinks({ className }: { className?: string }) {
  const pathname = usePathname();
  return (
    <nav className={cn(
        // Lima label harus muat di 390 px: di bawah sm pakai text-xs + px-1.5 (desain #31 B7).
        "flex w-full items-center justify-between gap-0 overflow-x-auto whitespace-nowrap text-xs sm:w-auto sm:justify-start sm:gap-1 sm:text-sm",
        className,
      )}>
      {LINKS.map(({ href, label }) => {
        const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "rounded-md px-1.5 py-2 text-muted-foreground sm:px-2.5 sm:py-1.5 hover:text-foreground",
              active && "bg-muted font-medium text-foreground",
            )}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
