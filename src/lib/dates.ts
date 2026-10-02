/** Tanggal hari ini (YYYY-MM-DD) di zona waktu tertentu, bukan zona waktu server. */
export function todayIn(timeZone: string, now: Date = new Date()): string {
  // en-CA memformat tanggal sebagai YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}

/** YYYY-MM-DD → Date UTC tengah malam (kolom `date` di Postgres tidak punya jam). */
export function dateOnlyToDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

export function dateToDateOnly(date: Date): string {
  return date.toISOString().slice(0, 10);
}

const longDate = new Intl.DateTimeFormat("id-ID", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });

export function formatDateOnly(value: string): string {
  return longDate.format(dateOnlyToDate(value));
}

/** Rentang bulan berjalan (YYYY-MM-DD) relatif terhadap `today`. */
export function monthRange(today: string): { from: string; to: string } {
  const [y, m] = today.split("-").map(Number);
  const last = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const mm = String(m).padStart(2, "0");
  return { from: `${y}-${mm}-01`, to: `${y}-${mm}-${String(last).padStart(2, "0")}` };
}
