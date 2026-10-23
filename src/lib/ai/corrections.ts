import type { ENTRY_KINDS } from "@/lib/schemas/settings";

// Aturan selisih koreksi (design §11): hanya isian yang benar-benar diubah pengguna di kartu
// konfirmasi yang masuk ke ai_extractions.user_corrections. `confidence` tidak pernah dibandingkan.

export type CorrectionSide = {
  amount: number;
  type: (typeof ENTRY_KINDS)[number];
  category: string;
  categoryId: string | null;
  wallet: string;
  walletId: string;
  description: string;
  occurred_at: string;
};

export type Correction = { from: string | number; to: string | number };

/** Urutan kunci tetap: amount, type, category, wallet, description, occurred_at. */
export function diffCorrections(proposal: CorrectionSide, final: CorrectionSide): Record<string, Correction> {
  const out: Record<string, Correction> = {};
  if (proposal.amount !== final.amount) out.amount = { from: proposal.amount, to: final.amount };
  if (proposal.type !== final.type) out.type = { from: proposal.type, to: final.type };
  // Dibandingkan per ID karena "Lain-lain" ada di dua jenis; usulan tanpa ID selalu dihitung berubah.
  if (proposal.categoryId === null || proposal.categoryId !== final.categoryId) {
    out.category = { from: proposal.category, to: final.category };
  }
  if (proposal.walletId !== final.walletId) out.wallet = { from: proposal.wallet, to: final.wallet };
  const fromDescription = proposal.description.trim();
  const toDescription = final.description.trim();
  if (fromDescription !== toDescription) out.description = { from: fromDescription, to: toDescription };
  if (proposal.occurred_at !== final.occurred_at) out.occurred_at = { from: proposal.occurred_at, to: final.occurred_at };
  return out;
}
