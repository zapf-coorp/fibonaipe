import { UserId, ok, removeMember, type AppError, type Result } from "@fibonaipe/domain";
import type { UseCaseDependencies } from "../room-session.js";
import { requireTeamAction, saveMemberships } from "./access.js";

export interface RemoveMemberInput {
  readonly teamId: string;
  readonly actorUserId: string;
  readonly memberUserId: string;
}

export class RemoveMember {
  constructor(private readonly deps: UseCaseDependencies) {}

  async execute(input: RemoveMemberInput): Promise<Result<{ readonly removed: true }, AppError>> {
    const memberUserId = UserId.create(input.memberUserId);
    if (!memberUserId.ok) return memberUserId;
    const allowed = await requireTeamAction(this.deps, input.teamId, input.actorUserId, "manageTeam");
    if (!allowed.ok) return allowed;
    const removed = removeMember(allowed.value.members, memberUserId.value);
    if (!removed.ok) return removed;
    const saved = await saveMemberships(this.deps, removed.value);
    if (!saved.ok) return saved;
    await this.deps.persistence.transaction({}, async (repos) => {
      await repos.memberships.delete(memberUserId.value, allowed.value.teamId);
      return ok(true);
    });
    return ok({ removed: true });
  }
}
