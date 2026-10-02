import { config } from "dotenv";
import { defineConfig } from "prisma/config";

// Sama dengan berkas env yang dibaca Next.js saat `pnpm dev`.
config({ path: ".env.local", quiet: true });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: { path: "prisma/migrations" },
  // Migrasi butuh koneksi non-pooled (port 5432). Sengaja process.env, bukan env():
  // env() melempar error kalau variabel kosong, padahal `prisma generate`
  // (postinstall di CI & Vercel) tidak butuh URL sama sekali.
  datasource: { url: process.env.DIRECT_URL ?? "" },
});
