// Variabel publik: aman dipakai di klien maupun server.
// Ditulis eksplisit (bukan process.env[nama]) supaya Next.js bisa menanamnya saat build.
export const publicEnv = {
  supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
  supabasePublishableKey: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
};
