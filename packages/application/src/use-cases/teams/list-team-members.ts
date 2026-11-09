import { TeamId, UserId, createAppError, err, ok, type AppError, type Result, type TeamRole } from "@fibonaipe/domain";
import type { UseCaseDependencies } from "../room-session.js";

export interface TeamMemberSummary { readonly id: string; readonly name: string; readonly role: TeamRole }
export class ListTeamMembers {
  constructor(private readonly deps: UseCaseDependencies) {}
  async execute(input: { readonly teamId: string; readonly actorUserId: string }): Promise<Result<readonly TeamMemberSummary[], AppError>> {
    const teamId = TeamId.create(input.teamId);
    if (!teamId.ok) return teamId;
    const userId = UserId.create(input.actorUserId);
    if (!userId.ok) return userId;
    return this.deps.persistence.transaction({}, async (repos) => {
      const members = await repos.memberships.listByTeam(teamId.value);
      const actor = await repos.users.findById(userId.value);
      if (!members.some((member) => member.userId === userId.value) && !actor?.isSuperAdmin) return err(createAppError("FORBIDDEN"));
      const rows: TeamMemberSummary[] = [];
      for (const member of members) {
        const user = await repos.users.findById(member.userId);
        if (user) rows.push({ id: member.userId, name: user.displayName, role: member.role });
      }
      return ok(rows);
    });
  }
}
