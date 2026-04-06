import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    fileParallelism: false,
    testTimeout: 10000,
    exclude: ["dist/**", "node_modules/**"],
  },
});
