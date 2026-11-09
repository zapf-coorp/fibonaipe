import { describe, expect, it } from "vitest";
import { HistoryEntryId, ItemId, RoomId, RoundId, TeamId, UserId, ok } from "@fibonaipe/domain";
import { CreateTeam } from "../teams/create-team.js";
import { asOk, createPorts } from "../__tests__/harness.js";
import { GetEstimationIndicators } from "./estimation-indicators.js";

describe("GetEstimationIndicators", () => {
  it("filters aggregated history by team and date, and rejects outsiders", async () => {
    const ports = createPorts();
    const actorUserId = UserId.create("admin").value;
    const team = asOk(await new CreateTeam(ports.deps).execute({ name: "Team", creatorUserId: actorUserId }));
    const teamId = TeamId.create(team.teamId).value;
    const base = { roomId: RoomId.create("room").value, roundId: RoundId.create("round").value, dominantSuit: "clubs", stats: { voteCount: 2, consensus: true }, teamId, roundNumber: 1, min: 5, max: 5, consensus: true, finalEstimate: "5", estimatedAt: new Date("2026-11-03T00:00:00Z") };
    await ports.store.transaction({}, async (repos) => {
      await repos.history.appendAggregated({ ...base, id: HistoryEntryId.create("entry-a").value, itemId: ItemId.create("a").value });
      await repos.history.appendAggregated({ ...base, id: HistoryEntryId.create("entry-b").value, itemId: ItemId.create("b").value, teamId: TeamId.create("other").value });
      return ok(true);
    });
    const get = new GetEstimationIndicators(ports.deps);
    const result = asOk(await get.execute({ teamId, actorUserId, from: new Date("2026-11-01T00:00:00Z"), to: new Date("2026-11-30T00:00:00Z") }));
    expect(result.firstRoundConsensusRate).toBe(1);
    expect(result.frequency).toEqual({ "5": 1 });
    expect((await get.execute({ teamId, actorUserId: "outsider" })).ok).toBe(false);
  });
});
