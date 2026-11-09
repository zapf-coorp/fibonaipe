import { describe, expect, it } from "vitest";
import { HolidayId, SprintBuilder, SprintId, TeamId, ok } from "@fibonaipe/domain";
import { createSqlitePersistence } from "./sqlite-persistence.js";

describe("SQLite sprint repository", () => {
  it("persists and filters team sprints", async () => {
    const store = createSqlitePersistence();
    try {
      const team = TeamId.create("team-a").value;
      const other = TeamId.create("team-b").value;
      await store.transaction({}, async (repos) => {
        await repos.sprints.save({ id: SprintId.create("s1").value, teamId: team, name: "One" });
        await repos.sprints.save({ id: SprintId.create("s2").value, teamId: other, name: "Two" });
        return ok(true);
      });
      const result = await store.transaction({}, async (repos) => ok(await repos.sprints.listByTeam(team)));
      expect(result.value.map((sprint) => sprint.name)).toEqual(["One"]);
    } finally {
      store.close();
    }
  });
  it("round trips the full sprint state across transactions", async () => {
    const store = createSqlitePersistence();
    try {
      const id = SprintId.create("s1").value;
      const teamId = TeamId.create("team-a").value;
      const sprint = new SprintBuilder().withId(id).withTeamId(teamId).withName("One").withStartDate("2026-11-02").withEndDate("2026-11-13").build().value;
      const linked = sprint.linkItem({ id: "item-a", estimate: 5, doneAt: null }).value;
      const active = linked.activate(new Date("2026-11-02T00:00:00Z")).value;
      await store.transaction({}, async (repos) => { await repos.sprints.save({ id, teamId, name: "One", state: active.props }); return ok(true); });
      const loaded = await store.transaction({}, async (repos) => ok(await repos.sprints.findById(id)));
      expect(loaded.value?.state).toMatchObject({ status: "active", committedPoints: 5, items: [{ id: "item-a", estimate: 5 }] });
    } finally { store.close(); }
  });
  it("persists and deletes team holidays", async () => {
    const store = createSqlitePersistence();
    try {
      const holiday = { id: HolidayId.create("holiday").value, teamId: TeamId.create("team").value, date: "2026-11-02", name: "Holiday" };
      await store.transaction({}, async (repos) => { await repos.holidays.save(holiday); return ok(true); });
      expect((await store.transaction({}, async (repos) => ok(await repos.holidays.listByTeam(holiday.teamId)))).value).toEqual([holiday]);
      await store.transaction({}, async (repos) => { await repos.holidays.delete(holiday.id); return ok(true); });
      expect((await store.transaction({}, async (repos) => ok(await repos.holidays.listByTeam(holiday.teamId)))).value).toEqual([]);
    } finally { store.close(); }
  });
});
