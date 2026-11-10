import { ok, type AppError, type Result } from "@fibonaipe/domain";
import type { UseCaseDependencies } from "../room-session.js";
import { requireTeamAction } from "./access.js";

export interface DeleteTeamInput {
  readonly teamId: string;
  readonly actorUserId: string;
}

export class DeleteTeam {
  constructor(private readonly deps: UseCaseDependencies) {}

  async execute(input: DeleteTeamInput): Promise<Result<{ readonly deleted: true }, AppError>> {
    const allowed = await requireTeamAction(this.deps, input.teamId, input.actorUserId, "manageTeam");
    if (!allowed.ok) return allowed;
    return this.deps.persistence.transaction({}, async (repos) => {
      const members = await repos.memberships.listByTeam(allowed.value.teamId);
      for (const member of members) await repos.memberships.delete(member.userId, allowed.value.teamId);
      await repos.teamTasks.deleteByTeam(allowed.value.teamId);
      await repos.teams.delete(allowed.value.teamId);
      return ok({ deleted: true as const });
    });
  }
}
