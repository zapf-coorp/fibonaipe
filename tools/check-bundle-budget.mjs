import { gzipSync } from "node:zlib";
import { fileURLToPath, pathToFileURL } from "node:url";

export function initialBytes(files) {
  const chunks = new Map(files.filter((file) => file.type === "chunk").map((file) => [file.fileName, file]));
  const pending = [...chunks.values()].filter((file) => file.isEntry).map((file) => file.fileName);
  if (!pending.length) throw new Error("No browser entry chunk in build");
  const visited = new Set();
  let bytes = 0;
  while (pending.length) {
    const name = pending.pop();
    if (visited.has(name)) continue;
    const chunk = chunks.get(name);
    if (!chunk) throw new Error(`Missing static import: ${name}`);
    visited.add(name);
    bytes += gzipSync(chunk.code).length;
    pending.push(...chunk.imports);
  }
  return bytes;
}

if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  const { build } = await import("vite");
  const result = await build({ root: fileURLToPath(new URL("../apps/web/", import.meta.url)), build: { write: false } });
  const bytes = initialBytes([result].flat().flatMap((bundle) => bundle.output));
  const limit = 150 * 1024;
  console.log(`Initial browser JavaScript: ${bytes} gzip bytes (limit ${limit})`);
  if (bytes > limit) process.exitCode = 1;
}
