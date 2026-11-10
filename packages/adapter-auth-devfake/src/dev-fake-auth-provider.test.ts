import { describe, expect, it } from "vitest";
import type { Clock, IdGenerator } from "@fibonaipe/application";
import { UserId } from "@fibonaipe/domain";
import { DEV_AUTH_USERS, DevFakeAuthProvider } from "./dev-fake-auth-provider.js";

const NOW = new Date("2026-11-09T12:00:00.000Z");

function harness() {
  const clock: Clock = { now: () => NOW };
  let sequence = 0;
  const ids: IdGenerator = {
    newId: () => `id-${++sequence}`,
    newRoomCode: () => "ABCD2345",
    newToken: () => `token-${++sequence}`,
    sha256: (input) => `hash:${input}`,
  };
  return { clock, ids, auth: new DevFakeAuthProvider({ clock, ids }) };
}

describe("DevFakeAuthProvider", () => {
  it("seeds four users with Host first", () => {
    const { auth } = harness();
    const users = auth.listUsers();
    expect(users).toHaveLength(4);
    expect(users[0]).toMatchObject({ displayName: "Host", email: "host@fibonaipe.dev", role: "teamAdmin" });
    expect(users.map((user) => user.email)).toEqual(DEV_AUTH_USERS.map((user) => user.email));
  });

  it("signs in with email through the magic-link verification path", async () => {
    const { auth } = harness();
    const result = await auth.signInWithEmail("host@fibonaipe.dev");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.method).toBe("email");
    expect(result.value.identity).toMatchObject({ email: "host@fibonaipe.dev", displayName: "Host" });
    expect(result.value.sessionToken.length).toBeGreaterThan(0);

    const verified = await auth.verifySessionToken(result.value.sessionToken);
    expect(verified.ok).toBe(true);
    if (verified.ok) expect(verified.value.userId).toBe(result.value.identity.userId);
  });

  it("signs in with Google through the code exchange path", async () => {
    const { auth } = harness();
    const result = await auth.signInWithGoogle("bruno@fibonaipe.dev");
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.method).toBe("google");
    expect(result.value.identity).toMatchObject({ email: "bruno@fibonaipe.dev", displayName: "Bruno" });
    expect((await auth.verifySessionToken(result.value.sessionToken)).ok).toBe(true);
  });

  it("rejects a magic link after it was used once", async () => {
    const { auth } = harness();
    await auth.sendMagicLink("alice@fibonaipe.dev", "https://app.example/callback");
    const token = auth.latestMagicLinkToken();
    expect((await auth.verifyMagicLink(token)).ok).toBe(true);
    expect((await auth.verifyMagicLink(token)).ok).toBe(false);
  });

  it("revokes every session for a user", async () => {
    const { auth } = harness();
    const first = await auth.signInWithEmail("carla@fibonaipe.dev");
    const second = await auth.signInWithGoogle("carla@fibonaipe.dev");
    if (!first.ok || !second.ok) throw new Error("sign-in failed");
    const userId = UserId.create(first.value.identity.userId);
    if (!userId.ok) throw new Error("invalid id");

    expect((await auth.revokeUserSessions(userId.value)).ok).toBe(true);
    expect((await auth.verifySessionToken(first.value.sessionToken)).ok).toBe(false);
    expect((await auth.verifySessionToken(second.value.sessionToken)).ok).toBe(false);
  });
});
