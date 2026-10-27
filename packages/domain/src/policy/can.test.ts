import { describe, expect, it } from "vitest";

type Seat = "superAdmin" | "teamAdmin" | "pm" | "po" | "dev" | "qa" | "teamObserver" | "guest";

type Action =
  | "manageInstance"
  | "manageTeam"
  | "configureSprints"
  | "createTeamRoom"
  | "createGuestRoom"
  | "hostRoom"
  | "vote"
  | "revealRound"
  | "setFinalEstimate"
  | "manageQueue"
  | "updateRoomSettings"
  | "transferHost"
  | "viewDashboard"
  | "exportTeamData"
  | "exportOwnRoomSummary";

interface Actor {
  kind: "guest" | "member";
  systemRole?: "superAdmin";
  teamRole?: "teamAdmin" | "pm" | "po" | "dev" | "qa" | "observer";
  isHost: boolean;
  isFacilitator: boolean;
  roomMode: "voter" | "observer";
}

interface PolicyContext {
  roomKind: "guest" | "team";
  actorCreatedRoom: boolean;
}

interface Flags {
  state: string;
  isHost: boolean;
  isFacilitator: boolean;
  roomMode: "voter" | "observer";
  actorCreatedRoom: boolean;
  roomKind: "guest" | "team";
}

const SEATS: readonly Seat[] = [
  "superAdmin",
  "teamAdmin",
  "pm",
  "po",
  "dev",
  "qa",
  "teamObserver",
  "guest",
];

const ACTIONS: readonly Action[] = [
  "manageInstance",
  "manageTeam",
  "configureSprints",
  "createTeamRoom",
  "createGuestRoom",
  "hostRoom",
  "vote",
  "revealRound",
  "setFinalEstimate",
  "manageQueue",
  "updateRoomSettings",
  "transferHost",
  "viewDashboard",
  "exportTeamData",
  "exportOwnRoomSummary",
];

const STATES: readonly Flags[] = [
  {
    state: "voter who is not host in a team room",
    isHost: false,
    isFacilitator: false,
    roomMode: "voter",
    actorCreatedRoom: false,
    roomKind: "team",
  },
  {
    state: "host voter in a team room",
    isHost: true,
    isFacilitator: false,
    roomMode: "voter",
    actorCreatedRoom: false,
    roomKind: "team",
  },
  {
    state: "facilitator voter in a team room",
    isHost: false,
    isFacilitator: true,
    roomMode: "voter",
    actorCreatedRoom: false,
    roomKind: "team",
  },
  {
    state: "observer mode in a team room",
    isHost: false,
    isFacilitator: false,
    roomMode: "observer",
    actorCreatedRoom: false,
    roomKind: "team",
  },
  {
    state: "host observer mode in a team room",
    isHost: true,
    isFacilitator: false,
    roomMode: "observer",
    actorCreatedRoom: false,
    roomKind: "team",
  },
  {
    state: "facilitator observer mode in a team room",
    isHost: false,
    isFacilitator: true,
    roomMode: "observer",
    actorCreatedRoom: false,
    roomKind: "team",
  },
  {
    state: "created the guest room",
    isHost: false,
    isFacilitator: false,
    roomMode: "voter",
    actorCreatedRoom: true,
    roomKind: "guest",
  },
  {
    state: "did not create the guest room",
    isHost: false,
    isFacilitator: false,
    roomMode: "voter",
    actorCreatedRoom: false,
    roomKind: "guest",
  },
];

function actor(seat: Seat, flags: Flags): Actor {
  const base: Actor = {
    kind: seat === "guest" ? "guest" : "member",
    isHost: flags.isHost,
    isFacilitator: flags.isFacilitator,
    roomMode: flags.roomMode,
  };
  if (seat === "superAdmin") return { ...base, systemRole: "superAdmin" };
  if (seat === "teamAdmin") return { ...base, teamRole: "teamAdmin" };
  if (seat === "pm") return { ...base, teamRole: "pm" };
  if (seat === "po") return { ...base, teamRole: "po" };
  if (seat === "dev") return { ...base, teamRole: "dev" };
  if (seat === "qa") return { ...base, teamRole: "qa" };
  if (seat === "teamObserver") return { ...base, teamRole: "observer" };
  return base;
}

function allowed(seat: Seat, action: Action, flags: Flags): boolean {
  switch (action) {
    case "manageInstance":
      return seat === "superAdmin";
    case "manageTeam":
      return seat === "superAdmin" || seat === "teamAdmin";
    case "configureSprints":
      return seat === "superAdmin" || seat === "teamAdmin" || seat === "pm";
    case "createTeamRoom":
      return seat === "superAdmin" || seat === "teamAdmin" || seat === "pm" || seat === "po";
    case "createGuestRoom":
    case "exportOwnRoomSummary":
      return true;
    case "hostRoom":
      if (flags.isHost) return true;
      if (seat === "guest") return flags.actorCreatedRoom;
      if (seat === "dev" || seat === "qa" || seat === "teamObserver") return flags.isFacilitator;
      return true;
    case "vote":
      return flags.roomMode === "voter";
    case "revealRound":
    case "setFinalEstimate":
    case "manageQueue":
      return flags.isHost || flags.isFacilitator;
    case "updateRoomSettings":
    case "transferHost":
      return flags.isHost;
    case "viewDashboard":
      return seat !== "guest";
    case "exportTeamData":
      return seat !== "guest" && seat !== "teamObserver";
    default: {
      const never: never = action;
      throw new Error(never);
    }
  }
}

const cases = SEATS.flatMap((seat) =>
  ACTIONS.flatMap((action) =>
    STATES.map((flags) => ({
      seat,
      action,
      state: flags.state,
      allowed: allowed(seat, action, flags),
      actor: actor(seat, flags),
      ctx: { roomKind: flags.roomKind, actorCreatedRoom: flags.actorCreatedRoom } satisfies PolicyContext,
    })),
  ),
);

function row(seat: Seat, action: Action, state: string) {
  const found = cases.find((item) => item.seat === seat && item.action === action && item.state === state);
  if (!found) throw new Error(`${seat} ${action} ${state}`);
  return found;
}

let loadingCan: Promise<(actor: Actor, action: Action, ctx: PolicyContext) => boolean> | undefined;

function loadCan(): Promise<(actor: Actor, action: Action, ctx: PolicyContext) => boolean> {
  loadingCan ??= import("./can.js").then((policy) => {
    if (typeof policy.can !== "function") throw new Error("can is not a function");
    return policy.can;
  });
  return loadingCan;
}

describe("can matrix rows", () => {
  it("generates one row for every §3.1 seat, action, and session state", () => {
    expect(cases).toHaveLength(SEATS.length * ACTIONS.length * STATES.length);
    expect(new Set(cases.map((item) => item.seat)).size).toBe(SEATS.length);
    expect(new Set(cases.map((item) => item.action)).size).toBe(ACTIONS.length);
    expect(row("superAdmin", "manageInstance", "voter who is not host in a team room").allowed).toBe(true);
    expect(row("teamAdmin", "manageInstance", "voter who is not host in a team room").allowed).toBe(false);
    expect(row("po", "configureSprints", "voter who is not host in a team room").allowed).toBe(false);
    expect(row("pm", "configureSprints", "voter who is not host in a team room").allowed).toBe(true);
    expect(row("po", "createTeamRoom", "voter who is not host in a team room").allowed).toBe(true);
    expect(row("dev", "createTeamRoom", "did not create the guest room").allowed).toBe(false);
    expect(row("qa", "createGuestRoom", "did not create the guest room").allowed).toBe(true);
    expect(row("dev", "hostRoom", "voter who is not host in a team room").allowed).toBe(false);
    expect(row("qa", "hostRoom", "facilitator voter in a team room").allowed).toBe(true);
    expect(row("guest", "hostRoom", "created the guest room").allowed).toBe(true);
    expect(row("guest", "hostRoom", "did not create the guest room").allowed).toBe(false);
    expect(row("guest", "hostRoom", "facilitator voter in a team room").allowed).toBe(false);
    expect(row("teamObserver", "vote", "voter who is not host in a team room").allowed).toBe(true);
    expect(row("pm", "vote", "observer mode in a team room").allowed).toBe(false);
    expect(row("pm", "vote", "host observer mode in a team room").allowed).toBe(false);
    expect(row("dev", "revealRound", "voter who is not host in a team room").allowed).toBe(false);
    expect(row("guest", "setFinalEstimate", "facilitator voter in a team room").allowed).toBe(true);
    expect(row("guest", "manageQueue", "facilitator observer mode in a team room").allowed).toBe(true);
    expect(row("pm", "updateRoomSettings", "voter who is not host in a team room").allowed).toBe(false);
    expect(row("pm", "updateRoomSettings", "facilitator voter in a team room").allowed).toBe(false);
    expect(row("guest", "updateRoomSettings", "did not create the guest room").allowed).toBe(false);
    expect(row("guest", "updateRoomSettings", "created the guest room").allowed).toBe(false);
    expect(row("guest", "transferHost", "host voter in a team room").allowed).toBe(true);
    expect(row("teamObserver", "viewDashboard", "voter who is not host in a team room").allowed).toBe(true);
    expect(row("teamObserver", "exportTeamData", "voter who is not host in a team room").allowed).toBe(false);
    expect(row("guest", "viewDashboard", "created the guest room").allowed).toBe(false);
    expect(row("guest", "exportOwnRoomSummary", "did not create the guest room").allowed).toBe(true);
    expect(row("qa", "exportTeamData", "observer mode in a team room").allowed).toBe(true);
  });
});

describe("can(actor, action, ctx)", () => {
  it.each(cases)("$seat $action ($state) → $allowed", async ({ actor: subject, action, ctx, allowed: expected }) => {
    const can = await loadCan();
    expect(can(subject, action, ctx)).toBe(expected);
  });

  it("refuses vote for a room-mode observer and still lets a team observer vote as voter", async () => {
    const can = await loadCan();
    const team: PolicyContext = { roomKind: "team", actorCreatedRoom: false };
    const observer = STATES.find((flags) => flags.state === "observer mode in a team room");
    const voter = STATES.find((flags) => flags.state === "voter who is not host in a team room");
    if (!observer || !voter) throw new Error("missing state");
    for (const seat of SEATS) {
      expect(can(actor(seat, observer), "vote", team)).toBe(false);
    }
    expect(can(actor("teamObserver", voter), "vote", team)).toBe(true);
    expect(can(actor("po", voter), "vote", team)).toBe(true);
    expect(can(actor("guest", voter), "vote", { roomKind: "guest", actorCreatedRoom: false })).toBe(true);
  });

  it("lets the guest who created the room host it and refuses settings changes from any other guest", async () => {
    const can = await loadCan();
    const creator = STATES.find((flags) => flags.state === "created the guest room");
    const other = STATES.find((flags) => flags.state === "did not create the guest room");
    const facilitator = STATES.find((flags) => flags.state === "facilitator voter in a team room");
    if (!creator || !other || !facilitator) throw new Error("missing state");
    expect(can(actor("guest", creator), "hostRoom", { roomKind: "guest", actorCreatedRoom: true })).toBe(true);
    expect(can(actor("guest", other), "updateRoomSettings", { roomKind: "guest", actorCreatedRoom: false })).toBe(
      false,
    );
    expect(can(actor("guest", facilitator), "updateRoomSettings", { roomKind: "team", actorCreatedRoom: false })).toBe(
      false,
    );
    expect(can(actor("guest", facilitator), "transferHost", { roomKind: "guest", actorCreatedRoom: true })).toBe(false);
    expect(can(actor("guest", facilitator), "revealRound", { roomKind: "guest", actorCreatedRoom: false })).toBe(true);
  });

  it("lets SuperAdmin manage the instance and lets a team observer read but not export team data", async () => {
    const can = await loadCan();
    const voter = STATES.find((flags) => flags.state === "voter who is not host in a team room");
    if (!voter) throw new Error("missing state");
    const team: PolicyContext = { roomKind: "team", actorCreatedRoom: false };
    expect(can(actor("superAdmin", voter), "manageInstance", team)).toBe(true);
    expect(can(actor("teamObserver", voter), "viewDashboard", team)).toBe(true);
    expect(can(actor("teamObserver", voter), "exportTeamData", team)).toBe(false);
    expect(can(actor("dev", voter), "exportTeamData", team)).toBe(true);
  });
});
