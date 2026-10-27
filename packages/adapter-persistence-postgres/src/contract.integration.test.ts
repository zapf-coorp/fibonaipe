import { readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  ClientOpId,
  ItemId,
  ParticipantId,
  RoomCode,
  RoomId,
  createAppError,
  ok,
  type AppError,
  type Result,
} from "@fibonaipe/domain";
import type { PersistedRoomRecord, Persistence } from "@fibonaipe/application";
import { describePersistenceContract } from "../../testing/src/contracts/persistence.contract.js";
import { applyPostgresMigrations, createPostgresPersistence, postgresMigrationSql } from "./postgres-persistence.js";

const NATIVE_MODULES = ["better-sqlite3", "bcrypt", "sharp", "canvas", "sqlite3", "node-gyp"] as const;
const REQUIRED_TABLES = [
  "rooms",
  "participants",
  "items",
  "rounds",
  "votes",
  "estimate_audits",
  "idempotency_keys",
  "schema_migrations",
] as const;

function databaseEnv(): { readonly DATABASE_URL: string } {
  const databaseUrl = process.env.DATABASE_URL;
  if (databaseUrl === undefined || databaseUrl.length === 0) {
    throw new Error("DATABASE_URL is unset");
  }
  return { DATABASE_URL: databaseUrl };
}

const hasLiveDatabase = (process.env.DATABASE_URL ?? "").length > 0;

describe.skipIf(!hasLiveDatabase)("Postgres live database", () => {
  describePersistenceContract("PostgresPersistence", () => createPostgresPersistence(databaseEnv()));
});

describe("Postgres migrations", () => {
  it.skipIf(!hasLiveDatabase)("applies twice and still lists each R1 table once", async () => {
    const env = databaseEnv();
    const first = await applyPostgresMigrations(env);
    const second = await applyPostgresMigrations(env);
    expect(new Set(first).size).toBe(first.length);
    expect(new Set(second).size).toBe(second.length);
    for (const name of REQUIRED_TABLES) {
      expect(first.filter((table) => table === name)).toHaveLength(1);
      expect(second.filter((table) => table === name)).toHaveLength(1);
    }
  });

  it("stores guest tokens as SHA-256 hex only and enables RLS without anon policies", () => {
    const sql = postgresMigrationSql().join("\n");
    const normalized = sql.toLowerCase();
    expect(normalized).toContain("guest_token_hash");
    expect(normalized).not.toMatch(/\bguest_token\b/);
    expect(normalized).not.toMatch(/\b(session_token|host_token|raw_token)\b/);
    expect(sql).toMatch(/guest_token_hash[\s\S]{0,160}(char\(64\)|varchar\(64\))/i);
    expect(sql).toMatch(/\[0-9a-f\]\{64\}/i);
    expect(normalized).toContain("timestamptz");
    expect(normalized).toContain("enable row level security");
    const policies = sql.match(/create\s+policy[\s\S]*?;/gi) ?? [];
    for (const policy of policies) {
      expect(policy.toLowerCase()).not.toContain("anon");
      expect(policy.toLowerCase()).not.toContain("authenticated");
    }
    for (const name of REQUIRED_TABLES) {
      if (name === "schema_migrations") continue;
      expect(normalized).toContain(name);
    }
  });
});

describe.skipIf(!hasLiveDatabase)("Postgres room version", () => {
  it("keeps one room at 100 concurrent increments", async () => {
    const persistence = createPostgresPersistence(databaseEnv());
    const id = must(RoomId.create("room-pg-increment"));
    await saveUnlocked(
      persistence,
      roomRecord({
        id,
        code: must(RoomCode.create("2345678S")),
        version: 1,
        items: [],
      }),
    );

    const itemIds = Array.from({ length: 100 }, (_, index) => must(ItemId.create(`pg100-item-${index}`)));
    const pending = Array.from({ length: 100 }, (_, index) =>
      persistence.transaction({ lockRoomId: id, isolation: "serializable" }, async (repos) => {
        const current = await repos.rooms.findById(id);
        if (!current) return errResult("NOT_FOUND");
        const itemId = itemIds[index];
        if (!itemId) return errResult("NOT_FOUND");
        await repos.rooms.save({
          ...current,
          items: [...current.items, { id: itemId, title: String(index) }],
        });
        return ok(current.version);
      }),
    );

    const results = await Promise.all(pending);
    const seen = results.map((result) => {
      expect(result.ok).toBe(true);
      if (!result.ok) throw new Error(result.error.messageKey);
      return result.value;
    });
    expect(seen).toHaveLength(100);
    expect([...seen].sort((left, right) => left - right)).toEqual(Array.from({ length: 100 }, (_, index) => index + 1));

    const stored = await readRoom(persistence, id);
    expect(stored?.version).toBe(101);
    expect(stored?.items.map((item) => item.title)).toEqual(Array.from({ length: 100 }, (_, index) => String(index)));
  });

  it("does not increment version when the locked callback throws", async () => {
    const persistence = createPostgresPersistence(databaseEnv());
    const id = must(RoomId.create("room-pg-throw"));
    const actorId = must(ParticipantId.create("participant-pg-throw"));
    const clientOpId = must(ClientOpId.create("op-pg-throw"));
    const seeded = roomRecord({
      id,
      code: must(RoomCode.create("2345678T")),
      version: 5,
      name: "Stable",
      items: [
        { id: must(ItemId.create("pg-throw-1")), title: "one" },
        { id: must(ItemId.create("pg-throw-2")), title: "two" },
      ],
    });
    await saveUnlocked(persistence, seeded);

    const failed = persistence.transaction({ lockRoomId: id }, async (repos) => {
      const current = await repos.rooms.findById(id);
      if (!current) return errResult("NOT_FOUND");
      await repos.rooms.save({ ...current, name: "Dirty", version: 9 });
      await repos.idempotency.record(actorId, clientOpId, new Date("2026-10-26T12:00:00.000Z"));
      throw new Error("defect");
    });
    await expect(failed).rejects.toThrow("defect");

    const rolledBack = await readRoom(persistence, id);
    expect(rolledBack?.version).toBe(5);
    expect(rolledBack?.name).toBe("Stable");
    expect(rolledBack?.items.map((item) => item.title)).toEqual(["one", "two"]);
    expect(await hasProcessed(persistence, actorId, clientOpId)).toBe(false);

    const followed = await persistence.transaction({ lockRoomId: id }, async (repos) => {
      const current = await repos.rooms.findById(id);
      if (!current) return errResult("NOT_FOUND");
      await repos.rooms.save({ ...current, name: "After defect" });
      return ok(current.version);
    });
    expect(followed).toEqual(ok(5));
    const stored = await readRoom(persistence, id);
    expect(stored?.version).toBe(6);
    expect(stored?.name).toBe("After defect");
  });
});

describe("adapter boundaries", () => {
  it("does not import another adapter or a native addon", () => {
    const packagesDir = join(dirname(fileURLToPath(import.meta.url)), "../..");
    const files = adapterSources(packagesDir);
    expect(files.length).toBeGreaterThan(0);
    for (const file of files) {
      const specifiers = importSpecifiers(readFileSync(file, "utf8"));
      for (const specifier of specifiers) {
        expect(specifier.startsWith("@fibonaipe/adapter-")).toBe(false);
        expect(specifier.includes("/adapter-")).toBe(false);
        expect(NATIVE_MODULES).not.toContain(specifier as (typeof NATIVE_MODULES)[number]);
      }
    }
    const repoRoot = join(packagesDir, "..");
    for (const manifest of packageManifests(repoRoot)) {
      const names = dependencyNames(manifest);
      const adapterManifest = manifest.replaceAll("\\", "/").includes("/packages/adapter-");
      for (const name of names) {
        if (adapterManifest) expect(name.startsWith("@fibonaipe/adapter-")).toBe(false);
        expect(NATIVE_MODULES).not.toContain(name as (typeof NATIVE_MODULES)[number]);
      }
    }
  });
});

function adapterSources(packagesDir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(packagesDir)) {
    if (!entry.startsWith("adapter-")) continue;
    const src = join(packagesDir, entry, "src");
    walkTs(src, files);
  }
  return files;
}

function walkTs(dir: string, acc: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      if (entry === "dist" || entry === "node_modules") continue;
      walkTs(full, acc);
      continue;
    }
    if (full.endsWith(".ts") && !full.endsWith(".test.ts")) acc.push(full);
  }
}

function packageManifests(root: string): string[] {
  const manifests: string[] = [];
  walkManifests(root, manifests);
  return manifests;
}

function dependencyNames(manifest: string): string[] {
  const parsed = JSON.parse(readFileSync(manifest, "utf8")) as {
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    optionalDependencies?: Record<string, string>;
  };
  return Object.keys({
    ...parsed.dependencies,
    ...parsed.devDependencies,
    ...parsed.optionalDependencies,
  });
}

function walkManifests(dir: string, acc: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }
  for (const entry of entries) {
    if (entry === "node_modules" || entry === "dist" || entry === "coverage" || entry === ".git") continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      walkManifests(full, acc);
      continue;
    }
    if (entry === "package.json") acc.push(full);
  }
}

function importSpecifiers(source: string): string[] {
  const stripped = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  return [...stripped.matchAll(/from\s+["']([^"']+)["']/g), ...stripped.matchAll(/import\(\s*["']([^"']+)["']\s*\)/g)].map(
    (match) => match[1] ?? "",
  );
}

function roomRecord(
  overrides: Partial<PersistedRoomRecord> & Pick<PersistedRoomRecord, "id" | "code">,
): PersistedRoomRecord {
  return {
    name: "Room",
    kind: "guest",
    teamId: null,
    status: "open",
    version: 1,
    items: [],
    expiresAt: null,
    lastActivityAt: new Date("2026-10-26T12:00:00.000Z"),
    ...overrides,
  };
}

async function saveUnlocked(persistence: Persistence, room: PersistedRoomRecord): Promise<void> {
  const result = await persistence.transaction({}, async (repos) => {
    await repos.rooms.save(room);
    return ok(true);
  });
  expect(result).toEqual(ok(true));
}

async function readRoom(persistence: Persistence, id: RoomId): Promise<PersistedRoomRecord | null> {
  const result = await persistence.transaction({}, async (repos) => ok(await repos.rooms.findById(id)));
  if (!result.ok) throw new Error(result.error.messageKey);
  return result.value;
}

async function hasProcessed(persistence: Persistence, actorId: ParticipantId, clientOpId: ClientOpId): Promise<boolean> {
  const result = await persistence.transaction({}, async (repos) =>
    ok(await repos.idempotency.hasProcessed(actorId, clientOpId, new Date("2026-10-26T12:00:00.000Z"))),
  );
  if (!result.ok) throw new Error(result.error.messageKey);
  return result.value;
}

function errResult(code: AppError["code"]): Result<never, AppError> {
  return { ok: false, error: createAppError(code) };
}

function must<T>(result: Result<T, AppError>): T {
  if (!result.ok) throw new Error(result.error.messageKey);
  return result.value;
}
