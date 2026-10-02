const rupiah = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });

export function formatRupiah(amount: number) {
  return rupiah.format(amount);
}

/** "1.500.000", "1500000", "Rp 1.500.000" → 1500000. Mengembalikan NaN bila tidak valid. */
export function parseRupiah(input: string): number {
  const cleaned = input.replace(/rp/i, "").replace(/[\s.]/g, "").replace(",", ".");
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return Number.NaN;
  return Math.round(Number(cleaned));
}
