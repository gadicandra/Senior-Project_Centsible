// Batas bersama jalur AI (aman dipakai di klien maupun server).

/** Panjang maksimum kalimat yang diterima API (setelah normalisasi). */
export const AI_TEXT_MAX_CHARS = 500;
/** `maxLength` input di UI (arsitektur §8.1). */
export const AI_TEXT_UI_MAX_CHARS = 300;
/** Batas ukuran body POST /api/ai/parse. */
export const AI_BODY_MAX_BYTES = 4096;
/** Anggaran waktu total panggilan AI per parse. */
export const AI_DEADLINE_MS = 8000;
/** Di bawah nilai ini setiap field diberi tanda "Periksa". */
export const LOW_CONFIDENCE = 0.6;
/** Di bawah nilai ini kalimat dianggap bukan transaksi. */
export const NOT_UNDERSTOOD_CONFIDENCE = 0.2;
/** Nominal di atas ini diberi tanda "large". */
export const PLAUSIBLE_MAX_AMOUNT = 100_000_000;
/** Umur draft token (detik). */
export const DRAFT_TTL_SECONDS = 1800;
/** Sama dengan CHECK `ai_extractions_model_chk`. */
export const MODEL_VERSION_MAX = 120;
/** Sama dengan CHECK deskripsi `transactions` dan `transactionSchema`. */
export const DESCRIPTION_MAX = 200;
/** Panjang minimum AI_DRAFT_SECRET. */
export const DRAFT_SECRET_MIN = 32;
/** Batas waktu fetch di klien sebelum jatuh ke form manual. */
export const CLIENT_TIMEOUT_MS = 12_000;
