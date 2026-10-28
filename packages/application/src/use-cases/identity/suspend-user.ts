import { UserId, createAppError, err, ok, type AppError, type Result } from "@fibonaipe/domain";
import type { AuthProvider } from "../../ports/auth-provider.port.js";
import { warn, type UseCaseDependencies } from "../room-session.js";

export interface SuspendUserInput {
  readonly actorSystemRole?: "superAdmin";
  readonly targetUserId: string;
}

export class SuspendUser {
  constructor(
    private readonly deps: UseCaseDependencies,
    private readonly auth: AuthProvider,
  ) {}

  async execute(input: SuspendUserInput): Promise<Result<{ readonly suspended: true }, AppError>> {
    if (input.actorSystemRole !== "superAdmin") {
      const forbidden = err(createAppError("FORBIDDEN"));
      warn(this.deps, "SuspendUser", forbidden.error);
      return forbidden;
    }
    const userId = UserId.create(input.targetUserId);
    if (!userId.ok) return userId;
    const saved = await this.deps.persistence.transaction({}, async (repos) => {
      const user = await repos.users.findById(userId.value);
      if (!user) return err(createAppError("NOT_FOUND"));
      await repos.users.save({ ...user, status: "suspended" });
      return ok(true);
    });
    if (!saved.ok) {
      warn(this.deps, "SuspendUser", saved.error);
      return saved;
    }
    const revoked = await this.auth.revokeUserSessions(userId.value);
    if (!revoked.ok) {
      warn(this.deps, "SuspendUser", revoked.error);
      return revoked;
    }
    return ok({ suspended: true });
  }
}
