import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    coverage: {
      provider: "v8",
      reporter: ["text", "json", "html", "lcov"],
      exclude: [
        "coverage/**",
        "dist/**",
        "**/[.]**",
        "packages/*/test?(s)/**",
        "**/*.d.ts",
        "**/*{.,-}test.ts",
        "**/*{.,-}spec.ts",
        "**/*{.,-}config.{js,ts}",
        "**/vitest.config.*",
        "**/tsconfig.json",
        "**/{bin,cli.ts}",
        "**/node_modules/**",
      ],
      thresholds: {
        branches: 80,
        functions: 80,
        lines: 80,
        statements: 80,
      },
    },
    include: ["src/**/*.{test,spec}.ts"],
    exclude: ["node_modules", "dist", "coverage"],
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
