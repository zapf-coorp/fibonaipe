import { describe, expect, it } from "vitest";
import { CreateRoom } from "./create-room.js";
import { JoinRoom } from "./join-room.js";
import { GetRoomSnapshot } from "./room-commands.js";
import { asOk, asView, createPorts, differentCode, readRoomByCode } from "../__tests__/harness.js";

describe("JoinRoom", () => {
  it("returns NOT_FOUND for an unknown code and does not hint at a similar code", async () => {
    const ports = createPorts();
    const created = asOk(
      await new CreateRoom(ports.deps).execute({
        name: "Sprint",
        ip: "203.0.113.10",
        hostNickname: "Ada",
      }),
    );
    const saves = ports.roomSaves();
    const joined = await new JoinRoom(ports.deps).execute({
      code: differentCode(created.code),
      nickname: "Bea",
      ip: "203.0.113.11",
      mode: "voter",
      role: "dev",
      clientOpId: "join-missing",
    });

    expect(joined.ok).toBe(false);
    if (joined.ok) throw new Error("expected NOT_FOUND");
    expect(joined.error.code).toBe("NOT_FOUND");
    expect(JSON.stringify(joined.error)).not.toContain(created.code);
    expect(ports.roomSaves()).toBe(saves);
  });

  it("rejects a duplicate nickname and stores only the SHA-256 of the guest session", async () => {
    const ports = createPorts();
    const created = asOk(
      await new CreateRoom(ports.deps).execute({
        name: "Sprint",
        ip: "203.0.113.10",
        hostNickname: "Ada",
      }),
    );
    const join = new JoinRoom(ports.deps);
    const first = asOk(
      await join.execute({
        code: created.code,
        nickname: "Bea",
        ip: "203.0.113.11",
        mode: "observer",
        role: "observer",
        clientOpId: "join-bea",
      }),
    );
    const stored = await readRoomByCode(ports.store, created.code);
    const document = JSON.stringify(stored);
    expect(document).not.toContain(first.sessionToken);
    expect(document).toContain(ports.ids.sha256(first.sessionToken));

    const taken = await join.execute({
      code: created.code,
      nickname: "bea",
      ip: "203.0.113.12",
      mode: "voter",
      role: "dev",
      clientOpId: "join-bea-again",
    });
    expect(taken.ok).toBe(false);
    if (taken.ok) throw new Error("expected NICKNAME_TAKEN");
    expect(taken.error.code).toBe("NICKNAME_TAKEN");

    const view = asView(
      asOk(
        await new GetRoomSnapshot(ports.deps).execute({
          code: created.code,
          since: 0,
          viewer: { kind: "participant", participantId: first.participantId },
        }),
      ),
    );
    expect(view.kind).toBe("guest");
    expect(view.teamId).toBeNull();
    expect(view.participants.find((seat) => seat.id === first.participantId)?.mode).toBe("observer");
    expect(view.permissions.vote).toBe(false);
    expect(JSON.stringify(ports.published)).not.toContain("Bea");
    expect(JSON.stringify(ports.logArgs)).not.toContain("Bea");
  });

  it("lets one of two racing joins take the last seat and keeps the room at 30", async () => {
    const ports = createPorts();
    const created = asOk(
      await new CreateRoom(ports.deps).execute({
        name: "Sprint",
        ip: "203.0.113.9",
        hostNickname: "Ada",
      }),
    );
    const join = new JoinRoom(ports.deps);
    for (let seat = 2; seat <= 29; seat += 1) {
      const joined = await join.execute({
        code: created.code,
        nickname: `Seat ${seat}`,
        ip: `10.2.0.${seat}`,
        mode: "voter",
        role: "dev",
        clientOpId: `join-${seat}`,
      });
      if (!joined.ok) throw new Error(`seat ${seat} ${joined.error.code}`);
    }

    const racing = await Promise.all([
      join.execute({
        code: created.code,
        nickname: "Seat 30",
        ip: "10.2.0.30",
        mode: "voter",
        role: "dev",
        clientOpId: "join-30",
      }),
      join.execute({
        code: created.code,
        nickname: "Seat 31",
        ip: "10.2.0.31",
        mode: "voter",
        role: "dev",
        clientOpId: "join-31",
      }),
    ]);
    expect(racing.filter((result) => result.ok)).toHaveLength(1);
    const rejected = racing.find((result) => !result.ok);
    expect(rejected?.ok).toBe(false);
    if (rejected === undefined || rejected.ok) throw new Error("expected ROOM_FULL");
    expect(rejected.error.code).toBe("ROOM_FULL");

    const view = asView(
      asOk(
        await new GetRoomSnapshot(ports.deps).execute({
          code: created.code,
          since: 0,
          viewer: { kind: "participant", participantId: created.participantId },
        }),
      ),
    );
    expect(view.participants).toHaveLength(30);

    const extra = await join.execute({
      code: created.code,
      nickname: "Seat 32",
      ip: "10.2.0.32",
      mode: "voter",
      role: "dev",
      clientOpId: "join-32",
    });
    expect(extra.ok).toBe(false);
    if (extra.ok) throw new Error("expected ROOM_FULL");
    expect(extra.error.code).toBe("ROOM_FULL");
    const after = asView(
      asOk(
        await new GetRoomSnapshot(ports.deps).execute({
          code: created.code,
          since: 0,
          viewer: { kind: "participant", participantId: created.participantId },
        }),
      ),
    );
    expect(after.participants).toHaveLength(30);
  });
});
