"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { TransactionDialog } from "@/components/transaksi/transaction-dialog";
import type { TransactionPrefill } from "@/components/transaksi/transaction-form";
import type { CategoryOption, WalletOption } from "@/components/transaksi/types";
import { CLIENT_TIMEOUT_MS, DESCRIPTION_MAX } from "@/lib/ai/limits";
import type { ParseSuccess } from "@/lib/ai/types";
import { AiTextInput } from "./ai-text-input";
import { ConfirmCard } from "./confirm-card";

const NETWORK_NOTICE = "Gagal menghubungi AI. Silakan isi form manual.";

type Card = { result: ParseSuccess; raw: string };
type Manual = { prefill: TransactionPrefill; notice?: string };

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function isParseSuccess(body: unknown): body is ParseSuccess {
  if (!isRecord(body) || body.ok !== true || typeof body.draft !== "string") return false;
  const p = body.proposal;
  return isRecord(p) && typeof p.amount === "number" && typeof p.walletId === "string" && isRecord(body.flags);
}

/** AiPrefill (respons gagal) → TransactionPrefill; hanya field yang tipenya benar yang dipakai. */
function toPrefill(body: unknown, text: string): TransactionPrefill {
  const fallback = { description: text.slice(0, DESCRIPTION_MAX) };
  if (!isRecord(body) || !isRecord(body.prefill)) return fallback;
  const p = body.prefill;
  return {
    description: typeof p.description === "string" ? p.description : fallback.description,
    amount: typeof p.amount === "number" ? String(p.amount) : undefined,
    occurredAt: typeof p.occurredAt === "string" ? p.occurredAt : undefined,
    type: p.type === "income" || p.type === "expense" ? p.type : undefined,
  };
}

function toNotice(body: unknown): string {
  const message = isRecord(body) && isRecord(body.error) ? body.error.message : undefined;
  return typeof message === "string" && message ? message : NETWORK_NOTICE;
}

/**
 * Jalur teks AI di klien (design §10.4): kirim kalimat → kartu konfirmasi, atau form manual
 * berisi isian awal bila AI gagal. Tidak ada yang tersimpan tanpa tombol Simpan.
 */
export function AiCapture({ categories, wallets, today }: { categories: CategoryOption[]; wallets: WalletOption[]; today: string }) {
  const [text, setText] = useState("");
  const [pending, setPending] = useState(false);
  const [card, setCard] = useState<Card | null>(null);
  const [cardOpen, setCardOpen] = useState(false);
  const [manual, setManual] = useState<Manual | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const inFlight = useRef<AbortController | null>(null);

  useEffect(
    () => () => {
      const controller = inFlight.current;
      inFlight.current = null;
      controller?.abort();
    },
    [],
  );

  function openManual(prefill: TransactionPrefill, notice?: string) {
    setCardOpen(false);
    setManual({ prefill, notice });
    setManualOpen(true);
  }

  async function submit(input: string) {
    // Satu AbortController + timer; tanpa AbortSignal.any/timeout (tidak ada di browser lama).
    inFlight.current?.abort(); // kiriman baru membatalkan yang sebelumnya
    const controller = new AbortController();
    inFlight.current = controller;
    const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
    setPending(true);
    try {
      const res = await fetch("/api/ai/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: input }),
        credentials: "same-origin",
        signal: controller.signal,
      });
      const body: unknown = await res.json().catch(() => null);
      if (controller !== inFlight.current) return; // sudah digantikan kiriman baru
      if (res.status === 200 && isParseSuccess(body)) {
        setCard({ result: body, raw: input });
        setManualOpen(false);
        setCardOpen(true);
      } else if (res.status === 401) {
        // Sesi berakhir: navigasi penuh (design §10.4) supaya state klien dan cache router ikut dibuang.
        // eslint-disable-next-line @next/next/no-location-assign-relative-destination
        window.location.assign("/login?next=" + encodeURIComponent(window.location.pathname));
      } else {
        openManual(toPrefill(body, input), toNotice(body));
      }
    } catch {
      if (controller !== inFlight.current) return; // dibatalkan kiriman baru: abaikan
      openManual(toPrefill(null, input), NETWORK_NOTICE);
    } finally {
      clearTimeout(timer);
      if (controller === inFlight.current) {
        inFlight.current = null;
        setPending(false);
      }
    }
  }

  const closeCard = useCallback(() => setCardOpen(false), []);
  const saved = useCallback(() => {
    setCardOpen(false);
    setText("");
  }, []);
  const switchToManual = useCallback((prefill: TransactionPrefill) => {
    setCardOpen(false);
    setManual({ prefill });
    setManualOpen(true);
  }, []);

  return (
    <>
      <AiTextInput value={text} onValueChange={setText} onSubmit={submit} pending={pending} />
      <ConfirmCard
        result={card?.result ?? null}
        raw={card?.raw ?? ""}
        open={cardOpen}
        categories={categories}
        wallets={wallets}
        today={today}
        onCancel={closeCard}
        onDone={saved}
        onSwitchToManual={switchToManual}
      />
      <TransactionDialog
        prefill={manual?.prefill}
        notice={manual?.notice}
        categories={categories}
        wallets={wallets}
        today={today}
        open={manualOpen}
        onOpenChange={setManualOpen}
      />
    </>
  );
}
