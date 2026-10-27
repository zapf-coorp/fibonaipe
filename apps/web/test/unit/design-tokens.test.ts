import { describe, expect, it } from "vitest";
import { collectCss, readSource } from "../support/read-source.js";

const lightTokens: ReadonlyArray<readonly [string, string]> = [
  ["--bg-canvas", "#f4f6f9"],
  ["--bg-surface", "#ffffff"],
  ["--bg-elevated", "#eef2f6"],
  ["--bg-overlay", "rgba(15, 23, 42, 0.55)"],
  ["--bg-table-felt", "#e6f0ec"],
  ["--border-table-rim", "#1e4e3a"],
  ["--text-primary", "#0f172a"],
  ["--text-secondary", "#334155"],
  ["--text-muted", "#475569"],
  ["--text-on-accent", "#ffffff"],
  ["--border-subtle", "#cbd5e1"],
  ["--border-control", "#64748b"],
  ["--accent-primary", "#0f52ba"],
  ["--accent-primary-hover", "#0a3d8f"],
  ["--accent-primary-subtle", "#dbeafe"],
  ["--focus-ring", "#0047ab"],
  ["--status-success-fg", "#065f46"],
  ["--status-success-bg", "#d1fae5"],
  ["--status-success-border", "#059669"],
  ["--status-warning-fg", "#92400e"],
  ["--status-warning-bg", "#fef3c7"],
  ["--status-warning-border", "#d97706"],
  ["--status-danger-fg", "#991b1b"],
  ["--status-danger-bg", "#fee2e2"],
  ["--status-danger-border", "#dc2626"],
  ["--suit-clubs-fg", "#991b1b"],
  ["--suit-clubs-bg", "#fee2e2"],
  ["--suit-clubs-border", "#dc2626"],
  ["--suit-hearts-fg", "#9a3412"],
  ["--suit-hearts-bg", "#ffedd5"],
  ["--suit-hearts-border", "#ea580c"],
  ["--suit-spades-fg", "#075985"],
  ["--suit-spades-bg", "#e0f2fe"],
  ["--suit-spades-border", "#0284c7"],
  ["--suit-diamonds-fg", "#065f46"],
  ["--suit-diamonds-bg", "#d1fae5"],
  ["--suit-diamonds-border", "#059669"],
  ["--suit-joker-fg", "#334155"],
  ["--suit-joker-bg", "#f1f5f9"],
  ["--suit-joker-border", "#64748b"],
  ["--tag-ace-fg", "#3730a3"],
  ["--tag-ace-bg", "#e0e7ff"],
  ["--tag-king-fg", "#6b21a8"],
  ["--tag-king-bg", "#f3e8ff"],
  ["--tag-queen-fg", "#9d174d"],
  ["--tag-queen-bg", "#fce7f3"],
  ["--tag-jack-fg", "#115e59"],
  ["--tag-jack-bg", "#ccfbf1"],
  ["--font-sans", "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"],
  ["--font-mono", "'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Consolas, monospace"],
  ["--space-1", "0.25rem"],
  ["--space-2", "0.5rem"],
  ["--space-3", "0.75rem"],
  ["--space-4", "1rem"],
  ["--space-5", "1.25rem"],
  ["--space-6", "1.5rem"],
  ["--space-8", "2rem"],
  ["--space-10", "2.5rem"],
  ["--touch-min", "2.75rem"],
  ["--radius-sm", "0.375rem"],
  ["--radius-md", "0.625rem"],
  ["--radius-lg", "1rem"],
  ["--radius-pill", "9999px"],
  ["--dur-instant", "90ms"],
  ["--dur-state", "180ms"],
  ["--dur-reveal", "320ms"],
  ["--dur-reveal-cap", "450ms"],
  ["--ease-out-fast", "ease-out"],
  ["--ease-spring", "cubic-bezier(0.22, 1, 0.36, 1)"],
  ["--shadow-card", "0 2px 5px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.06)"],
  ["--shadow-card-selected", "0 10px 20px rgba(15, 82, 186, 0.22), 0 4px 8px rgba(15, 23, 42, 0.12)"],
  ["--shadow-modal", "0 20px 32px rgba(15, 23, 42, 0.24)"],
];

const darkTokens: ReadonlyArray<readonly [string, string]> = [
  ["--bg-canvas", "#0b0f17"],
  ["--bg-surface", "#131b2e"],
  ["--bg-elevated", "#1c2742"],
  ["--bg-overlay", "rgba(2, 6, 23, 0.75)"],
  ["--bg-table-felt", "#0f2922"],
  ["--border-table-rim", "#2c7a5b"],
  ["--text-primary", "#f8fafc"],
  ["--text-secondary", "#cbd5e1"],
  ["--text-muted", "#94a3b8"],
  ["--text-on-accent", "#090d16"],
  ["--border-subtle", "#263554"],
  ["--border-control", "#64748b"],
  ["--accent-primary", "#60a5fa"],
  ["--accent-primary-hover", "#93c5fd"],
  ["--accent-primary-subtle", "#1e3a8a"],
  ["--focus-ring", "#38bdf8"],
  ["--status-success-fg", "#34d399"],
  ["--status-success-bg", "#064e3b"],
  ["--status-success-border", "#10b981"],
  ["--status-warning-fg", "#fbbf24"],
  ["--status-warning-bg", "#451a03"],
  ["--status-warning-border", "#f59e0b"],
  ["--status-danger-fg", "#f87171"],
  ["--status-danger-bg", "#450a0a"],
  ["--status-danger-border", "#ef4444"],
  ["--suit-clubs-fg", "#fca5a5"],
  ["--suit-clubs-bg", "#450a0a"],
  ["--suit-clubs-border", "#ef4444"],
  ["--suit-hearts-fg", "#fdba74"],
  ["--suit-hearts-bg", "#431407"],
  ["--suit-hearts-border", "#f97316"],
  ["--suit-spades-fg", "#7dd3fc"],
  ["--suit-spades-bg", "#082f49"],
  ["--suit-spades-border", "#38bdf8"],
  ["--suit-diamonds-fg", "#6ee7b7"],
  ["--suit-diamonds-bg", "#064e3b"],
  ["--suit-diamonds-border", "#10b981"],
  ["--suit-joker-fg", "#cbd5e1"],
  ["--suit-joker-bg", "#1e293b"],
  ["--suit-joker-border", "#64748b"],
  ["--tag-ace-fg", "#a5b4fc"],
  ["--tag-ace-bg", "#1e1b4b"],
  ["--tag-king-fg", "#d8b4fe"],
  ["--tag-king-bg", "#3b0764"],
  ["--tag-queen-fg", "#f9a8d4"],
  ["--tag-queen-bg", "#500724"],
  ["--tag-jack-fg", "#5eead4"],
  ["--tag-jack-bg", "#134e4a"],
  ["--shadow-card", "0 2px 6px rgba(0, 0, 0, 0.45)"],
  ["--shadow-card-selected", "0 10px 24px rgba(56, 189, 248, 0.28), 0 4px 10px rgba(0, 0, 0, 0.5)"],
];

function normalize(value: string): string {
  return value.toLowerCase().replace(/["']/g, "").replace(/\s+/g, "");
}

function sliceBetween(css: string, start: RegExp, end: RegExp | null): string {
  const opened = start.exec(css);
  expect(opened, start.source).not.toBeNull();
  const from = opened?.index ?? 0;
  const rest = css.slice(from);
  if (!end) return rest;
  const closed = end.exec(rest.slice(opened?.[0].length ?? 0));
  expect(closed, end.source).not.toBeNull();
  return rest.slice(0, (opened?.[0].length ?? 0) + (closed?.index ?? rest.length));
}

function expectDecl(section: string, property: string, value: string) {
  expect(normalize(section), `${property}: ${value}`).toContain(normalize(`${property}:${value}`));
}

describe("light and dark tokens", () => {
  it("defines the ui-ux §2.4 light, dark, and reduced-motion custom properties", () => {
    const css = readSource("apps/web/src/client/styles/tokens.css");
    const light = sliceBetween(css, /:root\b/, /\[data-theme=['"]dark['"]\]/);
    const dark = sliceBetween(css, /\[data-theme=['"]dark['"]\]/, /@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)/);
    const reduce = sliceBetween(css, /@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)/, null);
    expect(light).toMatch(/\[data-theme=['"]light['"]\]/);
    for (const [property, value] of lightTokens) expectDecl(light, property, value);
    for (const [property, value] of darkTokens) expectDecl(dark, property, value);
    expectDecl(reduce, "--dur-instant", "0ms");
    expectDecl(reduce, "--dur-state", "100ms");
    expectDecl(reduce, "--dur-reveal", "120ms");
    expectDecl(reduce, "--dur-reveal-cap", "120ms");
  });
});

describe("global shell css", () => {
  it("resets the page to a 360px canvas with a 3px focus ring and reduced motion", () => {
    const css = readSource("apps/web/src/client/styles/global.css");
    expect(css).toMatch(/@import\s+["'][^"']*tokens\.css["']/);
    expect(css).toMatch(/box-sizing:\s*border-box/);
    expect(css).toMatch(/html\s*,\s*body/);
    expect(css).toMatch(/overflow-x:\s*hidden/);
    expect(css).toMatch(/min-width:\s*360px/);
    expect(css).toMatch(/background-color:\s*var\(\s*--bg-canvas\s*\)/);
    expect(css).toMatch(/color:\s*var\(\s*--text-primary\s*\)/);
    expect(css).toMatch(/font-family:\s*var\(\s*--font-sans\s*\)/);
    expect(css).toMatch(/\.tabular-nums[^{]*\{[^}]*font-variant-numeric:\s*tabular-nums/s);
    expect(css).toMatch(/\.sr-only/);
    expect(css).toMatch(/position:\s*absolute/);
    expect(css).toMatch(/width:\s*1px/);
    expect(css).toMatch(/height:\s*1px/);
    expect(css).toMatch(/clip:\s*rect\(\s*0\s*,\s*0\s*,\s*0\s*,\s*0\s*\)/);
    expect(css).toMatch(/\.skip-link/);
    expect(css).toMatch(/z-index:\s*9999/);
    expect(css).toMatch(/min-height:\s*var\(\s*--touch-min\s*\)/);
    expect(css).toMatch(/:focus-visible[^{]*\{[^}]*outline:\s*3px\s+solid\s+var\(\s*--focus-ring\s*\)/s);
    expect(css).toMatch(/outline-offset:\s*2px/);
    const reduce = sliceBetween(css, /@media\s*\(\s*prefers-reduced-motion:\s*reduce\s*\)/, null);
    expect(reduce).toMatch(/transform:\s*none/);
  });

  it("lays the header out for 360, 768, and 1280 with a 44px touch floor", () => {
    const header = readSource("apps/web/src/client/components/shell/AppHeader.module.css");
    expect(header).toMatch(/min-height:\s*(56px|3\.5rem)/);
    expect(header).toMatch(/gap:\s*var\(\s*--space-2\s*\)/);
    expect(header).toMatch(/min-width:\s*var\(\s*--touch-min\s*\)/);
    expect(header).toMatch(/min-height:\s*var\(\s*--touch-min\s*\)/);
    expect(header).toMatch(/768px/);
    expect(header).toMatch(/1280px/);
    const shell = collectCss("apps/web/src/client");
    expect(shell).toMatch(/960px/);
    expect(shell).toMatch(/1200px/);
    expect(shell).toMatch(/1440px/);
  });
});
