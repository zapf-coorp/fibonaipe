import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { AppError } from "../shared/app-error.js";
import { InviteId, TeamId, UserId } from "../shared/ids.js";
import type { Result } from "../shared/result.js";
import { InviteBuilder } from "./invite.js";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const NOW = new Date("2026-10-27T15:00:00.000Z");

function must<T>(result: Result<T, AppError>): T {
  if (!result.ok) throw new Error(`${result.error.code} ${result.error.messageKey}`);
  return result.value;
}

function inviteAt(now: Date) {
  return must(
    new InviteBuilder()
      .withId(must(InviteId.create("invite-pm")))
      .withTeamId(must(TeamId.create("team-bridge")))
      .withRole("pm")
      .withNow(now)
      .build(),
  );
}

describe("Invite", () => {
  it("expires seven days after the injected now and accepts the preset role before then", () => {
    const invite = inviteAt(NOW);
    const userId = must(UserId.create("user-bea"));
    expect(invite.expiresAt.toISOString()).toBe(new Date(NOW.getTime() + WEEK_MS).toISOString());
    expect(invite.role).toBe("pm");

    const accepted = invite.accept({ userId, now: new Date(invite.expiresAt.getTime() - 1000) });
    expect(accepted.ok).toBe(true);
    if (!accepted.ok) throw new Error(`${accepted.error.code} ${accepted.error.messageKey}`);
    expect(accepted.value.role).toBe("pm");
    expect(accepted.value.teamId).toBe(invite.teamId);
    expect(accepted.value.userId).toBe(userId);
  });

  it("returns NOT_FOUND once the injected now is past expiry", () => {
    const invite = inviteAt(NOW);
    const accepted = invite.accept({
      userId: must(UserId.create("user-bea")),
      now: new Date(invite.expiresAt.getTime() + 1),
    });
    expect(accepted.ok).toBe(false);
    if (accepted.ok) throw new Error("expected NOT_FOUND");
    expect(accepted.error.code).toBe("NOT_FOUND");
    expect(accepted.error.messageKey).toBe("errors.NOT_FOUND");
  });

  it("returns NOT_FOUND after revoke", () => {
    const invite = inviteAt(NOW);
    const revoked = invite.revoke(NOW);
    expect(revoked.ok).toBe(true);
    if (!revoked.ok) throw new Error(`${revoked.error.code} ${revoked.error.messageKey}`);
    const accepted = revoked.value.accept({ userId: must(UserId.create("user-bea")), now: NOW });
    expect(accepted.ok).toBe(false);
    if (accepted.ok) throw new Error("expected NOT_FOUND");
    expect(accepted.error.code).toBe("NOT_FOUND");
    expect(accepted.error.messageKey).toBe("errors.NOT_FOUND");
  });

  it("keeps Date.now, new Date(), Math.random, crypto.randomUUID, and process.env out of the invite source", () => {
    const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "invite.ts"), "utf8");
    expect(source).not.toMatch(/Date\.now\s*\(/);
    expect(source).not.toMatch(/new\s+Date\s*\(\s*\)/);
    expect(source).not.toMatch(/Math\.random\s*\(/);
    expect(source).not.toMatch(/crypto\.randomUUID\s*\(/);
    expect(source).not.toMatch(/process\.env/);
    expect(source).not.toMatch(/SUPERADMIN_EMAILS/);
  });
});
