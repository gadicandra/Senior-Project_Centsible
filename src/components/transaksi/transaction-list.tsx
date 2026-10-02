"use client";

import { MoreHorizontalIcon } from "lucide-react";
import { useState } from "react";
import { useActionToast } from "@/components/form/use-action-toast";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDateOnly } from "@/lib/dates";
import { formatRupiah } from "@/lib/money";
import { cn } from "@/lib/utils";
import { removeTransaction } from "@/server/actions/transactions";
import { TransactionDialog } from "./transaction-dialog";
import type { CategoryOption, TransactionRow, WalletOption } from "./types";

type Props = { categories: CategoryOption[]; wallets: WalletOption[]; today: string };

export function TransactionList({ items, ...props }: Props & { items: TransactionRow[] }) {
  // Dikelompokkan per tanggal; urutan dari server sudah occurred_at desc.
  const groups = new Map<string, TransactionRow[]>();
  for (const t of items) groups.set(t.occurredAt, [...(groups.get(t.occurredAt) ?? []), t]);

  return (
    <div className="flex flex-col gap-4">
      {[...groups].map(([date, rows]) => (
        <section key={date} aria-label={formatDateOnly(date)}>
          <h3 className="mb-1.5 text-sm font-medium text-muted-foreground">{formatDateOnly(date)}</h3>
          <ul className="divide-y rounded-lg border">
            {rows.map((t) => (
              <TransactionItem key={t.id} transaction={t} {...props} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

const SOURCE_LABEL = { text: "AI · teks", voice: "AI · suara", manual: null } as const;

function TransactionItem({ transaction: t, categories, wallets, today }: Props & { transaction: TransactionRow }) {
  const { pending, run } = useActionToast();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);

  return (
    <li className="flex items-center gap-3 px-4 py-3" aria-busy={pending}>
      <span
        aria-hidden
        className="flex size-9 shrink-0 items-center justify-center rounded-full text-base"
        style={{ backgroundColor: `${t.category.color ?? "#64748B"}26` }}
      >
        {t.category.icon ?? "•"}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-medium">{t.description || t.category.name}</p>
        <p className="flex flex-wrap items-center gap-x-1.5 text-sm text-muted-foreground">
          <span>{t.category.name}</span>
          <span aria-hidden>·</span>
          <span>{t.wallet.name}</span>
          {SOURCE_LABEL[t.source] && <Badge variant="secondary">{SOURCE_LABEL[t.source]}</Badge>}
        </p>
      </div>
      <span
        className={cn("font-medium tabular-nums", t.type === "income" ? "text-emerald-600 dark:text-emerald-400" : "text-foreground")}
      >
        {t.type === "income" ? "+" : "−"}
        {formatRupiah(t.amount)}
      </span>
      <DropdownMenu>
        <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label="Aksi transaksi" disabled={pending} />}>
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditing(true)}>Ubah</DropdownMenuItem>
          <DropdownMenuItem variant="destructive" onClick={() => setConfirming(true)}>
            Hapus
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <TransactionDialog
        transaction={t}
        categories={categories}
        wallets={wallets}
        today={today}
        open={editing}
        onOpenChange={setEditing}
      />
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus transaksi ini?</AlertDialogTitle>
            <AlertDialogDescription>
              {t.description || t.category.name} · {formatRupiah(t.amount)}. Saldo dompet akan dihitung ulang.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => run(() => removeTransaction(t.id), () => setConfirming(false))}
            >
              Hapus
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}
