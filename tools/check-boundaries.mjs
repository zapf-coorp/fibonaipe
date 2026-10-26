import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const NATIVE = ["better-sqlite3", "bcrypt", "sharp", "canvas", "sqlite3", "node-gyp"];
const COPYLEFT = /GPL|AGPL|LGPL/i;

export function scanSourceForViolations(content, layer) {
  const violations = [];
  const stripped = content
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
  const imports = [
    ...stripped.matchAll(/from\s+["']([^"']+)["']/g),
    ...stripped.matchAll(/import\(\s*["']([^"']+)["']\s*\)/g),
  ].map((match) => match[1]);

  for (const specifier of imports) {
    if (layer === "domain" && !specifier.startsWith(".")) {
      violations.push(`DOMAIN_IMPORT ${specifier}`);
    }
    if (layer === "application") {
      if (specifier.startsWith("@fibonaipe/adapter-") || specifier.startsWith("node:")) {
        violations.push(`APPLICATION_IMPORT ${specifier}`);
      }
      if (!specifier.startsWith(".") && specifier !== "@fibonaipe/domain" && !specifier.startsWith("@fibonaipe/domain/")) {
        violations.push(`APPLICATION_IMPORT ${specifier}`);
      }
    }
    if (layer === "adapter" && specifier.startsWith("@fibonaipe/adapter-")) {
      violations.push(`ADAPTER_IMPORT ${specifier}`);
    }
  }

  if (layer === "domain" || layer === "application") {
    if (stripped.includes("Date.now(")) violations.push("DATE_NOW");
    if (/new\s+Date\s*\(/.test(stripped)) violations.push("NEW_DATE");
    if (stripped.includes("Math.random(")) violations.push("MATH_RANDOM");
    if (stripped.includes("process.env")) violations.push("PROCESS_ENV");
  }
  return violations;
}

export function verifyLicenseText(lockText) {
  const violations = [];
  for (const name of NATIVE) {
    if (lockText.includes(`node_modules/${name}`) || lockText.includes(`"${name}"`)) {
      violations.push(`NATIVE ${name}`);
    }
  }
  if (COPYLEFT.test(lockText)) violations.push("COPYLEFT");
  return violations;
}

function walk(dir, acc) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === "dist" || entry === "__tests__") continue;
      walk(full, acc);
    } else if (full.endsWith(".ts") || full.endsWith(".tsx")) {
      if (full.endsWith(".test.ts")) continue;
      acc.push(full);
    }
  }
}

function layerOf(file, root) {
  const rel = relative(root, file).replaceAll("\\", "/");
  if (rel.startsWith("packages/domain/")) return "domain";
  if (rel.startsWith("packages/application/")) return "application";
  if (rel.includes("/adapter-") || rel.startsWith("packages/adapter-")) return "adapter";
  return null;
}

export function verifyWorkspaceBoundaries(rootDir) {
  const violations = [];
  if (!existsSync(join(rootDir, "package-lock.json"))) violations.push("MISSING_LOCKFILE");
  if (existsSync(join(rootDir, "pnpm-lock.yaml"))) violations.push("PNPM_LOCK");
  if (existsSync(join(rootDir, "yarn.lock"))) violations.push("YARN_LOCK");

  const lockPath = join(rootDir, "package-lock.json");
  if (existsSync(lockPath)) {
    violations.push(...verifyLicenseText(readFileSync(lockPath, "utf8")).filter((item) => item.startsWith("NATIVE")));
  }

  const domainPkg = JSON.parse(readFileSync(join(rootDir, "packages/domain/package.json"), "utf8"));
  if (Object.keys(domainPkg.dependencies ?? {}).length !== 0) violations.push("DOMAIN_RUNTIME_DEP");
  const appPkg = JSON.parse(readFileSync(join(rootDir, "packages/application/package.json"), "utf8"));
  const appDeps = Object.keys(appPkg.dependencies ?? {});
  if (appDeps.some((name) => name !== "@fibonaipe/domain")) violations.push("APPLICATION_DEPS");

  const files = [];
  walk(join(rootDir, "packages"), files);
  walk(join(rootDir, "apps"), files);
  for (const file of files) {
    const layer = layerOf(file, rootDir);
    if (!layer) continue;
    const found = scanSourceForViolations(readFileSync(file, "utf8"), layer);
    for (const item of found) violations.push(`${file}: ${item}`);
  }

  const fixtureDir = join(rootDir, "tools/boundary-fixtures");
  const expected = [
    ["domain-imports-adapter/bad.ts", "domain"],
    ["adapter-imports-adapter/bad.ts", "adapter"],
    ["domain-impure-date/bad.ts", "domain"],
  ];
  for (const [rel, layer] of expected) {
    const found = scanSourceForViolations(readFileSync(join(fixtureDir, rel), "utf8"), layer);
    if (found.length === 0) violations.push(`BOUNDARY_SELF_TEST_FAILED ${rel}`);
  }
  const runtimeDep = readFileSync(join(fixtureDir, "domain-runtime-dep/package.json"), "utf8");
  const parsed = JSON.parse(runtimeDep);
  if (Object.keys(parsed.dependencies ?? {}).length === 0) {
    violations.push("BOUNDARY_SELF_TEST_FAILED domain-runtime-dep");
  }
  return violations;
}

const isCli = process.argv[1] && process.argv[1].endsWith("check-boundaries.mjs");
if (isCli) {
  const violations = verifyWorkspaceBoundaries(process.cwd());
  if (violations.length > 0) {
    console.error(violations.join("\n"));
    process.exit(1);
  }
  console.log("[check:boundaries] OK — verified workspace manifests, source files, and negative fixtures");
}
