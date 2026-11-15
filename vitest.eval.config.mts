import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { defineConfig } from "vitest/config";

// `pnpm eval:ai` (#29): memanggil penyedia AI sungguhan dari .env.local. Manual, tidak di CI.
config({ path: ".env.local", quiet: true });

export default defineConfig({
  resolve: {
    tsconfigPaths: true,
    alias: { "server-only": fileURLToPath(new URL("./node_modules/server-only/empty.js", import.meta.url)) },
  },
  test: { environment: "node", include: ["eval/**/*.eval.ts"], testTimeout: 30 * 60_000 },
});
