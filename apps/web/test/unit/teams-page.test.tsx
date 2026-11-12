// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
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

  expect(await screen.findByText("Falcons")).toBeTruthy();
  expect(screen.getByText("Administrador")).toBeTruthy();

  fireEvent.change(screen.getByLabelText("Nome do time"), { target: { value: "Hawks" } });
  fireEvent.click(screen.getByRole("button", { name: "Criar time" }));

  expect(await screen.findByText("Hawks")).toBeTruthy();
  await waitFor(() => expect(fetcher).toHaveBeenCalledWith("/api/teams", expect.objectContaining({ method: "POST" })));
});

it("commits a sprint tag and shows the task title as the link", async () => {
  const tasks = [
    { id: "task-1", title: "t1", sprintName: "Sprint1", link: "https://example.com/t1" },
  ];
  vi.stubGlobal("fetch", vi.fn(async (url: RequestInfo | URL) => {
    const path = String(url);
    if (path.endsWith("/tasks")) return new Response(JSON.stringify({ tasks }), { status: 200 });
    return new Response(JSON.stringify({ teams: [{ teamId: "team-1", name: "Ghost", role: "teamAdmin" }] }), { status: 200 });
  }));
  render(<I18nProvider><TeamsPage /></I18nProvider>);
  fireEvent.click(await screen.findByRole("button", { name: "Tarefas" }));
  const dialog = await screen.findByRole("dialog", { name: "Tarefas de Ghost" });
  const sprint = within(dialog).getByRole("textbox", { name: "Sprint..." });
  fireEvent.change(sprint, { target: { value: "Sprint1" } });
  fireEvent.blur(sprint);
  expect(within(dialog).queryByRole("textbox", { name: "Sprint..." })).toBeNull();
  fireEvent.click(within(dialog).getByRole("button", { name: "Sprint1" }));
  expect(within(dialog).getByRole("textbox", { name: "Sprint..." })).toBeTruthy();
  const taskLink = within(dialog).getByRole("link", { name: "t1" });
  expect(taskLink).toHaveAttribute("href", "https://example.com/t1");
  expect(taskLink).toHaveAttribute("target", "_blank");
  const row = taskLink.closest("li");
  expect(row?.textContent).toContain("Sprint1");
  expect(row?.querySelector("a")).toBe(taskLink);
});

it("shows a sign-in message when the session is missing", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ error: { code: "FORBIDDEN" } }), { status: 403 })));
  render(<I18nProvider><TeamsPage /></I18nProvider>);
  expect(await screen.findByText("Entre na sua conta para ver e criar times.")).toBeTruthy();
  expect(screen.getByRole("link", { name: "Entrar no modo Dev (fake)" })).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Criar time" })).toBeNull();
});
