import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["domains/**/__tests__/**/*.test.ts", "platform/**/__tests__/**/*.test.ts", "tests/**/*.test.ts"],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Concurrency tests spin up real overlapping transactions against Postgres;
    // running test files in sequence keeps them from fighting over the same test DB.
    fileParallelism: false,
    setupFiles: ["./tests/setup.ts"],
  },
  resolve: {
    alias: {
      "@/domains": path.resolve(__dirname, "domains"),
      "@/platform": path.resolve(__dirname, "platform"),
      "@/providers": path.resolve(__dirname, "providers"),
      "@/packages": path.resolve(__dirname, "packages"),
      "@/tests": path.resolve(__dirname, "tests"),
    },
  },
});
