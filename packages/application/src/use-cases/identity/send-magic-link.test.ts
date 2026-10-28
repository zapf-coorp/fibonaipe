import type { AppError, Result } from "@fibonaipe/domain";
import { FakeAuthProvider } from "@fibonaipe/testing";
import { describe, expect, it } from "vitest";
import { CompleteSignIn } from "./complete-sign-in.js";
import { SendMagicLink } from "./send-magic-link.js";
import { asOk, createPorts, type Harness } from "../__tests__/harness.js";

const REDIRECT = "https://app.example/callback";

function publicValue(result: Result<unknown, AppError>): unknown {
  if (!result.ok) return result;
  const value = { ...(result.value as Record<string, unknown>) };
  delete value.challengeId;
  delete value.token;
  return { ok: true, value };
}

async function signIn(ports: Harness, auth: FakeAuthProvider, email: string): Promise<{ userId: string }> {
  await auth.sendMagicLink(email, REDIRECT);
  return asOk(
    await new CompleteSignIn(ports.deps, auth).execute({
      token: auth.latestMagicLinkToken(),
      superAdminEmails: [],
    }),
  );
}

describe("SendMagicLink", () => {
  it("returns the same result shape for an unknown email and a known email without leaking either address", async () => {
    const ports = createPorts();
    const auth = new FakeAuthProvider();
    await signIn(ports, auth, "ada@example.com");
    const send = new SendMagicLink(ports.deps, auth);
    const known = await send.execute({ email: "Ada@Example.com", ip: "203.0.113.10", redirectUrl: REDIRECT });
    const unknown = await send.execute({ email: "nobody@example.com", ip: "203.0.113.11", redirectUrl: REDIRECT });

    expect(known.ok).toBe(true);
    expect(unknown.ok).toBe(true);
    expect(publicValue(unknown)).toEqual(publicValue(known));
    const body = JSON.stringify([known, unknown]).toLowerCase();
    expect(body).not.toContain("ada@example.com");
    expect(body).not.toContain("nobody@example.com");
    expect(body).not.toMatch(/exists|not found|unknown/);
    expect(JSON.stringify(ports.logArgs).toLowerCase()).not.toContain("ada@example.com");
    expect(ports.logs.forbiddenKeys()).toEqual([]);
  });

  it("still accepts a link request for a suspended user", async () => {
    const ports = createPorts();
    const auth = new FakeAuthProvider();
    await auth.sendMagicLink("suspended@example.com", REDIRECT);
    await auth.verifyMagicLink(auth.latestMagicLinkToken());
    auth.suspendCurrentUser();
    const sent = await new SendMagicLink(ports.deps, auth).execute({
      email: "suspended@example.com",
      ip: "203.0.113.12",
      redirectUrl: REDIRECT,
    });
    expect(sent.ok).toBe(true);
    if (!sent.ok) {
      expect(sent.error.code).not.toBe("ACCOUNT_SUSPENDED");
    }
  });

  it("returns RATE_LIMITED on the 6th link for one email within the hour and allows it after the clock advances", async () => {
    const ports = createPorts();
    const auth = new FakeAuthProvider();
    const send = new SendMagicLink(ports.deps, auth);
    const emails = ["Ada@Example.com", "ada@example.com", "ADA@example.com", "ada@EXAMPLE.com", "ada@example.com"];
    for (let index = 0; index < emails.length; index += 1) {
      const sent = await send.execute({
        email: emails[index] ?? "ada@example.com",
        ip: `203.0.113.${index + 1}`,
        redirectUrl: REDIRECT,
      });
      expect(sent.ok, JSON.stringify(sent)).toBe(true);
    }

    const before = auth.latestMagicLinkToken();
    const limited = await send.execute({ email: "ada@example.com", ip: "203.0.113.90", redirectUrl: REDIRECT });
    expect(limited.ok).toBe(false);
    if (limited.ok) throw new Error("expected RATE_LIMITED");
    expect(limited.error.code).toBe("RATE_LIMITED");
    expect(limited.error.messageKey).toBe("errors.RATE_LIMITED");
    expect(Number(limited.error.params?.retryAfterSec)).toBeGreaterThan(0);
    expect(auth.latestMagicLinkToken()).toBe(before);

    ports.clock.advanceSeconds(3600);
    const again = await send.execute({ email: "ada@example.com", ip: "203.0.113.90", redirectUrl: REDIRECT });
    expect(again.ok, JSON.stringify(again)).toBe(true);
  });

  it("returns RATE_LIMITED on the 21st link from one IP within the hour", async () => {
    const ports = createPorts();
    const auth = new FakeAuthProvider();
    const send = new SendMagicLink(ports.deps, auth);
    const ip = "198.51.100.20";
    for (let index = 0; index < 20; index += 1) {
      const sent = await send.execute({
        email: `user${index}@example.com`,
        ip,
        redirectUrl: REDIRECT,
      });
      expect(sent.ok, JSON.stringify(sent)).toBe(true);
    }

    const before = auth.latestMagicLinkToken();
    const limited = await send.execute({ email: "extra@example.com", ip, redirectUrl: REDIRECT });
    expect(limited.ok).toBe(false);
    if (limited.ok) throw new Error("expected RATE_LIMITED");
    expect(limited.error.code).toBe("RATE_LIMITED");
    expect(limited.error.messageKey).toBe("errors.RATE_LIMITED");
    expect(Number(limited.error.params?.retryAfterSec)).toBeGreaterThan(0);
    expect(auth.latestMagicLinkToken()).toBe(before);
  });
});
