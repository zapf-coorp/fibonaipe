import { describe, expect, it } from "vitest";
import { HolidayId, TeamId, ok } from "@fibonaipe/domain";
import { InMemoryPersistence } from "../fakes/in-memory-persistence.js";

describe("holiday repository", () => {
  it("stores, lists by team and deletes holidays transactionally", async () => {
    const store = new InMemoryPersistence();
    const teamId = TeamId.create("team-a").value;
    const otherTeam = TeamId.create("team-b").value;
    const holiday = { id: HolidayId.create("holiday-a").value, teamId, date: "2026-11-02", name: "Holiday" };
    await store.transaction({}, async (repos) => {
      await repos.holidays.save(holiday);
      await repos.holidays.save({ ...holiday, id: HolidayId.create("holiday-b").value, teamId: otherTeam });
      return ok(true);
    });
    const before = await store.transaction({}, async (repos) => ok(await repos.holidays.listByTeam(teamId)));
    expect(before.value).toEqual([holiday]);
    await store.transaction({}, async (repos) => { await repos.holidays.delete(holiday.id); return ok(true); });
    const after = await store.transaction({}, async (repos) => ok(await repos.holidays.listByTeam(teamId)));
    expect(after.value).toEqual([]);
  });
});
