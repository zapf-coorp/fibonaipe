import { HolidayId, Sprint, TeamId, UserId, can, createAppError, createHoliday, err, ok, type AppError, type Holiday, type PolicyAction, type Result } from "@fibonaipe/domain";
import type { TransactionRepos } from "../../ports/persistence.port.js";
import type { UseCaseDependencies } from "../room-session.js";

interface TeamInput { readonly teamId: string; readonly actorUserId: string }
async function recalculate(repos: TransactionRepos, teamId: import("@fibonaipe/domain").TeamId): Promise<Result<true, AppError>> {
  const dates = (await repos.holidays.listByTeam(teamId)).map((holiday) => holiday.date);
  for (const record of await repos.sprints.listByTeam(teamId)) {
    if (!record.state || record.state.status === "closed" || !record.state.capacityEntries?.length) continue;
    const result = Sprint.create(record.state).setCapacityEntries(record.state.capacityEntries, dates);
    if (!result.ok) return result;
    await repos.sprints.save({ ...record, state: result.value.props });
  }
  return ok(true);
}
async function access<T>(deps: UseCaseDependencies, input: TeamInput, action: PolicyAction, work: (repos: TransactionRepos, teamId: import("@fibonaipe/domain").TeamId) => Promise<Result<T, AppError>>): Promise<Result<T, AppError>> {
  const teamId = TeamId.create(input.teamId);
  if (!teamId.ok) return teamId;
  const userId = UserId.create(input.actorUserId);
  if (!userId.ok) return userId;
  return deps.persistence.transaction({ lockTeamId: teamId.value }, async (repos) => {
    if (!await repos.teams.findById(teamId.value)) return err(createAppError("NOT_FOUND"));
    const user = await repos.users.findById(userId.value);
    const member = (await repos.memberships.listByTeam(teamId.value)).find((entry) => entry.userId === userId.value);
    const actor = { kind: "member" as const, systemRole: user?.isSuperAdmin ? "superAdmin" as const : undefined, teamRole: member?.role, isHost: false, isFacilitator: false, roomMode: "voter" as const };
    if ((!member && !user?.isSuperAdmin) || !can(actor, action, { roomKind: "team", actorCreatedRoom: false })) return err(createAppError("FORBIDDEN"));
    return work(repos, teamId.value);
  });
}
export class SaveHoliday {
  constructor(private readonly deps: UseCaseDependencies) {}
  async execute(input: TeamInput & { readonly holidayId?: string; readonly date: string; readonly name: string }): Promise<Result<{ holidayId: string }, AppError>> {
    const id = HolidayId.create(input.holidayId ?? this.deps.ids.newId());
    if (!id.ok) return id;
    return access(this.deps, input, "configureSprints", async (repos, teamId) => {
      const existing = await repos.holidays.listByTeam(teamId);
      if (input.holidayId && !existing.some((holiday) => holiday.id === id.value)) return err(createAppError("NOT_FOUND"));
      if (existing.some((holiday) => holiday.date === input.date && holiday.id !== id.value)) return err(createAppError("VALIDATION"));
      const holiday = createHoliday({ id: id.value, teamId, date: input.date, name: input.name });
      if (!holiday.ok) return holiday;
      await repos.holidays.save(holiday.value);
      const updated = await recalculate(repos, teamId);
      if (!updated.ok) return updated;
      return ok({ holidayId: id.value });
    });
  }
}
export class ListHolidays {
  constructor(private readonly deps: UseCaseDependencies) {}
  execute(input: TeamInput): Promise<Result<readonly Holiday[], AppError>> {
    return access(this.deps, input, "viewDashboard", async (repos, teamId) => ok(await repos.holidays.listByTeam(teamId)));
  }
}
export class DeleteHoliday {
  constructor(private readonly deps: UseCaseDependencies) {}
  async execute(input: TeamInput & { readonly holidayId: string }): Promise<Result<true, AppError>> {
    const id = HolidayId.create(input.holidayId);
    if (!id.ok) return id;
    return access(this.deps, input, "configureSprints", async (repos, teamId) => {
      if (!(await repos.holidays.listByTeam(teamId)).some((holiday) => holiday.id === id.value)) return err(createAppError("NOT_FOUND"));
      await repos.holidays.delete(id.value);
      return recalculate(repos, teamId);
    });
  }
}
