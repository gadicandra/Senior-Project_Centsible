import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { defineConfig } from "vitest/config";

// Uji integrasi ke project Supabase dev sungguhan. Hanya dijalankan manual
// (`pnpm test:db`), tidak di CI, karena butuh DATABASE_URL & SUPABASE_SECRET_KEY.
config({ path: ".env.local", quiet: true });

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: {
      "server-only": fileURLToPath(new URL("./node_modules/server-only/empty.js", import.meta.url)),
    },
  },
  test: {
    environment: "node",
    include: ["tests/db/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    fileParallelism: false,
  },
});
