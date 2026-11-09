import { describe, expect, it } from "vitest";
import { SprintId, TeamId, ok } from "@fibonaipe/domain";
import { InMemoryPersistence } from "../fakes/in-memory-persistence.js";

describe("sprint repository", () => {
  it("lists only sprints belonging to a team", async () => {
    const store = new InMemoryPersistence();
    const team = TeamId.create("team-a").value;
    const other = TeamId.create("team-b").value;
    await store.transaction({}, async (repos) => {
      await repos.sprints.save({ id: SprintId.create("s1").value, teamId: team, name: "One" });
      await repos.sprints.save({ id: SprintId.create("s2").value, teamId: other, name: "Two" });
      return ok(true);
    });
    const result = await store.transaction({}, async (repos) => ok(await repos.sprints.listByTeam(team)));
    expect(result.value.map((sprint) => sprint.name)).toEqual(["One"]);
  });
});
