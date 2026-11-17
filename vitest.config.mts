import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "server-only": fileURLToPath(new URL("./src/test/server-only-stub.ts", import.meta.url)),
    },
  },
  // the server runs in Europe/Berlin (Dockerfile), days are counted there
  test: { include: ["src/**/*.test.ts"], env: { TZ: "Europe/Berlin" } },
});
