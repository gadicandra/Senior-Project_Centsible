import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";

/**
 * Menyegarkan token sesi Supabase di setiap request (pola resmi @supabase/ssr).
 * Mengembalikan response yang cookie-nya sudah sinkron, plus klaim JWT bila login.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(publicEnv.supabaseUrl, publicEnv.supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
        Object.entries(headers).forEach(([key, value]) => response.headers.set(key, value));
      },
    },
  });

  // Jangan menaruh kode apa pun di antara createServerClient dan getClaims():
  // getClaims() yang memicu refresh token dan menulis cookie baru.
  const { data } = await supabase.auth.getClaims();

  return { response, claims: data?.claims ?? null };
}
