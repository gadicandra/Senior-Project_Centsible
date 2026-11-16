/**
 * Satu sel CSV (RFC 4180). Sel yang diawali = + - @ tab/CR diberi awalan `'` supaya
 * Excel/Sheets tidak menjalankannya sebagai rumus (CSV injection, OWASP).
 */
export function csvCell(value: string | number): string {
  let s = String(value);
  if (typeof value === "string" && /^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\r\n]/.test(s) ? `"${s.replaceAll('"', '""')}"` : s;
}

export function csvRow(values: (string | number)[]): string {
  return values.map(csvCell).join(",");
}

/** BOM agar Excel membaca UTF-8 (emoji, huruf non-ASCII) dengan benar; CRLF sesuai RFC 4180. */
export function toCsv(header: string[], rows: (string | number)[][]): string {
  return "\uFEFF" + [header, ...rows].map(csvRow).join("\r\n") + "\r\n";
}
