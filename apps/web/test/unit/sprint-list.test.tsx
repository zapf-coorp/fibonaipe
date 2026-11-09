// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../../src/client/i18n/index.js";
import { SprintList } from "../../src/features/sprints/SprintList.js";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("creates a sprint and reloads the list", async () => {
  let created = false;
  const fetcher = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === "POST") created = true;
    return new Response(JSON.stringify(created ? { sprints: [{ id: "s1", name: "Sprint 1", status: "planned", startDate: "2026-11-02", endDate: "2026-11-13" }] } : { sprints: [] }), { status: 200 });
  });
  vi.stubGlobal("fetch", fetcher);
  render(<I18nProvider><SprintList teamId="team" /></I18nProvider>);
  expect(await screen.findByText("Nenhuma sprint cadastrada.")).toBeTruthy();
  fireEvent.change(screen.getByLabelText("Nome da sprint"), { target: { value: "Sprint 1" } });
  fireEvent.change(screen.getByLabelText("Início"), { target: { value: "2026-11-02" } });
  fireEvent.change(screen.getByLabelText("Fim"), { target: { value: "2026-11-13" } });
  fireEvent.click(screen.getByRole("button", { name: "Criar sprint" }));
  expect(await screen.findByText("Sprint 1")).toBeTruthy();
  expect(fetcher).toHaveBeenCalledWith("/api/teams/team/sprints", expect.objectContaining({ method: "POST" }));
});
