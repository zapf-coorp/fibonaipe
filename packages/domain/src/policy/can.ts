export type ActorKind = "guest" | "member";
export type SystemRole = "superAdmin";
export type TeamRole = "teamAdmin" | "pm" | "po" | "dev" | "qa" | "observer";
export type RoomMode = "voter" | "observer";
export type RoomKind = "guest" | "team";

export interface PolicyActor {
  readonly kind: ActorKind;
  readonly systemRole?: SystemRole;
  readonly teamRole?: TeamRole;
  readonly isHost: boolean;
  readonly isFacilitator: boolean;
  readonly roomMode: RoomMode;
}

export interface PolicyContext {
  readonly roomKind: RoomKind;
  readonly actorCreatedRoom: boolean;
}

export type PolicyAction =
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

type PolicyRule = (actor: PolicyActor, ctx: PolicyContext) => boolean;

function isInstanceAdmin(actor: PolicyActor): boolean {
  return actor.systemRole === "superAdmin";
}

function isTeamAdmin(actor: PolicyActor): boolean {
  return isInstanceAdmin(actor) || actor.teamRole === "teamAdmin";
}

function canHostBySeat(actor: PolicyActor, ctx: PolicyContext): boolean {
  if (actor.isHost) return true;
  if (actor.kind === "guest") return ctx.actorCreatedRoom;
  if (actor.teamRole === "dev" || actor.teamRole === "qa" || actor.teamRole === "observer") {
    return actor.isFacilitator;
  }
  return true;
}

function canFacilitate(actor: PolicyActor): boolean {
  return actor.isHost || actor.isFacilitator;
}

const MATRIX: Record<PolicyAction, PolicyRule> = {
  manageInstance: (actor) => isInstanceAdmin(actor),
  manageTeam: (actor) => isTeamAdmin(actor),
  configureSprints: (actor) => isTeamAdmin(actor) || actor.teamRole === "pm",
  createTeamRoom: (actor) => isTeamAdmin(actor) || actor.teamRole === "pm" || actor.teamRole === "po",
  createGuestRoom: () => true,
  hostRoom: (actor, ctx) => canHostBySeat(actor, ctx),
  vote: (actor) => actor.roomMode === "voter",
  revealRound: (actor) => canFacilitate(actor),
  setFinalEstimate: (actor) => canFacilitate(actor),
  manageQueue: (actor) => canFacilitate(actor),
  updateRoomSettings: (actor) => actor.isHost,
  transferHost: (actor) => actor.isHost,
  viewDashboard: (actor) => actor.kind !== "guest",
  exportTeamData: (actor) => actor.kind !== "guest" && actor.teamRole !== "observer",
  exportOwnRoomSummary: () => true,
};

export function can(actor: PolicyActor, action: PolicyAction, ctx: PolicyContext): boolean {
  const rule = MATRIX[action];
  if (!rule) return false;
  return rule(actor, ctx);
}
