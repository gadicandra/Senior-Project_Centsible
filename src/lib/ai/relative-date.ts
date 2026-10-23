// Resolver tanggal relatif deterministik (design §7). Murni, tanpa I/O.
// Semua aritmetika memakai string YYYY-MM-DD dan Date UTC (teknik yang sama dengan src/lib/dates.ts),
// jadi zona waktu server tidak berpengaruh. `today` sudah dihitung di zona waktu pengguna.

export const WEEKDAYS_ID = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"] as const;

const DATE_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

function parts(date: string): [number, number, number] {
  const m = DATE_RE.exec(date);
  if (!m) throw new RangeError("Tanggal harus berformat YYYY-MM-DD");
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

function fmt(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Tanggal valid di kalender, tanpa rollover (31/04 → null). */
function makeDate(y: number, m: number, d: number): string | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const date = new Date(Date.UTC(y, m - 1, d));
  if (date.getUTCFullYear() !== y || date.getUTCMonth() !== m - 1 || date.getUTCDate() !== d) return null;
  return fmt(date);
}

/** Geser tanggal YYYY-MM-DD sebanyak `days` hari (negatif = mundur). */
export function shiftDate(date: string, days: number): string {
  const [y, m, d] = parts(date);
  return fmt(new Date(Date.UTC(y, m - 1, d + days)));
}

/** 0 = Minggu … 6 = Sabtu. */
export function weekdayIndex(date: string): number {
  const [y, m, d] = parts(date);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

export type DayRow = { date: string; weekday: (typeof WEEKDAYS_ID)[number] };

/** Hari ini dan n−1 hari sebelumnya, terbaru dulu (tabel tanggal untuk prompt). */
export function lastNDays(today: string, n: number): DayRow[] {
  return Array.from({ length: n }, (_, i) => {
    const date = shiftDate(today, -i);
    return { date, weekday: WEEKDAYS_ID[weekdayIndex(date)] };
  });
}

const WEEKDAY_INDEX: Record<string, number> = {
  senin: 1,
  selasa: 2,
  rabu: 3,
  kamis: 4,
  jumat: 5,
  "jum'at": 5,
  sabtu: 6,
};

const EXPLICIT_RE = /(?<![\d/])(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?(?![\d/])/;
const TGL_RE = /\b(?:tgl|tanggal)\.?\s*(\d{1,2})\b/;
const WEEKDAY_RE = /\b(senin|selasa|rabu|kamis|jum'?at|sabtu)\s+(?:lalu|kemarin)\b/;
const LAST_WEEK_RE = /\bminggu\s+(?:lalu|kemarin)\b/;
const DAYS_AGO_RE = /\b(\d{1,2})\s+hari\s+(?:yang\s+)?lalu\b/;
const DAY_BEFORE_YESTERDAY_RE = /\bkemarin\s+lusa\b/;
const YESTERDAY_RE = /\bkemarin\b/;
const LAST_NIGHT_RE = /\b(?:semalam|tadi\s+malam)\b/;
const TODAY_RE = /\b(?:hari\s+ini|tadi|barusan|td)\b/;
const HHMM_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function explicitDate(day: number, month: number, yearText: string | undefined, today: string): string | null {
  const [ty] = parts(today);
  if (yearText !== undefined) {
    const year = yearText.length === 2 ? 2000 + Number(yearText) : Number(yearText);
    const date = makeDate(year, month, day);
    return date !== null && date <= today ? date : null;
  }
  // Tanpa tahun: tahun ini, atau tahun lalu bila tanggalnya masih di depan.
  const thisYear = makeDate(ty, month, day);
  if (thisYear === null) return null;
  return thisYear <= today ? thisYear : makeDate(ty - 1, month, day);
}

function dayOfMonth(day: number, today: string): string | null {
  const [ty, tm, td] = parts(today);
  if (day <= td) return makeDate(ty, tm, day);
  // Bulan lalu; tidak pernah melompat ke bulan berikutnya bila harinya tidak ada.
  return tm === 1 ? makeDate(ty - 1, 12, day) : makeDate(ty, tm - 1, day);
}

/**
 * Tanggal (YYYY-MM-DD) yang disebut kalimat relatif terhadap `today`, `"ambiguous"` bila frasa
 * bermakna ganda ("minggu lalu"), atau `null` bila tidak ada frasa tanggal yang dikenali.
 * `nowLocal` (HH:mm, zona waktu pengguna) dipakai untuk "semalam"/"tadi malam".
 */
export function resolveRelativeDate(text: string, today: string, nowLocal?: string): string | null | "ambiguous" {
  parts(today);
  const t = text.normalize("NFKC").toLowerCase().replace(/[’‘`]/g, "'").replace(/\s+/g, " ");

  const explicit = EXPLICIT_RE.exec(t);
  if (explicit) return explicitDate(Number(explicit[1]), Number(explicit[2]), explicit[3], today);

  const tgl = TGL_RE.exec(t);
  if (tgl) return dayOfMonth(Number(tgl[1]), today);

  const weekday = WEEKDAY_RE.exec(t);
  if (weekday) {
    const target = WEEKDAY_INDEX[weekday[1]];
    // Kemunculan terakhir yang benar-benar lampau: "Rabu lalu" pada hari Rabu = 7 hari lalu.
    const back = (weekdayIndex(today) - target + 7) % 7 || 7;
    return shiftDate(today, -back);
  }

  if (LAST_WEEK_RE.test(t)) return "ambiguous";

  if (DAY_BEFORE_YESTERDAY_RE.test(t)) return shiftDate(today, -2);

  const ago = DAYS_AGO_RE.exec(t);
  if (ago) {
    const n = Number(ago[1]);
    return n >= 1 && n <= 31 ? shiftDate(today, -n) : null;
  }

  if (YESTERDAY_RE.test(t)) return shiftDate(today, -1);

  if (LAST_NIGHT_RE.test(t)) {
    const evening = nowLocal !== undefined && HHMM_RE.test(nowLocal) && nowLocal >= "18:00";
    return evening ? today : shiftDate(today, -1);
  }

  if (TODAY_RE.test(t)) return today;

  return null;
}
