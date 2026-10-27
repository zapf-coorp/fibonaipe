import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "../../../..");

export function readSource(relativePath: string): string {
  const absolute = join(repoRoot, relativePath);
  if (!existsSync(absolute)) {
    throw new Error(`Missing implementation: ${relativePath}`);
  }
  return readFileSync(absolute, "utf8");
}

export function readJson(relativePath: string): unknown {
  return JSON.parse(readSource(relativePath)) as unknown;
}

export function collectCss(relativeDir: string): string {
  const absolute = join(repoRoot, relativeDir);
  if (!existsSync(absolute)) {
    throw new Error(`Missing implementation: ${relativeDir}`);
  }
  const parts: string[] = [];
  const stack = [absolute];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) continue;
    for (const entry of readdirSync(current)) {
      const next = join(current, entry);
      if (statSync(next).isDirectory()) stack.push(next);
      else if (entry.endsWith(".css")) parts.push(readFileSync(next, "utf8"));
    }
  }
  if (parts.length === 0) {
    throw new Error(`Missing implementation: ${relativeDir}/**/*.css`);
  }
  return parts.join("\n");
}
