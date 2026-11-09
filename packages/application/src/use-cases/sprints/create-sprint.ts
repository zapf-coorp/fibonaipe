import { Sprint, SprintBuilder, SprintId, TeamId, UserId, can, createAppError, err, hasSprintOverlap, ok, type AppError, type Result } from "@fibonaipe/domain";
import type { UseCaseDependencies } from "../room-session.js";

export interface CreateSprintInput {
  readonly teamId: string;
  readonly actorUserId: string;
  readonly name: string;
  readonly startDate: string;
  readonly endDate: string;
  readonly goal?: string | null;
}

export class CreateSprint {
  constructor(private readonly deps: UseCaseDependencies) {}

  async execute(input: CreateSprintInput): Promise<Result<{ sprintId: string }, AppError>> {
    const teamId = TeamId.create(input.teamId);
    if (!teamId.ok) return teamId;
    const actorId = UserId.create(input.actorUserId);
    if (!actorId.ok) return actorId;
    const sprintId = SprintId.create(this.deps.ids.newId());
    if (!sprintId.ok) return sprintId;
    const candidate = new SprintBuilder().withId(sprintId.value).withTeamId(teamId.value).withName(input.name)
      .withStartDate(input.startDate).withEndDate(input.endDate).withGoal(input.goal ?? null).build();
    if (!candidate.ok) return candidate;
    return this.deps.persistence.transaction({ lockTeamId: teamId.value }, async (repos) => {
      if (!await repos.teams.findById(teamId.value)) return err(createAppError("NOT_FOUND"));
      const user = await repos.users.findById(actorId.value);
      const membership = (await repos.memberships.listByTeam(teamId.value)).find((entry) => entry.userId === actorId.value);
      const actor = { kind: "member" as const, systemRole: user?.isSuperAdmin ? "superAdmin" as const : undefined, teamRole: membership?.role, isHost: false, isFacilitator: false, roomMode: "voter" as const };
      if ((!membership && !user?.isSuperAdmin) || !can(actor, "configureSprints", { roomKind: "team", actorCreatedRoom: false })) return err(createAppError("FORBIDDEN"));
      const records = await repos.sprints.listByTeam(teamId.value);
      const existing = records.flatMap((record) => record.state ? [Sprint.create(record.state)] : []);
      if (hasSprintOverlap(candidate.value, existing)) return err(createAppError("VALIDATION"));
      await repos.sprints.save({ id: sprintId.value, teamId: teamId.value, name: candidate.value.name, state: candidate.value.props });
      return ok({ sprintId: sprintId.value });
    });
  }
}
