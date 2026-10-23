import "server-only";
import { headers } from "next/headers";

/** Origin request saat ini (localhost, URL preview Vercel, atau domain produksi). */
export async function requestOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const proto = h.get("x-forwarded-proto") ?? (host?.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/** Hanya izinkan redirect ke path internal, supaya ?next= tidak bisa dipakai open redirect. */
export function safeNext(next: string | null | undefined, fallback = "/") {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : fallback;
}

/**
 * CSRF untuk Route Handler: Origin wajib ada dan host-nya harus sama dengan `x-forwarded-host ?? host`
 * (sama seperti cek bawaan Server Action). Hanya host yang dibandingkan, bukan protokol, supaya
 * http://192.168.x.x (HP lewat LAN) dan http://127.0.0.1 tetap jalan. Bila `Sec-Fetch-Site` ada, wajib same-origin.
 */
export function isSameOriginRequest(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin || origin === "null") return false;
  const site = request.headers.get("sec-fetch-site");
  if (site !== null && site !== "same-origin") return false;
  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    return false;
  }
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  return !!host && originHost.toLowerCase() === host.split(",")[0].trim().toLowerCase();
}
