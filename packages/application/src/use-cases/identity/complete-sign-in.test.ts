import { ok, UserId } from "@fibonaipe/domain";
import { FakeAuthProvider, type InMemoryPersistence } from "@fibonaipe/testing";
import { describe, expect, it } from "vitest";
import { CompleteSignIn } from "./complete-sign-in.js";
import { SuspendUser } from "./suspend-user.js";
import { createPorts, type Harness } from "../__tests__/harness.js";

const REDIRECT = "https://app.example/callback";

async function readUser(store: InMemoryPersistence, id: string) {
  const parsed = UserId.create(id);
  if (!parsed.ok) throw new Error(parsed.error.code);
  const result = await store.transaction({}, async (repos) => ok(await repos.users.findById(parsed.value)));
  if (!result.ok) throw new Error(result.error.code);
  return result.value;
}

async function complete(ports: Harness, auth: FakeAuthProvider, email: string, superAdminEmails: readonly string[]) {
  await auth.sendMagicLink(email, REDIRECT);
  return new CompleteSignIn(ports.deps, auth).execute({
    token: auth.latestMagicLinkToken(),
    superAdminEmails,
  });
}

describe("CompleteSignIn", () => {
  it("returns AUTH_LINK_INVALID when the magic link is used twice", async () => {
    const ports = createPorts();
    const auth = new FakeAuthProvider();
    await auth.sendMagicLink("ada@example.com", REDIRECT);
    const token = auth.latestMagicLinkToken();
    const login = new CompleteSignIn(ports.deps, auth);
    const first = await login.execute({ token, superAdminEmails: [] });
    expect(first.ok, JSON.stringify(first)).toBe(true);
    const second = await login.execute({ token, superAdminEmails: [] });
    expect(second.ok).toBe(false);
    if (second.ok) throw new Error("expected AUTH_LINK_INVALID");
    expect(second.error.code).toBe("AUTH_LINK_INVALID");
    expect(second.error.messageKey).toBe("errors.AUTH_LINK_INVALID");
    expect(JSON.stringify(ports.logArgs)).not.toContain(token);
    expect(ports.logs.forbiddenKeys()).toEqual([]);
  });

  it("stores the email lowercased and grants superadmin only from the injected list", async () => {
    const ports = createPorts();
    const auth = new FakeAuthProvider();
    const admin = await complete(ports, auth, "Ada@Example.com", ["ada@example.com"]);
    expect(admin.ok, JSON.stringify(admin)).toBe(true);
    if (!admin.ok) throw new Error(admin.error.code);
    expect(admin.value.email).toBe("ada@example.com");
    expect(admin.value.isSuperAdmin).toBe(true);
    expect((await readUser(ports.store, admin.value.userId))?.email).toBe("ada@example.com");

    const flagged = await complete(ports, auth, "bea@example.com", []);
    expect(flagged.ok, JSON.stringify(flagged)).toBe(true);
    if (!flagged.ok) throw new Error(flagged.error.code);
    expect(flagged.value.isSuperAdmin).toBe(false);

    await auth.sendMagicLink("bea@example.com", REDIRECT);
    const clientFlag = await new CompleteSignIn(ports.deps, auth).execute({
      token: auth.latestMagicLinkToken(),
      superAdminEmails: [],
      isSuperAdmin: true,
    });
    expect(clientFlag.ok, JSON.stringify(clientFlag)).toBe(true);
    if (!clientFlag.ok) throw new Error(clientFlag.error.code);
    expect(clientFlag.value.isSuperAdmin).toBe(false);
    expect(JSON.stringify(clientFlag)).not.toContain("SUPERADMIN_EMAILS");
  });

  it("returns ACCOUNT_SUSPENDED when a suspended user completes sign-in", async () => {
    const ports = createPorts();
    const auth = new FakeAuthProvider();
    const first = await complete(ports, auth, "suspended@example.com", []);
    expect(first.ok, JSON.stringify(first)).toBe(true);
    if (!first.ok) throw new Error(first.error.code);
    const suspended = await new SuspendUser(ports.deps, auth).execute({
      actorSystemRole: "superAdmin",
      targetUserId: first.value.userId,
    });
    expect(suspended.ok, JSON.stringify(suspended)).toBe(true);

    const again = await complete(ports, auth, "suspended@example.com", []);
    expect(again.ok).toBe(false);
    if (again.ok) throw new Error("expected ACCOUNT_SUSPENDED");
    expect(again.error.code).toBe("ACCOUNT_SUSPENDED");
    expect(again.error.messageKey).toBe("errors.ACCOUNT_SUSPENDED");
  });
});
