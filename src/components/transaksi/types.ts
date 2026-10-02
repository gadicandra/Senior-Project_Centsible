export type EntryKind = "income" | "expense";

export type TransactionRow = {
  id: string;
  type: EntryKind;
  amount: number;
  description: string;
  occurredAt: string;
  source: "text" | "voice" | "manual";
  category: { id: string; name: string; icon: string | null; color: string | null };
  wallet: { id: string; name: string };
};

export type CategoryOption = { id: string; name: string; kind: EntryKind; icon: string | null; isArchived: boolean };
export type WalletOption = { id: string; name: string; isDefault: boolean; isArchived: boolean };

export type FilterValues = {
  from?: string;
  to?: string;
  type?: EntryKind;
  categoryId?: string;
  walletId?: string;
};
