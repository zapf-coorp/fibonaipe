import { RoomId, Sprint, SprintId, TeamId, UserId, can, computeAccuracy, computeForecast, createAppError, err, ok, type AppError, type Result, type SprintCapacityEntry, type SprintProps, type SprintReport } from "@fibonaipe/domain";
import type { TransactionRepos } from "../../ports/persistence.port.js";
import { hydrate, type UseCaseDependencies } from "../room-session.js";

export interface SprintCommandInput { readonly teamId: string; readonly sprintId: string; readonly actorUserId: string }

async function mutate<T>(deps: UseCaseDependencies, input: SprintCommandInput, operation: (sprint: Sprint, repos: TransactionRepos) => Result<{ sprint: Sprint; value: T }, AppError> | Promise<Result<{ sprint: Sprint; value: T }, AppError>>): Promise<Result<T, AppError>> {
  const teamId = TeamId.create(input.teamId);
  if (!teamId.ok) return teamId;
  const sprintId = SprintId.create(input.sprintId);
  if (!sprintId.ok) return sprintId;
  const actorId = UserId.create(input.actorUserId);
  if (!actorId.ok) return actorId;
  return deps.persistence.transaction({ lockTeamId: teamId.value }, async (repos) => {
    const user = await repos.users.findById(actorId.value);
    const member = (await repos.memberships.listByTeam(teamId.value)).find((entry) => entry.userId === actorId.value);
    const actor = { kind: "member" as const, systemRole: user?.isSuperAdmin ? "superAdmin" as const : undefined, teamRole: member?.role, isHost: false, isFacilitator: false, roomMode: "voter" as const };
    if ((!member && !user?.isSuperAdmin) || !can(actor, "configureSprints", { roomKind: "team", actorCreatedRoom: false })) return err(createAppError("FORBIDDEN"));
    const record = await repos.sprints.findById(sprintId.value);
    if (!record || record.teamId !== teamId.value || !record.state) return err(createAppError("NOT_FOUND"));
    const result = await operation(Sprint.create(record.state), repos);
    if (!result.ok) return result;
    await repos.sprints.save({ ...record, state: result.value.sprint.props });
    return ok(result.value.value);
  });
}

export class ActivateSprint {
  constructor(private readonly deps: UseCaseDependencies) {}
  execute(input: SprintCommandInput): Promise<Result<true, AppError>> {
    return mutate(this.deps, input, async (sprint, repos) => {
      const result = sprint.activate(this.deps.clock.now());
      if (!result.ok) return result;
      const records = await repos.sprints.listByTeam(sprint.teamId);
      const closed = records.flatMap((record) => {
        const state = record.state;
        if (!state || state.status !== "closed" || state.deliveredPoints === null) return [];
        return [{ sprintId: state.id, endDate: state.endDate, capacityTotal: state.capacityTotal, deliveredPoints: state.deliveredPoints, clubItems: state.items.filter((item) => item.finalSuit === "clubs" || item.finalSuit === "♣").length, totalItems: state.items.length }];
      });
      const plannedClubItems = result.value.items.filter((item) => item.finalSuit === "clubs" || item.finalSuit === "♣").length;
      const plannedTotalItems = result.value.items.length;
      const historicalClubItems = closed.reduce((sum, row) => sum + row.clubItems, 0);
      const historicalTotalItems = closed.reduce((sum, row) => sum + row.totalItems, 0);
      const forecast = result.value.props.capacityTotal > 0
        ? computeForecast(closed, result.value.props.capacityTotal, { plannedClubItems, plannedTotalItems, historicalClubItems, historicalTotalItems })
        : { status: "insufficient_data" as const, have: closed.filter((row) => row.capacityTotal > 0).length, need: 3 as const, excluded: [] };
      const forecastRecord = Object.freeze({ status: forecast.status, predicted: forecast.status === "ok" ? forecast.predicted : null, low: forecast.status === "ok" ? forecast.low : null, high: forecast.status === "ok" ? forecast.high : null, medianPace: forecast.status === "ok" ? forecast.medianPace : null, delivered: null, errorPct: null });
      const activated = Sprint.create({ ...result.value.props, forecastRecord });
      return ok({ sprint: activated, value: true as const });
    });
  }
}
export class SetSprintCapacity {
  constructor(private readonly deps: UseCaseDependencies) {}
  execute(input: SprintCommandInput & { readonly capacityTotal: number }): Promise<Result<true, AppError>> {
    return mutate(this.deps, input, (sprint) => {
      const result = sprint.setCapacity(input.capacityTotal);
      return result.ok ? ok({ sprint: result.value, value: true as const }) : result;
    });
  }
}
export class SetSprintCapacityEntries {
  constructor(private readonly deps: UseCaseDependencies) {}
  execute(input: SprintCommandInput & { readonly entries: readonly SprintCapacityEntry[] }): Promise<Result<number, AppError>> {
    return mutate(this.deps, input, async (sprint, repos) => {
      const holidays = await repos.holidays.listByTeam(sprint.teamId);
      const result = sprint.setCapacityEntries(input.entries, holidays.map((holiday) => holiday.date));
      return result.ok ? ok({ sprint: result.value, value: result.value.props.capacityTotal }) : result;
    });
  }
}
export class CloseSprint {
  constructor(private readonly deps: UseCaseDependencies) {}
  execute(input: SprintCommandInput): Promise<Result<SprintReport, AppError>> {
    return mutate(this.deps, input, (sprint) => {
      const result = sprint.close(this.deps.clock.now());
      return result.ok ? ok({ sprint: result.value.sprint, value: result.value.report }) : result;
    });
  }
}
export class MarkSprintItemDone {
  constructor(private readonly deps: UseCaseDependencies) {}
  execute(input: SprintCommandInput & { readonly itemId: string; readonly estimateExceeded?: boolean }): Promise<Result<true, AppError>> {
    return mutate(this.deps, input, (sprint) => {
      const result = sprint.markDone(input.itemId, this.deps.clock.now(), input.estimateExceeded);
      return result.ok ? ok({ sprint: result.value, value: true as const }) : result;
    });
  }
}
export class LinkSprintItem {
  constructor(private readonly deps: UseCaseDependencies) {}
  execute(input: SprintCommandInput & { readonly roomId: string; readonly itemId: string }): Promise<Result<true, AppError>> {
    const roomId = RoomId.create(input.roomId);
    if (!roomId.ok) return Promise.resolve(roomId);
    return mutate(this.deps, input, async (sprint, repos) => {
      const room = await repos.rooms.findById(roomId.value);
      if (!room || room.teamId !== sprint.teamId) return err(createAppError("NOT_FOUND"));
      const loaded = hydrate(room);
      if (!loaded.ok) return loaded;
      const item = loaded.value.table.items.find((entry) => entry.id === input.itemId);
      if (!item) return err(createAppError("NOT_FOUND"));
      const sprints = await repos.sprints.listByTeam(sprint.teamId);
      const occupied = sprints.some((entry) => entry.id !== sprint.id && entry.state?.status !== "closed" && entry.state?.items.some((linked) => linked.id === item.id));
      const result = sprint.linkItem({ id: item.id, estimate: item.finalEstimate?.numeric ?? null, doneAt: null, finalSuit: item.finalSuit }, occupied);
      return result.ok ? ok({ sprint: result.value, value: true as const }) : result;
    });
  }
}
export class UnlinkSprintItem {
  constructor(private readonly deps: UseCaseDependencies) {}
  execute(input: SprintCommandInput & { readonly itemId: string }): Promise<Result<true, AppError>> {
    return mutate(this.deps, input, (sprint) => {
      const result = sprint.unlinkItem(input.itemId);
      return result.ok ? ok({ sprint: result.value, value: true as const }) : result;
    });
  }
}
export class GetSprintReport {
  constructor(private readonly deps: UseCaseDependencies) {}
  async execute(input: SprintCommandInput): Promise<Result<SprintReport, AppError>> {
    const teamId = TeamId.create(input.teamId);
    if (!teamId.ok) return teamId;
    const sprintId = SprintId.create(input.sprintId);
    if (!sprintId.ok) return sprintId;
    const actorId = UserId.create(input.actorUserId);
    if (!actorId.ok) return actorId;
    return this.deps.persistence.transaction({}, async (repos) => {
      const user = await repos.users.findById(actorId.value);
      const member = (await repos.memberships.listByTeam(teamId.value)).find((entry) => entry.userId === actorId.value);
      if (!member && !user?.isSuperAdmin) return err(createAppError("FORBIDDEN"));
      const record = await repos.sprints.findById(sprintId.value);
      if (!record || record.teamId !== teamId.value || !record.state) return err(createAppError("NOT_FOUND"));
      const report = Sprint.create(record.state).frozenMetrics;
      return report === null ? err(createAppError("VALIDATION")) : ok(report);
    });
  }
}
export class GetSprint {
  constructor(private readonly deps: UseCaseDependencies) {}
  async execute(input: SprintCommandInput): Promise<Result<SprintProps, AppError>> {
    const teamId = TeamId.create(input.teamId);
    if (!teamId.ok) return teamId;
    const sprintId = SprintId.create(input.sprintId);
    if (!sprintId.ok) return sprintId;
    const actorId = UserId.create(input.actorUserId);
    if (!actorId.ok) return actorId;
    return this.deps.persistence.transaction({}, async (repos) => {
      const user = await repos.users.findById(actorId.value);
      const member = (await repos.memberships.listByTeam(teamId.value)).find((entry) => entry.userId === actorId.value);
      if (!member && !user?.isSuperAdmin) return err(createAppError("FORBIDDEN"));
      const record = await repos.sprints.findById(sprintId.value);
      if (!record || record.teamId !== teamId.value || !record.state) return err(createAppError("NOT_FOUND"));
      return ok(Sprint.create(record.state).props);
    });
  }
}

export class ListSprints {
  constructor(private readonly deps: UseCaseDependencies) {}
  async execute(input: Omit<SprintCommandInput, "sprintId">): Promise<Result<readonly SprintProps[], AppError>> {
    const teamId = TeamId.create(input.teamId);
    if (!teamId.ok) return teamId;
    const actorId = UserId.create(input.actorUserId);
    if (!actorId.ok) return actorId;
    return this.deps.persistence.transaction({}, async (repos) => {
      const user = await repos.users.findById(actorId.value);
      const member = (await repos.memberships.listByTeam(teamId.value)).find((entry) => entry.userId === actorId.value);
      if (!member && !user?.isSuperAdmin) return err(createAppError("FORBIDDEN"));
      const records = await repos.sprints.listByTeam(teamId.value);
      return ok(records.flatMap((record) => record.state ? [Sprint.create(record.state).props] : []));
    });
  }
}

export class GetSprintForecast {
  constructor(private readonly deps: UseCaseDependencies) {}
  async execute(input: Omit<SprintCommandInput, "sprintId"> & { readonly plannedCapacity: number }): Promise<Result<ReturnType<typeof computeForecast>, AppError>> {
    const teamId = TeamId.create(input.teamId);
    if (!teamId.ok) return teamId;
    const actorId = UserId.create(input.actorUserId);
    if (!actorId.ok) return actorId;
    if (!Number.isFinite(input.plannedCapacity) || input.plannedCapacity <= 0) return err(createAppError("VALIDATION"));
    return this.deps.persistence.transaction({}, async (repos) => {
      const user = await repos.users.findById(actorId.value);
      const member = (await repos.memberships.listByTeam(teamId.value)).find((entry) => entry.userId === actorId.value);
      if (!member && !user?.isSuperAdmin) return err(createAppError("FORBIDDEN"));
      const records = await repos.sprints.listByTeam(teamId.value);
      const closed = records.flatMap((record) => {
        const state = record.state;
        if (!state || state.status !== "closed" || state.deliveredPoints === null) return [];
        return [{ sprintId: state.id, endDate: state.endDate, capacityTotal: state.capacityTotal, deliveredPoints: state.deliveredPoints }];
      });
      return ok(computeForecast(closed, input.plannedCapacity));
    });
  }
}

export class GetForecastAccuracy {
  constructor(private readonly deps: UseCaseDependencies) {}
  async execute(input: Omit<SprintCommandInput, "sprintId">): Promise<Result<ReturnType<typeof computeAccuracy>, AppError>> {
    const teamId = TeamId.create(input.teamId);
    if (!teamId.ok) return teamId;
    const actorId = UserId.create(input.actorUserId);
    if (!actorId.ok) return actorId;
    return this.deps.persistence.transaction({}, async (repos) => {
      const user = await repos.users.findById(actorId.value);
      const member = (await repos.memberships.listByTeam(teamId.value)).find((entry) => entry.userId === actorId.value);
      if (!member && !user?.isSuperAdmin) return err(createAppError("FORBIDDEN"));
      const records = await repos.sprints.listByTeam(teamId.value);
      const rows = records.flatMap((record) => {
        const state = record.state;
        if (!state || state.status !== "closed" || !state.forecastRecord) return [];
        return [{ sprintId: state.id, predicted: state.forecastRecord.predicted, delivered: state.forecastRecord.delivered, endDate: state.endDate }];
      });
      return ok(computeAccuracy(rows));
    });
  }
}
