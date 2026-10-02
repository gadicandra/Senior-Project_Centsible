import type { Metadata } from "next";
import { LoginScreen } from "@/components/auth/login-screen";

export const metadata: Metadata = { title: "Masuk · Centsible" };

export default async function Page({ searchParams }: PageProps<"/login">) {
  const { next, error, deleted } = await searchParams;
  return (
    <LoginScreen
      next={typeof next === "string" ? next : undefined}
      error={typeof error === "string" ? error : undefined}
      deleted={deleted === "1"}
    />
  );
}
