"use client";

import { SendHorizontal } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AI_TEXT_UI_MAX_CHARS } from "@/lib/ai/limits";

const EMPTY_ERROR = "Tulis transaksinya dulu.";
const PENDING_TEXT = "Membaca transaksi…";

/** Bilah input kalimat di bawah layar (design §10.4). Tidak menyimpan apa pun sendiri. */
export function AiTextInput({
  value,
  onValueChange,
  onSubmit,
  pending,
}: {
  value: string;
  onValueChange: (value: string) => void;
  onSubmit: (text: string) => void;
  pending: boolean;
}) {
  const [error, setError] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = value.trim();
    if (!text) {
      setError(true);
      return;
    }
    setError(false);
    onSubmit(text);
  }

  return (
    <form
      aria-label="Catat transaksi dengan kalimat"
      noValidate
      onSubmit={handleSubmit}
      className="fixed inset-x-0 bottom-0 z-20 border-t bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur"
    >
      <div className="mx-auto flex max-w-5xl gap-2">
        <Label htmlFor="ai-text" className="sr-only">
          Ketik transaksi
        </Label>
        <Input
          id="ai-text"
          name="text"
          value={value}
          onChange={(e) => {
            onValueChange(e.target.value);
            if (error) setError(false);
          }}
          maxLength={AI_TEXT_UI_MAX_CHARS}
          autoComplete="off"
          enterKeyHint="send"
          placeholder="Ketik transaksi… mis. makan siang 25rb"
          aria-invalid={error || undefined}
          aria-describedby={error ? "ai-text-error" : undefined}
          className="min-h-11 flex-1"
        />
        <Button type="submit" aria-label="Kirim" disabled={pending} aria-busy={pending} className="size-11 shrink-0">
          <SendHorizontal aria-hidden="true" />
        </Button>
      </div>
      <div className="mx-auto max-w-5xl text-sm">
        {error && (
          <p id="ai-text-error" className="pt-1 text-destructive">
            {EMPTY_ERROR}
          </p>
        )}
        {/* Region live selalu ada supaya perubahan isinya diumumkan pembaca layar. */}
        <p aria-live="polite" className="sr-only">
          {pending ? PENDING_TEXT : ""}
        </p>
        {pending && (
          <p aria-hidden="true" className="pt-1 text-muted-foreground">
            {PENDING_TEXT}
          </p>
        )}
      </div>
    </form>
  );
}
