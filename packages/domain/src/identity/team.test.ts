import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { AppError } from "../shared/app-error.js";
import { OrganizationId, TeamId } from "../shared/ids.js";
import type { Result } from "../shared/result.js";
import { TeamBuilder } from "./team.js";

function must<T>(result: Result<T, AppError>): T {
  if (!result.ok) throw new Error(`${result.error.code} ${result.error.messageKey}`);
  return result.value;
}

describe("Team", () => {
  it("builds a team from an injected id, organization id, and name", () => {
    const team = must(
      new TeamBuilder()
        .withId(must(TeamId.create("team-bridge")))
        .withOrganizationId(must(OrganizationId.create("org-mvp")))
        .withName("Bridge")
        .build(),
    );
    expect(team.id).toBe("team-bridge");
    expect(team.organizationId).toBe("org-mvp");
    expect(team.name).toBe("Bridge");
  });

  it("rejects an empty name with VALIDATION", () => {
    const built = new TeamBuilder()
      .withId(must(TeamId.create("team-empty")))
      .withOrganizationId(must(OrganizationId.create("org-mvp")))
      .withName("  ")
      .build();
    expect(built.ok).toBe(false);
    if (built.ok) throw new Error("expected VALIDATION");
    expect(built.error.code).toBe("VALIDATION");
    expect(built.error.messageKey).toBe("errors.VALIDATION");
  });

  it("keeps Date.now, new Date(), Math.random, crypto.randomUUID, and process.env out of the team source", () => {
    const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), "team.ts"), "utf8");
    expect(source).not.toMatch(/Date\.now\s*\(/);
    expect(source).not.toMatch(/new\s+Date\s*\(\s*\)/);
    expect(source).not.toMatch(/Math\.random\s*\(/);
    expect(source).not.toMatch(/crypto\.randomUUID\s*\(/);
    expect(source).not.toMatch(/process\.env/);
    expect(source).not.toMatch(/SUPERADMIN_EMAILS/);
  });
});
