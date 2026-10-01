import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  // Component tests render TSX with React 19's automatic JSX runtime.
  esbuild: { jsx: "automatic" },
  test: {
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"],
    coverage: {
      provider: "v8",
      include: ["src/lib/**/*.ts"],
      exclude: ["src/lib/**/*.test.ts"],
      thresholds: { lines: 80, functions: 80, branches: 80, statements: 80 },
    },
  },
});
