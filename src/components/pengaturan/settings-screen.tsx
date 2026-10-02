import { CategoryList } from "./category-list";
import type { CategoryRow, WalletRow } from "./types";
import { WalletList } from "./wallet-list";

export function SettingsScreen({ wallets, categories }: { wallets: WalletRow[]; categories: CategoryRow[] }) {
  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Pengaturan</h1>
        <p className="text-sm text-muted-foreground">
          Kategori dan dompet yang sudah punya transaksi diarsipkan, bukan dihapus, supaya riwayat tetap utuh.
        </p>
      </div>
      <WalletList wallets={wallets} />
      <CategoryList categories={categories} />
    </div>
  );
}
