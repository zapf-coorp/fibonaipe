import { UserId, createAppError, err, ok, removeMember, type AppError, type Result } from "@fibonaipe/domain";
import type { AuthProvider } from "../../ports/auth-provider.port.js";
import { warn, type UseCaseDependencies } from "../room-session.js";
import { membershipFrom } from "../teams/access.js";

export interface DeleteAccountInput {
  readonly userId: string;
  readonly confirmEmail: string;
}

export class DeleteAccount {
  constructor(
    private readonly deps: UseCaseDependencies,
    private readonly auth: AuthProvider,
  ) {}

  async execute(input: DeleteAccountInput): Promise<Result<{ readonly deleted: true }, AppError>> {
    const userId = UserId.create(input.userId);
    if (!userId.ok) return userId;
    const confirmed = input.confirmEmail.trim().toLowerCase();
    const removed = await this.deps.persistence.transaction({}, async (repos) => {
      const user = await repos.users.findById(userId.value);
      if (!user) return err(createAppError("NOT_FOUND"));
      if (user.email.trim().toLowerCase() !== confirmed) return err(createAppError("VALIDATION"));
      const memberships = await repos.memberships.listByUser(userId.value);
      for (const membership of memberships) {
        const stored = await repos.memberships.listByTeam(membership.teamId);
        const members = [];
        for (const record of stored) {
          const built = membershipFrom(record);
          if (!built.ok) return built;
          members.push(built.value);
        }
        const next = removeMember(members, userId.value);
        if (!next.ok) return next;
      }
      for (const membership of memberships) {
        const teamMembers = await repos.memberships.listByTeam(membership.teamId);
        if (teamMembers.length === 1) await repos.teams.delete(membership.teamId);
        await repos.memberships.delete(membership.userId, membership.teamId);
      }
      await repos.users.delete(userId.value);
      return ok({ deleted: true as const });
    });
    if (!removed.ok) {
      warn(this.deps, "DeleteAccount", removed.error);
      return removed;
    }
    const revoked = await this.auth.revokeUserSessions(userId.value);
    if (!revoked.ok) {
      warn(this.deps, "DeleteAccount", revoked.error);
      return revoked;
    }
    return ok({ deleted: true });
  }
}
