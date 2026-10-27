// @vitest-environment happy-dom
import { cleanup, fireEvent, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { flattenCatalog } from "../support/catalog.js";
import { clearMissingFlags, takeMissing } from "../support/missing-flags.js";
import { installColorScheme } from "../support/match-media.js";
import { readJson } from "../support/read-source.js";

const PT_BR = "apps/web/src/client/i18n/locales/pt-BR.json";
const EN_US = "apps/web/src/client/i18n/locales/en-US.json";
const ES_ES = "apps/web/src/client/i18n/locales/es-ES.json";

function readPolite(): string {
  return [...document.querySelectorAll("[aria-live='polite']")].map((node) => node.textContent ?? "").join("");
}

function themeColor(): string {
  return document.querySelector("meta[name='theme-color']")?.getAttribute("content")?.toLowerCase() ?? "";
}

function lengthPx(value: string): number | null {
  const compact = value.replace(/\s+/g, "").toLowerCase();
  if (compact === "" || compact === "auto" || compact === "none") return null;
  if (compact === "var(--touch-min)") return 44;
  if (compact.endsWith("px")) return Number.parseFloat(compact);
  if (compact.endsWith("rem")) return Number.parseFloat(compact) * 16;
  return null;
}

function assertTouchTarget(element: Element) {
  const style = getComputedStyle(element);
  const rect = element.getBoundingClientRect();
  const width = rect.width > 0 ? rect.width : (lengthPx(style.minWidth) ?? 0);
  const height = rect.height > 0 ? rect.height : (lengthPx(style.minHeight) ?? 0);
  const label = element.getAttribute("aria-label") || element.textContent || element.tagName;
  expect(width, String(label)).toBeGreaterThanOrEqual(44);
  expect(height, String(label)).toBeGreaterThanOrEqual(44);
}

async function boot(options: { pathname?: string; dark?: boolean; theme?: string; locale?: string; width?: number } = {}) {
  cleanup();
  localStorage.clear();
  clearMissingFlags();
  document.head.innerHTML = '<meta name="theme-color" content="#0F52BA">';
  document.body.innerHTML = '<div id="root"></div>';
  document.documentElement.lang = "pt-BR";
  delete document.documentElement.dataset.theme;
  window.innerWidth = options.width ?? 360;
  window.innerHeight = options.width === 1280 ? 720 : 640;
  const scheme = installColorScheme(options.dark ?? false);
  if (options.theme) localStorage.setItem("fibonaipe.theme", options.theme);
  if (options.locale) localStorage.setItem("fibonaipe.locale", options.locale);
  window.history.replaceState(null, "", options.pathname ?? "/");
  vi.resetModules();
  clearMissingFlags();
  await import("../../src/client/main.tsx");
  if (takeMissing("main")) {
    throw new Error("Missing implementation: apps/web/src/client/main.tsx");
  }
  return scheme;
}

async function remount(pathname = "/") {
  cleanup();
  document.body.innerHTML = '<div id="root"></div>';
  window.history.replaceState(null, "", pathname);
  vi.resetModules();
  clearMissingFlags();
  await import("../../src/client/main.tsx");
  if (takeMissing("main")) {
    throw new Error("Missing implementation: apps/web/src/client/main.tsx");
  }
}

function chooseLabeled(label: string) {
  const button = screen.queryByRole("button", { name: label });
  if (button) {
    fireEvent.click(button);
    return;
  }
  const radio = screen.queryByRole("radio", { name: label });
  if (radio) {
    fireEvent.click(radio);
    return;
  }
  for (const combo of screen.queryAllByRole("combobox")) {
    const select = combo as HTMLSelectElement;
    const match = [...select.options].find((item) => item.label === label || item.textContent === label || item.value === label);
    if (match) {
      fireEvent.change(select, { target: { value: match.value } });
      return;
    }
  }
  throw new Error(`No control labeled ${label}`);
}

describe("mobile-first shell", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    clearMissingFlags();
  });

  it("renders the pt-BR home shell with landmarks, suit labels, and 44px targets", async () => {
    await boot({ width: 360 });
    const banner = screen.getByRole("banner");
    const main = document.getElementById("main-stage");
    expect(main?.tagName).toBe("MAIN");
    expect(main?.tabIndex).toBe(-1);
    expect(banner.textContent).toContain("Fibonaipe");
    const hidden = [...banner.querySelectorAll("[aria-hidden='true']")].map((node) => node.textContent ?? "").join("");
    for (const suit of ["♠", "♣", "♥", "♦"]) expect(hidden).toContain(suit);
    expect(banner.querySelector("[role='status']")).not.toBeNull();
    const pt = flattenCatalog(readJson(PT_BR));
    expect(screen.getByRole("link", { name: "Pular para o conteúdo principal" })).toBeTruthy();
    expect(document.body.textContent).toContain(pt["home.heroTitle"]);
    expect(document.body.textContent).toContain(pt["home.createRoomTitle"]);
    expect(document.body.textContent).toContain(pt["home.joinRoomTitle"]);
    const createName = pt["home.createRoomCta"] ?? "";
    const joinName = pt["home.joinRoomCta"] ?? "";
    expect(screen.queryByRole("button", { name: createName }) ?? screen.queryByRole("link", { name: createName }) ?? screen.getByText(createName)).toBeTruthy();
    expect(screen.queryByRole("button", { name: joinName }) ?? screen.queryByRole("link", { name: joinName }) ?? screen.getByText(joinName)).toBeTruthy();
    expect(screen.getByPlaceholderText(pt["home.joinRoomCodePlaceholder"] ?? "")).toBeTruthy();
    expect(document.body.textContent).toMatch(/♣\s*Alto/);
    expect(document.body.textContent).toMatch(/♥\s*Médio/);
    expect(document.body.textContent).toMatch(/♠\s*Baixo/);
    expect(document.body.textContent).toMatch(/♦\s*Insignificante/);
    const controls = document.body.querySelectorAll("a, button, select, input");
    expect(controls.length).toBeGreaterThan(0);
    for (const control of controls) assertTouchTarget(control);
    const root = document.documentElement;
    if (root.clientWidth > 0) {
      expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth);
    }
    expect(document.documentElement.lang).toBe("pt-BR");
  });

  it("opens in dark when the OS scheme is dark and nothing is stored", async () => {
    await boot({ dark: true });
    expect(document.documentElement.lang).toBe("pt-BR");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("fibonaipe.theme")).toBeNull();
    expect(localStorage.getItem("fibonaipe.locale")).toBeNull();
  });

  it("moves focus from the skip link to #main-stage", async () => {
    await boot();
    const user = userEvent.setup();
    await user.tab();
    const skip = screen.getByRole("link", { name: "Pular para o conteúdo principal" });
    expect(document.activeElement).toBe(skip);
    await user.click(skip);
    expect(document.activeElement?.id).toBe("main-stage");
  });

  it("persists Escuro, announces it, and restores it when the shell mounts again", async () => {
    vi.useFakeTimers();
    await boot();
    vi.advanceTimersByTime(200);
    chooseLabeled("Escuro");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("fibonaipe.theme")).toBe("dark");
    expect(themeColor()).toBe("#0b0f17");
    vi.advanceTimersByTime(150);
    expect(readPolite()).toContain("Tema alterado para Escuro");
    await remount("/");
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(localStorage.getItem("fibonaipe.theme")).toBe("dark");
  });

  it("tracks the OS scheme while the stored theme is system", async () => {
    const scheme = await boot({ dark: false });
    expect(document.documentElement.dataset.theme).toBe("light");
    scheme.setDark(true);
    expect(document.documentElement.dataset.theme).toBe("dark");
    chooseLabeled("Claro");
    expect(localStorage.getItem("fibonaipe.theme")).toBe("light");
    scheme.setDark(true);
    expect(document.documentElement.dataset.theme).toBe("light");
    chooseLabeled("Automático do Sistema");
    expect(localStorage.getItem("fibonaipe.theme")).toBe("system");
    expect(document.documentElement.dataset.theme).toBe("dark");
    scheme.setDark(false);
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("switches the visible shell from pt-BR to en-US to es-ES without a reload", async () => {
    await boot();
    expect(document.documentElement.lang).toBe("pt-BR");
    chooseLabeled("English");
    expect(document.documentElement.lang).toBe("en-US");
    expect(localStorage.getItem("fibonaipe.locale")).toBe("en-US");
    const enSkip = flattenCatalog(readJson(EN_US))["app.skipToMain"];
    expect(screen.getByRole("link", { name: enSkip })).toBeTruthy();
    chooseLabeled("Español");
    expect(document.documentElement.lang).toBe("es-ES");
    expect(localStorage.getItem("fibonaipe.locale")).toBe("es-ES");
    const esSkip = flattenCatalog(readJson(ES_ES))["app.skipToMain"];
    expect(screen.getByRole("link", { name: esSkip })).toBeTruthy();
  });

  it("keeps the banner on the room route", async () => {
    await boot({ pathname: "/r/ABCD2345" });
    expect(screen.getByRole("banner")).toBeTruthy();
    expect(document.getElementById("main-stage")).not.toBeNull();
  });

  it("forces the projector route dark and suppresses the banner", async () => {
    await boot({ pathname: "/r/ABCD2345/screen", theme: "light", dark: false });
    expect(document.documentElement.dataset.theme).toBe("dark");
    expect(screen.queryByRole("banner")).toBeNull();
    expect(document.getElementById("main-stage")).not.toBeNull();
  });

  it("keeps 44px targets at a 1280px viewport", async () => {
    await boot({ width: 1280 });
    expect(screen.getByRole("banner")).toBeTruthy();
    const controls = document.body.querySelectorAll("a, button, select, input");
    expect(controls.length).toBeGreaterThan(0);
    for (const control of controls) assertTouchTarget(control);
    const root = document.documentElement;
    if (root.clientWidth > 0) {
      expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth);
    }
  });
});
