import { createRootRoute, createRoute, createRouter } from "@tanstack/react-router";
import { setConnectionStatus } from "./connection/status.js";
import { AppShell } from "./components/shell/AppShell.js";
import { HomePage } from "./pages/HomePage.js";
import { JoinRoomPage } from "./pages/JoinRoomPage.js";
import { ProjectorPage } from "./pages/ProjectorPage.js";
import { RoomPage } from "./pages/RoomPage.js";
import { SprintList } from "../features/sprints/SprintList.js";
import { SprintDetail } from "../features/sprints/SprintDetail.js";
import { ForecastDashboard } from "../features/forecast/ForecastDashboard.js";

const rootRoute = createRootRoute({
  component: AppShell,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    setConnectionStatus("connected");
  },
  component: HomePage,
});

const joinRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/r/$code/join",
  beforeLoad: () => {
    setConnectionStatus("connected");
  },
  component: JoinRoomPage,
});

const roomRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/r/$code",
  beforeLoad: () => {
    setConnectionStatus("reconnecting");
  },
  component: RoomPage,
});

const screenRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/r/$code/screen",
  component: ProjectorPage,
});

const sprintsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/teams/$teamId/sprints",
  component: () => <SprintList teamId={sprintsRoute.useParams().teamId} />,
});
const sprintDetailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/teams/$teamId/sprints/$sprintId",
  component: () => { const { teamId, sprintId } = sprintDetailRoute.useParams(); return <SprintDetail teamId={teamId} sprintId={sprintId} />; },
});
const dashboardRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/teams/$teamId/dashboard",
  component: () => <ForecastDashboard teamId={dashboardRoute.useParams().teamId} />,
});

const routeTree = rootRoute.addChildren([indexRoute, joinRoute, roomRoute, screenRoute, sprintsRoute, sprintDetailRoute, dashboardRoute]);

export const router = createRouter({
  routeTree,
  defaultPreload: false,
});

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
