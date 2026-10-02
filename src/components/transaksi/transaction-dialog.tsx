"use client";

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { TransactionForm } from "./transaction-form";
import type { CategoryOption, TransactionRow, WalletOption } from "./types";

export function TransactionDialog({
  transaction,
  categories,
  wallets,
  today,
  open,
  onOpenChange,
  trigger,
}: {
  transaction?: TransactionRow;
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
        {open && (
          <TransactionForm
            key={transaction?.id ?? "new"}
            transaction={transaction}
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
