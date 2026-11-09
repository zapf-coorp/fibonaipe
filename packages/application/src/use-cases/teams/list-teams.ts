import { UserId, createAppError, err, ok, type AppError, type Result, type TeamRole } from "@fibonaipe/domain";
import type { UseCaseDependencies } from "../room-session.js";

export interface TeamSummary {
  readonly teamId: string;
  readonly name: string;
  readonly role: TeamRole;
  readonly organizationId: string | null;
}

export interface ListTeamsInput {
  readonly actorUserId: string;
}

export class ListTeams {
  constructor(private readonly deps: UseCaseDependencies) {}

  async execute(input: ListTeamsInput): Promise<Result<readonly TeamSummary[], AppError>> {
    const actorId = UserId.create(input.actorUserId);
    if (!actorId.ok) return actorId;
    return this.deps.persistence.transaction({}, async (repos) => {
      const user = await repos.users.findById(actorId.value);
      if (!user) return err(createAppError("FORBIDDEN"));
      const memberships = await repos.memberships.listByUser(actorId.value);
      const teams: TeamSummary[] = [];
      for (const membership of memberships) {
        const team = await repos.teams.findById(membership.teamId);
        if (!team) continue;
        teams.push({
          teamId: team.id,
          name: team.name,
          role: membership.role,
          organizationId: team.organizationId ?? null,
        });
      }
      teams.sort((left, right) => left.name.localeCompare(right.name) || left.teamId.localeCompare(right.teamId));
      return ok(teams);
    });
  }
}
