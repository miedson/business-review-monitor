import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    include: ["**/*.test.ts"],
    fileParallelism: false,
    globals: false,
    passWithNoTests: true,
    setupFiles: [new URL("./vitest.setup.ts", import.meta.url).pathname],
  },
});
