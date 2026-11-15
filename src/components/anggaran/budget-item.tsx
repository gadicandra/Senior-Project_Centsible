"use client";

import { MoreHorizontalIcon } from "lucide-react";
import { useRouter } from "next/navigation";
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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { BudgetView } from "@/lib/budget";
import { BUDGET_PERIOD_LABEL } from "@/lib/schemas/budget";
import { removeBudget } from "@/server/actions/budgets";
import { BudgetFormDialog } from "./budget-form-dialog";
import { BudgetMeter } from "./budget-meter";

export function BudgetItem({ budget }: { budget: BudgetView }) {
  const router = useRouter();
  const { pending, run } = useActionToast();
  const [editing, setEditing] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const periodLower = BUDGET_PERIOD_LABEL[budget.period].toLowerCase();
  const href = `/transaksi?${new URLSearchParams({ type: "expense", categoryId: budget.categoryId, from: budget.from, to: budget.to })}`;

  return (
    <li className="flex flex-col gap-3 rounded-lg border p-4" aria-busy={pending}>
      <div className="flex items-center gap-2">
        <span aria-hidden className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: budget.color ?? "#64748B" }} />
        {budget.icon && <span aria-hidden>{budget.icon}</span>}
        <span className="min-w-0 flex-1 truncate font-medium">
          {budget.name}
          {budget.isArchived && " · arsip"}
        </span>
        <Badge variant="secondary">{BUDGET_PERIOD_LABEL[budget.period]}</Badge>
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Aksi untuk anggaran ${budget.name} (${periodLower})`}
                disabled={pending}
              />
            }
          >
            <MoreHorizontalIcon />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setEditing(true)}>Ubah</DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(href)}>Lihat transaksi</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={() => setConfirming(true)}>
              Hapus
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <BudgetMeter budget={budget} />

      <BudgetFormDialog budget={budget} open={editing} onOpenChange={setEditing} />
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Hapus anggaran {budget.name} ({periodLower})?
            </AlertDialogTitle>
            <AlertDialogDescription>Transaksi tidak ikut terhapus. Kamu bisa membuat anggaran baru kapan saja.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <Button
              variant="destructive"
              disabled={pending}
              onClick={() => run(() => removeBudget(budget.id), () => setConfirming(false))}
            >
              Hapus
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}
