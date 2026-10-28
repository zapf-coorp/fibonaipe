import { FakeAuthProvider } from "@fibonaipe/testing";
import { describe, expect, it } from "vitest";
import type { PersistedRoomRecord } from "../../ports/persistence.port.js";
import { CreateRoom } from "../rooms/create-room.js";
import { asOk, createPorts, readRoomByCode } from "../__tests__/harness.js";
import { CompleteSignIn } from "./complete-sign-in.js";
import { LinkGuestToAccount } from "./link-guest-to-account.js";

const REDIRECT = "https://app.example/callback";

interface StoredParticipant {
  readonly id: string;
  readonly userId: string | null;
  readonly guestSessionId: string | null;
  readonly nickname: string;
}

function participantsOf(room: PersistedRoomRecord | null): readonly StoredParticipant[] {
  const planning = (room as { planning?: { participants?: readonly StoredParticipant[] } } | null)?.planning;
  return planning?.participants ?? [];
}

describe("LinkGuestToAccount", () => {
  it("binds the guest session to the user and keeps the participant row", async () => {
    const ports = createPorts();
    const auth = new FakeAuthProvider();
    const created = asOk(
      await new CreateRoom(ports.deps).execute({
        name: "Sprint",
        ip: "203.0.113.10",
        hostNickname: "Ada",
      }),
    );
    await auth.sendMagicLink("ada@example.com", REDIRECT);
    const signedIn = asOk(
      await new CompleteSignIn(ports.deps, auth).execute({
        token: auth.latestMagicLinkToken(),
        superAdminEmails: [],
      }),
    );
    const before = await readRoomByCode(ports.store, created.code);
    const beforeSeats = participantsOf(before);
    expect(beforeSeats).toHaveLength(1);
    const hash = ports.ids.sha256(created.hostToken);

    const linked = await new LinkGuestToAccount(ports.deps).execute({
      roomCode: created.code,
      sessionToken: created.hostToken,
      userId: signedIn.userId,
    });
    expect(linked.ok, JSON.stringify(linked)).toBe(true);
    if (!linked.ok) throw new Error(linked.error.code);
    expect(linked.value.userId).toBe(signedIn.userId);
    expect(linked.value.participantId).toBe(created.participantId);

    const after = await readRoomByCode(ports.store, created.code);
    const seats = participantsOf(after);
    expect(seats).toHaveLength(1);
    expect(seats[0]?.id).toBe(beforeSeats[0]?.id);
    expect(seats[0]?.userId).toBe(signedIn.userId);
    expect(seats[0]?.guestSessionId).toBe(hash);
    expect(seats[0]?.nickname).toBe("Ada");
    const document = JSON.stringify(after);
    expect(document).not.toContain(created.hostToken);
    expect(JSON.stringify(ports.logArgs)).not.toContain(created.hostToken);
    expect(JSON.stringify(ports.logArgs)).not.toContain("Ada");
    expect(ports.logs.forbiddenKeys()).toEqual([]);
  });
});
