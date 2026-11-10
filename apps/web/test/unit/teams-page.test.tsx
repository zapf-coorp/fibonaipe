// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../../src/client/i18n/index.js";
import { TeamsPage } from "../../src/features/teams/TeamsPage.js";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

it("lists the signed-in user's teams and creates a new one", async () => {
  let teams = [{ teamId: "team-1", name: "Falcons", role: "teamAdmin" }];
  const fetcher = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => {
    if (init?.method === "POST") {
      teams = [...teams, { teamId: "team-2", name: "Hawks", role: "teamAdmin" }];
    }
    return new Response(JSON.stringify({ teams }), { status: 200 });
  });
  vi.stubGlobal("fetch", fetcher);
  render(<I18nProvider><TeamsPage /></I18nProvider>);

  expect(await screen.findByRole("link", { name: "Abrir o planejamento de Falcons" })).toBeTruthy();
  expect(screen.getByText("Seu papel: Administrador")).toBeTruthy();

  fireEvent.change(screen.getByLabelText("Nome do time"), { target: { value: "Hawks" } });
  fireEvent.click(screen.getByRole("button", { name: "Criar time" }));

  expect(await screen.findByRole("link", { name: "Abrir o planejamento de Hawks" })).toBeTruthy();
  await waitFor(() => expect(fetcher).toHaveBeenCalledWith("/api/teams", expect.objectContaining({ method: "POST" })));
});

it("shows a sign-in message when the session is missing", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: { code: "FORBIDDEN" } }), { status: 403 })));
  render(<I18nProvider><TeamsPage /></I18nProvider>);
  expect(await screen.findByText("Entre na sua conta para ver e criar times.")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Entrar no modo Dev (fake)" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Criar time" })).toBeNull();
});
