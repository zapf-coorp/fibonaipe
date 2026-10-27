import { ONLINE_WINDOW_SECONDS } from "@fibonaipe/domain";
import { describe, expect, it } from "vitest";
import { CreateRoom } from "./create-room.js";
import { JoinRoom } from "./join-room.js";
import { CloseRoom, GetRoomSnapshot, TransferHost, UpdateRoomSettings } from "./room-commands.js";
import { asOk, asView, createPorts, readRoomByCode } from "../__tests__/harness.js";

describe("room commands", () => {
  it("lets the host update settings and rejects everyone else", async () => {
    const ports = createPorts();
    const created = await openRoom(ports);
    const bea = await joinVoter(ports, created.code, "Bea", "203.0.113.11");
    const denied = await new UpdateRoomSettings(ports.deps).execute({
      code: created.code,
      actorParticipantId: bea.participantId,
      autoReveal: true,
      clientOpId: "settings-bea",
    });
    expect(denied.ok).toBe(false);
    if (denied.ok) throw new Error("expected FORBIDDEN");
    expect(denied.error.code).toBe("FORBIDDEN");

    const updated = await new UpdateRoomSettings(ports.deps).execute({
      code: created.code,
      actorParticipantId: created.participantId,
      autoReveal: true,
      clientOpId: "settings-ada",
    });
    expect(updated.ok).toBe(true);
    const view = asView(
      asOk(
        await new GetRoomSnapshot(ports.deps).execute({
          code: created.code,
          since: 0,
          viewer: { kind: "participant", participantId: created.participantId },
        }),
      ),
    );
    expect(view.settings.autoReveal).toBe(true);
    expect(view.kind).toBe("guest");
    expect(view.teamId).toBeNull();
    expect(ports.published).toContainEqual(
      expect.objectContaining({ type: "room.settings_updated", payload: { name: "Sprint" } }),
    );
  });

  it("transfers the host to an online participant and rejects an offline target", async () => {
    const ports = createPorts();
    const created = await openRoom(ports);
    const bea = await joinVoter(ports, created.code, "Bea", "203.0.113.11");
    const transferred = await new TransferHost(ports.deps).execute({
      code: created.code,
      actorParticipantId: created.participantId,
      targetParticipantId: bea.participantId,
      clientOpId: "transfer-bea",
    });
    expect(transferred.ok).toBe(true);
    const successor = await snapshot(ports, created.code, bea.participantId);
    const former = await snapshot(ports, created.code, created.participantId);
    expect(successor.permissions.transferHost).toBe(true);
    expect(former.permissions.transferHost).toBe(false);
    expect(ports.published).toContainEqual(
      expect.objectContaining({
        type: "host.transferred",
        payload: { fromParticipantId: created.participantId, toParticipantId: bea.participantId },
      }),
    );

    const offline = createPorts();
    const host = await openRoom(offline);
    const other = await joinVoter(offline, host.code, "Bea", "203.0.113.12");
    offline.clock.advanceSeconds(ONLINE_WINDOW_SECONDS + 1);
    const blocked = await new TransferHost(offline.deps).execute({
      code: host.code,
      actorParticipantId: host.participantId,
      targetParticipantId: other.participantId,
      clientOpId: "transfer-offline",
    });
    expect(blocked.ok).toBe(false);
    if (blocked.ok) throw new Error("expected FORBIDDEN");
    expect(blocked.error.code).toBe("FORBIDDEN");
    expect((await snapshot(offline, host.code, host.participantId)).permissions.transferHost).toBe(true);
  });

  it("closes the room for the host only and then rejects join", async () => {
    const ports = createPorts();
    const created = await openRoom(ports);
    const bea = await joinVoter(ports, created.code, "Bea", "203.0.113.11");
    const denied = await new CloseRoom(ports.deps).execute({
      code: created.code,
      actorParticipantId: bea.participantId,
      clientOpId: "close-bea",
    });
    expect(denied.ok).toBe(false);
    if (denied.ok) throw new Error("expected FORBIDDEN");
    expect(denied.error.code).toBe("FORBIDDEN");
    expect((await readRoomByCode(ports.store, created.code))?.status).toBe("open");

    const closed = await new CloseRoom(ports.deps).execute({
      code: created.code,
      actorParticipantId: created.participantId,
      clientOpId: "close-ada",
    });
    expect(closed.ok).toBe(true);
    expect((await readRoomByCode(ports.store, created.code))?.status).toBe("closed");
    const joined = await new JoinRoom(ports.deps).execute({
      code: created.code,
      nickname: "Cleo",
      ip: "203.0.113.13",
      mode: "voter",
      role: "dev",
      clientOpId: "join-cleo",
    });
    expect(joined.ok).toBe(false);
    if (joined.ok) throw new Error("expected FORBIDDEN");
    expect(joined.error.code).toBe("FORBIDDEN");
  });

  it("returns unchanged when since equals version and gives the screen no permissions", async () => {
    const ports = createPorts();
    const created = await openRoom(ports);
    const first = asOk(
      await new GetRoomSnapshot(ports.deps).execute({
        code: created.code,
        since: 0,
        viewer: { kind: "participant", participantId: created.participantId },
      }),
    );
    const view = asView(first);
    const versionBefore = (await readRoomByCode(ports.store, created.code))?.version;
    const second = asOk(
      await new GetRoomSnapshot(ports.deps).execute({
        code: created.code,
        since: view.version,
        viewer: { kind: "participant", participantId: created.participantId },
      }),
    );
    expect(second).toEqual({ unchanged: true, version: view.version });
    expect((await readRoomByCode(ports.store, created.code))?.version).toBe(versionBefore);

    const screen = asView(
      asOk(
        await new GetRoomSnapshot(ports.deps).execute({
          code: created.code,
          since: 0,
          viewer: { kind: "screen" },
        }),
      ),
    );
    expect(screen.ownVote).toBeNull();
    expect(screen.permissions.vote).toBe(false);
    expect(screen.permissions.revealRound).toBe(false);
    expect(screen.permissions.manageQueue).toBe(false);
    expect(screen.permissions.transferHost).toBe(false);
    expect(screen.permissions.exportOwnRoomSummary).toBe(false);
    expect(Object.values(screen.permissions).every((allowed) => allowed === false)).toBe(true);
  });
});

async function openRoom(ports: ReturnType<typeof createPorts>): Promise<{ code: string; participantId: string }> {
  return asOk(
    await new CreateRoom(ports.deps).execute({
      name: "Sprint",
      ip: "203.0.113.10",
      hostNickname: "Ada",
    }),
  );
}

async function joinVoter(
  ports: ReturnType<typeof createPorts>,
  code: string,
  nickname: string,
  ip: string,
): Promise<{ participantId: string }> {
  return asOk(
    await new JoinRoom(ports.deps).execute({
      code,
      nickname,
      ip,
      mode: "voter",
      role: "dev",
      clientOpId: `join-${nickname}`,
    }),
  );
}

async function snapshot(ports: ReturnType<typeof createPorts>, code: string, participantId: string) {
  return asView(
    asOk(
      await new GetRoomSnapshot(ports.deps).execute({
        code,
        since: 0,
        viewer: { kind: "participant", participantId },
      }),
    ),
  );
}
