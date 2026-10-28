import { UserId, createAppError, err, ok, type AppError, type Result } from "@fibonaipe/domain";
import type { AuthProvider } from "../../ports/auth-provider.port.js";
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
    const email = verified.value.email.trim().toLowerCase();
    const isSuperAdmin = input.superAdminEmails.some((candidate) => candidate.trim().toLowerCase() === email);
    const userId = UserId.create(verified.value.userId);
    if (!userId.ok) return userId;

    const stored = await this.deps.persistence.transaction({}, async (repos) => {
      const existing = await repos.users.findByEmail(email);
      if (existing?.status === "suspended") return err(createAppError("ACCOUNT_SUSPENDED"));
      const record: PersistedUserRecord = {
        id: existing?.id ?? userId.value,
        email,
        displayName: existing?.displayName ?? verified.value.displayName,
        status: existing?.status ?? "active",
        isSuperAdmin,
        locale: existing?.locale ?? "pt-BR",
        theme: existing?.theme ?? "system",
      };
      await repos.users.save(record);
      return ok(record);
    });
    if (!stored.ok) {
      warn(this.deps, "CompleteSignIn", stored.error);
      return stored;
    }
    return ok({ userId: stored.value.id, email: stored.value.email, isSuperAdmin: stored.value.isSuperAdmin === true });
  }
}
