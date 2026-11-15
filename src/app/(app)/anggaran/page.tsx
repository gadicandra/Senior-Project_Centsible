import type { Metadata } from "next";
import { BudgetsScreen } from "@/components/anggaran/budgets-screen";
import { requireClaims } from "@/server/auth/session";
import { getBudgetOverview } from "@/server/services/budgets";
import { listCategories } from "@/server/services/categories";

export const metadata: Metadata = { title: "Anggaran · Centsible" };

export default async function Page() {
  const claims = await requireClaims();
  const [overview, categories] = await Promise.all([getBudgetOverview(claims), listCategories(claims)]);
  const options = categories
    .filter((c) => c.kind === "expense" && !c.isArchived)
    .map(({ id, name, icon }) => ({ id, name, icon }));
  return <BudgetsScreen overview={overview} categories={options} />;
}
