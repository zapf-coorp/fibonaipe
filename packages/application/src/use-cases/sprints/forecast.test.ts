import { describe, expect, it } from "vitest";
import { UserId } from "@fibonaipe/domain";
import { CreateTeam } from "../teams/create-team.js";
import { asOk, createPorts } from "../__tests__/harness.js";
import { CreateSprint } from "./create-sprint.js";
import { ActivateSprint, CloseSprint, GetForecastAccuracy, GetSprintForecast, SetSprintCapacity } from "./sprint-commands.js";

describe("forecast application flow", () => {
  it("stores an insufficient activation snapshot and excludes it from accuracy", async () => {
    const ports = createPorts();
    const actorUserId = UserId.create("admin").value;
    const team = asOk(await new CreateTeam(ports.deps).execute({ name: "Team", creatorUserId: actorUserId }));
    const created = asOk(await new CreateSprint(ports.deps).execute({ teamId: team.teamId, actorUserId, name: "Sprint", startDate: "2026-03-01", endDate: "2026-03-14" }));
    const input = { teamId: team.teamId, actorUserId, sprintId: created.sprintId };
    expect((await new SetSprintCapacity(ports.deps).execute({ ...input, capacityTotal: 10 })).ok).toBe(true);
    expect(await new GetSprintForecast(ports.deps).execute({ teamId: team.teamId, actorUserId, plannedCapacity: 10 })).toMatchObject({ ok: true, value: { status: "insufficient_data", have: 0, need: 3 } });
    expect((await new ActivateSprint(ports.deps).execute(input)).ok).toBe(true);
    expect((await new CloseSprint(ports.deps).execute(input)).ok).toBe(true);
    expect(await new GetForecastAccuracy(ports.deps).execute({ teamId: team.teamId, actorUserId })).toMatchObject({ ok: true, value: { series: [], meanAbsError: null } });
  });
  it("rejects a zero-capacity forecast request", async () => {
    const ports = createPorts();
    const actorUserId = UserId.create("admin").value;
    const team = asOk(await new CreateTeam(ports.deps).execute({ name: "Team", creatorUserId: actorUserId }));
    expect(await new GetSprintForecast(ports.deps).execute({ teamId: team.teamId, actorUserId, plannedCapacity: 0 })).toMatchObject({ ok: false, error: { code: "VALIDATION" } });
  });
});
