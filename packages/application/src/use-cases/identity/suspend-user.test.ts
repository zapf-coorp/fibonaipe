import { FakeAuthProvider } from "@fibonaipe/testing";
import { describe, expect, it } from "vitest";
import { asOk, createPorts } from "../__tests__/harness.js";
import { CompleteSignIn } from "./complete-sign-in.js";
import { SuspendUser } from "./suspend-user.js";

const REDIRECT = "https://app.example/callback";

describe("SuspendUser", () => {
  it("revokes the current session and leaves a non-admin unable to suspend", async () => {
    const ports = createPorts();
    const auth = new FakeAuthProvider();
    await auth.sendMagicLink("ada@example.com", REDIRECT);
    const user = asOk(
      await new CompleteSignIn(ports.deps, auth).execute({
        token: auth.latestMagicLinkToken(),
        superAdminEmails: [],
      }),
    );
    const session = auth.latestSessionToken();
    expect((await auth.verifySessionToken(session)).ok).toBe(true);

    const denied = await new SuspendUser(ports.deps, auth).execute({
      targetUserId: user.userId,
    });
    expect(denied.ok).toBe(false);
    if (denied.ok) throw new Error("expected FORBIDDEN");
    expect(denied.error.code).toBe("FORBIDDEN");
    expect(denied.error.messageKey).toBe("errors.FORBIDDEN");
    expect((await auth.verifySessionToken(session)).ok).toBe(true);

    const suspended = await new SuspendUser(ports.deps, auth).execute({
      actorSystemRole: "superAdmin",
      targetUserId: user.userId,
    });
    expect(suspended.ok, JSON.stringify(suspended)).toBe(true);
    expect((await auth.verifySessionToken(session)).ok).toBe(false);
    expect(JSON.stringify(ports.logArgs)).not.toContain(session);
    expect(ports.logs.forbiddenKeys()).toEqual([]);
  });
});
