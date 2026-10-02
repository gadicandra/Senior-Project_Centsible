import { createClient } from "@supabase/supabase-js";
import type { JwtClaims } from "@/server/db/with-rls";

export function adminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) throw new Error("NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SECRET_KEY wajib ada di .env.local");
  return createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false } });
}

/** Membuat akun uji lewat Admin API; trigger pendaftaran membuat profil + data bawaan. */
export async function createTestUser(label: string) {
  const email = `centsible-test-${label}-${crypto.randomUUID()}@example.com`;
  const { data, error } = await adminClient().auth.admin.createUser({
    email,
    password: crypto.randomUUID(),
    email_confirm: true,
  });
  if (error || !data.user) throw error ?? new Error("createUser gagal");
  const claims: JwtClaims = { sub: data.user.id, role: "authenticated", email };
  return { id: data.user.id, email, claims };
}

export async function deleteTestUser(id: string) {
  await adminClient().auth.admin.deleteUser(id);
}
