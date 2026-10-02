import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "@/server/supabase/server";
import type { JwtClaims } from "@/server/db/with-rls";

/** Klaim JWT pengguna yang sudah diverifikasi tanda tangannya, atau null. */
export async function getClaims(): Promise<JwtClaims | null> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  return claims?.sub ? (claims as JwtClaims) : null;
}

/**
 * Wajib dipanggil di setiap Server Action, Route Handler, dan page yang
 * melayani pengguna — jangan hanya mengandalkan proxy (arsitektur §8.1).
 */
export async function requireClaims(): Promise<JwtClaims> {
  const claims = await getClaims();
  if (!claims) redirect("/login");
  return claims;
}
