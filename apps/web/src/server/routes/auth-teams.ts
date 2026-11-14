import type { Hono } from "hono";
import type { AppContainer } from "../composition.js";
import { registerAuthRoutes } from "./auth-routes.js";
import { registerSprintRoutes } from "./sprint-routes.js";
import { registerTeamRoutes } from "./team-routes.js";

/** Registers every auth, team, and sprint HTTP route; the groups live in sibling modules. */
export function registerAuthTeamRoutes(app: Hono, container: AppContainer): void {
  registerAuthRoutes(app, container);
  registerTeamRoutes(app, container);
  registerSprintRoutes(app, container);
}

