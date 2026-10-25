import Link from "next/link";
import { Button } from "@/components/ui/button";
import { signOut } from "@/server/actions/auth";
import { NavLinks } from "./nav-links";

export function AppShell({ displayName, children }: { displayName: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="sticky top-0 z-10 border-b bg-background/90 backdrop-blur">
        <div className="mx-auto flex min-h-14 w-full max-w-5xl flex-wrap items-center gap-x-4 gap-y-1 px-4 py-2 sm:h-14 sm:py-0">
          <Link href="/" className="font-semibold text-primary">
            Centsible
          </Link>
          {/* Di bawah sm nav turun ke baris kedua agar header tidak meluap di 390 px. */}
          <NavLinks className="order-last w-full sm:order-none sm:w-auto" />
          <div className="ml-auto flex items-center gap-2">
            <Link href="/akun" className="hidden text-sm text-muted-foreground hover:underline sm:inline">
              {displayName}
            </Link>
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm">
                Keluar
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pt-6 pb-28">{children}</main>
    </div>
  );
}
