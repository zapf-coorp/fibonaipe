// @vitest-environment happy-dom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, expect, it, vi } from "vitest";
import { I18nProvider } from "../../src/client/i18n/index.js";
import { DevLoginPage } from "../../src/features/auth/DevLoginPage.js";

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const USERS = [
  { userId: "dev-host", email: "host@fibonaipe.dev", displayName: "Host", role: "teamAdmin" },
  { userId: "dev-alice", email: "alice@fibonaipe.dev", displayName: "Alice", role: "pm" },
  { userId: "dev-bruno", email: "bruno@fibonaipe.dev", displayName: "Bruno", role: "dev" },
  { userId: "dev-carla", email: "carla@fibonaipe.dev", displayName: "Carla", role: "qa" },
];

it("lists the fake users and signs in with email", async () => {
  const onSignedIn = vi.fn();
  const fetcher = vi.fn(async (url: RequestInfo | URL, init?: RequestInit) => {
    if (String(url).endsWith("/status")) {
      return new Response(JSON.stringify({ enabled: true, users: USERS }), { status: 200 });
    }
    expect(init?.method).toBe("POST");
    return new Response(JSON.stringify({ user: { email: "host@fibonaipe.dev" }, method: "email" }), { status: 200 });
  });
  vi.stubGlobal("fetch", fetcher);
  render(<I18nProvider><DevLoginPage onSignedIn={onSignedIn} /></I18nProvider>);

  expect(await screen.findByText("Host")).toBeTruthy();
  expect(screen.getByText("host@fibonaipe.dev")).toBeTruthy();
  expect(screen.getAllByRole("button", { name: "Entrar com e-mail" })).toHaveLength(4);

  fireEvent.click(screen.getAllByRole("button", { name: "Entrar com e-mail" })[0]!);

  await waitFor(() => expect(onSignedIn).toHaveBeenCalledTimes(1));
  expect(fetcher).toHaveBeenLastCalledWith(
    "/api/dev/auth/login",
    expect.objectContaining({
      method: "POST",
      body: JSON.stringify({ email: "host@fibonaipe.dev", method: "email" }),
    }),
  );
});

it("shows a disabled message when the dev routes are unavailable", async () => {
  vi.stubGlobal("fetch", vi.fn(async () => new Response("{}", { status: 404 })));
  render(<I18nProvider><DevLoginPage /></I18nProvider>);
  expect(await screen.findByText(/Login de desenvolvimento indisponível/)).toBeTruthy();
});
