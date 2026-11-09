import { describe, expect, it } from "vitest";
import { SprintBuilder, hasSprintOverlap, SprintId, TeamId } from "../index.js";

const build = (id: string, team = "team", start = "2026-03-01", end = "2026-03-14") => new SprintBuilder()
  .withId(SprintId.create(id).value).withTeamId(TeamId.create(team).value).withName("Sprint").withStartDate(start).withEndDate(end).build();

describe("Sprint", () => {
  it("snapshots commitment, tracks added scope, delivers done points and freezes on close", () => {
    let sprint = build("s1").value;
    sprint = sprint.linkItem({ id: "a", estimate: 5, doneAt: null }).value;
    sprint = sprint.linkItem({ id: "b", estimate: 8, doneAt: null }).value;
    sprint = sprint.activate(new Date("2026-03-01T00:00:00Z")).value;
    sprint = sprint.linkItem({ id: "c", estimate: 3, doneAt: null }).value;
    sprint = sprint.markDone("a", new Date("2026-03-04T00:00:00Z")).value;
    sprint = sprint.markDone("c", new Date("2026-03-05T00:00:00Z")).value;
    const closed = sprint.close(new Date("2026-03-14T00:00:00Z")).value;
    expect(closed.report).toMatchObject({ committed: 13, delivered: 8, addedAfterStart: [{ id: "c" }], carryOver: [{ id: "b", estimate: 8, carriedOver: true }], pace: null });
    expect(closed.sprint.linkItem({ id: "d", estimate: 1, doneAt: null }).error.code).toBe("FORBIDDEN");
  });
  it("validates dates and detects same-team overlap only", () => {
    expect(build("invalid", "team", "2026-02-30", "2026-03-01").ok).toBe(false);
    const first = build("a").value;
    expect(hasSprintOverlap(build("b", "team", "2026-03-14", "2026-03-20").value, [first])).toBe(true);
    expect(hasSprintOverlap(build("c", "other").value, [first])).toBe(false);
  });
  it("rejects invalid linked items without changing the sprint", () => {
    const sprint = build("s1").value;
    expect(sprint.linkItem({ id: "", estimate: 1, doneAt: null }).ok).toBe(false);
    expect(sprint.linkItem({ id: "a", estimate: 1, doneAt: new Date("invalid") }).ok).toBe(false);
    expect(sprint.items).toHaveLength(0);
  });
  it("protects stored completion dates from mutation by callers", () => {
    const date = new Date("2026-03-04T00:00:00Z");
    let sprint = build("s1").value;
    sprint = sprint.linkItem({ id: "a", estimate: 5, doneAt: null }).value;
    sprint = sprint.activate(new Date("2026-03-01T00:00:00Z")).value;
    sprint = sprint.markDone("a", date).value;
    date.setUTCFullYear(2030);
    sprint.items[0]?.doneAt?.setUTCFullYear(2040);
    expect(sprint.items[0]?.doneAt?.toISOString()).toBe("2026-03-04T00:00:00.000Z");
    const closed = sprint.close(new Date("2026-03-14T00:00:00Z")).value.sprint;
    closed.props.items[0]?.doneAt?.setUTCFullYear(2050);
    expect(closed.items[0]?.doneAt?.toISOString()).toBe("2026-03-04T00:00:00.000Z");
  });
  it("calculates and retains individual capacity inputs", () => {
    const sprint = build("s1", "team", "2026-11-02", "2026-11-13").value;
    const result = sprint.setCapacityEntries([{ personId: "a", absenceDays: 1, focusPct: 80 }, { personId: "b", absenceDays: 0 }], ["2026-11-02"]);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.props).toMatchObject({ capacityTotal: 15.4, capacityEntries: [{ personId: "a", absenceDays: 1, focusPct: 80 }, { personId: "b", absenceDays: 0 }] });
    expect(sprint.setCapacityEntries([{ personId: "a", absenceDays: 0 }, { personId: "a", absenceDays: 0 }], []).ok).toBe(false);
  });
});
