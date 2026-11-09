// @vitest-environment happy-dom
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../../src/client/i18n/index.js";
import { ForecastCard } from "../../src/features/forecast/ForecastCard.js";
import { ForecastDashboard } from "../../src/features/forecast/ForecastDashboard.js";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it("shows a disclaimer and an insufficient-data count without a forecast number", () => {
  render(<I18nProvider><ForecastCard forecast={{ status: "insufficient_data", have: 2, need: 3, excluded: [] }} disclaimer="Estimativa estatística, não compromisso." /></I18nProvider>);
  expect(screen.getByText("Estimativa estatística, não compromisso.")).toBeTruthy();
  expect(screen.getByRole("status").textContent).toContain("2 de 3");
  expect(screen.queryByText(/Previsão estimada:/)).toBeNull();
});

it("dashboard with two sprints shows the disclaimer and no predicted numeral", async () => {
  vi.stubGlobal("fetch", vi.fn(async (url: RequestInfo | URL) => {
    const accuracy = String(url).endsWith("/accuracy");
    const value = accuracy ? { series: [], meanAbsError: null, canExport: true } : { status: "insufficient_data", have: 2, need: 3, excluded: [] };
    return new Response(JSON.stringify(value), { status: 200 });
  }));
  render(<I18nProvider><ForecastDashboard teamId="team" /></I18nProvider>);
  expect(await screen.findByText(/Dados insuficientes: 2 de 3/)).toBeTruthy();
  expect(screen.getByText(/Estimativa estatística baseada no ritmo recente/)).toBeTruthy();
  expect(screen.queryByText(/Previsão estimada:/)).toBeNull();
});
