import { describe, expect, it } from "vitest";
import { ok, type AppError, type Result } from "@fibonaipe/domain";
import type { AuthProvider, AuthenticatedIdentity } from "@fibonaipe/application";

export interface AuthProviderContractHarness {
  readonly provider: AuthProvider;
  latestMagicLinkToken(): string;
  latestGoogleCode(): string;
  latestSessionToken(): string;
  suspendCurrentUser(): void | Promise<void>;
}

const redirectUrl = "https://app.example/callback";

export function describeAuthProviderContract(name: string, factory: () => AuthProviderContractHarness): void {
  describe(name, () => {
    it("rejects a malformed email with VALIDATION", async () => {
      const { provider } = factory();
      for (const email of ["", "plain", "a @b.com", "@example.com", "user@", "user@@example.com"]) {
        const result = await provider.sendMagicLink(email, redirectUrl);
        expectError(result, "VALIDATION");
      }
    });

    it("consumes a magic link once and rejects a second use", async () => {
      const harness = factory();
      const sent = await harness.provider.sendMagicLink(" User@Example.com ", redirectUrl);
      expect(sent.ok).toBe(true);
      if (!sent.ok) throw new Error(sent.error.messageKey);
      expect(sent.value.challengeId.length).toBeGreaterThan(0);

      expectError(await harness.provider.verifyMagicLink("not-a-real-token"), "AUTH_LINK_INVALID");

      const token = harness.latestMagicLinkToken();
      expect(token.length).toBeGreaterThan(0);
      const identity = await harness.provider.verifyMagicLink(token);
      expectIdentity(identity, "user@example.com");
      expectError(await harness.provider.verifyMagicLink(token), "AUTH_LINK_INVALID");
    });

    it("exchanges a Google code once and puts the state on the authorization url", async () => {
      const harness = factory();
      const urlResult = harness.provider.getGoogleAuthUrl("state-1", redirectUrl);
      expect(urlResult.ok).toBe(true);
      if (!urlResult.ok) throw new Error(urlResult.error.messageKey);
      expect(new URL(urlResult.value.url).searchParams.get("state")).toBe("state-1");

      expectError(
        await harness.provider.exchangeGoogleCode("not-a-code", redirectUrl),
        "AUTH_LINK_INVALID",
      );

      const code = harness.latestGoogleCode();
      const identity = await harness.provider.exchangeGoogleCode(code, redirectUrl);
      expectIdentity(identity, "google.user@example.com");
      expectError(await harness.provider.exchangeGoogleCode(code, redirectUrl), "AUTH_LINK_INVALID");
    });

    it("verifies the session issued by a magic link and rejects it after revocation", async () => {
      const harness = factory();
      await harness.provider.sendMagicLink("ada@example.com", redirectUrl);
      const identity = await harness.provider.verifyMagicLink(harness.latestMagicLinkToken());
      expectIdentity(identity, "ada@example.com");
      if (!identity.ok) throw new Error(identity.error.messageKey);

      const session = harness.latestSessionToken();
      const verified = await harness.provider.verifySessionToken(session);
      expectIdentity(verified, "ada@example.com");
      if (!verified.ok) throw new Error(verified.error.messageKey);
      expect(verified.value.userId).toBe(identity.value.userId);

      const revoked = await harness.provider.revokeUserSessions(identity.value.userId);
      expect(revoked).toEqual(ok(undefined));
      expectError(await harness.provider.verifySessionToken(session), "AUTH_LINK_INVALID");
    });

    it("returns ACCOUNT_SUSPENDED for a suspended user's magic link and session", async () => {
      const harness = factory();
      await harness.provider.sendMagicLink("suspended@example.com", redirectUrl);
      const identity = await harness.provider.verifyMagicLink(harness.latestMagicLinkToken());
      expectIdentity(identity, "suspended@example.com");
      if (!identity.ok) throw new Error(identity.error.messageKey);
      const session = harness.latestSessionToken();

      await harness.suspendCurrentUser();
      expectError(await harness.provider.verifySessionToken(session), "ACCOUNT_SUSPENDED");

      await harness.provider.sendMagicLink("suspended@example.com", redirectUrl);
      expectError(await harness.provider.verifyMagicLink(harness.latestMagicLinkToken()), "ACCOUNT_SUSPENDED");
    });
  });
}

function expectIdentity(
  result: Result<AuthenticatedIdentity, AppError>,
  email: string,
): asserts result is { ok: true; value: AuthenticatedIdentity } {
  expect(result.ok).toBe(true);
  if (!result.ok) throw new Error(result.error.messageKey);
  expect(result.value.email).toBe(email);
  expect(result.value.userId.length).toBeGreaterThan(0);
  expect(result.value.displayName.length).toBeGreaterThan(0);
  const raw = result.value.emailVerifiedAt;
  const time = raw instanceof Date ? raw.getTime() : typeof raw === "string" ? Date.parse(raw) : Number.NaN;
  expect(Number.isNaN(time)).toBe(false);
}

function expectError(result: Result<unknown, AppError>, code: AppError["code"]): void {
  expect(result.ok).toBe(false);
  if (result.ok) throw new Error(`expected ${code}`);
  expect(result.error.code).toBe(code);
  expect(result.error.messageKey).toBe(`errors.${code}`);
  expect(result.error.params).toBeUndefined();
}
