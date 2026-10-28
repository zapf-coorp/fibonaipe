import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { AppError } from "../shared/app-error.js";
import { TeamId, UserId } from "../shared/ids.js";
import type { Result } from "../shared/result.js";
import { MembershipBuilder, changeMemberRole, removeMember } from "./membership.js";

function must<T>(result: Result<T, AppError>): T {
  if (!result.ok) throw new Error(`${result.error.code} ${result.error.messageKey}`);
  return result.value;
}

function member(userId: string, teamId: string, role: "teamAdmin" | "pm" | "po" | "dev" | "qa" | "observer") {
  return must(
    new MembershipBuilder()
      .withUserId(must(UserId.create(userId)))
      .withTeamId(must(TeamId.create(teamId)))
      .withRole(role)
      .build(),
  );
}

describe("Membership", () => {
  it("returns LAST_ADMIN when the only admin is demoted and another member exists", () => {
    const admin = member("user-ada", "team-bridge", "teamAdmin");
    const dev = member("user-bea", "team-bridge", "dev");
    const changed = changeMemberRole([admin, dev], admin.userId, "dev");
    expect(changed.ok).toBe(false);
    if (changed.ok) throw new Error("expected LAST_ADMIN");
    expect(changed.error.code).toBe("LAST_ADMIN");
    expect(changed.error.messageKey).toBe("errors.LAST_ADMIN");
  });

  it("returns LAST_ADMIN when the only admin is removed and another member exists", () => {
    const admin = member("user-ada", "team-bridge", "teamAdmin");
    const dev = member("user-bea", "team-bridge", "dev");
    const removed = removeMember([admin, dev], admin.userId);
    expect(removed.ok).toBe(false);
    if (removed.ok) throw new Error("expected LAST_ADMIN");
    expect(removed.error.code).toBe("LAST_ADMIN");
    expect(removed.error.messageKey).toBe("errors.LAST_ADMIN");
  });

  it("demotes one admin when a second admin remains", () => {
    const admin = member("user-ada", "team-bridge", "teamAdmin");
    const other = member("user-bea", "team-bridge", "teamAdmin");
    const changed = changeMemberRole([admin, other], admin.userId, "po");
    expect(changed.ok).toBe(true);
    if (!changed.ok) throw new Error(`${changed.error.code} ${changed.error.messageKey}`);
    expect(changed.value.find((entry) => entry.userId === admin.userId)?.role).toBe("po");
    expect(changed.value.find((entry) => entry.userId === other.userId)?.role).toBe("teamAdmin");
  });

  it("allows the same user to hold memberships in two teams", () => {
    const first = member("user-ada", "team-bridge", "teamAdmin");
    const second = member("user-ada", "team-tunnel", "dev");
    expect(first.userId).toBe(second.userId);
    expect(first.teamId).not.toBe(second.teamId);
    expect(first.role).toBe("teamAdmin");
    expect(second.role).toBe("dev");
  });

  it("keeps Date.now, new Date(), Math.random, crypto.randomUUID, and process.env out of the membership source", () => {
    const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "membership.ts"), "utf8");
    expect(source).not.toMatch(/Date\.now\s*\(/);
    expect(source).not.toMatch(/new\s+Date\s*\(\s*\)/);
    expect(source).not.toMatch(/Math\.random\s*\(/);
    expect(source).not.toMatch(/crypto\.randomUUID\s*\(/);
    expect(source).not.toMatch(/process\.env/);
    expect(source).not.toMatch(/SUPERADMIN_EMAILS/);
  });
});
