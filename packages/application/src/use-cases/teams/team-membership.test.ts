import { FakeAuthProvider } from "@fibonaipe/testing";
import { describe, expect, it } from "vitest";
import { CompleteSignIn } from "../identity/complete-sign-in.js";
import { asOk, createPorts, type Harness } from "../__tests__/harness.js";
import { AcceptInvite } from "./accept-invite.js";
import { ChangeMemberRole } from "./change-member-role.js";
import { CreateInvite } from "./create-invite.js";
import { CreateTeam } from "./create-team.js";
import { RemoveMember } from "./remove-member.js";

const REDIRECT = "https://app.example/callback";
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

async function signIn(ports: Harness, auth: FakeAuthProvider, email: string) {
  await auth.sendMagicLink(email, REDIRECT);
  return asOk(
    await new CompleteSignIn(ports.deps, auth).execute({
      token: auth.latestMagicLinkToken(),
      superAdminEmails: [],
    }),
  );
}

describe("team membership", () => {
  it("makes the creator teamAdmin", async () => {
    const ports = createPorts();
    const auth = new FakeAuthProvider();
    const creator = await signIn(ports, auth, "ada@example.com");
    const created = await new CreateTeam(ports.deps).execute({ name: "Bridge", creatorUserId: creator.userId });
    expect(created.ok, JSON.stringify(created)).toBe(true);
    if (!created.ok) throw new Error(created.error.code);
    expect(created.value.role).toBe("teamAdmin");
    expect(created.value.teamId.length).toBeGreaterThan(0);
    expect(JSON.stringify(ports.logArgs)).not.toContain("ada@example.com");
    expect(ports.logs.forbiddenKeys()).toEqual([]);
  });

  it("accepts an invite with the preset role and allows a second team", async () => {
    const ports = createPorts();
    const auth = new FakeAuthProvider();
    const admin = await signIn(ports, auth, "ada@example.com");
    const member = await signIn(ports, auth, "bea@example.com");
    const firstTeam = asOk(await new CreateTeam(ports.deps).execute({ name: "Bridge", creatorUserId: admin.userId }));
    const secondTeam = asOk(await new CreateTeam(ports.deps).execute({ name: "Tunnel", creatorUserId: admin.userId }));
    const issuedAt = ports.clock.now();
    const invite = asOk(
      await new CreateInvite(ports.deps).execute({ teamId: firstTeam.teamId, actorUserId: admin.userId, role: "pm" }),
    );
    expect(invite.role).toBe("pm");
    expect(invite.expiresAt.toISOString()).toBe(new Date(issuedAt.getTime() + WEEK_MS).toISOString());
    expect(JSON.stringify(ports.logArgs)).not.toContain(invite.token);

    const accepted = await new AcceptInvite(ports.deps).execute({ token: invite.token, userId: member.userId });
    expect(accepted.ok, JSON.stringify(accepted)).toBe(true);
    if (!accepted.ok) throw new Error(accepted.error.code);
    expect(accepted.value.role).toBe("pm");
    expect(accepted.value.teamId).toBe(firstTeam.teamId);

    const other = asOk(
      await new CreateInvite(ports.deps).execute({ teamId: secondTeam.teamId, actorUserId: admin.userId, role: "dev" }),
    );
    const second = await new AcceptInvite(ports.deps).execute({ token: other.token, userId: member.userId });
    expect(second.ok, JSON.stringify(second)).toBe(true);
    if (!second.ok) throw new Error(second.error.code);
    expect(second.value.role).toBe("dev");
    expect(second.value.teamId).toBe(secondTeam.teamId);
    expect(second.value.teamId).not.toBe(accepted.value.teamId);
  });

  it("returns NOT_FOUND for an invite past seven days", async () => {
    const ports = createPorts();
    const auth = new FakeAuthProvider();
    const admin = await signIn(ports, auth, "ada@example.com");
    const member = await signIn(ports, auth, "bea@example.com");
    const team = asOk(await new CreateTeam(ports.deps).execute({ name: "Bridge", creatorUserId: admin.userId }));
    const invite = asOk(
      await new CreateInvite(ports.deps).execute({ teamId: team.teamId, actorUserId: admin.userId, role: "qa" }),
    );
    ports.clock.advanceMs(WEEK_MS + 1);
    const accepted = await new AcceptInvite(ports.deps).execute({ token: invite.token, userId: member.userId });
    expect(accepted.ok).toBe(false);
    if (accepted.ok) throw new Error("expected NOT_FOUND");
    expect(accepted.error.code).toBe("NOT_FOUND");
    expect(accepted.error.messageKey).toBe("errors.NOT_FOUND");
  });

  it("returns LAST_ADMIN when the only admin demotes or removes themselves", async () => {
    const ports = createPorts();
    const auth = new FakeAuthProvider();
    const admin = await signIn(ports, auth, "ada@example.com");
    const member = await signIn(ports, auth, "bea@example.com");
    const team = asOk(await new CreateTeam(ports.deps).execute({ name: "Bridge", creatorUserId: admin.userId }));
    const invite = asOk(
      await new CreateInvite(ports.deps).execute({ teamId: team.teamId, actorUserId: admin.userId, role: "dev" }),
    );
    expect((await new AcceptInvite(ports.deps).execute({ token: invite.token, userId: member.userId })).ok).toBe(true);

    const demoted = await new ChangeMemberRole(ports.deps).execute({
      teamId: team.teamId,
      actorUserId: admin.userId,
      memberUserId: admin.userId,
      role: "dev",
    });
    expect(demoted.ok).toBe(false);
    if (demoted.ok) throw new Error("expected LAST_ADMIN");
    expect(demoted.error.code).toBe("LAST_ADMIN");
    expect(demoted.error.messageKey).toBe("errors.LAST_ADMIN");

    const removed = await new RemoveMember(ports.deps).execute({
      teamId: team.teamId,
      actorUserId: admin.userId,
      memberUserId: admin.userId,
    });
    expect(removed.ok).toBe(false);
    if (removed.ok) throw new Error("expected LAST_ADMIN");
    expect(removed.error.code).toBe("LAST_ADMIN");
    expect(removed.error.messageKey).toBe("errors.LAST_ADMIN");
  });

  it("returns FORBIDDEN when a member without manageTeam changes a role", async () => {
    const ports = createPorts();
    const auth = new FakeAuthProvider();
    const admin = await signIn(ports, auth, "ada@example.com");
    const member = await signIn(ports, auth, "bea@example.com");
    const team = asOk(await new CreateTeam(ports.deps).execute({ name: "Bridge", creatorUserId: admin.userId }));
    const invite = asOk(
      await new CreateInvite(ports.deps).execute({ teamId: team.teamId, actorUserId: admin.userId, role: "dev" }),
    );
    expect((await new AcceptInvite(ports.deps).execute({ token: invite.token, userId: member.userId })).ok).toBe(true);

    const changed = await new ChangeMemberRole(ports.deps).execute({
      teamId: team.teamId,
      actorUserId: member.userId,
      memberUserId: admin.userId,
      role: "po",
    });
    expect(changed.ok).toBe(false);
    if (changed.ok) throw new Error("expected FORBIDDEN");
    expect(changed.error.code).toBe("FORBIDDEN");
    expect(changed.error.messageKey).toBe("errors.FORBIDDEN");
  });
});
