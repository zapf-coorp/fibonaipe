import { UserId, createAppError, err, ok, type AppError, type Result } from "@fibonaipe/domain";
import type { AuthProvider, AuthenticatedIdentity } from "../../ports/auth-provider.port.js";
import type { PersistedUserRecord } from "../../ports/persistence.port.js";
import { warn, type UseCaseDependencies } from "../room-session.js";

export interface CompleteSignInInput {
  readonly token: string;
  readonly superAdminEmails: readonly string[];
  readonly isSuperAdmin?: boolean;
}

export interface CompleteSignInResult {
  readonly userId: string;
  readonly email: string;
  readonly isSuperAdmin: boolean;
  readonly sessionToken: string;
}

export interface CompleteGoogleSignInInput {
  readonly code: string;
  readonly redirectUrl: string;
  readonly superAdminEmails: readonly string[];
}

export async function persistSignedInUser(
  deps: UseCaseDependencies,
  identity: AuthenticatedIdentity,
  superAdminEmails: readonly string[],
): Promise<Result<PersistedUserRecord, AppError>> {
  const email = identity.email.trim().toLowerCase();
  const isSuperAdmin = superAdminEmails.some((candidate) => candidate.trim().toLowerCase() === email);
  const userId = UserId.create(identity.userId);
  if (!userId.ok) return userId;

  return deps.persistence.transaction({}, async (repos) => {
    const existing = await repos.users.findByEmail(email);
    if (existing?.status === "suspended") return err(createAppError("ACCOUNT_SUSPENDED"));
    const record: PersistedUserRecord = {
      id: existing?.id ?? userId.value,
      email,
      displayName: existing?.displayName ?? identity.displayName,
      status: existing?.status ?? "active",
      isSuperAdmin,
      locale: existing?.locale ?? "pt-BR",
      theme: existing?.theme ?? "system",
    };
    await repos.users.save(record);
    return ok(record);
  });
}

export class CompleteSignIn {
  constructor(
    private readonly deps: UseCaseDependencies,
    private readonly auth: AuthProvider,
  ) {}

  async execute(input: CompleteSignInInput): Promise<Result<CompleteSignInResult, AppError>> {
    const verified = await this.auth.verifyMagicLink(input.token);
    if (!verified.ok) {
      warn(this.deps, "CompleteSignIn", verified.error);
      return verified;
    }
    return completeIdentity(this.deps, verified.value, input.superAdminEmails);
  }
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

export class CompleteIdentitySignIn {
  constructor(private readonly deps: UseCaseDependencies) {}

  async execute(input: {
    readonly identity: AuthenticatedIdentity;
    readonly superAdminEmails: readonly string[];
  }): Promise<Result<CompleteSignInResult, AppError>> {
    return completeIdentity(this.deps, input.identity, input.superAdminEmails);
  }
}

async function completeIdentity(
  deps: UseCaseDependencies,
  identity: AuthenticatedIdentity,
  superAdminEmails: readonly string[],
): Promise<Result<CompleteSignInResult, AppError>> {
  const stored = await persistSignedInUser(deps, identity, superAdminEmails);
  if (!stored.ok) {
    warn(deps, "CompleteSignIn", stored.error);
    return stored;
  }
  return ok({
    userId: stored.value.id,
    email: stored.value.email,
    isSuperAdmin: stored.value.isSuperAdmin === true,
    sessionToken: identity.sessionToken ?? "",
  });
}
