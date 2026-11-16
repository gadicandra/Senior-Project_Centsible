// Daftar path yang boleh diakses tanpa login. Dipakai src/proxy.ts.
// /api/cron/: dipanggil Vercel Cron tanpa sesi; route-nya sendiri mewajibkan CRON_SECRET.
const PUBLIC_PREFIXES = ["/login", "/register", "/reset-password", "/auth/", "/api/health", "/api/cron/"];
// Halaman yang tidak relevan bagi pengguna yang sudah login.
const GUEST_ONLY = ["/login", "/register", "/reset-password"];

export function isPublicPath(pathname: string) {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p.endsWith("/") ? p : `${p}/`));
}

export function isGuestOnlyPath(pathname: string) {
  return GUEST_ONLY.includes(pathname);
}
/** Route Handler di bawah /api: tanpa sesi dijawab JSON 401, bukan redirect ke /login. */
export function isApiPath(pathname: string) {
  return pathname === "/api" || pathname.startsWith("/api/");
}
