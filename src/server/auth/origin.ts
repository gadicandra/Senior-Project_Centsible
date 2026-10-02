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
