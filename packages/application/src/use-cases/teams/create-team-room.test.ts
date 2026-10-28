import { FakeAuthProvider } from "@fibonaipe/testing";
import { describe, expect, it } from "vitest";
import type { PersistedRoomRecord } from "../../ports/persistence.port.js";
import { CompleteSignIn } from "../identity/complete-sign-in.js";
import { JoinRoom } from "../rooms/join-room.js";
import { asOk, createPorts, readRoomByCode, type Harness } from "../__tests__/harness.js";
import { AcceptInvite } from "./accept-invite.js";
import { CreateInvite } from "./create-invite.js";
import { CreateTeam } from "./create-team.js";
import { CreateTeamRoom } from "./create-team-room.js";

const REDIRECT = "https://app.example/callback";

interface StoredParticipant {
  readonly role: string;
  readonly mode: string;
}

function participantsOf(room: PersistedRoomRecord | null): readonly StoredParticipant[] {
  const planning = (room as { planning?: { participants?: readonly StoredParticipant[] } } | null)?.planning;
  return planning?.participants ?? [];
}

async function signIn(ports: Harness, auth: FakeAuthProvider, email: string) {
  await auth.sendMagicLink(email, REDIRECT);
  return asOk(
    await new CompleteSignIn(ports.deps, auth).execute({
      token: auth.latestMagicLinkToken(),
      superAdminEmails: [],
    }),
  );
}

describe("CreateTeamRoom", () => {
  it("returns FORBIDDEN when the actor cannot create a team room", async () => {
    const ports = createPorts();
    const auth = new FakeAuthProvider();
    const admin = await signIn(ports, auth, "ada@example.com");
    const dev = await signIn(ports, auth, "bea@example.com");
    const team = asOk(await new CreateTeam(ports.deps).execute({ name: "Bridge", creatorUserId: admin.userId }));
    const invite = asOk(
      await new CreateInvite(ports.deps).execute({ teamId: team.teamId, actorUserId: admin.userId, role: "dev" }),
    );
    expect((await new AcceptInvite(ports.deps).execute({ token: invite.token, userId: dev.userId })).ok).toBe(true);

    const denied = await new CreateTeamRoom(ports.deps).execute({
      teamId: team.teamId,
      actorUserId: dev.userId,
      name: "Sprint",
      mode: "voter",
    });
    expect(denied.ok).toBe(false);
    if (denied.ok) throw new Error("expected FORBIDDEN");
    expect(denied.error.code).toBe("FORBIDDEN");
    expect(denied.error.messageKey).toBe("errors.FORBIDDEN");
  });

  it("opens a team room with no expiry, allowGuests on, and the chosen observer mode", async () => {
    const ports = createPorts();
    const auth = new FakeAuthProvider();
    const admin = await signIn(ports, auth, "ada@example.com");
    const team = asOk(await new CreateTeam(ports.deps).execute({ name: "Bridge", creatorUserId: admin.userId }));
    const created = await new CreateTeamRoom(ports.deps).execute({
      teamId: team.teamId,
      actorUserId: admin.userId,
      name: "Sprint",
      mode: "observer",
    });
    expect(created.ok, JSON.stringify(created)).toBe(true);
    if (!created.ok) throw new Error(created.error.code);
    expect(created.value.allowGuests).toBe(true);
    expect(created.value.code.length).toBeGreaterThan(0);

    const stored = await readRoomByCode(ports.store, created.value.code);
    expect(stored?.kind).toBe("team");
    expect(stored?.teamId).toBe(team.teamId);
    expect(stored?.expiresAt).toBeNull();
    const host = participantsOf(stored)[0];
    expect(host?.role).toBe("teamAdmin");
    expect(host?.mode).toBe("observer");

    const joined = await new JoinRoom(ports.deps).execute({
      code: created.value.code,
      nickname: "Bea",
      ip: "203.0.113.77",
      mode: "voter",
      role: "dev",
      clientOpId: "join-bea",
    });
    expect(joined.ok, JSON.stringify(joined)).toBe(true);
    const guests = participantsOf(await readRoomByCode(ports.store, created.value.code));
    expect(guests.map((seat) => seat.mode).sort()).toEqual(["observer", "voter"]);
  });
});
