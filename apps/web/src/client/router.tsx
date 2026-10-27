import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { AppShell } from "./components/shell/AppShell.js";
import { HomePage } from "./pages/HomePage.js";
import { RoomPlaceholderPage } from "./pages/RoomPlaceholderPage.js";

const rootRoute = createRootRoute({
  component: AppShell,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: HomePage,
});

const roomRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/r/$code",
  component: RoomPlaceholderPage,
});

const screenRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/r/$code/screen",
  component: RoomPlaceholderPage,
});

const routeTree = rootRoute.addChildren([indexRoute, roomRoute, screenRoute]);

export const router = createRouter({
  routeTree,
  defaultPreload: false,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
