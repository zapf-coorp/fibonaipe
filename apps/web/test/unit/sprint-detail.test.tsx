// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../../src/client/i18n/index.js";
import { SprintDetail } from "../../src/features/sprints/SprintDetail.js";

afterEach(() => { cleanup(); vi.unstubAllGlobals(); });
it("requires confirmation to close and displays the frozen report", async () => {
  let status = "active";
  const fetcher = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    if (String(url).endsWith("/close") && init?.method === "POST") status = "closed";
    const body = String(url).endsWith("/members") ? { members: [] } : String(url).endsWith("/holidays") ? { holidays: [] } : String(url).endsWith("/history") ? { rows: [], nextCursor: null } : String(url).endsWith("/report") ? { committed: 13, delivered: 5, carryOver: [], unestimated: [], capacityTotal: 10, pace: 0.5 } : { sprints: [{ id: "s1", name: "Sprint 1", status, items: [{ id: "i1", estimate: null, doneAt: null }], capacityTotal: 10 }] };
    return new Response(JSON.stringify(body), { status: 200 });
  });
  vi.stubGlobal("fetch", fetcher);
  render(<I18nProvider><SprintDetail teamId="team" sprintId="s1" /></I18nProvider>);
  fireEvent.click(await screen.findByRole("button", { name: "Encerrar sprint" }));
  expect(screen.getByText("Itens que voltam ao backlog: 1")).toBeTruthy();
  expect(screen.getByText("Itens sem estimativa: 1")).toBeTruthy();
  expect(fetcher.mock.calls.filter(([url]) => String(url).endsWith("/close"))).toHaveLength(0);
  fireEvent.click(screen.getByRole("button", { name: "Confirmar encerramento" }));
  expect(await screen.findByText(/Comprometidos: 13/)).toBeTruthy();
  expect(screen.queryByRole("button", { name: "Encerrar sprint" })).toBeNull();
});
