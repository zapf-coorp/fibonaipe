import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { AppError } from "../shared/app-error.js";
import { UserId } from "../shared/ids.js";
import type { Result } from "../shared/result.js";
import { UserBuilder } from "./user.js";

function must<T>(result: Result<T, AppError>): T {
  if (!result.ok) throw new Error(`${result.error.code} ${result.error.messageKey}`);
  return result.value;
}

function assertPure(filename: string): void {
  const source = readFileSync(join(dirname(fileURLToPath(import.meta.url)), filename), "utf8");
  expect(source).not.toMatch(/Date\.now\s*\(/);
  expect(source).not.toMatch(/new\s+Date\s*\(\s*\)/);
  expect(source).not.toMatch(/Math\.random\s*\(/);
  expect(source).not.toMatch(/crypto\.randomUUID\s*\(/);
  expect(source).not.toMatch(/process\.env/);
  expect(source).not.toMatch(/SUPERADMIN_EMAILS/);
}

describe("User", () => {
  it("stores a trimmed lowercased email and the injected status, locale, and superadmin flag", () => {
    const active = must(
      new UserBuilder()
        .withId(must(UserId.create("user-ada")))
        .withEmail(" Ada@Example.com ")
        .withDisplayName("Ada")
        .withStatus("active")
        .withSuperAdmin(false)
        .withLocale("en-US")
        .withTheme("dark")
        .build(),
    );
    const suspended = must(
      new UserBuilder()
        .withId(must(UserId.create("user-bea")))
        .withEmail("bea@example.com")
        .withDisplayName("Bea")
        .withStatus("suspended")
        .withSuperAdmin(true)
        .withLocale("pt-BR")
        .withTheme("system")
        .build(),
    );

    expect(active.email).toBe("ada@example.com");
    expect(active.displayName).toBe("Ada");
    expect(active.status).toBe("active");
    expect(active.isSuperAdmin).toBe(false);
    expect(active.locale).toBe("en-US");
    expect(active.theme).toBe("dark");
    expect(suspended.status).toBe("suspended");
    expect(suspended.isSuperAdmin).toBe(true);
    expect(JSON.stringify(active)).not.toContain("Ada@Example.com");
  });

  it("rejects a malformed email with VALIDATION", () => {
    const built = new UserBuilder()
      .withId(must(UserId.create("user-bad")))
      .withEmail("plain")
      .withDisplayName("Ada")
      .withStatus("active")
      .withSuperAdmin(false)
      .withLocale("pt-BR")
      .withTheme("light")
      .build();
    expect(built.ok).toBe(false);
    if (built.ok) throw new Error("expected VALIDATION");
    expect(built.error.code).toBe("VALIDATION");
    expect(built.error.messageKey).toBe("errors.VALIDATION");
  });

  it("keeps Date.now, new Date(), Math.random, crypto.randomUUID, and process.env out of the user source", () => {
    assertPure("user.ts");
  });
});
