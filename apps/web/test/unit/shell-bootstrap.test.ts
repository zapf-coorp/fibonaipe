// @vitest-environment happy-dom
import { beforeEach, describe, expect, it } from "vitest";
import { installColorScheme } from "../support/match-media.js";
import { readSource } from "../support/read-source.js";

const htmlPath = "apps/web/index.html";

function inlineScripts(html: string): string[] {
  return [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter((match) => {
      const attrs = match[1] ?? "";
      return !/\bsrc\s*=/.test(attrs) && !/\btype\s*=\s*["']module["']/.test(attrs);
    })
    .map((match) => match[2] ?? "")
    .filter((source) => source.trim().length > 0);
}

function runBootstrap() {
  const html = readSource(htmlPath);
  const scripts = inlineScripts(html);
  if (scripts.length === 0) {
    throw new Error("index.html is missing the synchronous theme/locale bootstrap script");
  }
  for (const source of scripts) {
    const run = new Function(source);
    run();
  }
}

describe("index.html shell", () => {
  beforeEach(() => {
    document.documentElement.lang = "und";
    document.documentElement.dataset.theme = "unset";
    localStorage.clear();
    installColorScheme(false);
  });

  it("declares a zoomable pt-BR document, manifest, and theme color", () => {
    const html = readSource(htmlPath);
    expect(html).toMatch(/<html[^>]*\blang=["']pt-BR["']/);
    expect(html).toMatch(/<html[^>]*\bdata-theme=["']light["']/);
    expect(html).toMatch(/name=["']viewport["'][^>]*content=["'][^"']*width=device-width/);
    expect(html).toMatch(/initial-scale=1/);
    expect(html).not.toMatch(/maximum-scale\s*=\s*1(?:\.0)?/);
    expect(html).not.toMatch(/user-scalable\s*=\s*no/i);
    expect(html).toMatch(/<link[^>]*rel=["']manifest["'][^>]*>/i);
    expect(html).toMatch(/manifest\.webmanifest/);
    expect(html).toMatch(/name=["']theme-color["'][^>]*content=["']#0[Ff]52[Bb][Aa]["']/);
    expect(html).toContain("fibonaipe.theme");
    expect(html).toContain("fibonaipe.locale");
    expect(html).toContain("prefers-color-scheme");
  });

  it("resolves an empty store to pt-BR and the OS scheme before paint", () => {
    installColorScheme(false);
    runBootstrap();
    expect(document.documentElement.lang).toBe("pt-BR");
    expect(document.documentElement.dataset.theme).toBe("light");

    document.documentElement.lang = "und";
    document.documentElement.dataset.theme = "unset";
    installColorScheme(true);
    runBootstrap();
    expect(document.documentElement.lang).toBe("pt-BR");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("applies a stored dark theme and en-US locale before paint", () => {
    localStorage.setItem("fibonaipe.theme", "dark");
    localStorage.setItem("fibonaipe.locale", "en-US");
    installColorScheme(false);
    runBootstrap();
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.lang).toBe("en-US");
  });

  it("keeps an explicit light theme when the OS is dark", () => {
    localStorage.setItem("fibonaipe.theme", "light");
    installColorScheme(true);
    runBootstrap();
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("treats system and invalid theme or locale values as OS theme and pt-BR", () => {
    localStorage.setItem("fibonaipe.theme", "system");
    localStorage.setItem("fibonaipe.locale", "fr-FR");
    installColorScheme(true);
    runBootstrap();
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(document.documentElement.lang).toBe("pt-BR");

    document.documentElement.dataset.theme = "unset";
    localStorage.setItem("fibonaipe.theme", "blue");
    localStorage.setItem("fibonaipe.locale", "es-ES");
    installColorScheme(false);
    runBootstrap();
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(document.documentElement.lang).toBe("es-ES");
  });
});
