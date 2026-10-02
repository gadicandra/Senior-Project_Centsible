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
import { ENTRY_KIND_LABEL, ENTRY_KINDS } from "@/lib/schemas/settings";
import { cn } from "@/lib/utils";
import { archiveCategory, removeCategory } from "@/server/actions/settings";
import { CategoryFormDialog } from "./category-form-dialog";
import type { CategoryRow } from "./types";

export function CategoryList({ categories }: { categories: CategoryRow[] }) {
  return (
    <section className="flex flex-col gap-6">
      {ENTRY_KINDS.map((kind) => (
        <div key={kind} className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Kategori {ENTRY_KIND_LABEL[kind].toLowerCase()}</h2>
            <CategoryFormDialog
              defaultKind={kind}
              trigger={
                <Button size="sm" variant="outline">
                  Tambah
                </Button>
              }
            />
          </div>
          <ul className="divide-y rounded-lg border">
            {categories
              .filter((c) => c.kind === kind)
              .map((c) => (
                <CategoryItem key={c.id} category={c} />
              ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

function CategoryItem({ category }: { category: CategoryRow }) {
  const { pending, run } = useActionToast();
  const [editing, setEditing] = useState(false);
  return (
    <li className={cn("flex items-center gap-3 px-4 py-2.5", category.isArchived && "opacity-60")} aria-busy={pending}>
      <CategoryFormDialog category={category} open={editing} onOpenChange={setEditing} />
      <span
        aria-hidden
        className="flex size-8 shrink-0 items-center justify-center rounded-full text-base"
        style={{ backgroundColor: `${category.color ?? "#64748B"}26` }}
      >
        {category.icon ?? "•"}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="truncate font-medium">{category.name}</span>
          {category.isSystem && <Badge variant="secondary">Bawaan</Badge>}
          {category.isArchived && <Badge variant="outline">Diarsipkan</Badge>}
        </div>
        <p className="text-sm text-muted-foreground">{category.transactionCount} transaksi</p>
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={<Button variant="ghost" size="icon" aria-label={`Aksi untuk ${category.name}`} disabled={pending} />}
        >
          <MoreHorizontalIcon />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => setEditing(true)}>Ubah</DropdownMenuItem>
          <DropdownMenuItem onClick={() => run(() => archiveCategory(category.id, !category.isArchived))}>
            {category.isArchived ? "Aktifkan kembali" : "Arsipkan"}
          </DropdownMenuItem>
          {category.transactionCount === 0 && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem variant="destructive" onClick={() => run(() => removeCategory(category.id))}>
                Hapus
              </DropdownMenuItem>
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </li>
  );
}
