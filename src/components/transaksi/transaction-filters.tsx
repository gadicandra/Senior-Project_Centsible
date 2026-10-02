"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ENTRY_KIND_LABEL } from "@/lib/schemas/settings";
import type { CategoryOption, FilterValues, WalletOption } from "./types";

const ALL = "__all__";

/** Filter tanggal/jenis/kategori/dompet (FR 8), disimpan di URL agar bisa dibagikan & di-refresh. */
export function TransactionFilters({
  filters,
  categories,
  wallets,
}: {
  filters: FilterValues;
  categories: CategoryOption[];
  wallets: WalletOption[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function update(key: keyof FilterValues, value: string | null) {
    const params = new URLSearchParams(searchParams);
    if (!value || value === ALL) params.delete(key);
    else params.set(key, value);
    params.delete("page");
    // Kategori yang tidak cocok dengan jenis baru dihapus dari filter.
    if (key === "type" && params.get("categoryId")) {
      const cat = categories.find((c) => c.id === params.get("categoryId"));
      if (cat && value && value !== ALL && cat.kind !== value) params.delete("categoryId");
    }
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  const typeOptions = [
    { value: ALL, label: "Semua jenis" },
    { value: "expense", label: ENTRY_KIND_LABEL.expense },
    { value: "income", label: ENTRY_KIND_LABEL.income },
  ];
  const categoryOptions = [
    { value: ALL, label: "Semua kategori" },
    ...categories
      .filter((c) => !filters.type || c.kind === filters.type)
      .map((c) => ({ value: c.id, label: `${c.icon ? `${c.icon} ` : ""}${c.name}${c.isArchived ? " (arsip)" : ""}` })),
  ];
  const walletOptions = [
    { value: ALL, label: "Semua dompet" },
    ...wallets.map((w) => ({ value: w.id, label: `${w.name}${w.isArchived ? " (arsip)" : ""}` })),
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5" aria-busy={pending}>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-from">Dari</Label>
        <Input id="filter-from" type="date" value={filters.from ?? ""} onChange={(e) => update("from", e.target.value)} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filter-to">Sampai</Label>
        <Input id="filter-to" type="date" value={filters.to ?? ""} onChange={(e) => update("to", e.target.value)} />
      </div>
      <FilterSelect label="Jenis" id="filter-type" value={filters.type} options={typeOptions} onChange={(v) => update("type", v)} />
      <FilterSelect
        label="Kategori"
        id="filter-category"
        value={filters.categoryId}
        options={categoryOptions}
        onChange={(v) => update("categoryId", v)}
      />
      <div className="flex items-end gap-2">
        <div className="flex-1">
          <FilterSelect
            label="Dompet"
            id="filter-wallet"
            value={filters.walletId}
            options={walletOptions}
            onChange={(v) => update("walletId", v)}
          />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => startTransition(() => router.replace(pathname, { scroll: false }))}
          disabled={!Object.values(filters).some(Boolean)}
        >
          Reset
        </Button>
      </div>
    </div>
  );
}

function FilterSelect({
  label,
  id,
  value,
  options,
  onChange,
}: {
  label: string;
  id: string;
  value?: string;
  options: { value: string; label: string }[];
  onChange: (value: string | null) => void;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <Select items={options} value={value ?? ALL} onValueChange={(v) => onChange(v as string | null)}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o.value} value={o.value}>
              {o.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
