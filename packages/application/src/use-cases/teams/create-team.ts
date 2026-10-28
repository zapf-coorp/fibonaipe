import { TeamBuilder, TeamId, UserId, err, ok, type AppError, type Result } from "@fibonaipe/domain";
import type { UseCaseDependencies } from "../room-session.js";
import { organizationId } from "./access.js";

export interface CreateTeamInput {
  readonly name: string;
  readonly creatorUserId: string;
}

export interface CreateTeamResult {
  readonly teamId: string;
  readonly role: "teamAdmin";
}

export class CreateTeam {
  constructor(private readonly deps: UseCaseDependencies) {}

  async execute(input: CreateTeamInput): Promise<Result<CreateTeamResult, AppError>> {
    const creatorUserId = UserId.create(input.creatorUserId);
    if (!creatorUserId.ok) return creatorUserId;
    const teamId = TeamId.create(this.deps.ids.newId());
    if (!teamId.ok) return teamId;
    const organization = organizationId();
    if (!organization.ok) return organization;
    const team = new TeamBuilder().withId(teamId.value).withOrganizationId(organization.value).withName(input.name).build();
    if (!team.ok) return team;
    const saved = await this.deps.persistence.transaction({}, async (repos) => {
      await repos.teams.save({ id: team.value.id, name: team.value.name, organizationId: team.value.organizationId });
      await repos.memberships.save({ userId: creatorUserId.value, teamId: team.value.id, role: "teamAdmin" });
      return ok(true);
    });
    if (!saved.ok) return saved;
    return ok({ teamId: team.value.id, role: "teamAdmin" });
  }
}
