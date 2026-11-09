// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../../src/client/i18n/index.js";
import { HolidayCalendar } from "../../src/features/sprints/HolidayCalendar.js";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it("adds and removes team holidays", async () => {
  let holidays: { id: string; name: string; date: string }[] = [];
  const fetcher = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === "POST") holidays = [{ id: "h1", name: "Feriado", date: "2026-11-02" }];
    if (init?.method === "DELETE") holidays = [];
    return new Response(JSON.stringify({ holidays }), { status: 200 });
  });
  vi.stubGlobal("fetch", fetcher);
  render(<I18nProvider><HolidayCalendar teamId="team" onChanged={() => {}} /></I18nProvider>);
  fireEvent.change(screen.getByLabelText("Nome do feriado"), { target: { value: "Feriado" } });
  fireEvent.change(screen.getByLabelText("Data do feriado"), { target: { value: "2026-11-02" } });
  fireEvent.click(screen.getByRole("button", { name: "Adicionar feriado" }));
  expect(await screen.findByText(/Feriado.*02\/11\/2026/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Remover Feriado" }));
  await waitFor(() => expect(screen.queryByText(/Feriado.*02\/11\/2026/)).toBeNull());
});
