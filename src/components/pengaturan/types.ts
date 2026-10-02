// Bentuk data yang dikirim page.tsx ke komponen pengaturan (sudah tanpa BigInt).
export type WalletRow = {
  id: string;
  name: string;
  type: "cash" | "bank" | "ewallet";
  initialBalance: number;
  balance: number;
  transactionCount: number;
  isDefault: boolean;
  isArchived: boolean;
};

export type CategoryRow = {
  id: string;
  name: string;
  kind: "income" | "expense";
  icon: string | null;
  color: string | null;
  isSystem: boolean;
  isArchived: boolean;
  transactionCount: number;
};
