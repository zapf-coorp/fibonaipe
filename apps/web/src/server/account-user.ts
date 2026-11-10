import type { PersistedUserRecord } from "@fibonaipe/application";
import { UserId, ok } from "@fibonaipe/domain";
import type { Context } from "hono";
import type { AppContainer } from "./composition.js";
import { readAccountToken } from "./session-cookie.js";

export async function accountUser(c: Context, container: AppContainer): Promise<PersistedUserRecord | null> {
  const token = readAccountToken(c.req.header("cookie"));
  if (!token) return null;
  const identity = await container.authProvider.verifySessionToken(token);
  if (!identity.ok) return null;
  const userId = UserId.create(identity.value.userId);
  if (!userId.ok) return null;
  const loaded = await container.persistence.transaction({}, async (repos) => ok(await repos.users.findById(userId.value)));
  if (!loaded.ok) return null;
  return loaded.value;
}
