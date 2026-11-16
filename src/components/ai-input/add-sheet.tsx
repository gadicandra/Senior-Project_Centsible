"use client";

import { SparklesIcon } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AiTextInput } from "./ai-text-input";

/**
 * Layar "Tambah transaksi" (tombol + di navigasi). Satu tempat untuk tiga cara mencatat:
 * kalimat, suara (mikrofon di kolom yang sama), atau form manual. Hasil AI tetap berakhir di kartu konfirmasi.
 */
export function AddSheet({
  open,
  onOpenChange,
  text,
  onTextChange,
  onSubmit,
  pending,
  onManual,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  text: string;
  onTextChange: (v: string) => void;
  onSubmit: (text: string) => void;
  pending: boolean;
  onManual: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="gap-0 overflow-hidden p-0 sm:max-w-md">
        <div className="bg-gradient-to-br from-hero-from to-hero-to px-5 pt-6 pb-8 text-center text-hero-foreground">
          <DialogHeader className="items-center">
            <DialogTitle className="text-lg font-semibold text-hero-foreground">Tambah transaksi</DialogTitle>
            <DialogDescription className="text-sm text-hero-foreground/80">
              Ketik atau ucapkan seperti biasa, mis. <q>beli bensin gocap kemarin</q>
            </DialogDescription>
          </DialogHeader>
          <SparklesIcon className="mx-auto mt-4 size-8 opacity-90" aria-hidden />
        </div>
        <div className="-mt-4 flex flex-col gap-4 rounded-t-3xl bg-popover px-5 pt-5 pb-5">
          <AiTextInput value={text} onValueChange={onTextChange} onSubmit={onSubmit} pending={pending} variant="inline" />
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            atau
            <span className="h-px flex-1 bg-border" />
          </div>
          <button
            type="button"
            onClick={onManual}
            className="h-11 rounded-full border bg-card text-sm font-semibold transition-colors hover:border-primary/50"
          >
            Isi form manual
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
