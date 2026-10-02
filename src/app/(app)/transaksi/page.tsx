import type { Metadata } from "next";
import { TransactionsScreen } from "@/components/transaksi/transactions-screen";
import { todayIn } from "@/lib/dates";
import { transactionFilterSchema } from "@/lib/schemas/transaction";
import { requireClaims } from "@/server/auth/session";
import { listCategories } from "@/server/services/categories";
import { getTimezone } from "@/server/services/profile";
import { listTransactions } from "@/server/services/transactions";
import { listWallets } from "@/server/services/wallets";

export const metadata: Metadata = { title: "Transaksi · Centsible" };

export default async function Page({ searchParams }: PageProps<"/transaksi">) {
  const claims = await requireClaims();
  const raw = await searchParams;
  const filter = transactionFilterSchema.parse(raw);
  const [result, categories, wallets, timezone] = await Promise.all([
    listTransactions(claims, filter),
    listCategories(claims),
    listWallets(claims),
    getTimezone(claims),
  ]);
  const query = new URLSearchParams(
    Object.entries(raw).flatMap(([k, v]) => (typeof v === "string" ? [[k, v]] : [])),
  ).toString();

  return (
    <TransactionsScreen
      {...result}
      filters={{ from: filter.from, to: filter.to, type: filter.type, categoryId: filter.categoryId, walletId: filter.walletId }}
      categories={categories}
      wallets={wallets}
      today={todayIn(timezone)}
      query={query}
    />
  );
}
