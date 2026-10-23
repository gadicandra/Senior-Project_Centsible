"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TransactionForm, type TransactionPrefill } from "./transaction-form";
import type { CategoryOption, TransactionRow, WalletOption } from "./types";

export function TransactionDialog({
  transaction,
  prefill,
  notice,
  categories,
  wallets,
  today,
  open,
  onOpenChange,
  trigger,
}: {
  transaction?: TransactionRow;
  prefill?: TransactionPrefill;
  /** Pesan singkat di atas form (mis. alasan AI jatuh ke form manual). */
  notice?: string;
  categories: CategoryOption[];
  wallets: WalletOption[];
  today: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  trigger?: React.ReactElement;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {trigger && <DialogTrigger render={trigger} />}
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{transaction ? "Ubah transaksi" : "Catat transaksi"}</DialogTitle>
        </DialogHeader>
        {open && notice && (
          <p role="status" className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">
            {notice}
          </p>
        )}
        {open && (
          <TransactionForm
            key={transaction?.id ?? "new"}
            transaction={transaction}
            prefill={prefill}
            categories={categories}
            wallets={wallets}
            today={today}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}
