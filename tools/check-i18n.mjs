import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const locales = ["pt-BR", "en-US", "es-ES"];
const localeDir = join(process.cwd(), "apps/web/src/client/i18n/locales");
const scanRoots = [
  join(process.cwd(), "apps/web/src/client"),
  join(process.cwd(), "apps/web/src/features"),
  join(process.cwd(), "packages/domain/src"),
  join(process.cwd(), "packages/application/src"),
];

function flatten(value, prefix, out) {
  if (typeof value === "string") {
    out[prefix] = value;
    return;
  }
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`Invalid catalog node ${prefix || "<root>"}`);
  }
  for (const [key, child] of Object.entries(value)) {
    flatten(child, prefix ? `${prefix}.${key}` : key, out);
  }
}

function loadCatalog(locale) {
  const file = join(localeDir, `${locale}.json`);
  return JSON.parse(readFileSync(file, "utf8"));
}

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
}

function referencedKeys(source) {
  const keys = [];
  const call = /\b(?:t|messageKey)\s*(?:\(\s*|:\s*)["']([^"']+)["']/g;
  for (const match of stripComments(source).matchAll(call)) {
    if (match[1]) keys.push(match[1]);
  }
  return keys;
}

function hardcodedJsx(source) {
  const findings = [];
  const text = stripComments(source);
  for (const match of text.matchAll(/>([^<>{}]*)<\//g)) {
    const node = (match[1] ?? "").trim();
    if (/[A-Za-zÀ-ÖØ-öø-ÿ]/.test(node)) findings.push(node);
  }
  for (const match of text.matchAll(/\b(?:aria-label|aria-description|placeholder|title|alt)\s*=\s*["']([^"']+)["']/g)) {
    if (match[1]) findings.push(match[1]);
  }
  return findings;
}

function walk(dir, acc) {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "node_modules" || entry === "dist" || entry === "__tests__") continue;
      walk(full, acc);
    } else if ((full.endsWith(".ts") || full.endsWith(".tsx")) && !full.endsWith(".test.ts") && !full.endsWith(".test.tsx")) {
      acc.push(full);
    }
  }
}

function checkCatalogs() {
  const problems = [];
  const flat = {};
  for (const locale of locales) {
    const file = join(localeDir, `${locale}.json`);
    if (!existsSync(file)) {
      problems.push(`missing catalog ${locale}`);
      continue;
    }
    flat[locale] = {};
    flatten(loadCatalog(locale), "", flat[locale]);
    for (const [key, value] of Object.entries(flat[locale])) {
      if (value.trim() === "") problems.push(`empty key ${key} in ${locale}`);
    }
  }
  const pt = flat["pt-BR"];
  if (!pt) return { problems, keys: new Set() };
  const ptKeys = Object.keys(pt).sort();
  for (const locale of ["en-US", "es-ES"]) {
    const other = flat[locale];
    if (!other) continue;
    const keys = Object.keys(other).sort();
    if (keys.join("\n") !== ptKeys.join("\n")) problems.push(`key parity mismatch ${locale}`);
  }
  return { problems, keys: new Set(ptKeys) };
}

function checkSources(keys) {
  const problems = [];
  const files = [];
  for (const root of scanRoots) walk(root, files);
  const combined = [];
  for (const file of files) {
    const source = readFileSync(file, "utf8");
    combined.push(source);
    for (const key of referencedKeys(source)) {
      if (!keys.has(key)) problems.push(`missing-key ${key} in ${file}`);
    }
    if (file.endsWith(".tsx")) {
      for (const text of hardcodedJsx(source)) {
        problems.push(`hardcoded jsx "${text}" in ${file}`);
      }
    }
  }
  const haystack = combined.join("\n");
  for (const key of keys) {
    if (!haystack.includes(`"${key}"`) && !haystack.includes(`'${key}'`)) {
      problems.push(`orphan key ${key}`);
    }
  }
  return problems;
}

function selfTest() {
  const keys = new Set(["app.title"]);
  const source = `export function Bad(){ return <button aria-label="Save now">Save now</button>; }\nexport const label = t("app.missing");\n`;
  const missing = referencedKeys(source).filter((key) => !keys.has(key));
  const hardcoded = hardcodedJsx(source);
  if (missing.length === 0 || hardcoded.length === 0) {
    console.error("self-test failed to catch missing-key or hardcoded jsx");
    process.exit(1);
  }
  console.log(`self-test caught missing-key ${missing.join(",")}`);
  console.log(`self-test caught hardcoded jsx ${hardcoded.join(",")}`);
  process.exit(0);
}

const isCli = process.argv[1] && process.argv[1].endsWith("check-i18n.mjs");
if (isCli) {
  if (process.argv.includes("--self-test")) selfTest();
  const web = join(process.cwd(), "apps/web");
  if (!existsSync(web)) {
    console.log("i18n check skipped: apps/web is not created yet");
    process.exit(0);
  }
  const { problems, keys } = checkCatalogs();
  problems.push(...checkSources(keys));
  if (problems.length > 0) {
    console.error(problems.join("\n"));
    process.exit(1);
  }
  console.log("i18n check ok");
}
