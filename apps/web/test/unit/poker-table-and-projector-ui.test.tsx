// @vitest-environment happy-dom
import { cleanup, fireEvent, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

const CODE = "23456789";
const MEAN_CODE = "2345789A";
const SERVER_TIME = "2025-10-27T15:00:00.000Z";
const HOST_CARD = { participantId: "host", card: "5", suit: "clubs" };

interface Seat {
  readonly id: string;
  readonly nickname: string;
  readonly role: string;
  readonly mode: "voter" | "observer";
  readonly online: boolean;
  readonly afk: boolean;
  readonly hasVoted: boolean;
}

interface ItemRow {
  readonly id: string;
  readonly title: string;
  readonly status: "pending" | "current" | "estimated" | "skipped" | "deferred";
  readonly link: string | null;
  readonly finalEstimate: string | null;
}

interface VoteRow {
  readonly participantId: string;
  readonly card: string;
  readonly suit: string;
}

interface Snapshot {
  readonly code: string;
  readonly viewer: "participant" | "screen";
  readonly selfId: string | null;
  readonly round: "voting" | "revealed" | null;
  readonly roundState: "voting-empty" | "voting-own-card" | "revealed" | "estimated";
  readonly suitAxis: boolean;
  readonly showAverage: boolean;
  readonly seats: readonly Seat[];
  readonly items: readonly ItemRow[];
  readonly ownVote: { readonly card: string; readonly suit: string | null } | null;
  readonly votes: readonly VoteRow[] | null;
  readonly stats: Record<string, unknown> | null;
  readonly timerEndsAt: string | null;
  readonly permissions: Record<string, boolean>;
  readonly finalEstimate: string | null;
}

interface HappyDomSettings {
  disableCSSFileLoading?: boolean;
  disableJavaScriptFileLoading?: boolean;
  navigation?: { disableMainFrameNavigation?: boolean };
  fetch?: {
    interceptor?: {
      beforeAsyncRequest?: (input: { request: Request; window: Window }) => Response | undefined;
      beforeSyncRequest?: (input: { request: Request; window: Window }) => Response | undefined;
    };
  };
}

interface HappyDom {
  settings?: HappyDomSettings;
  abort?: () => Promise<void> | void;
  setURL?: (url: string) => void;
}

let snapshot: Snapshot;
let holdImport = false;
let releaseImport: (() => void) | null = null;
let onReveal: (() => void) | null = null;
let onVote: ((body: string) => void) | null = null;
let onTimer: (() => void) | null = null;
let onImport: (() => void) | null = null;
let onReorder: (() => void) | null = null;
let onEstimate: ((body: string) => void) | null = null;
const network: string[] = [];
const stateBodies: string[] = [];

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json" },
  });
}

function isLoopback(url: URL): boolean {
  const host = url.hostname;
  return (host === "localhost" || host === "127.0.0.1") && (url.port === "3000" || url.port === "");
}

function closed(owner: Window): Response {
  return new owner.Response(null, { status: 204, headers: { "content-type": "application/json" } });
}

function installMatchMedia(reduce: boolean): void {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: (query: string) => ({
      matches: query.includes("prefers-color-scheme: dark")
        ? false
        : query.includes("prefers-reduced-motion")
          ? reduce
          : false,
      media: query,
      onchange: null,
      addEventListener() {},
      removeEventListener() {},
      addListener() {},
      removeListener() {},
      dispatchEvent() {
        return true;
      },
    }),
  });
}

function guardLoopback(pathname: string): void {
  const happy = (window as Window & { happyDOM?: HappyDom }).happyDOM;
  if (!happy?.settings) return;
  happy.settings.disableCSSFileLoading = true;
  happy.settings.disableJavaScriptFileLoading = true;
  happy.settings.navigation = { disableMainFrameNavigation: true };
  happy.setURL?.(`http://localhost:3000${pathname}`);
  const passApi = (request: Request, owner: Window): Response | undefined => {
    const url = new URL(request.url, owner.location.href);
    if (url.pathname.startsWith("/api/")) return undefined;
    if (isLoopback(url)) return closed(owner);
    return undefined;
  };
  happy.settings.fetch = {
    interceptor: {
      beforeAsyncRequest: ({ request, window: owner }) => passApi(request, owner),
      beforeSyncRequest: ({ request, window: owner }) => passApi(request, owner),
    },
  };
}

function seat(input: Partial<Seat> & Pick<Seat, "id" | "nickname" | "mode">): Seat {
  return {
    role: input.mode === "observer" ? "observer" : "dev",
    online: true,
    afk: false,
    hasVoted: false,
    ...input,
  };
}

function permissions(kind: "host" | "voter" | "observer" | "screen"): Record<string, boolean> {
  const none = {
    vote: false,
    revealRound: false,
    setFinalEstimate: false,
    manageQueue: false,
    updateRoomSettings: false,
    hostRoom: false,
  };
  if (kind === "host") {
    return { ...none, vote: true, revealRound: true, setFinalEstimate: true, manageQueue: true, updateRoomSettings: true, hostRoom: true };
  }
  if (kind === "voter") return { ...none, vote: true };
  return none;
}

function item(id: string, title: string, status: ItemRow["status"] = "pending", link: string | null = null): ItemRow {
  return { id, title, status, link, finalEstimate: null };
}

function base(overrides: Partial<Snapshot>): Snapshot {
  const items = overrides.items ?? [item("item-1", "Pagamento do boleto", "current")];
  return {
    code: CODE,
    viewer: "participant",
    selfId: "ada",
    round: "voting",
    roundState: "voting-empty",
    suitAxis: true,
    showAverage: true,
    seats: [seat({ id: "ada", nickname: "Ada", mode: "voter" })],
    items,
    ownVote: null,
    votes: null,
    stats: null,
    timerEndsAt: null,
    permissions: permissions("voter"),
    finalEstimate: null,
    ...overrides,
  };
}

function payload(current: Snapshot): Record<string, unknown> {
  const currentItem = current.items.find((row) => row.status === "current") ?? current.items[0] ?? null;
  return {
    id: "room-1",
    code: current.code,
    name: "Sprint",
    kind: "guest",
    teamId: null,
    version: 1,
    serverTime: SERVER_TIME,
    settings: {
      autoReveal: false,
      showAverage: current.showAverage,
      suitAxisEnabled: current.suitAxis,
      suitAxisLabelKey: "risk",
      timerSeconds: 60,
      activeCards: ["1", "2", "3", "5", "8", "13"],
    },
    viewer: current.viewer === "screen" ? { kind: "screen" } : { kind: "participant", participantId: current.selfId },
    participants: current.seats,
    queue: current.items,
    currentItem: currentItem ? { id: currentItem.id, title: currentItem.title, status: currentItem.status, link: currentItem.link } : null,
    currentRound: current.round ? { id: "round-1", itemId: currentItem?.id ?? "item-1", number: 1, status: current.round } : null,
    ownVote: current.ownVote,
    votes: current.votes,
    stats: current.stats,
    timer: current.timerEndsAt ? { endsAt: current.timerEndsAt } : null,
    permissions: current.permissions,
    finalEstimate: current.finalEstimate,
    roundState: current.roundState,
  };
}

function installFetch(): void {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = new URL(String(input), window.location.href);
      const method = (init?.method ?? "GET").toUpperCase();
      const bodyText = typeof init?.body === "string" ? init.body : "";
      network.push(`${method} ${url.pathname} ${bodyText}`);
      if (!isLoopback(url)) return jsonResponse({ error: { code: "NOT_FOUND", params: {} } }, 404);
      if (method === "POST" && url.pathname.endsWith("/join")) {
        return jsonResponse({ error: { code: "ROOM_FULL", params: {} } }, 409);
      }
      if (method === "POST" && url.pathname.includes("reveal")) onReveal?.();
      if (method === "POST" && /vote/.test(url.pathname)) onVote?.(bodyText);
      if (method === "POST" && url.pathname.includes("timer")) onTimer?.();
      if (method === "POST" && url.pathname.includes("reorder")) onReorder?.();
      if (method === "POST" && url.pathname.includes("estimate")) onEstimate?.(bodyText);
      const importing = method === "POST" && (url.pathname.includes("import") || bodyText.includes("Linha 01"));
      if (importing && holdImport) {
        return new Promise<Response>((resolve) => {
          releaseImport = () => {
            onImport?.();
            resolve(jsonResponse(payload(snapshot), 200));
          };
        });
      }
      if (importing) onImport?.();
      if (method === "GET" && url.pathname.includes("/state")) {
        const body = payload(snapshot);
        stateBodies.push(JSON.stringify(body));
        return jsonResponse(body, 200);
      }
      return jsonResponse(payload(snapshot), 200);
    }),
  );
}

async function boot(pathname: string, next: Snapshot, options?: { readonly reduce?: boolean; readonly width?: number }): Promise<void> {
  snapshot = next;
  holdImport = false;
  releaseImport = null;
  onReveal = null;
  onVote = null;
  onTimer = null;
  onImport = null;
  onReorder = null;
  onEstimate = null;
  network.length = 0;
  stateBodies.length = 0;
  cleanup();
  localStorage.clear();
  sessionStorage.clear();
  const retained = globalThis as typeof globalThis & { __fibonaipeRoomSnapshots?: Map<string, unknown> };
  retained.__fibonaipeRoomSnapshots?.clear();
  document.head.innerHTML = '<meta name="theme-color" content="#0F52BA">';
  document.body.innerHTML = '<div id="root"></div>';
  document.documentElement.lang = "pt-BR";
  delete document.documentElement.dataset.theme;
  window.innerWidth = options?.width ?? 360;
  window.innerHeight = (options?.width ?? 360) >= 1280 ? 1080 : 640;
  Object.defineProperty(navigator, "onLine", { configurable: true, value: true });
  installMatchMedia(options?.reduce ?? false);
  guardLoopback(pathname);
  window.history.replaceState(null, "", pathname);
  installFetch();
  vi.resetModules();
  await import("../../src/client/main.tsx");
}

function readPolite(): string {
  return [...document.querySelectorAll("[aria-live='polite']")].map((node) => node.textContent ?? "").join(" ");
}

function lengthPx(value: string): number | null {
  const compact = value.replace(/\s+/g, "").toLowerCase();
  if (compact === "var(--touch-min)") return 44;
  if (compact.endsWith("px")) return Number.parseFloat(compact);
  if (compact.endsWith("rem")) return Number.parseFloat(compact) * 16;
  return null;
}

function assertTouchTarget(element: Element): void {
  const style = getComputedStyle(element);
  const inline = element instanceof HTMLElement ? element.style : null;
  const rect = element.getBoundingClientRect();
  const width = rect.width > 0 ? rect.width : (lengthPx(inline?.minWidth || style.minWidth) ?? 0);
  const height = rect.height > 0 ? rect.height : (lengthPx(inline?.minHeight || style.minHeight) ?? 0);
  expect(width).toBeGreaterThanOrEqual(44);
  expect(height).toBeGreaterThanOrEqual(44);
}

function fontPx(element: Element): number {
  const attr = element.getAttribute("style") ?? "";
  const inline = /font-size:\s*([0-9.]+)px/i.exec(attr);
  if (inline?.[1]) return Number.parseFloat(inline[1]);
  const computed = getComputedStyle(element).fontSize;
  if (computed.endsWith("px")) return Number.parseFloat(computed);
  return 0;
}

function humans(count: number): Seat[] {
  return Array.from({ length: count }, (_, index) =>
    seat({
      id: `n${String(index + 1).padStart(2, "0")}`,
      nickname: `n${String(index + 1).padStart(2, "0")}`,
      mode: "voter",
      hasVoted: index % 2 === 0,
    }),
  );
}

function divergenceStats(): Record<string, unknown> {
  return {
    voteCount: 2,
    mean: 5,
    median: 5,
    modes: [5],
    min: 5,
    max: 5,
    consensus: true,
    nearConsensus: false,
    extremes: { minIds: [], maxIds: [] },
    specialCounts: { "?": 0, Coringa: 0, AFK: 0 },
    suitDistribution: { clubs: 1, hearts: 0, spades: 1, diamonds: 0 },
    suitDivergence: true,
  };
}

function hiddenMeanStats(): Record<string, unknown> {
  return {
    voteCount: 3,
    mean: 6,
    median: 3,
    modes: [],
    min: 2,
    max: 13,
    consensus: false,
    nearConsensus: false,
    extremes: { minIds: ["ana"], maxIds: ["caio"] },
    specialCounts: { "?": 0, Coringa: 0, AFK: 0 },
    suitDistribution: { clubs: 3, hearts: 0, spades: 0, diamonds: 0 },
    suitDivergence: false,
  };
}

describe("poker table and projector screens", () => {
  afterEach(async () => {
    releaseImport?.();
    releaseImport = null;
    holdImport = false;
    cleanup();
    const happy = (window as Window & { happyDOM?: HappyDom }).happyDOM;
    await happy?.abort?.();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("walks voting-empty to an own card, marks the current seat in text, and keeps 44px targets", async () => {
    await boot(
      `/r/${CODE}`,
      base({
        seats: [
          seat({ id: "ada", nickname: "Ada", mode: "voter" }),
          seat({ id: "helena", nickname: "Helena", mode: "voter", hasVoted: true }),
        ],
      }),
      { width: 360 },
    );
    const mesa = await screen.findByRole("region", { name: "Mesa" });
    expect(mesa).toHaveAttribute("data-round-state", "voting-empty");
    const deck = within(mesa).getByRole("group", { name: "Baralho" });
    expect(within(deck).getByRole("button", { name: "5" })).toHaveAttribute("aria-pressed", "false");
    expect(within(deck).getByRole("button", { name: "?" })).toBeTruthy();
    expect(within(deck).getByRole("button", { name: "Coringa" })).toBeTruthy();
    expect(within(deck).getByRole("button", { name: "AFK" })).toBeTruthy();
    expect(mesa.textContent).toMatch(/Coringa/);
    const ada = within(mesa).getByRole("listitem", { name: /Ada/ });
    expect(ada.textContent).toContain("Você");
    expect(ada.textContent).toContain("Online");
    expect(ada.textContent).toContain("Aguardando");
    expect(ada.textContent).not.toContain("Você está ausente");
    const helena = within(mesa).getByRole("listitem", { name: /Helena/ });
    expect(helena.textContent).toContain("Votou");
    expect(helena.textContent).not.toMatch(/Alto|♣/);
    for (const button of deck.querySelectorAll("button")) assertTouchTarget(button);
    const root = document.documentElement;
    expect(window.innerWidth).toBe(360);
    if (root.clientWidth > 0) expect(root.scrollWidth).toBeLessThanOrEqual(root.clientWidth);

    onVote = (body) => {
      expect(body).toMatch(/joker|coringa/i);
      snapshot = {
        ...snapshot,
        roundState: "voting-own-card",
        ownVote: { card: "3", suit: "joker" },
        seats: snapshot.seats.map((row) => (row.id === "ada" ? { ...row, hasVoted: true } : row)),
      };
    };
    fireEvent.click(within(deck).getByRole("button", { name: "3" }));
    expect(await within(mesa).findByRole("button", { name: "3" })).toHaveAttribute("aria-pressed", "true");
    expect(mesa).toHaveAttribute("data-round-state", "voting-own-card");
    expect(helena.textContent).not.toMatch(/Alto|♣/);
    expect(stateBodies.join("\n")).not.toContain('"participantId":"helena"');
  });

  it("keeps the deck off the observer table", async () => {
    await boot(
      `/r/${CODE}`,
      base({
        selfId: "olivia",
        permissions: permissions("observer"),
        seats: [
          seat({ id: "olivia", nickname: "Olivia", mode: "observer" }),
          seat({ id: "ada", nickname: "Ada", mode: "voter" }),
        ],
      }),
    );
    const mesa = await screen.findByRole("region", { name: "Mesa" });
    expect(within(mesa).getByRole("listitem", { name: /Olivia/ }).textContent).toMatch(/Observador/);
    expect(within(mesa).queryByRole("group", { name: "Baralho" })).toBeNull();
    expect(within(mesa).queryByRole("button", { name: "Revelar" })).toBeNull();
  });

  it("e2e skeleton: reveal shows Alto and Baixo while the voter network omits the host card", async () => {
    const voter = base({
      selfId: "voter",
      permissions: permissions("voter"),
      seats: [
        seat({ id: "host", nickname: "Helena", mode: "voter", role: "dev", hasVoted: true }),
        seat({ id: "voter", nickname: "Bia", mode: "voter", hasVoted: true }),
        seat({ id: "olivia", nickname: "Olivia", mode: "observer" }),
      ],
      ownVote: { card: "5", suit: "spades" },
      roundState: "voting-own-card",
    });
    await boot(`/r/${CODE}`, voter);
    const voting = await screen.findByRole("region", { name: "Mesa" });
    expect(within(voting).queryByRole("button", { name: "Revelar" })).toBeNull();
    expect(stateBodies.length).toBeGreaterThan(0);
    expect(stateBodies.join("\n")).not.toContain('"participantId":"host"');
    expect(within(voting).getByRole("listitem", { name: /Helena/ }).textContent).not.toMatch(/Alto|♣/);

    const host = base({
      selfId: "host",
      permissions: permissions("host"),
      seats: voter.seats,
      ownVote: { card: "5", suit: "clubs" },
      roundState: "voting-own-card",
    });
    await boot(`/r/${CODE}`, host);
    const mesa = await screen.findByRole("region", { name: "Mesa" });
    onReveal = () => {
      snapshot = {
        ...host,
        round: "revealed",
        roundState: "revealed",
        votes: [HOST_CARD, { participantId: "voter", card: "5", suit: "spades" }],
        stats: divergenceStats(),
      };
    };
    fireEvent.click(within(mesa).getByRole("button", { name: "Revelar" }));
    const result = await screen.findByRole("region", { name: "Resultado" });
    expect(result.textContent).toContain("Alto");
    expect(result.textContent).toContain("Baixo");
    expect(within(mesa).getByRole("button", { name: "5" })).toHaveAttribute("aria-disabled", "true");
    expect(mesa.textContent).toMatch(/revelad/i);
    await waitFor(() => {
      expect(readPolite()).toMatch(/Alto/);
      expect(readPolite()).toMatch(/Baixo|diverg/i);
    });

    await boot(`/r/${CODE}`, {
      ...host,
      selfId: "olivia",
      permissions: permissions("observer"),
      round: "revealed",
      roundState: "revealed",
      ownVote: null,
      votes: [HOST_CARD, { participantId: "voter", card: "5", suit: "spades" }],
      stats: divergenceStats(),
    });
    const observer = await screen.findByRole("region", { name: "Mesa" });
    expect(within(observer).queryByRole("group", { name: "Baralho" })).toBeNull();
    expect(screen.getByRole("region", { name: "Resultado" }).textContent).toContain("Alto");
  });

  it("hides the mean number when showAverage is off and still shows the median", async () => {
    await boot(
      `/r/${MEAN_CODE}`,
      base({
        code: MEAN_CODE,
        selfId: "ana",
        round: "revealed",
        roundState: "revealed",
        showAverage: false,
        suitAxis: true,
        seats: [
          seat({ id: "ana", nickname: "Ana", mode: "voter", hasVoted: true }),
          seat({ id: "bia", nickname: "Bia", mode: "voter", hasVoted: true }),
          seat({ id: "caio", nickname: "Caio", mode: "voter", hasVoted: true }),
        ],
        ownVote: { card: "2", suit: "clubs" },
        votes: [
          { participantId: "ana", card: "2", suit: "clubs" },
          { participantId: "bia", card: "3", suit: "clubs" },
          { participantId: "caio", card: "13", suit: "clubs" },
        ],
        stats: hiddenMeanStats(),
        permissions: permissions("host"),
      }),
    );
    const result = await screen.findByRole("region", { name: "Resultado" });
    expect(result.textContent).toMatch(/Mediana/);
    expect(result.textContent).toContain("Ana");
    expect(result.textContent).toContain("Caio");
    expect(document.body.textContent ?? "").not.toMatch(/(^|[^\d])6([^\d]|$)/);
    expect(readPolite()).not.toMatch(/(^|[^\d])6([^\d]|$)/);
    expect(screen.getByRole("region", { name: "Mesa" })).toHaveAttribute("data-round-state", "revealed");
  });

  it("confirms a final estimate that differs from the mean and closes the picker", async () => {
    await boot(
      `/r/${CODE}`,
      base({
        selfId: "host",
        permissions: permissions("host"),
        round: "revealed",
        roundState: "revealed",
        ownVote: { card: "5", suit: "clubs" },
        votes: [HOST_CARD, { participantId: "voter", card: "5", suit: "spades" }],
        stats: divergenceStats(),
        seats: [
          seat({ id: "host", nickname: "Helena", mode: "voter", hasVoted: true }),
          seat({ id: "voter", nickname: "Bia", mode: "voter", hasVoted: true }),
        ],
      }),
    );
    const mesa = await screen.findByRole("region", { name: "Mesa" });
    fireEvent.click(within(mesa).getByRole("button", { name: "Estimativa final" }));
    const dialog = screen.getByRole("dialog", { name: "Estimativa final" });
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    onEstimate = () => {
      snapshot = { ...snapshot, roundState: "estimated", finalEstimate: "8" };
    };
    fireEvent.click(within(dialog).getByRole("button", { name: "8" }));
    fireEvent.click(within(dialog).getByRole("button", { name: "Confirmar" }));
    expect(mesa).toHaveAttribute("data-round-state", "estimated");
    expect(mesa.textContent).toMatch(/estimativa final/i);
    expect(mesa.textContent).toMatch(/8/);
    expect(screen.queryByRole("dialog", { name: "Estimativa final" })).toBeNull();
    const confirm = screen.queryByRole("button", { name: "Confirmar" });
    if (confirm) expect(confirm).not.toHaveAttribute("aria-busy", "true");
  });

  it("replaces the deck while AFK and keeps the round in voting", async () => {
    await boot(
      `/r/${CODE}`,
      base({
        seats: [seat({ id: "ada", nickname: "Ada", mode: "voter", afk: true })],
      }),
    );
    const mesa = await screen.findByRole("region", { name: "Mesa" });
    expect(mesa).toHaveAttribute("data-round-state", "voting-empty");
    expect(mesa.textContent).toContain("Você está ausente");
    expect(within(mesa).queryByRole("group", { name: "Baralho" })).toBeNull();
    onVote = () => {
      snapshot = { ...snapshot, seats: snapshot.seats.map((row) => ({ ...row, afk: false })) };
    };
    fireEvent.click(within(mesa).getByRole("button", { name: /voltar/i }));
    expect(await within(mesa).findByRole("group", { name: "Baralho" })).toBeTruthy();
    expect(mesa).toHaveAttribute("data-round-state", "voting-empty");
    expect(screen.queryByRole("region", { name: "Resultado" })).toBeNull();
  });

  it("keeps a single dialog open across queue, import, settings, estimate, and QR", async () => {
    await boot(
      `/r/${CODE}`,
      base({
        selfId: "host",
        permissions: permissions("host"),
        round: "revealed",
        roundState: "revealed",
        votes: [HOST_CARD],
        stats: divergenceStats(),
        items: [item("item-1", "Pagamento do boleto", "current"), item("item-2", "Alpha", "pending")],
      }),
    );
    const mesa = await screen.findByRole("region", { name: "Mesa" });
    fireEvent.click(within(mesa).getByRole("button", { name: "Fila" }));
    expect(screen.getByRole("dialog", { name: "Fila" })).toBeTruthy();
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));
    expect(screen.queryByRole("dialog", { name: "Fila" })).toBeNull();
    expect(screen.getByRole("dialog", { name: "Importar" })).toBeTruthy();
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    fireEvent.click(within(mesa).getByRole("button", { name: "Configurações" }));
    const settings = screen.getByRole("dialog", { name: "Configurações" });
    expect(screen.queryByRole("dialog", { name: "Importar" })).toBeNull();
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(settings.textContent).toMatch(/quem vota/i);
    expect(settings.textContent).toMatch(/próxima rodada/i);
    expect(within(settings).getByRole("group", { name: /Fibonacci/ })).toBeTruthy();
    expect(within(settings).getByRole("checkbox", { name: "Média" })).toBeTruthy();
    fireEvent.click(within(mesa).getByRole("button", { name: "Estimativa final" }));
    expect(screen.queryByRole("dialog", { name: "Configurações" })).toBeNull();
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    fireEvent.click(within(mesa).getByRole("button", { name: "Mostrar QR" }));
    const qr = screen.getByRole("dialog", { name: "QR da sala" });
    expect(screen.getAllByRole("dialog")).toHaveLength(1);
    expect(qr.querySelector("svg, canvas")).not.toBeNull();
    expect(qr.querySelector("img[src^='http']")).toBeNull();
  });

  it("confirms a 50-line import in order and clears the busy state", async () => {
    const lines = Array.from({ length: 50 }, (_, index) => `Linha ${String(index + 1).padStart(2, "0")}`);
    await boot(`/r/${CODE}`, base({ selfId: "host", permissions: permissions("host") }));
    const mesa = await screen.findByRole("region", { name: "Mesa" });
    fireEvent.click(within(mesa).getByRole("button", { name: "Fila" }));
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));
    const dialog = screen.getByRole("dialog", { name: "Importar" });
    expect(screen.queryByRole("dialog", { name: "Fila" })).toBeNull();
    fireEvent.change(within(dialog).getByRole("textbox", { name: /colar|texto|csv/i }), {
      target: { value: lines.join("\n") },
    });
    expect(dialog.textContent).toContain("Linha 01");
    expect(dialog.textContent?.indexOf("Linha 01") ?? -1).toBeLessThan(dialog.textContent?.indexOf("Linha 02") ?? -1);
    expect(dialog.textContent).toContain("Linha 50");
    holdImport = true;
    onImport = () => {
      snapshot = {
        ...snapshot,
        items: lines.map((title, index) => item(`line-${index + 1}`, title, index === 0 ? "current" : "pending")),
      };
    };
    const confirm = within(dialog).getByRole("button", { name: "Confirmar" });
    fireEvent.click(confirm);
    expect(confirm).toHaveAttribute("aria-busy", "true");
    releaseImport?.();
    releaseImport = null;
    const queue = await screen.findByRole("list", { name: "Fila" });
    const labels = within(queue).getAllByRole("listitem").map((row) => row.textContent ?? "");
    expect(labels).toHaveLength(50);
    expect(labels[0]).toContain("Linha 01");
    expect(labels[49]).toContain("Linha 50");
    const leftover = screen.queryByRole("button", { name: "Confirmar" });
    if (leftover) expect(leftover).not.toHaveAttribute("aria-busy", "true");
  });

  it("renders an https link with noopener and rejects an ftp link in the preview", async () => {
    await boot(`/r/${CODE}`, base({ selfId: "host", permissions: permissions("host"), items: [] }));
    const mesa = await screen.findByRole("region", { name: "Mesa" });
    fireEvent.click(within(mesa).getByRole("button", { name: "Fila" }));
    const queue = screen.getByRole("dialog", { name: "Fila" });
    fireEvent.change(within(queue).getByRole("textbox", { name: /título/i }), { target: { value: "Boleto" } });
    fireEvent.change(within(queue).getByRole("textbox", { name: /link/i }), {
      target: { value: "https://example.com/boleto" },
    });
    fireEvent.click(within(queue).getByRole("button", { name: "Adicionar" }));
    const link = await within(mesa).findByRole("link", { name: /example.com\/boleto/i });
    expect(link).toHaveAttribute("rel", "noopener noreferrer");
    fireEvent.click(screen.getByRole("button", { name: "Importar" }));
    const dialog = screen.getByRole("dialog", { name: "Importar" });
    expect(screen.queryByRole("dialog", { name: "Fila" })).toBeNull();
    fireEvent.change(within(dialog).getByRole("textbox", { name: /colar|texto|csv/i }), {
      target: { value: "Boleto;nota;ftp://files.example/boleto\nValido;nota;https://example.com/ok" },
    });
    expect(dialog.textContent).toMatch(/inválid|http\(s\)|somente http/i);
    expect(dialog.querySelector("a[href^='ftp:']")).toBeNull();
    expect(dialog.textContent).toContain("Valido");
  });

  it("announces a keyboard move of item 3 up to position 2", async () => {
    await boot(
      `/r/${CODE}`,
      base({
        selfId: "host",
        permissions: permissions("host"),
        items: [item("alpha", "Alpha", "current"), item("bravo", "Bravo"), item("charlie", "Charlie")],
      }),
    );
    const mesa = await screen.findByRole("region", { name: "Mesa" });
    fireEvent.click(within(mesa).getByRole("button", { name: "Fila" }));
    const queue = screen.getByRole("dialog", { name: "Fila" });
    const charlie = within(queue).getByRole("listitem", { name: /Charlie/ });
    const up = within(charlie).getByRole("button", { name: "Mover para cima" });
    expect(up.tagName).toBe("BUTTON");
    onReorder = () => {
      snapshot = {
        ...snapshot,
        items: [item("alpha", "Alpha", "current"), item("charlie", "Charlie"), item("bravo", "Bravo")],
      };
    };
    up.focus();
    await userEvent.keyboard("{Enter}");
    await waitFor(() => {
      expect(readPolite()).toMatch(/Charlie/);
      expect(readPolite()).toMatch(/2/);
    });
    const labels = within(screen.getByRole("list", { name: "Fila" }))
      .getAllByRole("listitem")
      .map((row) => row.textContent ?? "");
    expect(labels.findIndex((label) => label.includes("Charlie"))).toBeLessThan(labels.findIndex((label) => label.includes("Bravo")));
  });

  it("moves the timer through last 10 seconds and elapsed without revealing", async () => {
    await boot(`/r/${CODE}`, base({ selfId: "host", permissions: permissions("host") }));
    const mesa = await screen.findByRole("region", { name: "Mesa" });
    expect(mesa).toHaveAttribute("data-round-state", "voting-empty");
    expect(screen.getByRole("timer")).toHaveAttribute("data-timer-state", "off");
    onTimer = () => {
      snapshot = { ...snapshot, timerEndsAt: "2025-10-27T15:01:00.000Z" };
    };
    fireEvent.click(within(mesa).getByRole("button", { name: "Iniciar tempo" }));
    expect(await screen.findByRole("timer")).toHaveAttribute("data-timer-state", "running");
    expect(screen.getByRole("button", { name: /silenciar/i })).toBeTruthy();
    vi.useFakeTimers({ shouldAdvanceTime: true });
    vi.setSystemTime(new Date("2025-10-27T15:00:51.000Z"));
    await vi.advanceTimersByTimeAsync(51_000);
    const last = screen.getByRole("timer");
    expect(last).toHaveAttribute("data-timer-state", "last10");
    expect(last.textContent).toContain("Últimos 10 segundos");
    expect(mesa).toHaveAttribute("data-round-state", "voting-empty");
    vi.setSystemTime(new Date("2025-10-27T15:01:00.000Z"));
    await vi.advanceTimersByTimeAsync(9_000);
    expect(screen.getByRole("timer")).toHaveAttribute("data-timer-state", "elapsed");
    expect(screen.getByRole("timer").textContent).toContain("00:00");
    await waitFor(() => expect(readPolite()).toMatch(/00:00/));
    expect(mesa).toHaveAttribute("data-round-state", "voting-empty");
    expect(screen.queryByRole("region", { name: "Resultado" })).toBeNull();
    expect(snapshot.votes).toBeNull();
  });

  it("opens the projector for 30 humans without a seat, then refuses a 31st person", async () => {
    const seats = humans(30);
    const waiting = base({
      viewer: "screen",
      selfId: null,
      permissions: permissions("screen"),
      seats,
      round: null,
      roundState: "voting-empty",
      items: [item("item-1", "Pagamento do boleto", "pending")],
    });
    await boot(`/r/${CODE}/screen`, waiting, { width: 1920 });
    let projector = await screen.findByRole("region", { name: "Projetor" });
    expect(projector).toHaveAttribute("data-projector-state", "waiting");
    expect(within(projector).queryByRole("group", { name: "Baralho" })).toBeNull();
    expect(within(projector).queryByRole("button", { name: "Configurações" })).toBeNull();

    await boot(
      `/r/${CODE}/screen`,
      { ...waiting, round: "voting", items: [item("item-1", "Pagamento do boleto", "current")] },
      { width: 1920 },
    );
    projector = await screen.findByRole("region", { name: "Projetor" });
    expect(projector).toHaveAttribute("data-projector-state", "voting");
    expect(projector.textContent).toMatch(/Votou/);
    expect(projector.textContent).not.toMatch(/\b(1|2|3|5|8|13)\b/);
    expect(projector.textContent).not.toMatch(/[♣♥♠♦]/);
    expect(within(projector).queryByRole("group", { name: "Baralho" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Configurações" })).toBeNull();
    const heading = projector.querySelector("h1");
    expect(heading).not.toBeNull();
    expect(fontPx(heading as Element)).toBeGreaterThanOrEqual(48);
    expect(projector.querySelector("svg, canvas")).not.toBeNull();
    expect(stateBodies.length).toBeGreaterThan(0);
    expect(stateBodies.join("\n")).not.toContain("ROOM_FULL");
    expect(JSON.parse(stateBodies[0] ?? "{}").participants).toHaveLength(30);

    await boot(
      `/r/${CODE}/screen`,
      {
        ...waiting,
        round: "revealed",
        roundState: "revealed",
        votes: [HOST_CARD, { participantId: "voter", card: "5", suit: "spades" }],
        stats: divergenceStats(),
        items: [item("item-1", "Pagamento do boleto", "current")],
      },
      { width: 1920 },
    );
    projector = await screen.findByRole("region", { name: "Projetor" });
    expect(projector).toHaveAttribute("data-projector-state", "revealed");
    expect(projector.textContent).toContain("Alto");
    expect(within(projector).queryByRole("button", { name: "Configurações" })).toBeNull();
    expect(fontPx(projector.querySelector("h1") as Element)).toBeGreaterThanOrEqual(48);

    await boot(`/r/${CODE}/join`, waiting);
    fireEvent.change(screen.getByRole("textbox", { name: "Apelido" }), { target: { value: "Extra" } });
    fireEvent.click(screen.getByRole("button", { name: "Entrar" }));
    expect(await screen.findByText("A sala está cheia.")).toBeTruthy();
    expect(seats).toHaveLength(30);
  });

  it("uses no flip animation when reduced motion is on", async () => {
    await boot(
      `/r/${CODE}`,
      base({
        selfId: "host",
        permissions: permissions("host"),
        round: "revealed",
        roundState: "revealed",
        votes: [HOST_CARD, { participantId: "voter", card: "5", suit: "spades" }],
        stats: divergenceStats(),
      }),
      { reduce: true },
    );
    const mesa = await screen.findByRole("region", { name: "Mesa" });
    expect(screen.getByRole("region", { name: "Resultado" }).textContent).toContain("Alto");
    for (const node of mesa.querySelectorAll("*")) {
      expect(String(node.className)).not.toMatch(/flip|rotate3d|preserve-3d|rotateX|rotate-x/i);
    }
  });

  it("omits the suit control when the room turns the axis off", async () => {
    await boot(`/r/${CODE}`, base({ suitAxis: false }));
    const mesa = await screen.findByRole("region", { name: "Mesa" });
    expect(within(mesa).getByRole("group", { name: "Baralho" })).toBeTruthy();
    expect(within(mesa).getByRole("button", { name: "Coringa" })).toBeTruthy();
    expect(within(mesa).queryByRole("button", { name: /naipe/i })).toBeNull();
    expect(within(mesa).queryByRole("group", { name: /naipe/i })).toBeNull();
    expect(within(mesa).queryByRole("radiogroup", { name: /naipe/i })).toBeNull();
  });
});
