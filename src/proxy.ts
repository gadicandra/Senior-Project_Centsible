import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/server/supabase/proxy";
import { isGuestOnlyPath, isPublicPath } from "@/server/supabase/routes";

export async function proxy(request: NextRequest) {
  const { response, claims } = await updateSession(request);
  const { pathname, search } = request.nextUrl;

  if (!claims && !isPublicPath(pathname)) {
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

export const config = {
  matcher: [
    // Semua path kecuali aset statis & optimasi gambar.
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
