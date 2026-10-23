// Ekstraktor nominal deterministik (design §6). Murni, tanpa I/O.
// Dipakai server untuk memeriksa silang angka dari AI dan untuk prefill form manual.

export type AmountExtraction = {
  candidates: number[];
  ambiguous: { token: string; options: number[] }[];
};

const MAX_AMOUNT = 1_000_000_000_000;

const SLANG: Record<string, number> = {
  gopek: 500,
  seceng: 1_000,
  ceceng: 1_000,
  goceng: 5_000,
  ceban: 10_000,
  gocap: 50_000,
};
/** Slang yang artinya bisa dua: Rp100 atau Rp100.000. */
const AMBIGUOUS_SLANG: Record<string, number[]> = { cepek: [100, 100_000] };

const NUMBER_WORDS: Record<string, number> = {
  se: 1,
  satu: 1,
  dua: 2,
  tiga: 3,
  empat: 4,
  lima: 5,
  enam: 6,
  tujuh: 7,
  delapan: 8,
  sembilan: 9,
};

const SLANG_WORDS = [...Object.keys(SLANG), ...Object.keys(AMBIGUOUS_SLANG)].join("|");
const NUMBER_WORD_ALT = Object.keys(NUMBER_WORDS)
  .sort((a, b) => b.length - a.length)
  .join("|");
// Pengali opsional: "2 ceban", "2ceban", "dua ceban", "seceban". Tanpa pengali butuh batas kata
// di depan, jadi "gocapan" atau "xgocap" tidak cocok.
const SLANG_RE = new RegExp(
  `(?:(?<![\\d.,])([1-9]\\d?)\\s*|\\b(se)|\\b(${NUMBER_WORD_ALT})\\s+|\\b)(${SLANG_WORDS})\\b`,
  "g",
);
// "25rb", "1,5jt", "1.500rb", "2.5k".
const SUFFIX_RE = /(?<![\d.,])(\d+)(?:[.,](\d{1,3}))?\s*(rb|ribu|k|jt|juta)\b/g;
// "Rp25.000", "25.000", "25000".
const PLAIN_RE = /(?<![\d.,\w])(rp\.?\s*)?(\d{1,3}(?:\.\d{3})+|\d+)(?![\d\w])/g;
// Tanggal dan jam bukan nominal: "23/09/2026", "07:30".
const NOT_AMOUNT_RE = /\b\d{1,2}[/-]\d{1,2}(?:[/-]\d{2,4})?\b|\b\d{1,2}:\d{2}\b/g;

const valid = (n: number) => Number.isFinite(n) && n > 0 && n <= MAX_AMOUNT;
const blank = (s: string) => " ".repeat(s.length);

export function extractAmounts(text: string): AmountExtraction {
  let work = text.normalize("NFKC").toLowerCase();
  const found: { index: number; values: number[]; ambiguous?: string }[] = [];

  work = work.replace(NOT_AMOUNT_RE, blank);

  work = work.replace(SLANG_RE, (match, digits: string | undefined, se, word, slang: string, index: number) => {
    const multiplier = digits ? Number(digits) : se ? 1 : word ? NUMBER_WORDS[word] : 1;
    const options = AMBIGUOUS_SLANG[slang];
    if (options) found.push({ index, values: options.map((o) => o * multiplier), ambiguous: match.trim() });
    else found.push({ index, values: [SLANG[slang] * multiplier] });
    return blank(match);
  });

  work = work.replace(SUFFIX_RE, (match, whole: string, frac: string | undefined, unit: string, index: number) => {
    // 1–2 digit setelah pemisah = desimal; tepat 3 digit = pemisah ribuan.
    const base = frac === undefined ? Number(whole) : frac.length === 3 ? Number(whole + frac) : Number(`${whole}.${frac}`);
    const factor = unit === "jt" || unit === "juta" ? 1_000_000 : 1_000;
    found.push({ index, values: [Math.round(base * factor)] });
    return blank(match);
  });

  work.replace(PLAIN_RE, (match, rp: string | undefined, digits: string, index: number) => {
    const value = Number(digits.replace(/\./g, ""));
    // Bilangan kecil tanpa satuan biasanya hitungan ("2 kali", "jam 7").
    if (rp || value >= 100) found.push({ index, values: [value] });
    return match;
  });

  found.sort((a, b) => a.index - b.index);
  const candidates: number[] = [];
  const ambiguous: AmountExtraction["ambiguous"] = [];
  for (const f of found) {
    const values = f.values.filter(valid);
    if (values.length === 0) continue;
    for (const v of values) if (!candidates.includes(v)) candidates.push(v);
    if (f.ambiguous !== undefined) ambiguous.push({ token: f.ambiguous, options: values });
  }
  return { candidates, ambiguous };
}
