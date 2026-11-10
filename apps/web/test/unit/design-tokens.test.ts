import { describe, expect, it } from "vitest";
import { collectCss, readSource } from "../support/read-source.js";

const lightTokens: ReadonlyArray<readonly [string, string]> = [
  ["--bg-canvas", "#f3ead2"],
  ["--bg-surface", "#fff8e6"],
  ["--bg-elevated", "#e7d7b0"],
  ["--bg-overlay", "rgba(26, 23, 56, 0.72)"],
  ["--bg-table-felt", "#e7d7b0"],
  ["--border-table-rim", "#0b0918"],
  ["--text-primary", "#1a1738"],
  ["--text-secondary", "#2a2650"],
  ["--text-muted", "#4a4570"],
  ["--text-on-accent", "#1a1738"],
  ["--border-subtle", "#1a1738"],
  ["--border-control", "#0b0918"],
  ["--accent-primary", "#e2b657"],
  ["--accent-primary-hover", "#f0cc74"],
  ["--accent-primary-subtle", "#f7e7bf"],
  ["--focus-ring", "#0e7490"],
  ["--status-success-fg", "#3f6212"],
  ["--status-success-bg", "#ecfccb"],
  ["--status-success-border", "#65a30d"],
  ["--status-warning-fg", "#92400e"],
  ["--status-warning-bg", "#fef3c7"],
  ["--status-warning-border", "#d97706"],
  ["--status-danger-fg", "#9f1239"],
  ["--status-danger-bg", "#fde2e4"],
  ["--status-danger-border", "#e23b4a"],
  ["--suit-clubs-fg", "#9f1239"],
  ["--suit-clubs-bg", "#fde2e4"],
  ["--suit-clubs-border", "#e23b4a"],
  ["--suit-hearts-fg", "#9a3412"],
  ["--suit-hearts-bg", "#ffedd5"],
  ["--suit-hearts-border", "#ea580c"],
  ["--suit-spades-fg", "#0e4f66"],
  ["--suit-spades-bg", "#d7f6fb"],
  ["--suit-spades-border", "#1493aa"],
  ["--suit-diamonds-fg", "#3f6212"],
  ["--suit-diamonds-bg", "#ecfccb"],
  ["--suit-diamonds-border", "#65a30d"],
  ["--suit-joker-fg", "#1a1738"],
  ["--suit-joker-bg", "#efe6ff"],
  ["--suit-joker-border", "#6d28d9"],
  ["--tag-ace-fg", "#3730a3"],
  ["--tag-ace-bg", "#e0e7ff"],
  ["--tag-king-fg", "#6b21a8"],
  ["--tag-king-bg", "#f3e8ff"],
  ["--tag-queen-fg", "#9d174d"],
  ["--tag-queen-bg", "#fce7f3"],
  ["--tag-jack-fg", "#115e59"],
  ["--tag-jack-bg", "#ccfbf1"],
  ["--font-sans", "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"],
  ["--font-mono", "'Silkscreen', ui-monospace, SFMono-Regular, Consolas, monospace"],
  ["--space-1", "0.25rem"],
  ["--space-2", "0.5rem"],
  ["--space-3", "0.75rem"],
  ["--space-4", "1rem"],
  ["--space-5", "1.25rem"],
  ["--space-6", "1.5rem"],
  ["--space-8", "2rem"],
  ["--space-10", "2.5rem"],
  ["--touch-min", "44px"],
  ["--radius-sm", "4px"],
  ["--radius-md", "4px"],
  ["--radius-lg", "8px"],
  ["--radius-pill", "4px"],
  ["--dur-instant", "90ms"],
  ["--dur-state", "180ms"],
  ["--dur-reveal", "320ms"],
  ["--dur-reveal-cap", "450ms"],
  ["--ease-out-fast", "ease-out"],
  ["--ease-spring", "cubic-bezier(0.22, 1, 0.36, 1)"],
  ["--shadow-card", "4px 4px 0 #0b0918"],
  ["--shadow-card-selected", "4px 4px 0 #0e7490"],
  ["--shadow-modal", "6px 6px 0 #0b0918"],
];

const darkTokens: ReadonlyArray<readonly [string, string]> = [
  ["--bg-canvas", "#1a1738"],
  ["--bg-surface", "#241f45"],
  ["--bg-elevated", "#2e2858"],
  ["--bg-overlay", "rgba(11, 9, 24, 0.78)"],
  ["--bg-table-felt", "#14122e"],
  ["--border-table-rim", "#3ec8e0"],
  ["--text-primary", "#f4ecd8"],
  ["--text-secondary", "#e7dcc4"],
  ["--text-muted", "#c4b89a"],
  ["--text-on-accent", "#1a1738"],
  ["--border-subtle", "#3a3468"],
  ["--border-control", "#f4ecd8"],
  ["--accent-primary", "#e2b657"],
  ["--accent-primary-hover", "#f0cc74"],
  ["--accent-primary-subtle", "#3a3018"],
  ["--focus-ring", "#3ec8e0"],
  ["--status-success-fg", "#d9f99d"],
  ["--status-success-bg", "#1a2e10"],
  ["--status-success-border", "#84cc16"],
  ["--status-warning-fg", "#fbbf24"],
  ["--status-warning-bg", "#3a3018"],
  ["--status-warning-border", "#e2b657"],
  ["--status-danger-fg", "#ff8b96"],
  ["--status-danger-bg", "#3a1020"],
  ["--status-danger-border", "#e23b4a"],
  ["--suit-clubs-fg", "#ff8b96"],
  ["--suit-clubs-bg", "#3a1020"],
  ["--suit-clubs-border", "#e23b4a"],
  ["--suit-hearts-fg", "#fdba74"],
  ["--suit-hearts-bg", "#3a2010"],
  ["--suit-hearts-border", "#f97316"],
  ["--suit-spades-fg", "#9aefff"],
  ["--suit-spades-bg", "#0c3040"],
  ["--suit-spades-border", "#3ec8e0"],
  ["--suit-diamonds-fg", "#d9f99d"],
  ["--suit-diamonds-bg", "#1a2e10"],
  ["--suit-diamonds-border", "#84cc16"],
  ["--suit-joker-fg", "#f4ecd8"],
  ["--suit-joker-bg", "#2a1848"],
  ["--suit-joker-border", "#e879f9"],
  ["--tag-ace-fg", "#a5b4fc"],
  ["--tag-ace-bg", "#1e1b4b"],
  ["--tag-king-fg", "#d8b4fe"],
  ["--tag-king-bg", "#3b0764"],
  ["--tag-queen-fg", "#f9a8d4"],
  ["--tag-queen-bg", "#500724"],
  ["--tag-jack-fg", "#5eead4"],
  ["--tag-jack-bg", "#134e4a"],
  ["--shadow-card", "4px 4px 0 #0b0918"],
  ["--shadow-card-selected", "4px 4px 0 #3ec8e0"],
  ["--shadow-modal", "6px 6px 0 #0b0918"],
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
