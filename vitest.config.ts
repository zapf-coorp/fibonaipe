import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const root = dirname(fileURLToPath(import.meta.url));

const missingShell = [
  ["apps/web/src/client/i18n/index.ts", "apps/web/test/support/missing-i18n.ts"],
  ["apps/web/src/client/providers/theme-provider.tsx", "apps/web/test/support/missing-theme.ts"],
  ["apps/web/src/client/providers/live-announcer.tsx", "apps/web/test/support/missing-live-announcer.ts"],
  ["apps/web/src/client/main.tsx", "apps/web/test/support/missing-main.ts"],
  ["apps/web/src/server/app.ts", "apps/web/test/support/missing-server.ts"],
  ["apps/web/src/server/composition.ts", "apps/web/test/support/missing-server.ts"],
] as const;

function importerDir(importer: string): string {
  return importer.startsWith("file:") ? dirname(fileURLToPath(importer)) : dirname(importer);
}

function missingShellPlugin() {
  return {
    name: "fibonaipe-missing-shell",
    enforce: "pre" as const,
    resolveId(source: string, importer: string | undefined) {
      if (!importer || source.charCodeAt(0) === 0) return null;
      const bare = source.split("?")[0] ?? source;
      if (!bare.startsWith(".") && !bare.includes("apps/web/src")) return null;
      const absolute = (bare.startsWith(".") ? resolve(importerDir(importer), bare) : bare).replaceAll("\\", "/");
      if (absolute.includes("/packages/")) return null;
      for (const [target, stub] of missingShell) {
        if (!absolute.endsWith(target)) continue;
        if (existsSync(resolve(root, target))) return null;
        return resolve(root, stub);
      }
      return null;
    },
  };
}

export default defineConfig({
  plugins: [missingShellPlugin()],
  test: {
    include: ["packages/**/*.test.ts", "tools/**/*.test.ts", "apps/**/*.test.ts", "apps/**/*.test.tsx"],
    coverage: {
      provider: "v8",
      include: ["packages/domain/src/**/*.ts"],
      exclude: ["**/*.test.ts", "**/__tests__/**"],
      thresholds: {
        lines: 90,
        statements: 90,
        functions: 90,
        branches: 75,
      },
    },
  },
});
