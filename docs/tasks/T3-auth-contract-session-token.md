# T3 — Explicit `sessionToken` in `AuthProvider` and `CompleteSignIn`

**Status:** DONE  
**Depends on:** T2  
**Max files to touch:** 5

## Goal

Remove the test-only `issuedSessionToken(auth)` duck-typing hack in `apps/web/src/server/routes/auth-teams.ts` (`auth.latestSessionToken()`) by including `readonly sessionToken?: string` on `AuthenticatedIdentity` and propagating it through `CompleteSignIn` and `CompleteIdentitySignIn`.

## Step-by-Step Instructions

### 1. Update `packages/application/src/ports/auth-provider.port.ts`

Add optional `sessionToken?: string` to `AuthenticatedIdentity` (optional keeps backwards compatibility with any existing test fixtures that construct `AuthenticatedIdentity` literals):
```ts
export interface AuthenticatedIdentity {
  readonly userId: UserId;
  readonly email: string;
  readonly displayName: string;
  readonly emailVerifiedAt: Date;
  readonly sessionToken?: string;
}
```
Also add an optional `exchangeGoogleCode` flow or keep the 6 methods on `AuthProvider`.

### 2. Update `packages/adapter-auth-devfake/src/dev-fake-auth-provider.ts`

In `verifyMagicLink` and `exchangeGoogleCode`, pass the newly issued session token into `this.identityFor(user, token)`:
```ts
  async verifyMagicLink(token: string): Promise<Result<AuthenticatedIdentity, AppError>> {
    const link = this.magicLinks.get(token);
    if (!link || link.used || link.expiresAt.getTime() < this.clock.now().getTime()) {
      return err(createAppError("AUTH_LINK_INVALID"));
    }
    link.used = true;
    const user = this.ensureUser(link.email);
    if (user.suspended) return err(createAppError("ACCOUNT_SUSPENDED"));
    const sessionToken = this.issueSession(link.email);
    return ok(this.identityFor(user, sessionToken));
  }
```
Do the same in `exchangeGoogleCode` and `verifySessionToken(token)` (passing `token` to `this.identityFor(user, token)`).
Update `identityFor`:
```ts
  private identityFor(user: StoredUser, sessionToken?: string): AuthenticatedIdentity {
    return {
      userId: user.userId,
      email: user.email,
      displayName: user.displayName,
      emailVerifiedAt: new Date(this.clock.now().getTime()),
      ...(sessionToken === undefined ? {} : { sessionToken }),
    };
  }
```
Keep `latestMagicLinkToken()` and `latestSessionToken()` on `DevFakeAuthProvider` so existing contract tests in `packages/testing` continue to pass unchanged.

### 3. Update `packages/testing/src/fakes/fake-auth-provider.ts`

Read `packages/testing/src/fakes/fake-auth-provider.ts` and ensure `verifyMagicLink`, `exchangeGoogleCode`, and `verifySessionToken` also include `sessionToken` on the returned `AuthenticatedIdentity` (while keeping `latestSessionToken()` on the contract harness).

### 4. Update `packages/application/src/use-cases/identity/complete-sign-in.ts`

1. Add `readonly sessionToken: string;` to `CompleteSignInResult`.
2. Add a `CompleteGoogleSignIn` use case class (or a method) in the same file so Google OAuth code exchange has a first-class application use case:
   ```ts
   export interface CompleteGoogleSignInInput {
     readonly code: string;
     readonly redirectUrl: string;
     readonly superAdminEmails: readonly string[];
   }

   export class CompleteGoogleSignIn {
     constructor(
       private readonly deps: UseCaseDependencies,
       private readonly auth: AuthProvider,
     ) {}

     async execute(input: CompleteGoogleSignInInput): Promise<Result<CompleteSignInResult, AppError>> {
       const exchanged = await this.auth.exchangeGoogleCode(input.code, input.redirectUrl);
       if (!exchanged.ok) {
         warn(this.deps, "CompleteGoogleSignIn", exchanged.error);
         return exchanged;
       }
       return completeIdentity(this.deps, exchanged.value, input.superAdminEmails);
     }
   }
   ```
3. In `completeIdentity`, return `sessionToken: identity.sessionToken ?? ""`.
4. Export `CompleteGoogleSignIn` and `CompleteGoogleSignInInput` from `packages/application/src/index.ts`.

### 5. Update `apps/web/src/server/routes/auth-teams.ts`

In `POST /api/auth/callback`, use `signedIn.value.sessionToken || issuedSessionToken(container.authProvider)` so real providers use `signedIn.value.sessionToken`.

## Verification

Run:
```sh
npm run lint
npm run typecheck
npx vitest run packages/application packages/adapter-auth-devfake packages/testing
```
