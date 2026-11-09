import { describe, expect, it } from "vitest";
import { TeamId, UserId, ok } from "@fibonaipe/domain";
import { CreateTeam } from "../teams/create-team.js";
import { asOk, createPorts } from "../__tests__/harness.js";
import { DeleteHoliday, ListHolidays, SaveHoliday } from "./holidays.js";
import { CreateSprint } from "./create-sprint.js";
import { ActivateSprint, CloseSprint, GetSprintReport, SetSprintCapacityEntries } from "./sprint-commands.js";

describe("team holidays", () => {
  it("validates, lists and deletes only for authorized team members", async () => {
    const ports = createPorts();
    const actorUserId = UserId.create("admin").value;
    const team = asOk(await new CreateTeam(ports.deps).execute({ name: "Team", creatorUserId: actorUserId }));
    const input = { teamId: team.teamId, actorUserId };
    const save = new SaveHoliday(ports.deps);
    expect((await save.execute({ ...input, date: "2026-02-30", name: "Invalid" })).ok).toBe(false);
    const holiday = asOk(await save.execute({ ...input, date: "2026-11-02", name: " Holiday " }));
    expect((await save.execute({ ...input, date: "2026-11-02", name: "Duplicate" })).ok).toBe(false);
    expect(asOk(await new ListHolidays(ports.deps).execute(input))).toMatchObject([{ name: "Holiday", date: "2026-11-02" }]);
    expect((await new DeleteHoliday(ports.deps).execute({ ...input, actorUserId: "stranger", holidayId: holiday.holidayId })).ok).toBe(false);
    expect((await new DeleteHoliday(ports.deps).execute({ ...input, holidayId: holiday.holidayId })).ok).toBe(true);
    expect(asOk(await new ListHolidays(ports.deps).execute(input))).toEqual([]);
  });
  it("recalculates open sprint capacity but keeps closed reports frozen", async () => {
    const ports = createPorts();
    const actorUserId = UserId.create("admin").value;
    const team = asOk(await new CreateTeam(ports.deps).execute({ name: "Team", creatorUserId: actorUserId }));
    const base = { teamId: team.teamId, actorUserId };
    const create = new CreateSprint(ports.deps);
    const open = asOk(await create.execute({ ...base, name: "Open", startDate: "2026-11-02", endDate: "2026-11-13" }));
    const closed = asOk(await create.execute({ ...base, name: "Closed", startDate: "2026-10-19", endDate: "2026-10-30" }));
    const setCapacity = new SetSprintCapacityEntries(ports.deps);
    for (const sprintId of [open.sprintId, closed.sprintId]) asOk(await setCapacity.execute({ ...base, sprintId, entries: [{ personId: "a", absenceDays: 0 }] }));
    asOk(await new ActivateSprint(ports.deps).execute({ ...base, sprintId: closed.sprintId }));
    asOk(await new CloseSprint(ports.deps).execute({ ...base, sprintId: closed.sprintId }));
    const holiday = asOk(await new SaveHoliday(ports.deps).execute({ ...base, date: "2026-11-02", name: "Holiday" }));
    const updated = await ports.store.transaction({}, async (repos) => {
      const records = await repos.sprints.listByTeam(TeamId.create(team.teamId).value);
      return ok(records);
    });
    expect(updated.value.find((record) => record.id === open.sprintId)?.state?.capacityTotal).toBe(9);
    expect(asOk(await new GetSprintReport(ports.deps).execute({ ...base, sprintId: closed.sprintId })).capacityTotal).toBe(10);
    asOk(await new DeleteHoliday(ports.deps).execute({ ...base, holidayId: holiday.holidayId }));
    const restored = await ports.store.transaction({}, async (repos) => ok(await repos.sprints.listByTeam(TeamId.create(team.teamId).value)));
    expect(restored.value.find((record) => record.id === open.sprintId)?.state?.capacityTotal).toBe(10);
  });
});
