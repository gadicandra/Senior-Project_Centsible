import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/server/supabase/proxy";
import { isApiPath, isGuestOnlyPath, isPublicPath } from "@/server/supabase/routes";

export async function proxy(request: NextRequest) {
  const { response, claims } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  if (!claims && !isPublicPath(pathname)) {
    // fetch() akan diam-diam mengikuti redirect dan menerima HTML; API dijawab JSON 401.
    // Route Handler tetap memanggil getClaims() sendiri (arsitektur §8.1).
    if (isApiPath(pathname)) return unauthorizedKeepingCookies(response);
    const url = new URL("/login", request.url);
    if (pathname !== "/") url.searchParams.set("next", pathname + search);
    return redirectKeepingCookies(url, response);
  }
  if (claims && isGuestOnlyPath(pathname)) {
    return redirectKeepingCookies(new URL("/", request.url), response);
  }
  return response;
}

// Cookie sesi yang baru disegarkan harus ikut terbawa, kalau tidak sesi bisa putus.
function redirectKeepingCookies(url: URL, from: NextResponse) {
  const redirect = NextResponse.redirect(url);
  from.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

function unauthorizedKeepingCookies(from: NextResponse) {
  const res = NextResponse.json(
    { ok: false, error: { code: "unauthorized", message: "Sesi berakhir. Silakan masuk lagi." } },
    { status: 401, headers: { "Cache-Control": "no-store" } },
  );
  from.cookies.getAll().forEach((cookie) => res.cookies.set(cookie));
  return res;
}

export const config = {
  matcher: [
    // Semua path kecuali aset statis & optimasi gambar.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
