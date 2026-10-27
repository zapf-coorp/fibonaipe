import { describe, expect, it } from "vitest";
import { AddItem, SetCurrentItem } from "../items/item-commands.js";
import { CastVote, RevealRound, SetFinalEstimate } from "../voting/voting-commands.js";
import { CreateRoom } from "./create-room.js";
import { JoinRoom } from "./join-room.js";
import { ExportRoomSummary } from "./export-room-summary.js";
import { asOk, asView, createPorts, hasIndividualVote, readHistory, readRoomByCode } from "../__tests__/harness.js";
import { GetRoomSnapshot } from "./room-commands.js";

describe("ExportRoomSummary", () => {
  it("exports guest items, the final estimate, and round aggregates without individual votes or team history", async () => {
    const ports = createPorts();
    const created = asOk(
      await new CreateRoom(ports.deps).execute({
        name: "Sprint",
        ip: "203.0.113.60",
        hostNickname: "Ada",
      }),
    );
    const bea = asOk(
      await new JoinRoom(ports.deps).execute({
        code: created.code,
        nickname: "Bea",
        ip: "203.0.113.61",
        mode: "voter",
        role: "dev",
        clientOpId: "join-bea",
      }),
    );
    await new AddItem(ports.deps).execute({
      code: created.code,
      actorParticipantId: created.participantId,
      title: "Bridge work",
      clientOpId: "add-bridge",
    });
    const queued = asView(
      asOk(
        await new GetRoomSnapshot(ports.deps).execute({
          code: created.code,
          since: 0,
          viewer: { kind: "participant", participantId: created.participantId },
        }),
      ),
    );
    const itemId = queued.queue[0]?.id ?? "";
    await new SetCurrentItem(ports.deps).execute({
      code: created.code,
      actorParticipantId: created.participantId,
      itemId,
      clientOpId: "current-bridge",
    });
    await new CastVote(ports.deps).execute({
      code: created.code,
      participantId: created.participantId,
      card: "8",
      suit: "clubs",
      comment: "secret-note",
      clientOpId: "vote-ada",
    });
    await new CastVote(ports.deps).execute({
      code: created.code,
      participantId: bea.participantId,
      card: "13",
      suit: "hearts",
      clientOpId: "vote-bea",
    });
    await new RevealRound(ports.deps).execute({
      code: created.code,
      actorParticipantId: created.participantId,
      clientOpId: "reveal-1",
    });
    await new SetFinalEstimate(ports.deps).execute({
      code: created.code,
      actorParticipantId: created.participantId,
      itemId,
      label: "21",
      clientOpId: "final-21",
    });

    const stored = await readRoomByCode(ports.store, created.code);
    if (stored === null) throw new Error("expected the guest room");
    expect(stored.kind).toBe("guest");
    expect(stored.teamId).toBeNull();
    expect(await readHistory(ports.store, stored.id)).toEqual([]);

    const exporter = new ExportRoomSummary(ports.deps);
    const json = asOk(
      await exporter.execute({ code: created.code, participantId: bea.participantId, format: "json" }),
    );
    const csv = asOk(
      await exporter.execute({ code: created.code, participantId: created.participantId, format: "csv" }),
    );
    expect(json.mimeType).toContain("json");
    expect(csv.mimeType).toContain("csv");
    expect(json.content).toContain("Bridge work");
    expect(json.content).toContain("21");
    expect(json.content).toContain("10.5");
    expect(json.content).not.toContain("secret-note");
    expect(hasIndividualVote(JSON.parse(json.content))).toBe(false);
    expect(csv.content).toContain("Bridge work");
    expect(csv.content).toContain("21");
    expect(csv.content).not.toContain("secret-note");
    expect(JSON.stringify(ports.logArgs)).not.toContain("secret-note");
    expect(ports.logs.forbiddenKeys()).toEqual([]);
  });
});
