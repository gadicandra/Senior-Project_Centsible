import { ChevronRightIcon, UserIcon } from "lucide-react";
import Link from "next/link";
import { SignOutButton } from "@/components/app-shell/sign-out-button";
import { PageHero } from "@/components/layout/page-hero";
import { CategoryList } from "./category-list";
import type { CategoryRow, WalletRow } from "./types";
import { WalletList } from "./wallet-list";

export function SettingsScreen({ wallets, categories }: { wallets: WalletRow[]; categories: CategoryRow[] }) {
  return (
    <div className="flex flex-col gap-8">
      <PageHero
        title="Pengaturan"
        subtitle="Kategori dan dompet yang sudah punya transaksi diarsipkan, bukan dihapus, supaya riwayat tetap utuh."
      />
      <div className="flex flex-col divide-y overflow-hidden rounded-2xl bg-card shadow-sm ring-1 ring-border">
        <Link href="/akun" className="flex items-center gap-3 px-4 py-3 font-medium hover:bg-muted/50">
          <span className="flex size-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground">
            <UserIcon className="size-4" aria-hidden />
          </span>
          Akun & kata sandi
          <ChevronRightIcon className="ml-auto size-4 text-muted-foreground" aria-hidden />
        </Link>
        <div className="flex items-center justify-between px-4 py-2 md:hidden">
          <span className="text-sm text-muted-foreground">Keluar dari Centsible</span>
          <SignOutButton />
        </div>
      </div>
      <WalletList wallets={wallets} />
      <CategoryList categories={categories} />
    </div>
  );
}
