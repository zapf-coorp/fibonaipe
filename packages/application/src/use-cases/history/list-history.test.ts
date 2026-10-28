import {
  HistoryEntryId,
  ItemId,
  RoomId,
  RoundId,
  SprintId,
  TeamId,
  UserId,
  ok,
  type HistoryEntryId as HistoryId,
  type TeamId as TeamIdValue,
} from "@fibonaipe/domain";
import { FakeAuthProvider, FakeClock } from "@fibonaipe/testing";
import { describe, expect, it } from "vitest";
import type { AggregatedHistoryRecord } from "../../ports/persistence.port.js";
import { CompleteSignIn } from "../identity/complete-sign-in.js";
import { CreateTeam } from "../teams/create-team.js";
import { asOk, createPorts, type Harness } from "../__tests__/harness.js";
import { ExportHistory, ListHistory } from "./list-history.js";

const REDIRECT = "https://app.example/callback";

function instant(value: Date | string | undefined): string {
  if (value === undefined) return "";
  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

function jsonRowCount(value: unknown): number {
  if (Array.isArray(value)) return value.length;
  if (typeof value === "object" && value !== null && Array.isArray((value as { rows?: unknown }).rows)) {
    return (value as { rows: unknown[] }).rows.length;
  }
  return 0;
}
const BASE = Date.parse("2026-10-01T00:00:00.000Z");

interface SeedRow extends AggregatedHistoryRecord {
  readonly teamId: TeamIdValue;
  readonly title: string;
  readonly finalEstimate: string;
  readonly estimatedAt: Date;
  readonly roundNumber: number;
  readonly mean: number;
  readonly sprintId?: string;
  readonly suit?: string;
  readonly figureTag?: string;
}

function mustId<T extends string>(factory: { create(raw: string): { ok: boolean; value?: T; error?: { code: string } } }, raw: string): T {
  const parsed = factory.create(raw);
  if (!parsed.ok || parsed.value === undefined) throw new Error(parsed.error?.code ?? "id");
  return parsed.value;
}

async function signIn(ports: Harness, email: string): Promise<string> {
  const auth = new FakeAuthProvider();
  await auth.sendMagicLink(email, REDIRECT);
  return asOk(
    await new CompleteSignIn(ports.deps, auth).execute({
      token: auth.latestMagicLinkToken(),
      superAdminEmails: [],
    }),
  ).userId;
}

async function append(ports: Harness, row: SeedRow) {
  const saved = await ports.store.transaction({}, async (repos) => {
    await repos.history.appendAggregated(row);
    return ok(true);
  });
  if (!saved.ok) throw new Error(saved.error.code);
}

function row(index: number, teamId: TeamIdValue, fields: Partial<SeedRow> & Pick<SeedRow, "title" | "finalEstimate" | "estimatedAt">): SeedRow {
  const id = mustId(HistoryEntryId, `history-${String(index).padStart(2, "0")}`);
  return {
    id: id as HistoryId,
    roomId: fields.roomId ?? mustId(RoomId, "room-seed"),
    itemId: mustId(ItemId, `item-${String(index).padStart(2, "0")}`),
    roundId: mustId(RoundId, `round-${String(index).padStart(2, "0")}`),
    dominantSuit: fields.suit ?? "clubs",
    stats: { voteCount: 3, consensus: false },
    teamId,
    title: fields.title,
    finalEstimate: fields.finalEstimate,
    estimatedAt: fields.estimatedAt,
    roundNumber: 1,
    mean: Number(fields.finalEstimate) || 0,
    ...(fields.sprintId === undefined ? {} : { sprintId: fields.sprintId }),
    ...(fields.suit === undefined ? {} : { suit: fields.suit }),
    ...(fields.figureTag === undefined ? {} : { figureTag: fields.figureTag }),
    ...(fields.roomId === undefined ? {} : { roomId: fields.roomId }),
  };
}

async function teamOf(ports: Harness, userId: string): Promise<TeamIdValue> {
  const created = asOk(await new CreateTeam(ports.deps).execute({ name: "Bridge", creatorUserId: userId }));
  const parsed = TeamId.create(created.teamId);
  if (!parsed.ok) throw new Error(parsed.error.code);
  return parsed.value;
}

describe("ListHistory", () => {
  it("returns VALIDATION when limit is above 100", async () => {
    const ports = createPorts({ clock: new FakeClock("2026-10-27T15:00:00.000Z") });
    const userId = await signIn(ports, "ada@example.com");
    const teamId = await teamOf(ports, userId);
    const listed = await new ListHistory(ports.deps).execute({
      teamId,
      actorUserId: userId,
      limit: 101,
    });
    expect(listed.ok).toBe(false);
    if (listed.ok) throw new Error("expected VALIDATION");
    expect(listed.error.code).toBe("VALIDATION");
    expect(listed.error.messageKey).toBe("errors.VALIDATION");
  });

  it("sorts by estimatedAt descending and continues at the cursor without repeating a row", async () => {
    const ports = createPorts({ clock: new FakeClock("2026-10-27T15:00:00.000Z") });
    const userId = await signIn(ports, "ada@example.com");
    const teamId = await teamOf(ports, userId);
    for (let index = 0; index < 40; index += 1) {
      await append(
        ports,
        row(index, teamId, {
          title: `Item ${index}`,
          finalEstimate: "5",
          estimatedAt: new Date(BASE + index * 60_000),
        }),
      );
    }
    const list = new ListHistory(ports.deps);
    const first = await list.execute({ teamId, actorUserId: userId, limit: 2 });
    expect(first.ok, JSON.stringify(first)).toBe(true);
    if (!first.ok) throw new Error(first.error.code);
    expect(first.value.rows).toHaveLength(2);
    expect(instant(first.value.rows[0]?.estimatedAt)).toBe(new Date(BASE + 39 * 60_000).toISOString());
    expect(instant(first.value.rows[1]?.estimatedAt)).toBe(new Date(BASE + 38 * 60_000).toISOString());
    expect(typeof first.value.nextCursor).toBe("string");
    const second = await list.execute({ teamId, actorUserId: userId, limit: 2, cursor: first.value.nextCursor });
    expect(second.ok, JSON.stringify(second)).toBe(true);
    if (!second.ok) throw new Error(second.error.code);
    expect(instant(second.value.rows[0]?.estimatedAt)).toBe(new Date(BASE + 37 * 60_000).toISOString());
    const seen = new Set([...first.value.rows, ...second.value.rows].map((entry) => entry.id));
    expect(seen.size).toBe(4);
  });

  it("filters title, date range, sprint, room, estimate min and max, suit, and figure tag", async () => {
    const ports = createPorts({ clock: new FakeClock("2026-10-27T15:00:00.000Z") });
    const userId = await signIn(ports, "ada@example.com");
    const teamId = await teamOf(ports, userId);
    const sprintId = mustId(SprintId, "sprint-filter");
    const roomId = mustId(RoomId, "room-filter");
    await append(ports, row(1, teamId, { title: "AlphaBridge", finalEstimate: "3", estimatedAt: new Date("2026-10-20T12:00:00.000Z") }));
    await append(ports, row(2, teamId, { title: "Other", finalEstimate: "3", estimatedAt: new Date("2026-11-02T12:00:00.000Z") }));
    await append(ports, row(3, teamId, { title: "Sprint row", finalEstimate: "5", estimatedAt: new Date("2026-10-10T12:00:00.000Z"), sprintId }));
    await append(ports, row(4, teamId, { title: "Room row", finalEstimate: "5", estimatedAt: new Date("2026-10-11T12:00:00.000Z"), roomId }));
    await append(ports, row(5, teamId, { title: "Suit row", finalEstimate: "8", estimatedAt: new Date("2026-10-12T12:00:00.000Z"), suit: "hearts" }));
    await append(ports, row(6, teamId, { title: "Figure row", finalEstimate: "13", estimatedAt: new Date("2026-10-13T12:00:00.000Z"), figureTag: "K" }));
    const list = new ListHistory(ports.deps);
    const text = await list.execute({ teamId, actorUserId: userId, text: "AlphaBridge", limit: 100 });
    const dates = await list.execute({
      teamId,
      actorUserId: userId,
      from: new Date("2026-10-19T00:00:00.000Z"),
      to: new Date("2026-10-21T00:00:00.000Z"),
      limit: 100,
    });
    const sprint = await list.execute({ teamId, actorUserId: userId, sprintId, limit: 100 });
    const room = await list.execute({ teamId, actorUserId: userId, roomId, limit: 100 });
    const estimate = await list.execute({ teamId, actorUserId: userId, estimateMin: 8, estimateMax: 13, limit: 100 });
    const suit = await list.execute({ teamId, actorUserId: userId, suit: "hearts", limit: 100 });
    const figure = await list.execute({ teamId, actorUserId: userId, figureTag: "K", limit: 100 });
    for (const result of [text, dates, sprint, room, suit, figure]) {
      expect(result.ok, JSON.stringify(result)).toBe(true);
      if (!result.ok) throw new Error(result.error.code);
      expect(result.value.rows).toHaveLength(1);
    }
    expect(estimate.ok, JSON.stringify(estimate)).toBe(true);
    if (!estimate.ok) throw new Error(estimate.error.code);
    expect(estimate.value.rows).toHaveLength(2);
    if (!text.ok || !dates.ok || !sprint.ok || !room.ok || !estimate.ok || !suit.ok || !figure.ok) return;
    expect(text.value.rows[0]?.title).toBe("AlphaBridge");
    expect(dates.value.rows[0]?.title).toBe("AlphaBridge");
    expect(sprint.value.rows[0]?.title).toBe("Sprint row");
    expect(room.value.rows[0]?.title).toBe("Room row");
    expect(estimate.value.rows.map((entry) => entry.finalEstimate).sort()).toEqual(["13", "8"]);
    expect(suit.value.rows[0]?.title).toBe("Suit row");
    expect(figure.value.rows[0]?.title).toBe("Figure row");
  });

  it("exports the three rows at or above 8 from forty, quoting formula cells and naming the team and clock date", async () => {
    const ports = createPorts({ clock: new FakeClock("2026-10-27T15:00:00.000Z") });
    const userId = await signIn(ports, "ada@example.com");
    const teamId = await teamOf(ports, userId);
    const highs = [
      { title: "=SUM(1)", finalEstimate: "8" },
      { title: "North", finalEstimate: "13" },
      { title: "South", finalEstimate: "21" },
    ];
    for (let index = 0; index < 37; index += 1) {
      await append(
        ports,
        row(index, teamId, {
          title: `Small ${index}`,
          finalEstimate: "5",
          estimatedAt: new Date(BASE + index * 60_000),
        }),
      );
    }
    for (let index = 0; index < highs.length; index += 1) {
      const high = highs[index];
      if (high === undefined) continue;
      await append(
        ports,
        row(37 + index, teamId, {
          title: high.title,
          finalEstimate: high.finalEstimate,
          estimatedAt: new Date(BASE + (37 + index) * 60_000),
        }),
      );
    }
    const listed = await new ListHistory(ports.deps).execute({
      teamId,
      actorUserId: userId,
      estimateMin: 8,
      limit: 100,
    });
    expect(listed.ok, JSON.stringify(listed)).toBe(true);
    if (!listed.ok) throw new Error(listed.error.code);
    expect(listed.value.rows).toHaveLength(3);
    expect(listed.value.rows.map((entry) => entry.finalEstimate)).toEqual(["21", "13", "8"]);

    const exported = await new ExportHistory(ports.deps).execute({
      teamId,
      actorUserId: userId,
      estimateMin: 8,
      limit: 100,
      format: "csv",
    });
    expect(exported.ok, JSON.stringify(exported)).toBe(true);
    if (!exported.ok) throw new Error(exported.error.code);
    const lines = exported.value.content.replace(/^\uFEFF/, "").split("\n").filter((line) => line.length > 0);
    expect(lines).toHaveLength(4);
    expect(exported.value.content).toContain("'=SUM(1)");
    expect(exported.value.content).toContain("North");
    expect(exported.value.content).toContain("South");
    expect(exported.value.filename.toLowerCase()).toContain("bridge");
    expect(exported.value.filename).toContain("2026-10-27");
    expect(JSON.stringify(exported.value.content)).not.toMatch(/"participantId"|"nickname"|"comment"/);

    const json = await new ExportHistory(ports.deps).execute({
      teamId,
      actorUserId: userId,
      estimateMin: 8,
      limit: 100,
      format: "json",
    });
    expect(json.ok, JSON.stringify(json)).toBe(true);
    if (!json.ok) throw new Error(json.error.code);
    expect(jsonRowCount(JSON.parse(json.value.content) as unknown)).toBe(3);
    expect(json.value.filename.toLowerCase()).toContain("bridge");
    expect(json.value.filename).toContain("2026-10-27");
  });

  it("lets an observer read the same rows and returns FORBIDDEN on export", async () => {
    const ports = createPorts({ clock: new FakeClock("2026-10-27T15:00:00.000Z") });
    const adminId = await signIn(ports, "ada@example.com");
    const observerId = await signIn(ports, "omar@example.com");
    const teamId = await teamOf(ports, adminId);
    await append(
      ports,
      row(1, teamId, { title: "Visible", finalEstimate: "8", estimatedAt: new Date("2026-10-27T12:00:00.000Z") }),
    );
    const observer = UserId.create(observerId);
    if (!observer.ok) throw new Error(observer.error.code);
    const saved = await ports.store.transaction({}, async (repos) => {
      await repos.memberships.save({ userId: observer.value, teamId, role: "observer" });
      return ok(true);
    });
    expect(saved.ok).toBe(true);
    const admin = await new ListHistory(ports.deps).execute({ teamId, actorUserId: adminId, limit: 100 });
    const listed = await new ListHistory(ports.deps).execute({ teamId, actorUserId: observerId, limit: 100 });
    expect(admin.ok && listed.ok).toBe(true);
    if (!admin.ok || !listed.ok) throw new Error("expected rows");
    expect(listed.value.rows.map((entry) => entry.id)).toEqual(admin.value.rows.map((entry) => entry.id));
    const exported = await new ExportHistory(ports.deps).execute({
      teamId,
      actorUserId: observerId,
      limit: 100,
      format: "csv",
    });
    expect(exported.ok).toBe(false);
    if (exported.ok) throw new Error("expected FORBIDDEN");
    expect(exported.error.code).toBe("FORBIDDEN");
    expect(exported.error.messageKey).toBe("errors.FORBIDDEN");
  });
});
