/**
 * Antrean transaksi offline (FR 16, arsitektur §7.4). Isinya nilai form apa adanya + `clientId`
 * (kunci idempoten di `transactions.client_id`), divalidasi ulang di /api/sync.
 * ponytail: localStorage, bukan IndexedDB — cukup untuk puluhan transaksi dan sinkron.
 * Pindah ke IndexedDB bila antrean perlu dibaca Service Worker (Background Sync).
 */
export type OutboxItem = { clientId: string; values: Record<string, string>; queuedAt: string };

export const OUTBOX_EVENT = "centsible:outbox";
const key = (userId: string) => `centsible:outbox:${userId}`;

export function readOutbox(userId: string): OutboxItem[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(key(userId)) ?? "[]");
    return Array.isArray(parsed) ? (parsed as OutboxItem[]) : [];
  } catch {
    return [];
  }
}

function write(userId: string, items: OutboxItem[]) {
  // Tidak ditangkap: kalau penyimpanan gagal, pemanggil harus tahu data belum tersimpan.
  if (items.length) localStorage.setItem(key(userId), JSON.stringify(items));
  else localStorage.removeItem(key(userId));
  window.dispatchEvent(new Event(OUTBOX_EVENT));
}

export function enqueue(userId: string, values: Record<string, string>): OutboxItem {
  const item = { clientId: crypto.randomUUID(), values, queuedAt: new Date().toISOString() };
  write(userId, [...readOutbox(userId), item]);
  return item;
}

export function removeFromOutbox(userId: string, clientIds: string[]) {
  const done = new Set(clientIds);
  write(userId, readOutbox(userId).filter((i) => !done.has(i.clientId)));
}
