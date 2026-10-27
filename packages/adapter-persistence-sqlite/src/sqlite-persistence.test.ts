import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { ok } from "@fibonaipe/domain";
import { describePersistenceContract } from "../../testing/src/contracts/persistence.contract.js";
import { createSqlitePersistence, localSqlitePath } from "./sqlite-persistence.js";

describePersistenceContract("SqlitePersistence", () => createSqlitePersistence());

describe("local sqlite file", () => {
  it("plans data/local.sqlite and opens a file database", async () => {
    expect(localSqlitePath).toBe("data/local.sqlite");
    const dir = mkdtempSync(join(tmpdir(), "fibonaipe-sqlite-"));
    const persistence = createSqlitePersistence(join(dir, "local.sqlite"));
    try {
      expect(await persistence.ping()).toEqual(ok({ ok: true }));
    } finally {
      persistence.close();
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
