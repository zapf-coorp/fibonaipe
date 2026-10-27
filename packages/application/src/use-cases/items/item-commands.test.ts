import { MAX_ITEM_DESC_LENGTH, MAX_ITEM_TITLE_LENGTH, MAX_ITEMS_PER_ROOM, ok } from "@fibonaipe/domain";
import type { IssueTracker, IssueTrackerImportInput } from "@fibonaipe/application";
import { describe, expect, it } from "vitest";
import { FakeIssueTracker } from "@fibonaipe/testing";
import { CreateRoom } from "../rooms/create-room.js";
import { JoinRoom } from "../rooms/join-room.js";
import { GetRoomSnapshot } from "../rooms/room-commands.js";
import { AddItem, DeferItem, ImportItems, RemoveItem, ReorderItems, SetCurrentItem, SkipItem } from "./item-commands.js";
import { asOk, asView, createPorts, readRoomByCode, type Harness } from "../__tests__/harness.js";

describe("item commands", () => {
  it("imports, reorders, focuses, skips, defers, and removes without calling the tracker write", async () => {
    const seen: IssueTrackerImportInput[] = [];
    let writes = 0;
    const tracker = new FakeIssueTracker();
    const issueTracker: IssueTracker = {
      provider: "manual",
      importItems: async (input) => {
        seen.push(input);
        return tracker.importItems(input);
      },
      writeEstimate: async () => {
        writes += 1;
        return ok(undefined);
      },
    };
    const ports = createPorts({ issueTracker });
    const created = await openRoom(ports);
    const rawText = "Alpha\n\n Beta \n";
    const imported = await new ImportItems(ports.deps).execute({
      code: created.code,
      actorParticipantId: created.participantId,
      source: { kind: "text", rawText },
      clientOpId: "import-1",
    });
    expect(imported.ok).toBe(true);
    expect(writes).toBe(0);
    expect(seen).toEqual([{ kind: "text", rawText }]);
    expect((await titles(ports, created.code)).map((item) => item.title)).toEqual(["Alpha", "Beta"]);

    const queue = await titles(ports, created.code);
    const beta = queue[1];
    const alpha = queue[0];
    if (alpha === undefined || beta === undefined) throw new Error("expected two items");
    const reordered = await new ReorderItems(ports.deps).execute({
      code: created.code,
      actorParticipantId: created.participantId,
      itemIds: [beta.id, alpha.id],
      clientOpId: "reorder-1",
    });
    expect(reordered.ok).toBe(true);
    expect((await titles(ports, created.code)).map((item) => item.title)).toEqual(["Beta", "Alpha"]);

    const focused = await new SetCurrentItem(ports.deps).execute({
      code: created.code,
      actorParticipantId: created.participantId,
      itemId: beta.id,
      clientOpId: "current-beta",
    });
    expect(focused.ok).toBe(true);
    expect((await viewOf(ports, created.code, created.participantId)).currentItem).toEqual({ id: beta.id, status: "current" });

    const skipped = await new SkipItem(ports.deps).execute({
      code: created.code,
      actorParticipantId: created.participantId,
      itemId: beta.id,
      clientOpId: "skip-beta",
    });
    expect(skipped.ok).toBe(true);
    expect(statusOf(await viewOf(ports, created.code, created.participantId), beta.id)).toBe("skipped");

    const currentAlpha = await new SetCurrentItem(ports.deps).execute({
      code: created.code,
      actorParticipantId: created.participantId,
      itemId: alpha.id,
      clientOpId: "current-alpha",
    });
    expect(currentAlpha.ok).toBe(true);
    const deferred = await new DeferItem(ports.deps).execute({
      code: created.code,
      actorParticipantId: created.participantId,
      itemId: alpha.id,
      clientOpId: "defer-alpha",
    });
    expect(deferred.ok).toBe(true);
    expect(statusOf(await viewOf(ports, created.code, created.participantId), alpha.id)).toBe("deferred");

    const addedGamma = await new AddItem(ports.deps).execute({
      code: created.code,
      actorParticipantId: created.participantId,
      title: "Gamma",
      clientOpId: "add-gamma",
    });
    expect(addedGamma.ok).toBe(true);
    const withGamma = await viewOf(ports, created.code, created.participantId);
    const gamma = withGamma.queue.find((item) => item.status === "pending");
    if (gamma === undefined) throw new Error("expected Gamma");
    const replay = await new AddItem(ports.deps).execute({
      code: created.code,
      actorParticipantId: created.participantId,
      title: "Gamma copy",
      clientOpId: "add-gamma",
    });
    expect(replay.ok).toBe(true);
    expect((await viewOf(ports, created.code, created.participantId)).queue).toHaveLength(withGamma.queue.length);
    expect((await titles(ports, created.code)).map((item) => item.title)).toContain("Gamma");
    expect((await titles(ports, created.code)).map((item) => item.title)).not.toContain("Gamma copy");

    const removed = await new RemoveItem(ports.deps).execute({
      code: created.code,
      actorParticipantId: created.participantId,
      itemId: gamma.id,
      clientOpId: "remove-gamma",
    });
    expect(removed.ok).toBe(true);
    const afterRemove = await viewOf(ports, created.code, created.participantId);
    expect(afterRemove.queue.map((item) => item.id)).not.toContain(gamma.id);
    expect((await titles(ports, created.code)).map((item) => item.title)).toEqual(["Beta", "Alpha"]);
    expect((await readRoomByCode(ports.store, created.code))?.teamId).toBeNull();

    const facilitator = asOk(
      await new JoinRoom(ports.deps).execute({
        code: created.code,
        nickname: "Fac",
        ip: "203.0.113.30",
        mode: "voter",
        role: "qa",
        isFacilitator: true,
        clientOpId: "join-fac",
      }),
    );
    const facilitated = await new AddItem(ports.deps).execute({
      code: created.code,
      actorParticipantId: facilitator.participantId,
      title: "Delta",
      clientOpId: "add-delta",
    });
    expect(facilitated.ok).toBe(true);

    const observer = asOk(
      await new JoinRoom(ports.deps).execute({
        code: created.code,
        nickname: "Omar",
        ip: "203.0.113.31",
        mode: "observer",
        role: "observer",
        clientOpId: "join-omar",
      }),
    );
    const blocked = await new AddItem(ports.deps).execute({
      code: created.code,
      actorParticipantId: observer.participantId,
      title: "Nope",
      clientOpId: "add-nope",
    });
    expect(blocked.ok).toBe(false);
    if (blocked.ok) throw new Error("expected FORBIDDEN");
    expect(blocked.error.code).toBe("FORBIDDEN");
    expect(ports.published.filter((event) => event.type === "item.queue_updated").length).toBeGreaterThan(0);
  });

  it("enforces title, description, and the 500 item cap", async () => {
    const ports = createPorts();
    const created = await openRoom(ports);
    const add = new AddItem(ports.deps);
    const tooLong = await add.execute({
      code: created.code,
      actorParticipantId: created.participantId,
      title: "T".repeat(MAX_ITEM_TITLE_LENGTH + 1),
      clientOpId: "title-long",
    });
    expect(tooLong.ok).toBe(false);
    if (tooLong.ok) throw new Error("expected VALIDATION");
    expect(tooLong.error.code).toBe("VALIDATION");

    const description = await add.execute({
      code: created.code,
      actorParticipantId: created.participantId,
      title: "Described",
      description: "D".repeat(MAX_ITEM_DESC_LENGTH + 1),
      clientOpId: "desc-long",
    });
    expect(description.ok).toBe(false);
    if (description.ok) throw new Error("expected VALIDATION");
    expect(description.error.code).toBe("VALIDATION");

    const boundary = await add.execute({
      code: created.code,
      actorParticipantId: created.participantId,
      title: "T".repeat(MAX_ITEM_TITLE_LENGTH),
      description: "D".repeat(MAX_ITEM_DESC_LENGTH),
      clientOpId: "boundary-ok",
    });
    expect(boundary.ok).toBe(true);

    for (let index = 2; index <= MAX_ITEMS_PER_ROOM; index += 1) {
      const added = await add.execute({
        code: created.code,
        actorParticipantId: created.participantId,
        title: `Item ${index}`,
        clientOpId: `add-${index}`,
      });
      if (!added.ok) throw new Error(`item ${index} ${added.error.code}`);
      if (index % 50 === 0) ports.clock.advanceSeconds(61);
    }
    const overflow = await add.execute({
      code: created.code,
      actorParticipantId: created.participantId,
      title: "One more",
      clientOpId: "add-overflow",
    });
    expect(overflow.ok).toBe(false);
    if (overflow.ok) throw new Error("expected LIMIT_EXCEEDED");
    expect(overflow.error.code).toBe("LIMIT_EXCEEDED");
    expect((await readRoomByCode(ports.store, created.code))?.items).toHaveLength(MAX_ITEMS_PER_ROOM);
  }, 20_000);
});

async function openRoom(ports: Harness): Promise<{ code: string; participantId: string }> {
  return asOk(
    await new CreateRoom(ports.deps).execute({
      name: "Sprint",
      ip: "203.0.113.10",
      hostNickname: "Ada",
    }),
  );
}

async function titles(ports: Harness, code: string): Promise<readonly { id: string; title: string }[]> {
  return (await readRoomByCode(ports.store, code))?.items ?? [];
}

async function viewOf(ports: Harness, code: string, participantId: string) {
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

function statusOf(view: { queue: readonly { id: string; status: string }[] }, itemId: string): string | undefined {
  return view.queue.find((item) => item.id === itemId)?.status;
}
