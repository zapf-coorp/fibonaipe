import { HOST_GRACE_SECONDS } from "@fibonaipe/domain";
import { describe, expect, it } from "vitest";
import { CreateRoom } from "./create-room.js";
import { Heartbeat } from "./heartbeat.js";
import { JoinRoom } from "./join-room.js";
import { GetRoomSnapshot } from "./room-commands.js";
import { asOk, asView, createPorts, readRoomByCode } from "../__tests__/harness.js";

describe("Heartbeat", () => {
  it("refreshes activity and auto-transfers the host after the grace period", async () => {
    const ports = createPorts();
    const created = asOk(
      await new CreateRoom(ports.deps).execute({
        name: "Sprint",
        ip: "203.0.113.10",
        hostNickname: "Ada",
      }),
    );
    const bea = asOk(
      await new JoinRoom(ports.deps).execute({
        code: created.code,
        nickname: "Bea",
        ip: "203.0.113.11",
        mode: "voter",
        role: "dev",
        clientOpId: "join-bea",
      }),
    );
    ports.clock.advanceSeconds(HOST_GRACE_SECONDS + 1);

    const beat = await new Heartbeat(ports.deps).execute({
      code: created.code,
      participantId: bea.participantId,
      clientOpId: "hb-bea",
    });
    expect(beat.ok).toBe(true);
    expect(asOk(beat).realtimePending).not.toBe(true);

    const stored = await readRoomByCode(ports.store, created.code);
    expect(stored?.lastActivityAt.toISOString()).toBe(ports.clock.now().toISOString());
    expect(stored?.expiresAt?.toISOString()).toBe(new Date(ports.clock.now().getTime() + 60 * 60_000).toISOString());

    const successor = asView(
      asOk(
        await new GetRoomSnapshot(ports.deps).execute({
          code: created.code,
          since: 0,
          viewer: { kind: "participant", participantId: bea.participantId },
        }),
      ),
    );
    const former = asView(
      asOk(
        await new GetRoomSnapshot(ports.deps).execute({
          code: created.code,
          since: 0,
          viewer: { kind: "participant", participantId: created.participantId },
        }),
      ),
    );
    expect(successor.permissions.transferHost).toBe(true);
    expect(former.permissions.transferHost).toBe(false);
    expect(ports.published).toContainEqual(
      expect.objectContaining({
        type: "host.transferred",
        payload: { fromParticipantId: created.participantId, toParticipantId: bea.participantId },
      }),
    );
    expect(JSON.stringify(ports.logArgs)).not.toContain("Ada");
    expect(JSON.stringify(ports.logArgs)).not.toContain("Bea");
  });
});
