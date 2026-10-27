import { ANON_ROOM_TTL_MINUTES, RoomCode, RoomId, TeamId, ok } from "@fibonaipe/domain";
import { describe, expect, it } from "vitest";
import { CreateRoom } from "./create-room.js";
import { Heartbeat } from "./heartbeat.js";
import { PurgeExpiredRooms } from "./purge-expired-rooms.js";
import { asOk, createPorts, readRoomByCode } from "../__tests__/harness.js";

describe("PurgeExpiredRooms", () => {
  it("deletes an idle guest at 61 minutes, keeps a recently active guest and every team room, and logs only a count", async () => {
    const ports = createPorts();
    const idle = asOk(
      await new CreateRoom(ports.deps).execute({
        name: "Idle room",
        ip: "203.0.113.20",
        hostNickname: "Ada",
      }),
    );
    const active = asOk(
      await new CreateRoom(ports.deps).execute({
        name: "Active room",
        ip: "203.0.113.21",
        hostNickname: "Bea",
      }),
    );
    const teamId = asOk(TeamId.create("team-1"));
    const teamRoomId = asOk(RoomId.create("team-room-1"));
    const teamCode = asOk(RoomCode.create("TEAM2345"));
    const seeded = await ports.store.transaction({}, async (repos) => {
      await repos.rooms.save({
        id: teamRoomId,
        code: teamCode,
        name: "Platform",
        kind: "team",
        teamId,
        status: "open",
        version: 1,
        items: [],
        expiresAt: new Date(0),
        lastActivityAt: new Date(0),
      });
      return ok(true);
    });
    expect(seeded.ok).toBe(true);

    ports.clock.advanceSeconds(50 * 60);
    const beat = await new Heartbeat(ports.deps).execute({
      code: active.code,
      participantId: active.participantId,
      clientOpId: "hb-active",
    });
    expect(beat.ok).toBe(true);

    ports.clock.advanceSeconds((ANON_ROOM_TTL_MINUTES - 1 - 50) * 60);
    const purge = new PurgeExpiredRooms(ports.deps);
    await expectCount(ports, purge, 0);
    expect(await readRoomByCode(ports.store, idle.code)).not.toBeNull();
    expect(await readRoomByCode(ports.store, active.code)).not.toBeNull();
    expect(await readRoomByCode(ports.store, teamCode)).not.toBeNull();

    ports.clock.advanceSeconds(2 * 60);
    await expectCount(ports, purge, 1);
    expect(await readRoomByCode(ports.store, idle.code)).toBeNull();
    expect(await readRoomByCode(ports.store, active.code)).not.toBeNull();
    expect(await readRoomByCode(ports.store, teamCode)).not.toBeNull();

    await expectCount(ports, purge, 0);
    expect(await readRoomByCode(ports.store, idle.code)).toBeNull();
    expect(await readRoomByCode(ports.store, active.code)).not.toBeNull();
    expect(await readRoomByCode(ports.store, teamCode)).not.toBeNull();

    const logged = JSON.stringify(ports.logArgs);
    expect(logged).not.toContain("Ada");
    expect(logged).not.toContain("Bea");
    expect(ports.logs.forbiddenKeys()).toEqual([]);
  });
});

async function expectCount(
  ports: ReturnType<typeof createPorts>,
  purge: { execute(): Promise<{ ok: boolean }> },
  count: number,
): Promise<void> {
  const before = numericCounts(ports.logArgs).length;
  const result = await purge.execute();
  expect(result.ok).toBe(true);
  expect(numericCounts(ports.logArgs).slice(before)).toEqual([count]);
}

function numericCounts(entries: readonly unknown[]): number[] {
  const counts: number[] = [];
  for (const entry of entries) {
    if (typeof entry !== "object" || entry === null || !("count" in entry)) continue;
    const count = entry.count;
    if (typeof count === "number") counts.push(count);
  }
  return counts;
}
