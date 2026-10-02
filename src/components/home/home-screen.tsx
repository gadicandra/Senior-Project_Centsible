import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatRupiah } from "@/lib/money";

type WalletBalance = { id: string; name: string; balance: number; isDefault: boolean };

/** Beranda sementara: total & saldo per dompet. Dashboard lengkap dikerjakan di Issue #30. */
export function HomeScreen({ displayName, wallets }: { displayName: string; wallets: WalletBalance[] }) {
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
      <Button className="self-start" render={<Link href="/transaksi" />}>
        Lihat transaksi
      </Button>
    </div>
  );
}
