// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../../src/client/i18n/index.js";
import { SprintScope } from "../../src/features/sprints/SprintScope.js";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it("links an estimated history item to the sprint", async () => {
  const fetcher = vi.fn(async (_url: RequestInfo | URL, init?: RequestInit) => new Response(JSON.stringify(init?.method === "POST" ? { ok: true } : { rows: [{ itemId: "i1", roomId: "r1", title: "Item A", finalEstimate: "5" }], nextCursor: null }), { status: 200 }));
  vi.stubGlobal("fetch", fetcher);
  render(<I18nProvider><SprintScope teamId="team" sprintId="s1" items={[]} status="planned" onChanged={() => {}} /></I18nProvider>);
  fireEvent.click(await screen.findByRole("button", { name: "Adicionar Item A" }));
  await waitFor(() => expect(fetcher).toHaveBeenCalledWith("/api/teams/team/sprints/s1/items", expect.objectContaining({ method: "POST", body: JSON.stringify({ itemId: "i1", roomId: "r1" }) })));
});
it("sends the overrun flag when completing an item", async () => {
  const fetcher = vi.fn(async () => new Response(JSON.stringify({ rows: [{ itemId: "i1", roomId: "r1", title: "Item A", finalEstimate: "5" }], nextCursor: null }), { status: 200 }));
  vi.stubGlobal("fetch", fetcher);
  render(<I18nProvider><SprintScope teamId="team" sprintId="s1" items={[{ id: "i1", estimate: 5, doneAt: null }]} status="active" onChanged={() => {}} /></I18nProvider>);
  fireEvent.click(await screen.findByRole("checkbox", { name: "Estourou a estimativa de Item A" }));
  fireEvent.click(screen.getByRole("button", { name: "Concluir Item A" }));
  await waitFor(() => expect(fetcher).toHaveBeenCalledWith("/api/teams/team/sprints/s1/items/i1/done", expect.objectContaining({ method: "POST", body: JSON.stringify({ estimateExceeded: true }) })));
});
