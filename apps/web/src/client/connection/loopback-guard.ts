interface HappyDomSettings {
  disableCSSFileLoading?: boolean;
  disableJavaScriptFileLoading?: boolean;
  navigation?: { disableMainFrameNavigation?: boolean };
  fetch?: {
    interceptor?: {
      beforeAsyncRequest?: (input: { request: Request; window: Window }) => Response | undefined | Promise<Response | undefined>;
      beforeSyncRequest?: (input: { request: Request; window: Window }) => Response | undefined;
    } | null;
  };
}

interface HappyDomWindow extends Window {
  happyDOM?: {
    settings?: HappyDomSettings;
    abort?: () => Promise<void> | void;
  };
}

const guardedWindows = new WeakSet<Window>();

/**
 * Happy-dom's document URL is http://localhost:3000. Relative fetches and
 * navigations otherwise open a real socket and log ECONNREFUSED.
 * Test stubs replace `fetch` before boot and must still observe the call.
 */
export function installLoopbackGuard(): void {
  if (typeof window === "undefined" || guardedWindows.has(window)) return;
  const happy = (window as HappyDomWindow).happyDOM;
  if (!happy?.settings) return;
  guardedWindows.add(window);

  happy.settings.disableCSSFileLoading = true;
  happy.settings.disableJavaScriptFileLoading = true;
  if (happy.settings.navigation) happy.settings.navigation.disableMainFrameNavigation = true;

  const closed = (): Response =>
    new Response(null, {
      status: 204,
      headers: { "content-type": "application/json" },
    });

  const mockIfLoopback = (request: Request): Response | undefined => {
    if (!isTestLoopback(request.url)) return undefined;
    return closed();
  };

  happy.settings.fetch ??= {};
  happy.settings.fetch.interceptor = {
    beforeAsyncRequest: ({ request }) => mockIfLoopback(request),
    beforeSyncRequest: ({ request }) => mockIfLoopback(request),
  };

  const current = globalThis.fetch;
  if (typeof current !== "function" || "mock" in current) return;
  const native = current.bind(globalThis);
  const guarded: typeof fetch = (input, init) => {
    const live = globalThis.fetch;
    if (live !== guarded) return live(input, init);
    if (isTestLoopback(resolveFetchUrl(input))) return Promise.resolve(closed());
    return native(input, init);
  };
  globalThis.fetch = guarded;
}

installLoopbackGuard();

function resolveFetchUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") return new URL(input, window.location.href).href;
  if (input instanceof URL) return input.href;
  return input.url;
}

function isTestLoopback(value: string): boolean {
  try {
    const url = new URL(value, window.location.href);
    const host = url.hostname;
    const loopback = host === "localhost" || host === "127.0.0.1" || host === "[::1]" || host === "::1";
    return loopback && url.port === "3000";
  } catch {
    return false;
  }
}
