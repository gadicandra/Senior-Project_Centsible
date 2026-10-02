"use client";

import { MoreHorizontalIcon } from "lucide-react";
import { useState } from "react";
import { useActionToast } from "@/components/form/use-action-toast";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatRupiah } from "@/lib/money";
import { WALLET_TYPE_LABEL } from "@/lib/schemas/settings";
import { cn } from "@/lib/utils";
import { archiveWallet, makeDefaultWallet, removeWallet } from "@/server/actions/settings";
import type { WalletRow } from "./types";
import { WalletFormDialog } from "./wallet-form-dialog";

export function WalletList({ wallets }: { wallets: WalletRow[] }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Dompet</h2>
        <WalletFormDialog trigger={<Button size="sm">Tambah dompet</Button>} />
      </div>
      <ul className="divide-y rounded-lg border">
        {wallets.map((w) => (
          <WalletItem key={w.id} wallet={w} />
        ))}
      </ul>
    </section>
  );
}

function WalletItem({ wallet }: { wallet: WalletRow }) {
  const { pending, run } = useActionToast();
  const [editing, setEditing] = useState(false);
  return (
    <li className={cn("flex items-center gap-3 px-4 py-3", wallet.isArchived && "opacity-60")} aria-busy={pending}>
      <WalletFormDialog wallet={wallet} open={editing} onOpenChange={setEditing} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium">{wallet.name}</span>
          {wallet.isDefault && <Badge>Utama</Badge>}
          {wallet.isArchived && <Badge variant="outline">Diarsipkan</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">
          {WALLET_TYPE_LABEL[wallet.type]} · {wallet.transactionCount} transaksi
        </p>
      </div>
      <span className="font-medium tabular-nums">{formatRupiah(wallet.balance)}</span>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon" aria-label={`Aksi untuk ${wallet.name}`} disabled={pending} />}
        >
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditing(true)}>Ubah</DropdownMenuItem>
          {!wallet.isDefault && !wallet.isArchived && (
            <DropdownMenuItem onClick={() => run(() => makeDefaultWallet(wallet.id))}>Jadikan utama</DropdownMenuItem>
          )}
          {!wallet.isDefault && (
            <DropdownMenuItem onClick={() => run(() => archiveWallet(wallet.id, !wallet.isArchived))}>
              {wallet.isArchived ? "Aktifkan kembali" : "Arsipkan"}
            </DropdownMenuItem>
          )}
          {!wallet.isDefault && wallet.transactionCount === 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => run(() => removeWallet(wallet.id))}>
                Hapus
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
