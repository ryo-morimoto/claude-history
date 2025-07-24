import { defineConfig } from "tsdown";

export default defineConfig({
  entry: "./src/cli.ts",
  format: ["esm"],
  dts: true,
  clean: true,
  platform: "node",
  target: "node18",
  external: [
    // Native modules that should not be bundled
    "better-sqlite3",
    "sqlite-vec",
  ],
  define: {
    "import.meta.vitest": "undefined",
  },
  env: {
    NODE_ENV: "production",
  },
  outDir: "dist",
  sourcemap: true,
  // Keep the shebang for CLI executable
  banner: {
    js: "#!/usr/bin/env node",
  },
});
