import "./connection/loopback-guard.js";
import { QueryClientProvider } from "@tanstack/react-query";
import { RouterProvider } from "@tanstack/react-router";
import { StrictMode } from "react";
import { flushSync } from "react-dom";
import { createRoot } from "react-dom/client";
import { I18nProvider } from "./i18n/index.js";
import { LiveAnnouncerProvider } from "./providers/live-announcer.js";
import { ThemeProvider } from "./providers/theme-provider.js";
import { createQueryClient } from "./query-client.js";
import { router } from "./router.js";
import "./styles/global.css";

const queryClient = createQueryClient();

function App() {
  return (
    <StrictMode>
      <I18nProvider>
        <LiveAnnouncerProvider>
          <ThemeProvider>
            <QueryClientProvider client={queryClient}>
              <RouterProvider router={router} />
            </QueryClientProvider>
          </ThemeProvider>
        </LiveAnnouncerProvider>
      </I18nProvider>
    </StrictMode>
  );
}

const bootGeneration = Symbol.for("fibonaipe.client-boot");
const bootScope = globalThis as typeof globalThis & { [bootGeneration]?: number };
const bootToken = (bootScope[bootGeneration] ?? 0) + 1;
bootScope[bootGeneration] = bootToken;

const rootElement = document.getElementById("root");
if (rootElement) {
  await router.load();
  if (bootScope[bootGeneration] === bootToken && rootElement.isConnected !== false) {
    flushSync(() => {
      createRoot(rootElement).render(<App />);
    });
  }
}

registerServiceWorker();

function registerServiceWorker(): void {
  const meta = import.meta as ImportMeta & { readonly env?: { readonly PROD?: boolean } };
  if (meta.env?.PROD !== true) return;
  if (!("serviceWorker" in navigator)) return;
  window.addEventListener("load", () => {
    void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
  });
}
