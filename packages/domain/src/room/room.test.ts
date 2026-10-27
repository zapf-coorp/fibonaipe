import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { AppError } from "../shared/app-error.js";
import {
  HOST_GRACE_SECONDS,
  MAX_NICKNAME_LENGTH,
  MAX_PARTICIPANTS,
  MIN_NICKNAME_LENGTH,
  ONLINE_WINDOW_SECONDS,
} from "../shared/constants.js";
import { ParticipantId, RoomCode, RoomId, TeamId, UserId } from "../shared/ids.js";
import { type Result } from "../shared/result.js";
import { ScaleBuilder } from "../scales/scale-builder.js";
import type { Scale } from "../scales/scale.js";

const EPOCH = Date.UTC(2026, 0, 1, 12, 0, 0);
const TRANSFER_AT = HOST_GRACE_SECONDS + 1;

function at(seconds: number): Date {
  return new Date(EPOCH + seconds * 1000);
}

function must<T>(result: Result<T, AppError>): T {
  if (!result.ok) throw new Error(`${result.error.code} ${result.error.messageKey}`);
  return result.value;
}

function code(result: Result<unknown, AppError>): string {
  return result.ok ? "OK" : result.error.code;
}

function branded<T extends string>(factory: { create(raw: string): Result<T, AppError> }, raw: string): T {
  return must(factory.create(raw));
}

interface DomainEvent {
  type: string;
  payload: Record<string, unknown>;
}

interface SettingsView {
  activeScaleId: string;
  suitAxisEnabled: boolean;
  suitAxisLabelKey: string;
  autoReveal: boolean;
  showAverage: boolean;
  timerSeconds: number | null;
  maxParticipants: number;
  allowObserverComments: boolean;
}

interface ParticipantView {
  id: string;
  roomId: string;
  userId: string | null;
  guestSessionId: string | null;
  nickname: string;
  role: string;
  mode: "voter" | "observer";
  isFacilitator: boolean;
  joinedAt: Date;
  lastSeenAt: Date;
  afk: boolean;
  canVote: boolean;
}

interface JoinInput {
  participantId: string;
  nickname: string;
  role: string;
  mode: "voter" | "observer";
  guestSessionId?: string | null;
  userId?: string | null;
  now: Date;
  afk?: boolean;
  isFacilitator?: boolean;
}

interface RejoinInput {
  guestSessionId?: string | null;
  userId?: string | null;
  now: Date;
}

interface JoinOk {
  room: RoomView;
  participant: ParticipantView;
  events: readonly DomainEvent[];
}

interface MutationOk {
  room: RoomView;
  events: readonly DomainEvent[];
}

interface RoomView {
  id: string;
  code: string;
  name: string;
  kind: "guest" | "team";
  teamId: string | null;
  hostParticipantId: string;
  scale: { id: string };
  settings: SettingsView;
  status: "open" | "closed";
  version: number;
  lastActivityAt: Date;
  expiresAt: Date | null;
  participants: readonly ParticipantView[];
  join(input: JoinInput): Result<JoinOk, AppError>;
  rejoin(input: RejoinInput): Result<JoinOk, AppError>;
  updateSettings(input: { actorParticipantId: string; settings: SettingsView; now: Date }): Result<MutationOk, AppError>;
  transferHost(input: { actorParticipantId: string; targetParticipantId: string; now: Date }): Result<MutationOk, AppError>;
  autoTransferHost(now: Date): Result<MutationOk, AppError>;
  delegateFacilitator(input: {
    actorParticipantId: string;
    targetParticipantId: string;
    now: Date;
  }): Result<MutationOk, AppError>;
  revokeFacilitator(input: {
    actorParticipantId: string;
    targetParticipantId: string;
    now: Date;
  }): Result<MutationOk, AppError>;
  close(input: { actorParticipantId: string; now: Date }): Result<MutationOk, AppError>;
}

interface HostSeed {
  id: string;
  nickname: string;
  role: string;
  mode: "voter" | "observer";
  guestSessionId?: string | null;
  userId?: string | null;
  joinedAt: Date;
  lastSeenAt: Date;
  afk?: boolean;
  isFacilitator?: boolean;
}

interface RoomBuilderChain {
  withId(id: string): this;
  withCode(code: string): this;
  withName(name: string): this;
  withKind(kind: "guest" | "team"): this;
  withTeamId(teamId: string | null): this;
  withScale(scale: Scale): this;
  withSettings(settings: SettingsView): this;
  withHost(host: HostSeed): this;
  withNow(now: Date): this;
  withVersion(version: number): this;
  withExpiresAt(expiresAt: Date | null): this;
  build(): Result<RoomView, AppError>;
}

interface SettingsBuilderChain {
  withActiveScaleId(id: string): this;
  withSuitAxis(enabled: boolean, labelKey?: string): this;
  withAutoReveal(autoReveal: boolean): this;
  withShowAverage(showAverage: boolean): this;
  withTimerSeconds(seconds: number | null): this;
  withMaxParticipants(max: number): this;
  withAllowObserverComments(allow: boolean): this;
  build(): Result<SettingsView, AppError>;
}

interface SeatSpec {
  key: string;
  nickname: string;
  role: string;
  mode?: "voter" | "observer";
  joinedAt: number;
  lastSeenAt?: number;
  isFacilitator?: boolean;
  afk?: boolean;
  guestSessionId?: string;
  userId?: string;
}

let RoomBuilder: new () => RoomBuilderChain;
let RoomSettingsBuilder: new () => SettingsBuilderChain;
let Room: new (...args: never[]) => RoomView;
let Participant: new (...args: never[]) => ParticipantView;
let scale: Scale;
let defaultSettings: SettingsView;

let loadingRoom: Promise<void> | undefined;

function loadRoom(): Promise<void> {
  loadingRoom ??= (async () => {
    const roomMod = await import("./room.js");
    const participantMod = await import("./participant.js");
    const builderMod = await import("./room-builder.js");
    const settingsMod = await import("./room-settings-builder.js");
    if (typeof roomMod.Room !== "function") throw new Error("Room is not a constructor");
    if (typeof participantMod.Participant !== "function") throw new Error("Participant is not a constructor");
    if (typeof builderMod.RoomBuilder !== "function") throw new Error("RoomBuilder is not a constructor");
    if (typeof settingsMod.RoomSettingsBuilder !== "function") {
      throw new Error("RoomSettingsBuilder is not a constructor");
    }
    Room = roomMod.Room;
    Participant = participantMod.Participant;
    RoomBuilder = builderMod.RoomBuilder;
    RoomSettingsBuilder = settingsMod.RoomSettingsBuilder;
    scale = must(ScaleBuilder.fibonacci().withId("scale-1").withName("Fibonacci").build());
    defaultSettings = must(new RoomSettingsBuilder().withActiveScaleId(scale.id).build());
  })();
  return loadingRoom;
}

const VOTE_KEYS = ["card", "suit", "comment", "vote", "votes"];

function assertVoteFree(events: readonly DomainEvent[]) {
  for (const event of events) {
    expect(typeof event.type).toBe("string");
    expect(event.payload).toEqual(expect.any(Object));
    for (const key of Object.keys(event.payload)) {
      expect(VOTE_KEYS).not.toContain(key);
    }
  }
}

function assertOneHost(room: RoomView) {
  expect(room.status).toBe("open");
  expect(room.participants.filter((participant) => participant.id === room.hostParticipantId)).toHaveLength(1);
}

function hostChanged(events: readonly DomainEvent[], reason: "auto" | "manual", hostParticipantId: string) {
  expect(events).toContainEqual(
    expect.objectContaining({
      type: "host.changed",
      payload: expect.objectContaining({ reason, hostParticipantId }),
    }),
  );
  assertVoteFree(events);
}

function findKey(room: RoomView, key: string): ParticipantView {
  const id = branded(ParticipantId, key);
  const found = room.participants.find((participant) => participant.id === id);
  if (!found) throw new Error(`missing ${key}`);
  return found;
}

function buildRoom(input: {
  name?: string;
  kind?: "guest" | "team";
  teamId?: string | null;
  host: HostSeed;
  now: Date;
  version?: number;
  expiresAt?: Date | null;
  settings?: SettingsView;
}): RoomView {
  const kind = input.kind ?? "guest";
  const room = must(
    new RoomBuilder()
      .withId(branded(RoomId, "room-1"))
      .withCode(branded(RoomCode, "23456789"))
      .withName(input.name ?? "Planning")
      .withKind(kind)
      .withTeamId(input.teamId ?? null)
      .withScale(scale)
      .withSettings(input.settings ?? defaultSettings)
      .withHost(input.host)
      .withNow(input.now)
      .withVersion(input.version ?? 1)
      .withExpiresAt(input.expiresAt === undefined ? null : input.expiresAt)
      .build(),
  );
  expect(room).toBeInstanceOf(Room);
  expect(Object.isFrozen(room)).toBe(true);
  expect(Object.isFrozen(room.participants)).toBe(true);
  expect(Object.isFrozen(room.settings)).toBe(true);
  return room;
}

function hostSeed(partial?: Partial<HostSeed>): HostSeed {
  return {
    id: branded(ParticipantId, "host"),
    nickname: "Host",
    role: "observer",
    mode: "voter",
    guestSessionId: "session-host",
    joinedAt: at(0),
    lastSeenAt: at(0),
    afk: false,
    isFacilitator: false,
    ...partial,
  };
}

function stage(others: readonly SeatSpec[], hostPartial?: Partial<HostSeed>): RoomView {
  let room = buildRoom({ host: hostSeed(hostPartial), now: at(0) });
  for (const seat of others) {
    const joined = must(
      room.join({
        participantId: branded(ParticipantId, seat.key),
        nickname: seat.nickname,
        role: seat.role,
        mode: seat.mode ?? "voter",
        now: at(seat.joinedAt),
        afk: seat.afk ?? false,
        isFacilitator: seat.isFacilitator ?? false,
        ...(seat.userId ? { userId: branded(UserId, seat.userId) } : {}),
        ...(seat.userId ? {} : { guestSessionId: seat.guestSessionId ?? `session-${seat.key}` }),
      }),
    );
    room = joined.room;
    const seen = seat.lastSeenAt ?? seat.joinedAt;
    if (seen !== seat.joinedAt) {
      const refreshed = must(
        room.rejoin({
          ...(seat.userId ? { userId: branded(UserId, seat.userId) } : {}),
          ...(seat.userId ? {} : { guestSessionId: seat.guestSessionId ?? `session-${seat.key}` }),
          now: at(seen),
        }),
      );
      room = refreshed.room;
    }
  }
  return room;
}

const here = dirname(fileURLToPath(import.meta.url));
const PURE_FILES = [
  join(here, "room.ts"),
  join(here, "participant.ts"),
  join(here, "room-builder.ts"),
  join(here, "room-settings-builder.ts"),
  join(here, "../policy/can.ts"),
];

describe("domain policy modules stay pure", () => {
  it("keeps Date.now, new Date, Math.random, and process.env out of the aggregate", () => {
    const problems: string[] = [];
    for (const file of PURE_FILES) {
      if (!existsSync(file)) {
        problems.push(`missing ${file}`);
        continue;
      }
      const source = readFileSync(file, "utf8");
      if (/Date\.now\s*\(/.test(source)) problems.push(`Date.now ${file}`);
      if (/new\s+Date\s*\(/.test(source)) problems.push(`new Date ${file}`);
      if (/Math\.random\s*\(/.test(source)) problems.push(`Math.random ${file}`);
      if (source.includes("process.env")) problems.push(`process.env ${file}`);
      if (/crypto\.randomUUID\s*\(/.test(source)) problems.push(`crypto.randomUUID ${file}`);
    }
    expect(problems, problems.join("\n")).toEqual([]);
  });
});

describe("Room, Participant, and RoomSettings", () => {
  describe("RoomSettingsBuilder", () => {
    it("builds the spec defaults, including maxParticipants 30 and suit label key risk", async () => {
      await loadRoom();
      const settings = must(new RoomSettingsBuilder().build());
      expect(settings.maxParticipants).toBe(MAX_PARTICIPANTS);
      expect(settings.maxParticipants).toBe(30);
      expect(settings.allowObserverComments).toBe(false);
      expect(settings.suitAxisEnabled).toBe(true);
      expect(settings.suitAxisLabelKey).toBe("risk");
      expect(settings.autoReveal).toBe(false);
      expect(settings.showAverage).toBe(true);
      expect(settings.timerSeconds).toBeNull();
      expect(settings.activeScaleId).toEqual(expect.any(String));
      expect(Object.isFrozen(settings)).toBe(true);
    });

    it("accepts exactly 30 participants and rejects any other cap", async () => {
      await loadRoom();
      expect(code(new RoomSettingsBuilder().withMaxParticipants(30).build())).toBe("OK");
      expect(code(new RoomSettingsBuilder().withMaxParticipants(29).build())).toBe("VALIDATION");
      expect(code(new RoomSettingsBuilder().withMaxParticipants(31).build())).toBe("VALIDATION");
      expect(code(new RoomSettingsBuilder().withMaxParticipants(0).build())).toBe("VALIDATION");
    });

    it("stores suit axis, timer, average, and observer-comment overrides", async () => {
      await loadRoom();
      const settings = must(
        new RoomSettingsBuilder()
          .withActiveScaleId("scale-9")
          .withSuitAxis(false, "complexity")
          .withAutoReveal(true)
          .withShowAverage(false)
          .withTimerSeconds(90)
          .withAllowObserverComments(true)
          .build(),
      );
      expect(settings.activeScaleId).toBe("scale-9");
      expect(settings.suitAxisEnabled).toBe(false);
      expect(settings.suitAxisLabelKey).toBe("complexity");
      expect(settings.autoReveal).toBe(true);
      expect(settings.showAverage).toBe(false);
      expect(settings.timerSeconds).toBe(90);
      expect(settings.allowObserverComments).toBe(true);
      expect(must(new RoomSettingsBuilder().withTimerSeconds(null).build()).timerSeconds).toBeNull();
    });
  });

  describe("RoomBuilder", () => {
    it("opens a guest room with one host and a team room with teamId", async () => {
      await loadRoom();
      const guest = buildRoom({ host: hostSeed(), now: at(0), version: 4, name: "  Planning  " });
      expect(guest.kind).toBe("guest");
      expect(guest.teamId).toBeNull();
      expect(guest.name).toBe("Planning");
      expect(guest.status).toBe("open");
      expect(guest.version).toBe(4);
      expect(guest.scale.id).toBe(scale.id);
      expect(guest.hostParticipantId).toBe(branded(ParticipantId, "host"));
      expect(guest.participants).toHaveLength(1);
      expect(guest.lastActivityAt.getTime()).toBe(at(0).getTime());
      expect(guest.expiresAt).toBeNull();
      assertOneHost(guest);
      const host = guest.participants[0];
      if (!host) throw new Error("missing host");
      expect(host).toBeInstanceOf(Participant);
      expect(Object.isFrozen(host)).toBe(true);
      expect(host.nickname).toBe("Host");
      expect(host.canVote).toBe(true);
      expect(host.joinedAt.getTime()).toBe(at(0).getTime());
      expect(host.lastSeenAt.getTime()).toBe(at(0).getTime());

      const team = buildRoom({
        host: hostSeed(),
        now: at(0),
        kind: "team",
        teamId: branded(TeamId, "team-1"),
        expiresAt: null,
      });
      expect(team.kind).toBe("team");
      expect(team.teamId).toBe(branded(TeamId, "team-1"));
      expect(team.expiresAt).toBeNull();
    });

    it("returns VALIDATION when name, scale, host, clock, id, or code is missing", async () => {
      await loadRoom();
      const host = hostSeed();
      const base = () =>
        new RoomBuilder()
          .withId(branded(RoomId, "room-1"))
          .withCode(branded(RoomCode, "23456789"))
          .withName("Planning")
          .withKind("guest")
          .withTeamId(null)
          .withScale(scale)
          .withSettings(defaultSettings)
          .withHost(host)
          .withNow(at(0))
          .withVersion(1)
          .withExpiresAt(null);

      expect(code(base().withName("").build())).toBe("VALIDATION");
      expect(code(base().withName("   ").build())).toBe("VALIDATION");
      expect(
        code(
          new RoomBuilder()
            .withId(branded(RoomId, "room-1"))
            .withCode(branded(RoomCode, "23456789"))
            .withName("Planning")
            .withKind("guest")
            .withTeamId(null)
            .withSettings(defaultSettings)
            .withHost(host)
            .withNow(at(0))
            .build(),
        ),
      ).toBe("VALIDATION");
      expect(
        code(
          new RoomBuilder()
            .withId(branded(RoomId, "room-1"))
            .withCode(branded(RoomCode, "23456789"))
            .withName("Planning")
            .withKind("guest")
            .withTeamId(null)
            .withScale(scale)
            .withSettings(defaultSettings)
            .withNow(at(0))
            .build(),
        ),
      ).toBe("VALIDATION");
      expect(
        code(
          new RoomBuilder()
            .withId(branded(RoomId, "room-1"))
            .withCode(branded(RoomCode, "23456789"))
            .withName("Planning")
            .withKind("guest")
            .withTeamId(null)
            .withScale(scale)
            .withSettings(defaultSettings)
            .withHost(host)
            .build(),
        ),
      ).toBe("VALIDATION");
      expect(
        code(
          new RoomBuilder()
            .withCode(branded(RoomCode, "23456789"))
            .withName("Planning")
            .withKind("guest")
            .withScale(scale)
            .withSettings(defaultSettings)
            .withHost(host)
            .withNow(at(0))
            .build(),
        ),
      ).toBe("VALIDATION");
      expect(
        code(
          new RoomBuilder()
            .withId(branded(RoomId, "room-1"))
            .withName("Planning")
            .withKind("guest")
            .withScale(scale)
            .withSettings(defaultSettings)
            .withHost(host)
            .withNow(at(0))
            .build(),
        ),
      ).toBe("VALIDATION");
      expect(
        code(
          new RoomBuilder()
            .withId(branded(RoomId, "room-1"))
            .withCode(branded(RoomCode, "23456789"))
            .withName("Planning")
            .withKind("team")
            .withTeamId(null)
            .withScale(scale)
            .withSettings(defaultSettings)
            .withHost(host)
            .withNow(at(0))
            .build(),
        ),
      ).toBe("VALIDATION");
    });
  });

  describe("INV-14 nickname", () => {
    it("rejects ana when Ana is already seated", async () => {
      await loadRoom();
      const room = buildRoom({ host: hostSeed({ nickname: "Ana" }), now: at(0) });
      const taken = room.join({
        participantId: branded(ParticipantId, "ana"),
        nickname: "ana",
        role: "dev",
        mode: "voter",
        guestSessionId: "session-ana",
        now: at(1),
      });
      expect(code(taken)).toBe("NICKNAME_TAKEN");
      expect(room.participants).toHaveLength(1);

      const padded = room.join({
        participantId: branded(ParticipantId, "padded"),
        nickname: "  ANA  ",
        role: "dev",
        mode: "voter",
        guestSessionId: "session-padded",
        now: at(1),
      });
      expect(code(padded)).toBe("NICKNAME_TAKEN");
    });

    it("returns VALIDATION for an empty nickname or a control character, without stripping it into a collision", async () => {
      await loadRoom();
      const room = buildRoom({ host: hostSeed({ nickname: "Ana" }), now: at(0) });
      for (const [index, nickname] of ["", "   ", "Ana\n", "\tAna", "\u0000", "Ana\u007f"].entries()) {
        expect(code(room.join({
          participantId: branded(ParticipantId, `bad-${index}`),
          nickname,
          role: "dev",
          mode: "voter",
          guestSessionId: `session-bad-${index}`,
          now: at(1),
        }))).toBe("VALIDATION");
      }
      expect(room.participants).toHaveLength(1);
    });

    it("accepts 1 to 30 characters after trim and keeps accents distinct under pt-BR case folding", async () => {
      await loadRoom();
      expect(MIN_NICKNAME_LENGTH).toBe(1);
      expect(MAX_NICKNAME_LENGTH).toBe(30);
      const room = buildRoom({ host: hostSeed({ nickname: "José" }), now: at(0) });
      const accent = must(room.join({
        participantId: branded(ParticipantId, "jose"),
        nickname: ` ${"é".repeat(30)} `,
        role: "dev",
        mode: "voter",
        guestSessionId: "session-jose",
        now: at(1),
      }));
      expect(accent.participant.nickname).toBe("é".repeat(30));
      expect(accent.room.participants).toHaveLength(2);

      expect(code(accent.room.join({
        participantId: branded(ParticipantId, "lower"),
        nickname: "josé",
        role: "qa",
        mode: "voter",
        guestSessionId: "session-lower",
        now: at(2),
      }))).toBe("NICKNAME_TAKEN");

      const unaccented = must(accent.room.join({
        participantId: branded(ParticipantId, "plain"),
        nickname: "jose",
        role: "qa",
        mode: "observer",
        guestSessionId: "session-plain",
        now: at(2),
      }));
      expect(unaccented.participant.nickname).toBe("jose");

      expect(code(room.join({
        participantId: branded(ParticipantId, "long"),
        nickname: "b".repeat(31),
        role: "dev",
        mode: "voter",
        guestSessionId: "session-long",
        now: at(1),
      }))).toBe("VALIDATION");
    });
  });

  describe("Participant.canVote", () => {
    it("is true only for a voter who is not AFK", async () => {
      await loadRoom();
      const room = stage([
        { key: "voter", nickname: "Val", role: "dev", joinedAt: 1, mode: "voter", afk: false },
        { key: "away", nickname: "Ada", role: "dev", joinedAt: 1, mode: "voter", afk: true },
        { key: "watch", nickname: "Wes", role: "observer", joinedAt: 1, mode: "observer", afk: false },
        { key: "watch-away", nickname: "Wyn", role: "observer", joinedAt: 1, mode: "observer", afk: true },
      ]);
      expect(findKey(room, "voter")).toMatchObject({ mode: "voter", afk: false, canVote: true });
      expect(findKey(room, "away")).toMatchObject({ mode: "voter", afk: true, canVote: false });
      expect(findKey(room, "watch")).toMatchObject({ mode: "observer", afk: false, canVote: false });
      expect(findKey(room, "watch-away")).toMatchObject({ mode: "observer", afk: true, canVote: false });
      expect(room.participants.every((participant) => participant.mode === "voter" || participant.mode === "observer")).toBe(
        true,
      );
    });
  });

  describe("INV-01 capacity", () => {
    it("returns ROOM_FULL for the 31st distinct participant and reuses a known guestSessionId or userId", async () => {
      await loadRoom();
      expect(MAX_PARTICIPANTS).toBe(30);
      let room = buildRoom({ host: hostSeed(), now: at(0) });
      for (let seat = 2; seat <= MAX_PARTICIPANTS; seat += 1) {
        const key = `seat-${String(seat).padStart(2, "0")}`;
        const joined = must(room.join({
          participantId: branded(ParticipantId, key),
          nickname: `Nick${seat}`,
          role: seat % 2 === 0 ? "observer" : "dev",
          mode: seat % 2 === 0 ? "observer" : "voter",
          now: at(1),
          ...(seat === 7 ? { userId: branded(UserId, "user-07") } : { guestSessionId: `session-${key}` }),
        }));
        expect(joined.participant).toBeInstanceOf(Participant);
        expect(joined.participant.id).toBe(branded(ParticipantId, key));
        expect(joined.room.participants).toHaveLength(seat);
        assertVoteFree(joined.events);
        room = joined.room;
      }

      expect(room.participants).toHaveLength(30);
      expect(room.participants.some((participant) => participant.mode === "observer")).toBe(true);
      const overflow = room.join({
        participantId: branded(ParticipantId, "seat-31"),
        nickname: "Overflow",
        role: "dev",
        mode: "voter",
        guestSessionId: "session-31",
        now: at(2),
      });
      expect(code(overflow)).toBe("ROOM_FULL");
      expect(room.participants).toHaveLength(30);

      const rejoined = must(room.rejoin({ guestSessionId: "session-seat-08", now: at(50) }));
      expect(rejoined.participant.id).toBe(branded(ParticipantId, "seat-08"));
      expect(rejoined.participant.joinedAt.getTime()).toBe(at(1).getTime());
      expect(rejoined.participant.lastSeenAt.getTime()).toBe(at(50).getTime());
      expect(rejoined.room.participants).toHaveLength(30);
      expect(findKey(rejoined.room, "host").lastSeenAt.getTime()).toBe(at(0).getTime());

      const member = must(room.rejoin({ userId: branded(UserId, "user-07"), now: at(40) }));
      expect(member.participant.id).toBe(branded(ParticipantId, "seat-07"));
      expect(member.room.participants).toHaveLength(30);

      const sameUserJoin = must(room.join({
        participantId: branded(ParticipantId, "seat-07-again"),
        nickname: "Nick7",
        role: "dev",
        mode: "voter",
        userId: branded(UserId, "user-07"),
        now: at(3),
      }));
      expect(sameUserJoin.participant.id).toBe(branded(ParticipantId, "seat-07"));
      expect(sameUserJoin.room.participants).toHaveLength(30);

      expect(code(room.rejoin({ guestSessionId: "missing", now: at(4) }))).toBe("NOT_FOUND");
      expect(code(room.rejoin({ now: at(4) }))).toBe("VALIDATION");
      expect(room.participants).toHaveLength(30);
    });
  });

  describe("INV-02 manual transfer and settings", () => {
    it("lets only the current host transfer to an online participant and emits host.changed manual", async () => {
      await loadRoom();
      const room = stage([{ key: "dev", nickname: "Dee", role: "dev", joinedAt: 10 }]);
      const hostId = branded(ParticipantId, "host");
      const devId = branded(ParticipantId, "dev");
      assertOneHost(room);

      const moved = must(room.transferHost({ actorParticipantId: hostId, targetParticipantId: devId, now: at(10) }));
      expect(moved.room.hostParticipantId).toBe(devId);
      expect(moved.room.participants.map((participant) => participant.id).sort()).toEqual([devId, hostId].sort());
      hostChanged(moved.events, "manual", devId);
      assertOneHost(moved.room);
      expect(room.hostParticipantId).toBe(hostId);

      expect(code(room.transferHost({ actorParticipantId: devId, targetParticipantId: hostId, now: at(10) }))).toBe(
        "FORBIDDEN",
      );
      const facilitated = stage([
        { key: "fac", nickname: "Fac", role: "dev", joinedAt: 10, isFacilitator: true },
        { key: "dev", nickname: "Dee", role: "dev", joinedAt: 10 },
      ]);
      expect(
        code(
          facilitated.transferHost({
            actorParticipantId: branded(ParticipantId, "fac"),
            targetParticipantId: branded(ParticipantId, "dev"),
            now: at(10),
          }),
        ),
      ).toBe("FORBIDDEN");
      expect(code(room.transferHost({
        actorParticipantId: hostId,
        targetParticipantId: branded(ParticipantId, "missing"),
        now: at(10),
      }))).toBe("NOT_FOUND");
    });

    it("treats a target last seen exactly 45s ago as online and 46s ago as FORBIDDEN", async () => {
      await loadRoom();
      expect(ONLINE_WINDOW_SECONDS).toBe(45);
      const room = stage([{ key: "dev", nickname: "Dee", role: "dev", joinedAt: 0 }]);
      const hostId = branded(ParticipantId, "host");
      const devId = branded(ParticipantId, "dev");
      const online = must(room.transferHost({
        actorParticipantId: hostId,
        targetParticipantId: devId,
        now: at(ONLINE_WINDOW_SECONDS),
      }));
      expect(online.room.hostParticipantId).toBe(devId);
      expect(code(room.transferHost({
        actorParticipantId: hostId,
        targetParticipantId: devId,
        now: at(ONLINE_WINDOW_SECONDS + 1),
      }))).toBe("FORBIDDEN");
    });

    it("lets the host turn the suit axis off and refuses facilitators and other participants", async () => {
      await loadRoom();
      const room = stage([
        { key: "fac", nickname: "Fac", role: "dev", joinedAt: 2, isFacilitator: true },
        { key: "dev", nickname: "Dee", role: "dev", joinedAt: 2 },
      ]);
      const next = must(new RoomSettingsBuilder().withActiveScaleId(scale.id).withSuitAxis(false).withAutoReveal(true).build());
      const updated = must(room.updateSettings({
        actorParticipantId: branded(ParticipantId, "host"),
        settings: next,
        now: at(5),
      }));
      expect(updated.room.settings.suitAxisEnabled).toBe(false);
      expect(updated.room.settings.autoReveal).toBe(true);
      expect(updated.room.lastActivityAt.getTime()).toBe(at(5).getTime());
      expect(updated.events).toContainEqual(
        expect.objectContaining({
          type: "settings.changed",
          payload: expect.objectContaining({ suitAxisEnabled: false }),
        }),
      );
      assertVoteFree(updated.events);
      expect(room.settings.suitAxisEnabled).toBe(true);
      expect(code(room.updateSettings({
        actorParticipantId: branded(ParticipantId, "fac"),
        settings: next,
        now: at(5),
      }))).toBe("FORBIDDEN");
      expect(code(room.updateSettings({
        actorParticipantId: branded(ParticipantId, "dev"),
        settings: next,
        now: at(5),
      }))).toBe("FORBIDDEN");
    });
  });

  describe("facilitator delegation", () => {
    it("lets the host delegate and revoke one facilitator, and rejects everyone else", async () => {
      await loadRoom();
      const room = stage([
        { key: "fac", nickname: "Fac", role: "qa", joinedAt: 5 },
        { key: "dev", nickname: "Dee", role: "dev", joinedAt: 5 },
      ]);
      const hostId = branded(ParticipantId, "host");
      const facId = branded(ParticipantId, "fac");
      const devId = branded(ParticipantId, "dev");
      const delegated = must(room.delegateFacilitator({
        actorParticipantId: hostId,
        targetParticipantId: facId,
        now: at(5),
      }));
      expect(findKey(delegated.room, "fac").isFacilitator).toBe(true);
      expect(findKey(delegated.room, "dev").isFacilitator).toBe(false);
      expect(delegated.room.hostParticipantId).toBe(hostId);
      assertVoteFree(delegated.events);
      expect(findKey(room, "fac").isFacilitator).toBe(false);

      const replaced = must(delegated.room.delegateFacilitator({
        actorParticipantId: hostId,
        targetParticipantId: devId,
        now: at(5),
      }));
      expect(findKey(replaced.room, "fac").isFacilitator).toBe(false);
      expect(findKey(replaced.room, "dev").isFacilitator).toBe(true);

      const revoked = must(replaced.room.revokeFacilitator({
        actorParticipantId: hostId,
        targetParticipantId: devId,
        now: at(5),
      }));
      expect(findKey(revoked.room, "dev").isFacilitator).toBe(false);

      expect(code(room.delegateFacilitator({
        actorParticipantId: devId,
        targetParticipantId: facId,
        now: at(5),
      }))).toBe("FORBIDDEN");
      expect(code(delegated.room.delegateFacilitator({
        actorParticipantId: facId,
        targetParticipantId: devId,
        now: at(5),
      }))).toBe("FORBIDDEN");
      expect(code(room.delegateFacilitator({
        actorParticipantId: hostId,
        targetParticipantId: branded(ParticipantId, "missing"),
        now: at(5),
      }))).toBe("NOT_FOUND");
      expect(code(room.delegateFacilitator({
        actorParticipantId: hostId,
        targetParticipantId: facId,
        now: at(5 + ONLINE_WINDOW_SECONDS + 1),
      }))).toBe("FORBIDDEN");
    });
  });

  describe("autoTransferHost", () => {
    const races: readonly { name: string; seats: readonly SeatSpec[]; winner: string }[] = [
      {
        name: "a facilitator online becomes host over an earlier PM, reason auto",
        seats: [
          { key: "pm", nickname: "Pat", role: "pm", joinedAt: 20 },
          { key: "fac", nickname: "Fac", role: "dev", joinedAt: 40, isFacilitator: true },
        ],
        winner: "fac",
      },
      {
        name: "a later PM beats an earlier Dev",
        seats: [
          { key: "dev", nickname: "Dee", role: "dev", joinedAt: 20 },
          { key: "pm", nickname: "Pat", role: "pm", joinedAt: 30 },
        ],
        winner: "pm",
      },
      {
        name: "a later PO beats an earlier Dev",
        seats: [
          { key: "dev", nickname: "Dee", role: "dev", joinedAt: 20 },
          { key: "po", nickname: "Pat", role: "po", joinedAt: 30 },
        ],
        winner: "po",
      },
      {
        name: "a later Dev beats an earlier QA",
        seats: [
          { key: "qa", nickname: "Quinn", role: "qa", joinedAt: 20 },
          { key: "dev", nickname: "Dee", role: "dev", joinedAt: 30 },
        ],
        winner: "dev",
      },
      {
        name: "a later QA beats an earlier Observer",
        seats: [
          { key: "obs", nickname: "Olive", role: "observer", joinedAt: 20, mode: "observer" },
          { key: "qa", nickname: "Quinn", role: "qa", joinedAt: 30 },
        ],
        winner: "qa",
      },
      {
        name: "the earlier Dev wins when two Devs are online",
        seats: [
          { key: "early", nickname: "Early", role: "dev", joinedAt: 20 },
          { key: "late", nickname: "Late", role: "dev", joinedAt: 40 },
        ],
        winner: "early",
      },
      {
        name: "the earlier facilitator wins over a later PM facilitator",
        seats: [
          { key: "early", nickname: "Early", role: "dev", joinedAt: 20, isFacilitator: true },
          { key: "late", nickname: "Late", role: "pm", joinedAt: 40, isFacilitator: true },
        ],
        winner: "early",
      },
      {
        name: "an offline facilitator is skipped for an online Dev",
        seats: [
          { key: "fac", nickname: "Fac", role: "pm", joinedAt: 10, isFacilitator: true },
          { key: "dev", nickname: "Dee", role: "dev", joinedAt: 30 },
        ],
        winner: "dev",
      },
      {
        name: "the only online observer becomes host",
        seats: [{ key: "obs", nickname: "Olive", role: "observer", joinedAt: 30, mode: "observer" }],
        winner: "obs",
      },
    ];

    it.each(races)("$name", async ({ seats, winner }) => {
      await loadRoom();
      expect(HOST_GRACE_SECONDS).toBe(60);
      const room = stage(seats);
      const hostId = branded(ParticipantId, "host");
      expect(findKey(room, "host").lastSeenAt.getTime()).toBe(at(0).getTime());
      const quiet = must(room.autoTransferHost(at(HOST_GRACE_SECONDS)));
      expect(quiet.room.hostParticipantId).toBe(hostId);
      expect(quiet.events.some((event) => event.type === "host.changed")).toBe(false);
      expect(room.hostParticipantId).toBe(hostId);
      expect(findKey(room, "host").lastSeenAt.getTime()).toBe(at(0).getTime());

      const transferred = must(room.autoTransferHost(at(TRANSFER_AT)));
      const winnerId = branded(ParticipantId, winner);
      expect(transferred.room.hostParticipantId).toBe(winnerId);
      hostChanged(transferred.events, "auto", winnerId);
      assertOneHost(transferred.room);
      expect(room.hostParticipantId).toBe(hostId);
      if (winner === "obs") expect(findKey(transferred.room, "obs").canVote).toBe(false);
    });

    it("does not transfer a room whose only participant is the host", async () => {
      await loadRoom();
      const room = buildRoom({ host: hostSeed(), now: at(0) });
      const stayed = must(room.autoTransferHost(at(TRANSFER_AT)));
      expect(stayed.room.hostParticipantId).toBe(branded(ParticipantId, "host"));
      expect(stayed.events.some((event) => event.type === "host.changed")).toBe(false);
      expect(stayed.room.participants).toHaveLength(1);
    });

    it("does not transfer when the other participant was last seen 46s before now", async () => {
      await loadRoom();
      const room = stage([{ key: "dev", nickname: "Dee", role: "dev", joinedAt: TRANSFER_AT - (ONLINE_WINDOW_SECONDS + 1) }]);
      const stayed = must(room.autoTransferHost(at(TRANSFER_AT)));
      expect(stayed.room.hostParticipantId).toBe(branded(ParticipantId, "host"));
      expect(stayed.events.some((event) => event.type === "host.changed")).toBe(false);
    });

    it("transfers to a participant last seen exactly 45s before now", async () => {
      await loadRoom();
      const room = stage([{ key: "dev", nickname: "Dee", role: "dev", joinedAt: TRANSFER_AT - ONLINE_WINDOW_SECONDS }]);
      const transferred = must(room.autoTransferHost(at(TRANSFER_AT)));
      expect(transferred.room.hostParticipantId).toBe(branded(ParticipantId, "dev"));
      hostChanged(transferred.events, "auto", branded(ParticipantId, "dev"));
    });

    it("measures host grace from the injected clock after the host rejoins", async () => {
      await loadRoom();
      const room = stage([{ key: "dev", nickname: "Dee", role: "dev", joinedAt: 100 }]);
      const hostSeen = must(room.rejoin({ guestSessionId: "session-host", now: at(100) }));
      const devSeen = must(hostSeen.room.rejoin({ guestSessionId: "session-dev", now: at(130) }));
      expect(findKey(devSeen.room, "host").lastSeenAt.getTime()).toBe(at(100).getTime());
      expect(findKey(devSeen.room, "dev").lastSeenAt.getTime()).toBe(at(130).getTime());
      const tooSoon = must(devSeen.room.autoTransferHost(at(100 + HOST_GRACE_SECONDS)));
      expect(tooSoon.room.hostParticipantId).toBe(branded(ParticipantId, "host"));
      const due = must(devSeen.room.autoTransferHost(at(100 + HOST_GRACE_SECONDS + 1)));
      expect(due.room.hostParticipantId).toBe(branded(ParticipantId, "dev"));
      expect(devSeen.room.hostParticipantId).toBe(branded(ParticipantId, "host"));
    });
  });

  describe("closed room", () => {
    it("lets the host close and then rejects join, settings, and transfer with FORBIDDEN", async () => {
      await loadRoom();
      const room = stage([{ key: "dev", nickname: "Dee", role: "dev", joinedAt: 2 }]);
      expect(code(room.close({ actorParticipantId: branded(ParticipantId, "dev"), now: at(3) }))).toBe("FORBIDDEN");
      expect(room.status).toBe("open");
      const closed = must(room.close({ actorParticipantId: branded(ParticipantId, "host"), now: at(3) }));
      expect(closed.room.status).toBe("closed");
      expect(room.status).toBe("open");
      const next = must(new RoomSettingsBuilder().withActiveScaleId(scale.id).build());
      expect(code(closed.room.join({
        participantId: branded(ParticipantId, "late"),
        nickname: "Late",
        role: "dev",
        mode: "voter",
        guestSessionId: "session-late",
        now: at(4),
      }))).toBe("FORBIDDEN");
      expect(code(closed.room.updateSettings({
        actorParticipantId: branded(ParticipantId, "host"),
        settings: next,
        now: at(4),
      }))).toBe("FORBIDDEN");
      expect(code(closed.room.transferHost({
        actorParticipantId: branded(ParticipantId, "host"),
        targetParticipantId: branded(ParticipantId, "dev"),
        now: at(4),
      }))).toBe("FORBIDDEN");
      expect(code(closed.room.autoTransferHost(at(4 + HOST_GRACE_SECONDS + 1)))).toBe("FORBIDDEN");
    });
  });
});
