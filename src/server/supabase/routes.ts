// Daftar path yang boleh diakses tanpa login. Dipakai src/proxy.ts.
const PUBLIC_PREFIXES = ["/login", "/register", "/reset-password", "/auth/", "/api/health"];
// Halaman yang tidak relevan bagi pengguna yang sudah login.
const GUEST_ONLY = ["/login", "/register", "/reset-password"];

export function isPublicPath(pathname: string) {
  return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p.endsWith("/") ? p : `${p}/`));
}

export function isGuestOnlyPath(pathname: string) {
  return GUEST_ONLY.includes(pathname);
}
