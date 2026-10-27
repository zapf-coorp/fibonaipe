import { describe, expect, it } from "vitest";
import { readSource } from "../support/read-source.js";

describe("PWA shell assets", () => {
  it("serves a standalone pt-BR manifest", () => {
    const manifest = JSON.parse(readSource("apps/web/public/manifest.webmanifest")) as {
      name?: string;
      short_name?: string;
      lang?: string;
      display?: string;
      start_url?: string;
      theme_color?: string;
      background_color?: string;
      icons?: Array<{ src?: string; sizes?: string; purpose?: string }>;
    };
    expect(manifest.name).toBe("Fibonaipe — Planning Poker & Previsão de Sprints");
    expect(manifest.short_name).toBe("Fibonaipe");
    expect(manifest.lang).toBe("pt-BR");
    expect(manifest.display).toBe("standalone");
    expect(manifest.start_url).toBe("/");
    expect(manifest.theme_color?.toLowerCase()).toBe("#0f52ba");
    expect(manifest.background_color?.toLowerCase()).toBe("#0b0f17");
    const icons = manifest.icons ?? [];
    expect(icons.some((icon) => icon.sizes === "192x192")).toBe(true);
    expect(icons.some((icon) => icon.sizes === "512x512")).toBe(true);
    expect(icons.some((icon) => (icon.purpose ?? "").toLowerCase().includes("maskable"))).toBe(true);
  });

  it("ships 192 and 512 svg icons", () => {
    const icon192 = readSource("apps/web/public/icons/icon-192.svg");
    const icon512 = readSource("apps/web/public/icons/icon-512.svg");
    expect(icon192).toContain("<svg");
    expect(icon192).toContain("192");
    expect(icon512).toContain("<svg");
    expect(icon512).toContain("512");
  });

  it("keeps /api/* and /healthz out of the service worker cache", () => {
    const sw = readSource("apps/web/public/sw.js");
    expect(sw).toMatch(/pathname\.startsWith\(\s*['"]\/api\/['"]\s*\)/);
    expect(sw).toMatch(/pathname\s*===\s*['"]\/healthz['"]/);
  });
});
