import { InviteBuilder, UserId, createAppError, err, ok, type AppError, type Result, type TeamRole } from "@fibonaipe/domain";
import type { UseCaseDependencies } from "../room-session.js";
import { issuedAtFromExpiry } from "./access.js";

export interface AcceptInviteInput {
  readonly token: string;
  readonly userId: string;
}

export interface AcceptInviteResult {
  readonly role: TeamRole;
  readonly teamId: string;
}

export class AcceptInvite {
  constructor(private readonly deps: UseCaseDependencies) {}

  async execute(input: AcceptInviteInput): Promise<Result<AcceptInviteResult, AppError>> {
    const userId = UserId.create(input.userId);
    if (!userId.ok) return userId;
    const tokenHash = this.deps.ids.sha256(input.token);
    const now = this.deps.clock.now();
    return this.deps.persistence.transaction({}, async (repos) => {
      const stored = await repos.invites.findByTokenHash(tokenHash);
      if (!stored || stored.acceptedBy !== null) return err(createAppError("NOT_FOUND"));
      const built = new InviteBuilder()
        .withId(stored.id)
        .withTeamId(stored.teamId)
        .withRole(stored.role)
        .withNow(issuedAtFromExpiry(stored.expiresAt))
        .build();
      if (!built.ok) return built;
      let invite = built.value;
      if (stored.revokedAt !== null) {
        const revoked = built.value.revoke(stored.revokedAt);
        if (!revoked.ok) return revoked;
        invite = revoked.value;
      }
      const accepted = invite.accept({ userId: userId.value, now });
      if (!accepted.ok) return accepted;
      await repos.memberships.save({ userId: userId.value, teamId: accepted.value.teamId, role: accepted.value.role });
      await repos.invites.save({ ...stored, acceptedBy: userId.value, revokedAt: stored.revokedAt ?? now });
      return ok({ role: accepted.value.role, teamId: accepted.value.teamId });
    });
  }
}
