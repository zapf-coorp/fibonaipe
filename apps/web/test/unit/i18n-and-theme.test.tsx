// @vitest-environment happy-dom
import { spawnSync } from "node:child_process";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { formatDate, formatNumber, I18nProvider, t, useI18n } from "../../src/client/i18n/index.ts";
import { LiveAnnouncerProvider, useLiveAnnouncer } from "../../src/client/providers/live-announcer.tsx";
import { ThemeProvider, useTheme } from "../../src/client/providers/theme-provider.tsx";
import { createApp } from "../../src/server/app.ts";
import { createAppContainer } from "../../src/server/composition.ts";
import { ERROR_KEYS, flattenCatalog, SHELL_KEYS } from "../support/catalog.js";
import { clearMissingFlags, takeMissing } from "../support/missing-flags.js";
import { installColorScheme } from "../support/match-media.js";
import { readJson, repoRoot } from "../support/read-source.js";

const PT_BR = "apps/web/src/client/i18n/locales/pt-BR.json";
const EN_US = "apps/web/src/client/i18n/locales/en-US.json";
const ES_ES = "apps/web/src/client/i18n/locales/es-ES.json";
const ULID = /^[0-9A-HJKMNP-TV-Z]{26}$/;
const oneDecimal: Intl.NumberFormatOptions = { minimumFractionDigits: 1, maximumFractionDigits: 1 };
const twoDecimals: Intl.NumberFormatOptions = { minimumFractionDigits: 2, maximumFractionDigits: 2 };
const dayOptions: Intl.DateTimeFormatOptions = { timeZone: "UTC", year: "numeric", month: "2-digit", day: "2-digit" };
const sampleDate = "2026-10-26T18:00:00.000Z";

function readPolite(): string {
  return [...document.querySelectorAll("[aria-live='polite']")].map((node) => node.textContent ?? "").join("");
}

function themeColor(): string {
  return document.querySelector("meta[name='theme-color']")?.getAttribute("content")?.toLowerCase() ?? "";
}

function LocaleProbe() {
  const i18n = useI18n();
  return (
    <div>
      <span data-testid="locale">{i18n.locale}</span>
      <span data-testid="skip">{i18n.t("app.skipToMain")}</span>
      <span data-testid="theme">{i18n.t("announcements.themeChanged", { theme: "Escuro" })}</span>
      <span data-testid="avg">{i18n.formatNumber(5.4, oneDecimal)}</span>
      <span data-testid="pace">{i18n.formatNumber(5.25, twoDecimals)}</span>
      <span data-testid="day">{i18n.formatDate(sampleDate, dayOptions)}</span>
      <button type="button" onClick={() => i18n.setLocale("en-US")}>
        en-US
      </button>
      <button type="button" onClick={() => i18n.setLocale("es-ES")}>
        es-ES
      </button>
      <button type="button" onClick={() => i18n.setLocale("pt-BR")}>
        pt-BR
      </button>
    </div>
  );
}

function ThemeProbe() {
  const theme = useTheme();
  return (
    <div>
      <span data-testid="mode">{theme.mode}</span>
      <span data-testid="resolved">{theme.resolvedTheme}</span>
      <button type="button" onClick={() => theme.setMode("dark")}>
        dark
      </button>
      <button type="button" onClick={() => theme.setMode("light")}>
        light
      </button>
      <button type="button" onClick={() => theme.setMode("system")}>
        system
      </button>
    </div>
  );
}

function AnnounceProbe() {
  const { announce } = useLiveAnnouncer();
  return (
    <button type="button" onClick={() => announce("Tema alterado para Escuro", "polite")}>
      announce
    </button>
  );
}

function renderLocale() {
  return render(
    <I18nProvider>
      <LocaleProbe />
    </I18nProvider>,
  );
}

function renderTheme() {
  return render(
    <LiveAnnouncerProvider>
      <ThemeProvider>
        <ThemeProbe />
      </ThemeProvider>
    </LiveAnnouncerProvider>,
  );
}

describe("shell locale catalogs", () => {
  it("loads pt-BR.json", () => {
    expect(Object.keys(flattenCatalog(readJson(PT_BR))).length).toBeGreaterThan(0);
  });

  it("loads en-US.json", () => {
    expect(Object.keys(flattenCatalog(readJson(EN_US))).length).toBeGreaterThan(0);
  });

  it("loads es-ES.json", () => {
    expect(Object.keys(flattenCatalog(readJson(ES_ES))).length).toBeGreaterThan(0);
  });

  it("keeps pt-BR, en-US, and es-ES on the same shell and error keys", () => {
    const catalogs = [PT_BR, EN_US, ES_ES].map((path) => flattenCatalog(readJson(path)));
    const [pt, en, es] = catalogs;
    if (!pt || !en || !es) throw new Error("expected three catalogs");
    const required = [...SHELL_KEYS, ...ERROR_KEYS];
    expect(ERROR_KEYS).toContain("errors.SERVICE_UNAVAILABLE");
    expect(ERROR_KEYS).toHaveLength(13);
    expect(Object.keys(en).sort()).toEqual(Object.keys(pt).sort());
    expect(Object.keys(es).sort()).toEqual(Object.keys(pt).sort());
    for (const catalog of catalogs) {
      for (const key of required) {
        expect(catalog[key], key).toEqual(expect.any(String));
        expect(catalog[key]?.trim().length, key).toBeGreaterThan(0);
      }
      for (const [key, value] of Object.entries(catalog)) {
        expect(value.trim(), key).not.toBe("");
      }
    }
  });

  it("locks the pt-BR shell copy and locale endonyms", () => {
    const pt = flattenCatalog(readJson(PT_BR));
    const en = flattenCatalog(readJson(EN_US));
    const es = flattenCatalog(readJson(ES_ES));
    expect(pt["app.skipToMain"]).toBe("Pular para o conteúdo principal");
    expect(pt["header.theme.light"]).toBe("Claro");
    expect(pt["header.theme.dark"]).toBe("Escuro");
    expect(pt["header.theme.system"]).toBe("Automático do Sistema");
    expect(pt["announcements.themeChanged"]).toBe("Tema alterado para {theme}");
    for (const catalog of [pt, en, es]) {
      expect(catalog["header.locale.ptBR"]).toBe("Português (BR)");
      expect(catalog["header.locale.enUS"]).toBe("English");
      expect(catalog["header.locale.esES"]).toBe("Español");
      expect(catalog["announcements.themeChanged"]).toContain("{theme}");
    }
    expect(en["app.skipToMain"]).not.toBe(pt["app.skipToMain"]);
    expect(es["app.skipToMain"]).not.toBe(pt["app.skipToMain"]);
    expect(en["announcements.themeChanged"]).not.toBe(pt["announcements.themeChanged"]);
    expect(es["announcements.themeChanged"]).not.toBe(pt["announcements.themeChanged"]);
    expect(en["header.theme.dark"]).not.toBe("Escuro");
    expect(es["header.theme.dark"]).not.toBe("Escuro");
  });
});

describe("t() and Intl formatters", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = "";
    clearMissingFlags();
  });

  afterEach(() => {
    cleanup();
  });

  it("interpolates {theme} and resolves the pt-BR skip link", () => {
    renderLocale();
    expect(screen.getByTestId("locale").textContent).toBe("pt-BR");
    expect(document.documentElement.lang).toBe("pt-BR");
    expect(screen.getByTestId("skip").textContent).toBe("Pular para o conteúdo principal");
    expect(screen.getByTestId("theme").textContent).toBe("Tema alterado para Escuro");
    expect(t("app.skipToMain")).toBe("Pular para o conteúdo principal");
    expect(t("announcements.themeChanged", { theme: "Escuro" })).toBe("Tema alterado para Escuro");
  });

  it("formats one-decimal averages and two-decimal pace in pt-BR, en-US, and es-ES", () => {
    renderLocale();
    expect(screen.getByTestId("avg").textContent).toBe("5,4");
    expect(screen.getByTestId("pace").textContent).toBe("5,25");
    expect(screen.getByTestId("day").textContent).toBe(new Intl.DateTimeFormat("pt-BR", dayOptions).format(new Date(sampleDate)));

    fireEvent.click(screen.getByRole("button", { name: "en-US" }));
    expect(screen.getByTestId("locale").textContent).toBe("en-US");
    expect(document.documentElement.lang).toBe("en-US");
    expect(localStorage.getItem("fibonaipe.locale")).toBe("en-US");
    expect(screen.getByTestId("avg").textContent).toBe("5.4");
    expect(screen.getByTestId("pace").textContent).toBe("5.25");
    expect(screen.getByTestId("day").textContent).toBe(new Intl.DateTimeFormat("en-US", dayOptions).format(new Date(sampleDate)));
    expect(formatNumber(5.4, oneDecimal)).toBe("5.4");
    expect(formatDate(sampleDate, dayOptions)).toBe(new Intl.DateTimeFormat("en-US", dayOptions).format(new Date(sampleDate)));
    const enSkip = flattenCatalog(readJson(EN_US))["app.skipToMain"];
    expect(screen.getByTestId("skip").textContent).toBe(enSkip);
    expect(t("app.skipToMain")).toBe(enSkip);

    fireEvent.click(screen.getByRole("button", { name: "es-ES" }));
    expect(document.documentElement.lang).toBe("es-ES");
    expect(localStorage.getItem("fibonaipe.locale")).toBe("es-ES");
    expect(screen.getByTestId("avg").textContent).toBe("5,4");
    expect(screen.getByTestId("pace").textContent).toBe("5,25");
    expect(screen.getByTestId("day").textContent).toBe(new Intl.DateTimeFormat("es-ES", dayOptions).format(new Date(sampleDate)));
    expect(screen.getByTestId("skip").textContent).toBe(flattenCatalog(readJson(ES_ES))["app.skipToMain"]);
  });

  it("restores a stored locale and falls back to pt-BR when the stored value is unsupported", () => {
    localStorage.setItem("fibonaipe.locale", "en-US");
    const stored = renderLocale();
    expect(screen.getByTestId("locale").textContent).toBe("en-US");
    expect(screen.getByTestId("avg").textContent).toBe("5.4");
    stored.unmount();

    localStorage.setItem("fibonaipe.locale", "fr-FR");
    renderLocale();
    expect(screen.getByTestId("locale").textContent).toBe("pt-BR");
    expect(document.documentElement.lang).toBe("pt-BR");
    expect(screen.getByTestId("avg").textContent).toBe("5,4");
  });
});

describe("theme provider", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.lang = "pt-BR";
    delete document.documentElement.dataset.theme;
    document.head.innerHTML = '<meta name="theme-color" content="#0F52BA" />';
    clearMissingFlags();
    installColorScheme(false);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("defaults to system and follows prefers-color-scheme until the choice is explicit", () => {
    const scheme = installColorScheme(false);
    renderTheme();
    expect(screen.getByTestId("mode").textContent).toBe("system");
    expect(screen.getByTestId("resolved").textContent).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(localStorage.getItem("fibonaipe.theme")).toBeNull();

    scheme.setDark(true);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(screen.getByTestId("mode").textContent).toBe("system");

    fireEvent.click(screen.getByRole("button", { name: "dark" }));
    expect(screen.getByTestId("mode").textContent).toBe("dark");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("fibonaipe.theme")).toBe("dark");
    expect(themeColor()).toBe("#0b0f17");
    scheme.setDark(false);
    expect(document.documentElement.dataset.theme).toBe("dark");

    fireEvent.click(screen.getByRole("button", { name: "light" }));
    expect(localStorage.getItem("fibonaipe.theme")).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
    expect(themeColor()).toBe("#0f52ba");

    fireEvent.click(screen.getByRole("button", { name: "system" }));
    expect(localStorage.getItem("fibonaipe.theme")).toBe("system");
    expect(document.documentElement.dataset.theme).toBe("light");
    scheme.setDark(true);
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(screen.getByTestId("mode").textContent).toBe("system");
  });

  it("restores an explicit theme and treats an invalid stored value as system", () => {
    localStorage.setItem("fibonaipe.theme", "light");
    installColorScheme(true);
    const stored = renderTheme();
    expect(screen.getByTestId("mode").textContent).toBe("light");
    expect(document.documentElement.dataset.theme).toBe("light");
    stored.unmount();

    localStorage.setItem("fibonaipe.theme", "blue");
    installColorScheme(true);
    renderTheme();
    expect(screen.getByTestId("mode").textContent).toBe("system");
    expect(document.documentElement.dataset.theme).toBe("dark");
  });

  it("announces Tema alterado para Escuro after the 150ms polite debounce", () => {
    vi.useFakeTimers();
    render(
      <I18nProvider>
        <LiveAnnouncerProvider>
          <ThemeProvider>
            <ThemeProbe />
          </ThemeProvider>
        </LiveAnnouncerProvider>
      </I18nProvider>,
    );
    if (takeMissing("announcer")) {
      throw new Error("Missing implementation: apps/web/src/client/providers/live-announcer.tsx");
    }
    vi.advanceTimersByTime(200);
    const before = readPolite();
    fireEvent.click(screen.getByRole("button", { name: "dark" }));
    expect(readPolite()).toBe(before);
    vi.advanceTimersByTime(149);
    expect(readPolite()).toBe(before);
    vi.advanceTimersByTime(1);
    expect(readPolite()).toContain("Tema alterado para Escuro");
  });

  it("keeps the dark theme when localStorage.setItem throws", () => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = () => {
      throw new DOMException("quota", "QuotaExceededError");
    };
    try {
      renderTheme();
      expect(() => fireEvent.click(screen.getByRole("button", { name: "dark" }))).not.toThrow();
      expect(document.documentElement.dataset.theme).toBe("dark");
      expect(themeColor()).toBe("#0b0f17");
    } finally {
      Storage.prototype.setItem = original;
    }
  });
});

describe("live announcer", () => {
  beforeEach(() => {
    clearMissingFlags();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("renders dual polite status regions and one assertive alert", () => {
    vi.useFakeTimers();
    render(
      <LiveAnnouncerProvider>
        <AnnounceProbe />
      </LiveAnnouncerProvider>,
    );
    if (takeMissing("announcer")) {
      throw new Error("Missing implementation: apps/web/src/client/providers/live-announcer.tsx");
    }
    const polite = [...document.querySelectorAll("[aria-live='polite']")];
    const assertive = document.querySelector("[aria-live='assertive']");
    expect(polite).toHaveLength(2);
    for (const node of polite) {
      expect(node.getAttribute("role")).toBe("status");
      expect(node.getAttribute("aria-atomic")).toBe("true");
      expect(node.classList.contains("sr-only")).toBe(true);
    }
    expect(assertive?.getAttribute("role")).toBe("alert");
    expect(assertive?.getAttribute("aria-atomic")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: "announce" }));
    expect(readPolite()).toBe("");
    vi.advanceTimersByTime(150);
    expect(readPolite()).toContain("Tema alterado para Escuro");
  });
});

describe("check-i18n --self-test", () => {
  it("reports a caught missing key and hardcoded JSX", () => {
    const result = spawnSync(process.execPath, ["tools/check-i18n.mjs", "--self-test"], {
      cwd: repoRoot,
      encoding: "utf8",
    });
    const output = `${result.stdout ?? ""}\n${result.stderr ?? ""}`.toLowerCase();
    expect(result.status, output).toBe(0);
    expect(output).toMatch(/missing[- ]key/);
    expect(output).toMatch(/hardcoded/);
  });
});

describe("GET /healthz", () => {
  it("returns ok JSON from /healthz and /api/healthz without caching", async () => {
    const app = createApp();
    const first = await app.request("/healthz", { headers: { Origin: "https://evil.example" } });
    const second = await app.request("/api/healthz");
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    const type = first.headers.get("content-type")?.toLowerCase().replace(/\s+/g, "") ?? "";
    expect(type).toContain("application/json");
    expect(type).toContain("charset=utf-8");
    expect((first.headers.get("cache-control") ?? "").toLowerCase().replace(/\s+/g, "")).toBe(
      "no-store,no-cache,must-revalidate",
    );
    const id1 = first.headers.get("x-request-id") ?? "";
    const id2 = second.headers.get("x-request-id") ?? "";
    expect(id1).toMatch(ULID);
    expect(id2).toMatch(ULID);
    expect(id1).not.toBe(id2);
    const body = (await first.json()) as {
      status?: string;
      version?: string;
      timestamp?: string;
      checks?: { persistence?: string };
      error?: unknown;
    };
    expect(body).toMatchObject({ status: "ok", version: "0.1.0", checks: { persistence: "ok" } });
    expect(body.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
    expect(body.error).toBeUndefined();
    const aliased = (await second.json()) as { status?: string; version?: string; checks?: { persistence?: string } };
    expect(aliased).toMatchObject({ status: "ok", version: "0.1.0", checks: { persistence: "ok" } });
  });

  it("rejects cross-origin mutations with 403 FORBIDDEN and still serves GET", async () => {
    const app = createApp(createAppContainer({ PUBLIC_APP_URL: "http://localhost:5173" }));
    for (const method of ["POST", "PUT", "PATCH", "DELETE"] as const) {
      const denied = await app.request("http://localhost:5173/api/healthz", {
        method,
        headers: { Origin: "https://evil.example" },
      });
      expect(denied.status, method).toBe(403);
      const body = (await denied.json()) as { error?: { code?: string; messageKey?: string } };
      expect(body.error?.code, method).toBe("FORBIDDEN");
      expect(body.error?.messageKey, method).toBe("errors.FORBIDDEN");
    }
    const sameOrigin = await app.request("http://localhost:5173/api/healthz", {
      method: "POST",
      headers: { Origin: "http://localhost:5173" },
    });
    expect(sameOrigin.status).not.toBe(403);
    const read = await app.request("http://localhost:5173/healthz", {
      method: "GET",
      headers: { Origin: "https://evil.example" },
    });
    expect(read.status).toBe(200);
  });
});
