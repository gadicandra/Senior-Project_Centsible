import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  resolve: {
    tsconfigPaths: true,
    alias: {
      // server-only melempar error di luar kondisi "react-server"; di test kita memang memanggil modul server langsung.
      "server-only": fileURLToPath(new URL("./node_modules/server-only/empty.js", import.meta.url)),
    },
  },
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{ts,tsx}"],
    // `pnpm test:coverage` (dijalankan CI, Issue #35). Batas = cakupan saat ini dibulatkan ke bawah, supaya CI
    // gagal kalau cakupan turun. Naikkan pelan-pelan saat tes bertambah, bukan sebaliknya.
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: ["src/generated/**", "src/components/ui/**", "**/*.test.{ts,tsx}"],
      reporter: ["text-summary", "html"],
      thresholds: { lines: 75, statements: 75, branches: 68, functions: 65 },
    },
  },
});
