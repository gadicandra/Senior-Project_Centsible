import { NextResponse, type NextRequest } from "next/server";
import { safeNext } from "@/server/auth/origin";
import { createClient } from "@/server/supabase/server";

// Kembalian OAuth (Google): tukar `code` PKCE menjadi sesi.
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const next = safeNext(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }
  return NextResponse.redirect(new URL("/login?error=oauth", request.url));
}
