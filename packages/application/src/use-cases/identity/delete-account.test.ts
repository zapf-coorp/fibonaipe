import { ok, TeamId, UserId } from "@fibonaipe/domain";
import { FakeAuthProvider, type InMemoryPersistence } from "@fibonaipe/testing";
import { describe, expect, it } from "vitest";
import { AcceptInvite } from "../teams/accept-invite.js";
import { CreateInvite } from "../teams/create-invite.js";
import { CreateTeam } from "../teams/create-team.js";
import { asOk, createPorts, type Harness } from "../__tests__/harness.js";
import { CompleteSignIn } from "./complete-sign-in.js";
import { DeleteAccount } from "./delete-account.js";

const REDIRECT = "https://app.example/callback";

async function readUser(store: InMemoryPersistence, id: string) {
  const parsed = UserId.create(id);
  if (!parsed.ok) throw new Error(parsed.error.code);
  const result = await store.transaction({}, async (repos) => ok(await repos.users.findById(parsed.value)));
  if (!result.ok) throw new Error(result.error.code);
  return result.value;
}

async function readTeam(store: InMemoryPersistence, id: string) {
  const parsed = TeamId.create(id);
  if (!parsed.ok) throw new Error(parsed.error.code);
  const result = await store.transaction({}, async (repos) => ok(await repos.teams.findById(parsed.value)));
  if (!result.ok) throw new Error(result.error.code);
  return result.value;
}

function storeText(store: InMemoryPersistence): string {
  const internal = store as unknown as {
    store?: {
      users: Map<string, unknown>;
      teams: Map<string, unknown>;
      rooms: Map<string, unknown>;
      history: Map<string, unknown>;
      audits: Map<string, unknown>;
    };
  };
  const memory = internal.store;
  if (!memory) return JSON.stringify(store);
  return JSON.stringify({
    users: [...memory.users.values()],
    teams: [...memory.teams.values()],
    rooms: [...memory.rooms.values()],
    history: [...memory.history.values()],
    audits: [...memory.audits.values()],
  });
}

async function signIn(ports: Harness, auth: FakeAuthProvider, email: string) {
  await auth.sendMagicLink(email, REDIRECT);
  return asOk(
    await new CompleteSignIn(ports.deps, auth).execute({
      token: auth.latestMagicLinkToken(),
      superAdminEmails: [],
    }),
  );
}

describe("DeleteAccount", () => {
  it("refuses a confirmation that does not match and keeps the user", async () => {
    const ports = createPorts();
    const auth = new FakeAuthProvider();
    const user = await signIn(ports, auth, "ada@example.com");
    const denied = await new DeleteAccount(ports.deps, auth).execute({
      userId: user.userId,
      confirmEmail: "other@example.com",
    });
    expect(denied.ok).toBe(false);
    if (denied.ok) throw new Error("expected the delete to fail");
    expect(denied.error.messageKey).toBe(`errors.${denied.error.code}`);
    expect((await readUser(ports.store, user.userId))?.email).toBe("ada@example.com");
    expect(storeText(ports.store).toLowerCase()).toContain("ada@example.com");
  });

  it("returns LAST_ADMIN when the only admin deletes and other members exist", async () => {
    const ports = createPorts();
    const auth = new FakeAuthProvider();
    const admin = await signIn(ports, auth, "ada@example.com");
    const adminSession = auth.latestSessionToken();
    const member = await signIn(ports, auth, "bea@example.com");
    const team = asOk(await new CreateTeam(ports.deps).execute({ name: "Bridge", creatorUserId: admin.userId }));
    const invite = asOk(
      await new CreateInvite(ports.deps).execute({ teamId: team.teamId, actorUserId: admin.userId, role: "dev" }),
    );
    const accepted = await new AcceptInvite(ports.deps).execute({ token: invite.token, userId: member.userId });
    expect(accepted.ok, JSON.stringify(accepted)).toBe(true);

    const denied = await new DeleteAccount(ports.deps, auth).execute({
      userId: admin.userId,
      confirmEmail: "ada@example.com",
    });
    expect(denied.ok).toBe(false);
    if (denied.ok) throw new Error("expected LAST_ADMIN");
    expect(denied.error.code).toBe("LAST_ADMIN");
    expect(denied.error.messageKey).toBe("errors.LAST_ADMIN");
    expect((await readUser(ports.store, admin.userId))?.email).toBe("ada@example.com");
    expect(await readTeam(ports.store, team.teamId)).not.toBeNull();
    expect((await auth.verifySessionToken(adminSession)).ok).toBe(true);
  });

  it("removes the sole member, the team, and every stored copy of the email", async () => {
    const ports = createPorts();
    const auth = new FakeAuthProvider();
    const user = await signIn(ports, auth, "ada@example.com");
    const team = asOk(await new CreateTeam(ports.deps).execute({ name: "Bridge", creatorUserId: user.userId }));
    const session = auth.latestSessionToken();
    const deleted = await new DeleteAccount(ports.deps, auth).execute({
      userId: user.userId,
      confirmEmail: "ada@example.com",
    });
    expect(deleted.ok, JSON.stringify(deleted)).toBe(true);
    expect(await readUser(ports.store, user.userId)).toBeNull();
    expect(await readTeam(ports.store, team.teamId)).toBeNull();
    expect(storeText(ports.store).toLowerCase()).not.toContain("ada@example.com");
    expect((await auth.verifySessionToken(session)).ok).toBe(false);
    expect(JSON.stringify(ports.logArgs).toLowerCase()).not.toContain("ada@example.com");
    expect(ports.logs.forbiddenKeys()).toEqual([]);
  });
});
