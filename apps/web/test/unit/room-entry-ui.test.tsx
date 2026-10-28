// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { I18nProvider } from "../../src/client/i18n/index.js";
import { ConnectionStatusPill, type ConnectionStatus } from "../../src/client/components/status/ConnectionStatusPill.js";
import { clearMissingFlags, takeMissing } from "../support/missing-flags.js";
import { installColorScheme } from "../support/match-media.js";

const ROOM_CODE = "23456789";
const OWN_VOTE = "kept-offline-vote";

function renderPill(status: ConnectionStatus): HTMLElement {
  cleanup();
  document.body.innerHTML = "";
  render(
    <I18nProvider>
      <ConnectionStatusPill status={status} />
    </I18nProvider>,
  );
  const pill = document.querySelector("span[role='status']");
  if (!(pill instanceof HTMLElement)) throw new Error("Missing connection pill");
  return pill;
}

async function boot(pathname: string) {
  cleanup();
  localStorage.clear();
  clearMissingFlags();
  document.head.innerHTML = '<meta name="theme-color" content="#0F52BA">';
  document.body.innerHTML = '<div id="root"></div>';
  document.documentElement.lang = "pt-BR";
  delete document.documentElement.dataset.theme;
  window.innerWidth = 360;
  window.innerHeight = 640;
  installColorScheme(false);
  window.history.replaceState(null, "", pathname);
  vi.resetModules();
  clearMissingFlags();
  await import("../../src/client/main.tsx");
  if (takeMissing("main")) throw new Error("Missing implementation: apps/web/src/client/main.tsx");
}

function expectNoHorizontalScroll() {
  const root = document.documentElement;
  expect(window.innerWidth).toBe(360);
  if (root.clientWidth > 0) expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth);
}

function control(name: RegExp): HTMLElement {
  const found =
    screen.queryByRole("textbox", { name }) ??
    screen.queryByRole("checkbox", { name }) ??
    screen.queryByRole("switch", { name }) ??
    screen.queryByRole("spinbutton", { name }) ??
    screen.queryByRole("combobox", { name }) ??
    screen.queryByLabelText(name);
  if (!found) throw new Error(`Missing control matching ${name}`);
  return found;
}

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

describe("room entry UI", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
    vi.useRealTimers();
    clearMissingFlags();
  });

  it("shows Criar sala and Entrar com código at 360px without horizontal scroll", async () => {
    await boot("/");
    expect(screen.getByRole("button", { name: "Criar sala" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Entrar com código" })).toBeTruthy();
    expectNoHorizontalScroll();
  });

  it("collects the room name, Fibonacci subset, suit axis, auto-reveal, timer, and average", async () => {
    await boot("/");
    fireEvent.click(screen.getByRole("button", { name: "Criar sala" }));
    expect(control(/nome da sala|nome/i)).toBeTruthy();
    expect(screen.getByRole("group", { name: /fibonacci|cartas/i })).toBeTruthy();
    for (const card of ["1", "2", "3", "5", "8", "13"]) {
      expect(screen.getByRole("checkbox", { name: card })).toBeTruthy();
    }
    expect(control(/naipe/i)).toBeTruthy();
    expect(control(/revel/i)).toBeTruthy();
    expect(control(/tempo|timer/i)).toBeTruthy();
    expect(control(/méd|med/i)).toBeTruthy();
  });

  it("shares the room link, code, copy control, and a QR drawn in the browser", async () => {
    const requested: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        requested.push(url);
        expect(init?.credentials).toBe("include");
        expect(url.startsWith("/api/") || url.startsWith("http://localhost")).toBe(true);
        if (url.includes("/api/rooms") && (init?.method ?? "GET") === "POST") {
          return jsonResponse({ code: ROOM_CODE }, 201);
        }
        return jsonResponse({ error: { code: "NOT_FOUND", params: {} } }, 404);
      }),
    );
    await boot("/");
    fireEvent.click(screen.getByRole("button", { name: "Criar sala" }));
    fireEvent.change(control(/nome da sala|nome/i), { target: { value: "Sprint" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar sala" }));
    expect(await screen.findByRole("link", { name: new RegExp(ROOM_CODE) })).toHaveAttribute("href", `/r/${ROOM_CODE}`);
    expect(document.body.textContent).toContain(ROOM_CODE);
    expect(screen.getByRole("button", { name: /copiar/i })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /qr/i }));
    const dialog = screen.getByRole("dialog", { name: /qr/i });
    expect(dialog.querySelector("svg, canvas")).not.toBeNull();
    expect(dialog.querySelector("img[src^='http']")).toBeNull();
    expect(document.body.innerHTML).not.toMatch(/qrserver|quickchart|chart\.googleapis/i);
    expect(requested.some((url) => /qrserver|quickchart|chart\.googleapis/i.test(url))).toBe(false);
    fireEvent.click(screen.getByRole("button", { name: /entrar com código/i }));
    expect(screen.queryByRole("dialog", { name: /qr/i })).toBeNull();
  });

  it("prefills the room code on the join screen at 360px without horizontal scroll", async () => {
    await boot(`/r/${ROOM_CODE}/join`);
    const code = control(/código da sala|código/i) as HTMLInputElement;
    expect(code.value.replaceAll(" ", "").toUpperCase()).toBe(ROOM_CODE);
    expect(control(/apelido/i)).toBeTruthy();
    expect(control(/papel/i)).toBeTruthy();
    expect(screen.getByRole("radio", { name: /votante/i })).toBeTruthy();
    expect(screen.getByRole("radio", { name: /observador/i })).toBeTruthy();
    expectNoHorizontalScroll();
  });

  it("shows a field error when the nickname is already taken", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ error: { code: "NICKNAME_TAKEN", params: {} } }, 409)),
    );
    await boot(`/r/${ROOM_CODE}/join`);
    fireEvent.change(control(/apelido/i), { target: { value: "Ada" } });
    fireEvent.click(screen.getByRole("radio", { name: /votante/i }));
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));
    const nickname = control(/apelido/i);
    expect(nickname).toHaveAttribute("aria-invalid", "true");
    expect(nickname).toHaveAccessibleDescription("Esse apelido já está em uso.");
  });

  it("replaces the join form with the room-full message and a link home", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => jsonResponse({ error: { code: "ROOM_FULL", params: {} } }, 409)),
    );
    await boot(`/r/${ROOM_CODE}/join`);
    fireEvent.change(control(/apelido/i), { target: { value: "Late" } });
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));
    expect(await screen.findByText("A sala está cheia.")).toBeTruthy();
    expect(screen.getByRole("link", { name: /início|home|voltar/i })).toHaveAttribute("href", "/");
    expect(screen.queryByLabelText(/apelido/i)).toBeNull();
  });

  it("shows Sincronizando voto... and Reconectando / Acordando servidor... with an icon", () => {
    const syncing = renderPill("syncing");
    expect(syncing.textContent).toContain("Sincronizando voto...");
    expect(syncing.querySelector("svg, img")).not.toBeNull();
    const waking = renderPill("reconnecting");
    expect(waking.textContent).toContain("Reconectando / Acordando servidor...");
    expect(waking.querySelector("svg, img")).not.toBeNull();
    const connected = renderPill("connected");
    expect(connected.textContent).toContain("Conectado");
    expect(document.querySelectorAll("span[role='status']")).toHaveLength(1);
  });

  it("shows Acordando servidor... while the first room response is still pending", async () => {
    let release: (response: Response) => void = () => {};
    const pending = new Promise<Response>((resolve) => {
      release = resolve;
    });
    vi.stubGlobal("fetch", vi.fn(() => pending));
    try {
      await boot(`/r/${ROOM_CODE}`);
      expect(document.body.textContent).toContain("Acordando servidor...");
    } finally {
      release(jsonResponse({}, 200));
    }
  });

  it("keeps the same vote after 15s offline and flushes one queued command on reconnect", async () => {
    const posts: string[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
        const url = String(input);
        const method = init?.method ?? "GET";
        if (method === "POST" && url.includes("/votes")) {
          posts.push(typeof init?.body === "string" ? init.body : "");
          return jsonResponse({ ok: true }, 200);
        }
        return jsonResponse(
          {
            participants: [{ id: "ada", nickname: "Ada", hasVoted: true }],
            ownVote: { card: { label: "13", kind: "numeric" }, suit: { kind: "clubs" }, comment: OWN_VOTE },
            votes: null,
          },
          200,
        );
      }),
    );
    await boot(`/r/${ROOM_CODE}`);
    expect(document.body.textContent).toContain(OWN_VOTE);
    Object.defineProperty(navigator, "onLine", { configurable: true, value: false });
    window.dispatchEvent(new Event("offline"));
    vi.useFakeTimers();
    await vi.advanceTimersByTimeAsync(15_000);
    await boot(`/r/${ROOM_CODE}`);
    expect(document.body.textContent).toContain(OWN_VOTE);
    const vote = screen.getByRole("button", { name: "8" });
    fireEvent.click(vote);
    expect(screen.getByRole("status").textContent).toContain("Sincronizando voto...");
    expect(posts).toHaveLength(0);
    Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
    window.dispatchEvent(new Event("online"));
    await vi.advanceTimersByTimeAsync(0);
    expect(posts).toHaveLength(1);
    expect(posts[0]).toContain("8");
  });
});
