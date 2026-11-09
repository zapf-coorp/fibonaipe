// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../../src/client/i18n/index.js";
import { CapacityGrid } from "../../src/features/sprints/CapacityGrid.js";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it("saves absence and focus for the team's members", async () => {
  const fetcher = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => new Response(JSON.stringify(init?.method === "PUT" ? { capacityTotal: 6.4 } : { members: [{ id: "a", name: "Ana" }] }), { status: 200 }));
  vi.stubGlobal("fetch", fetcher);
  render(<I18nProvider><CapacityGrid teamId="team" sprintId="s1" entries={[]} onSaved={() => {}} /></I18nProvider>);
  fireEvent.change(await screen.findByLabelText("Ausências de Ana"), { target: { value: "1" } });
  fireEvent.change(screen.getByLabelText("Foco de Ana"), { target: { value: "80" } });
  fireEvent.click(screen.getByRole("button", { name: "Salvar capacidade" }));
  await waitFor(() => expect(fetcher).toHaveBeenCalledWith("/api/teams/team/sprints/s1/capacity", expect.objectContaining({ method: "PUT", body: JSON.stringify({ entries: [{ personId: "a", absenceDays: 1, focusPct: 80 }] }) })));
});
