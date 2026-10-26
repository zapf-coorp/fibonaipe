import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { verifyLicenseText } from "./check-boundaries.mjs";

export function verifyLicenses(lockText) {
  const violations = verifyLicenseText(lockText);
  return { ok: violations.length === 0, violations };
}

const isCli = process.argv[1] && process.argv[1].endsWith("check-licenses.mjs");
if (isCli) {
  const lockPath = join(process.cwd(), "package-lock.json");
  if (!existsSync(lockPath)) {
    console.error("MISSING_LOCKFILE");
    process.exit(1);
  }
  const result = verifyLicenses(readFileSync(lockPath, "utf8"));
  if (!result.ok) {
    console.error(result.violations.join("\n"));
    process.exit(1);
  }
  console.log("licenses ok");
}
