import Link from "next/link";
import { AiCapture } from "@/components/ai-input/ai-capture";
import type { CategoryOption, WalletOption } from "@/components/transaksi/types";
import { buttonVariants } from "@/components/ui/button";
import { formatRupiah } from "@/lib/money";
import { cn } from "@/lib/utils";

type WalletBalance = WalletOption & { balance: number };

/** Beranda: total & saldo per dompet + input transaksi. Ringkasan bulanan ada di /ringkasan (Issue #30). */
export function HomeScreen({
  displayName,
  wallets,
  categories,
  today,
}: {
  displayName: string;
  wallets: WalletBalance[];
  categories: CategoryOption[];
  today: string;
}) {
  const total = wallets.reduce((sum, w) => sum + w.balance, 0);
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Halo, {displayName}</h1>
        <p className="text-muted-foreground">Total saldo semua dompet</p>
        <p className="text-3xl font-semibold tabular-nums">{formatRupiah(total)}</p>
      </div>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {wallets.map((w) => (
          <li key={w.id} className="rounded-lg border p-4">
            <p className="text-sm text-muted-foreground">
              {w.name}
              {w.isDefault && " · utama"}
            </p>
            <p className="text-lg font-medium tabular-nums">{formatRupiah(w.balance)}</p>
          </li>
        ))}
      </ul>
      {/* Tautan bergaya tombol: Base UI Button hanya untuk tombol sungguhan (peran "button"). */}
      <div className="flex flex-wrap gap-2">
        <Link href="/transaksi" className={buttonVariants()}>
          Lihat transaksi
        </Link>
        <Link href="/ringkasan" className={cn(buttonVariants({ variant: "outline" }))}>
          Lihat ringkasan
        </Link>
      </div>
      <AiCapture
        categories={categories}
        wallets={wallets.map(({ id, name, isDefault, isArchived }) => ({ id, name, isDefault, isArchived }))}
        today={today}
      />
    </div>
  );
}
