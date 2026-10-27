const prefix = "__fibonaipeMissing_";

export function markMissing(flag: "announcer" | "main"): void {
  (globalThis as Record<string, boolean>)[`${prefix}${flag}`] = true;
}

export function takeMissing(flag: "announcer" | "main"): boolean {
  const holder = globalThis as Record<string, boolean | undefined>;
  const key = `${prefix}${flag}`;
  const missing = holder[key] === true;
  delete holder[key];
  return missing;
}

export function clearMissingFlags(): void {
  takeMissing("announcer");
  takeMissing("main");
}
