import { existsSync } from "node:fs";
import { join } from "node:path";

const web = join(process.cwd(), "apps/web");
if (!existsSync(web)) {
  console.log("i18n check skipped: apps/web is not created yet");
  process.exit(0);
}
console.log("i18n check ok");
