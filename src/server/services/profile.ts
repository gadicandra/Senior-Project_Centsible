import "server-only";
import { withRls, type JwtClaims } from "@/server/db/with-rls";

export type Profile = { id: string; email: string | null; fullName: string | null; timezone: string };

export async function getProfile(claims: JwtClaims): Promise<Profile | null> {
  const user = await withRls(claims, (tx) =>
    tx.user.findUnique({
      where: { id: claims.sub },
      select: { id: true, email: true, fullName: true, timezone: true },
    }),
  );
  return user;
}

/** Zona waktu pengguna, dipakai untuk "hari ini" (validasi tanggal & filter bawaan). */
export async function getTimezone(claims: JwtClaims): Promise<string> {
  return (await getProfile(claims))?.timezone ?? "Asia/Jakarta";
}
