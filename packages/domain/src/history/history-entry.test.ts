import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { AppError } from "../shared/app-error.js";
import { HistoryEntryId, ItemId, RoomId, SprintId, TeamId } from "../shared/ids.js";
import type { Result } from "../shared/result.js";
import { HistoryEntryBuilder } from "./history-entry-builder.js";

const NOW = new Date("2026-10-27T15:00:00.000Z");
const FORBIDDEN_KEYS = ["votes", "participantId", "nickname", "comment"] as const;

function must<T>(result: Result<T, AppError>): T {
  if (!result.ok) throw new Error(`${result.error.code} ${result.error.messageKey}`);
  return result.value;
}

function id<T extends string>(factory: { create(raw: string): Result<T, AppError> }, raw: string): T {
  return must(factory.create(raw));
}

function forbiddenKeys(value: unknown, found: string[] = []): string[] {
  if (Array.isArray(value)) {
    for (const entry of value) forbiddenKeys(entry, found);
    return found;
  }
  if (typeof value !== "object" || value === null) return found;
  for (const [key, entry] of Object.entries(value)) {
    if ((FORBIDDEN_KEYS as readonly string[]).includes(key)) found.push(key);
    forbiddenKeys(entry, found);
  }
  return found;
}

describe("HistoryEntry", () => {
  it("builds an aggregate row from injected ids and now, with no vote or person fields", () => {
    const entry = must(
      new HistoryEntryBuilder()
        .withId(id(HistoryEntryId, "history-1"))
        .withTeamId(id(TeamId, "team-bridge"))
        .withItemId(id(ItemId, "item-bridge"))
        .withRoomId(id(RoomId, "room-bridge"))
        .withSprintId(id(SprintId, "sprint-1"))
        .withTitle("Bridge work")
        .withExternalKey("PAY-8")
        .withFigureTag("K")
        .withRoundNumber(2)
        .withMean(8)
        .withMedian(8)
        .withModes([8, 13])
        .withMin(5)
        .withMax(13)
        .withConsensus(false)
        .withNearConsensus(true)
        .withSuitDistribution({ clubs: 2, hearts: 1, spades: 0, diamonds: 0 })
        .withSuitDivergence(true)
        .withSpecialCounts({ "?": 0, Coringa: 1, AFK: 0 })
        .withFinalEstimate("13")
        .withFinalSuit("clubs")
        .withEstimatedAt(NOW)
        .build(),
    );

    expect(entry.id).toBe("history-1");
    expect(entry.teamId).toBe("team-bridge");
    expect(entry.itemId).toBe("item-bridge");
    expect(entry.roomId).toBe("room-bridge");
    expect(entry.sprintId).toBe("sprint-1");
    expect(entry.title).toBe("Bridge work");
    expect(entry.externalKey).toBe("PAY-8");
    expect(entry.figureTag).toBe("K");
    expect(entry.roundNumber).toBe(2);
    expect(entry.mean).toBe(8);
    expect(entry.median).toBe(8);
    expect(entry.modes).toEqual([8, 13]);
    expect(entry.min).toBe(5);
    expect(entry.max).toBe(13);
    expect(entry.consensus).toBe(false);
    expect(entry.nearConsensus).toBe(true);
    expect(entry.suitDistribution).toEqual({ clubs: 2, hearts: 1, spades: 0, diamonds: 0 });
    expect(entry.suitDivergence).toBe(true);
    expect(entry.specialCounts).toEqual({ "?": 0, Coringa: 1, AFK: 0 });
    expect(entry.finalEstimate).toBe("13");
    expect(entry.finalSuit).toBe("clubs");
    expect(entry.estimatedAt.toISOString()).toBe(NOW.toISOString());
    expect(forbiddenKeys(entry)).toEqual([]);
    expect(JSON.stringify(entry)).not.toMatch(/"votes"|"participantId"|"nickname"|"comment"/);
  });

  it("leaves optional sprint, external key, figure tag, and final suit empty when omitted", () => {
    const entry = must(
      new HistoryEntryBuilder()
        .withId(id(HistoryEntryId, "history-2"))
        .withTeamId(id(TeamId, "team-bridge"))
        .withItemId(id(ItemId, "item-bridge"))
        .withRoomId(id(RoomId, "room-bridge"))
        .withTitle("Tunnel")
        .withRoundNumber(1)
        .withMean(null)
        .withMedian(null)
        .withModes([])
        .withMin(null)
        .withMax(null)
        .withConsensus(false)
        .withNearConsensus(false)
        .withSuitDistribution({ clubs: 0, hearts: 0, spades: 0, diamonds: 0 })
        .withSuitDivergence(false)
        .withSpecialCounts({ "?": 1, Coringa: 0, AFK: 0 })
        .withFinalEstimate("5")
        .withEstimatedAt(NOW)
        .build(),
    );
    expect(entry.sprintId ?? null).toBeNull();
    expect(entry.externalKey ?? null).toBeNull();
    expect(entry.figureTag ?? null).toBeNull();
    expect(entry.finalSuit ?? null).toBeNull();
    expect(forbiddenKeys(entry)).toEqual([]);
  });

  it("rejects an empty title with VALIDATION", () => {
    const built = new HistoryEntryBuilder()
      .withId(id(HistoryEntryId, "history-3"))
      .withTeamId(id(TeamId, "team-bridge"))
      .withItemId(id(ItemId, "item-bridge"))
      .withRoomId(id(RoomId, "room-bridge"))
      .withTitle("  ")
      .withRoundNumber(1)
      .withMean(5)
      .withMedian(5)
      .withModes([5])
      .withMin(5)
      .withMax(5)
      .withConsensus(true)
      .withNearConsensus(true)
      .withSuitDistribution({ clubs: 1, hearts: 0, spades: 0, diamonds: 0 })
      .withSuitDivergence(false)
      .withSpecialCounts({ "?": 0, Coringa: 0, AFK: 0 })
      .withFinalEstimate("5")
      .withEstimatedAt(NOW)
      .build();
    expect(built.ok).toBe(false);
    if (built.ok) throw new Error("expected VALIDATION");
    expect(built.error.code).toBe("VALIDATION");
    expect(built.error.messageKey).toBe("errors.VALIDATION");
  });

  it("keeps Date.now, new Date(), Math.random, crypto.randomUUID, and process.env out of the history sources", () => {
    const directory = dirname(fileURLToPath(import.meta.url));
    for (const filename of ["history-entry.ts", "history-entry-builder.ts"]) {
      const source = readFileSync(join(directory, filename), "utf8");
      expect(source, filename).not.toMatch(/Date\.now\s*\(/);
      expect(source, filename).not.toMatch(/new\s+Date\s*\(\s*\)/);
      expect(source, filename).not.toMatch(/Math\.random\s*\(/);
      expect(source, filename).not.toMatch(/crypto\.randomUUID\s*\(/);
      expect(source, filename).not.toMatch(/process\.env/);
    }
  });
});
