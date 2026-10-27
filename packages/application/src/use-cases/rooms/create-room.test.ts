import { ANON_ROOM_TTL_MINUTES } from "@fibonaipe/domain";
import { describe, expect, it } from "vitest";
import { CreateRoom } from "./create-room.js";
import { asOk, createPorts, readRoomByCode } from "../__tests__/harness.js";

describe("CreateRoom", () => {
  it("stores only the SHA-256 of the host token and opens a guest room for 60 minutes", async () => {
    const ports = createPorts();
    const now = ports.clock.now();
    const created = asOk(
      await new CreateRoom(ports.deps).execute({
        name: "Sprint",
        ip: "203.0.113.10",
        hostNickname: "Ada",
      }),
    );

    expect(created.hostToken.length).toBeGreaterThan(0);
    expect(created.code).toMatch(/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{8}$/);
    expect(created.participantId.length).toBeGreaterThan(0);

    const stored = await readRoomByCode(ports.store, created.code);
    expect(stored).not.toBeNull();
    const document = JSON.stringify(stored);
    expect(document).not.toContain(created.hostToken);
    expect(document).toContain(ports.ids.sha256(created.hostToken));
    expect(stored?.kind).toBe("guest");
    expect(stored?.teamId).toBeNull();
    expect(stored?.lastActivityAt.toISOString()).toBe(now.toISOString());
    expect(stored?.expiresAt?.toISOString()).toBe(new Date(now.getTime() + ANON_ROOM_TTL_MINUTES * 60_000).toISOString());
    expect(JSON.stringify(ports.logArgs)).not.toContain(created.hostToken);
    expect(JSON.stringify(ports.logArgs)).not.toContain("Ada");
    expect(JSON.stringify(ports.published)).not.toContain("Ada");
    expect(ports.logs.forbiddenKeys()).toEqual([]);
  });

  it("returns RATE_LIMITED once an IP has created 10 rooms in the hour and does not persist another", async () => {
    const ports = createPorts();
    const create = new CreateRoom(ports.deps);
    for (let index = 1; index <= 10; index += 1) {
      const created = await create.execute({
        name: `Room ${index}`,
        ip: "203.0.113.50",
        hostNickname: "Ada",
      });
      expect(created.ok, JSON.stringify(created)).toBe(true);
    }

    const saves = ports.roomSaves();
    const limited = await create.execute({
      name: "Room 11",
      ip: "203.0.113.50",
      hostNickname: "Ada",
    });

    expect(limited.ok).toBe(false);
    if (limited.ok) throw new Error("expected RATE_LIMITED");
    expect(limited.error.code).toBe("RATE_LIMITED");
    expect(limited.error.params?.retryAfterSec).toEqual(expect.any(Number));
    expect(Number(limited.error.params?.retryAfterSec)).toBeGreaterThan(0);
    expect(ports.roomSaves()).toBe(saves);
    expect(JSON.stringify(limited.error)).not.toContain("Ada");
  });
});
