import { describe, expect, it } from "vitest";
import { UserId, ok } from "@fibonaipe/domain";
import { CreateTeam } from "../teams/create-team.js";
import { asOk, createPorts } from "../__tests__/harness.js";
import { CreateSprint } from "./create-sprint.js";

describe("CreateSprint", () => {
  it("stores a sprint, rejects overlap, and checks team permissions", async () => {
    const ports = createPorts();
    const admin = UserId.create("admin").value;
    const dev = UserId.create("dev").value;
    const team = asOk(await new CreateTeam(ports.deps).execute({ name: "Team", creatorUserId: admin }));
    await ports.store.transaction({}, async (repos) => {
      await repos.memberships.save({ userId: dev, teamId: team.teamId as typeof team.teamId & import("@fibonaipe/domain").TeamId, role: "dev" });
      return ok(true);
    });
    const create = new CreateSprint(ports.deps);
    const input = { teamId: team.teamId, actorUserId: admin, name: "Sprint 1", startDate: "2026-03-01", endDate: "2026-03-14" };
    const first = await create.execute(input);
    expect(first.ok).toBe(true);
    const overlap = await create.execute({ ...input, startDate: "2026-03-14", endDate: "2026-03-20" });
    expect(overlap.ok).toBe(false);
    if (!overlap.ok) expect(overlap.error.code).toBe("VALIDATION");
    const denied = await create.execute({ ...input, actorUserId: dev, startDate: "2026-04-01", endDate: "2026-04-14" });
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.error.code).toBe("FORBIDDEN");
  });
  it("serializes concurrent creation for the same team", async () => {
    const ports = createPorts();
    const admin = UserId.create("admin").value;
    const team = asOk(await new CreateTeam(ports.deps).execute({ name: "Team", creatorUserId: admin }));
    const create = new CreateSprint(ports.deps);
    const input = { teamId: team.teamId, actorUserId: admin, name: "Sprint", startDate: "2026-03-01", endDate: "2026-03-14" };
    const results = await Promise.all([create.execute(input), create.execute(input)]);
    expect(results.filter((result) => result.ok)).toHaveLength(1);
  });
});
