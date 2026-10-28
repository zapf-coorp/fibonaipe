import {
  InviteId,
  Membership,
  MembershipBuilder,
  OrganizationId,
  TeamId,
  UserId,
  can,
  createAppError,
  err,
  isTeamRole,
  ok,
  type AppError,
  type Membership as MembershipValue,
  type PolicyAction,
  type Result,
  type TeamId as TeamIdValue,
  type TeamRole,
  type UserId as UserIdValue,
} from "@fibonaipe/domain";
import type { PersistedInviteRecord, PersistedMembershipRecord } from "../../ports/persistence.port.js";
import type { UseCaseDependencies } from "../room-session.js";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
export const MVP_ORGANIZATION_ID = "org-mvp";

export function issuedAtFromExpiry(expiresAt: Date): Date {
  return new Date(expiresAt.getTime() - WEEK_MS);
}

export async function requireTeamAction(
  deps: UseCaseDependencies,
  teamIdRaw: string,
  actorUserIdRaw: string,
  action: PolicyAction,
): Promise<Result<{ teamId: TeamIdValue; actorUserId: UserIdValue; members: MembershipValue[] }, AppError>> {
  const teamId = TeamId.create(teamIdRaw);
  if (!teamId.ok) return teamId;
  const actorUserId = UserId.create(actorUserIdRaw);
  if (!actorUserId.ok) return actorUserId;
  return deps.persistence.transaction({}, async (repos) => {
    const team = await repos.teams.findById(teamId.value);
    if (!team) return err(createAppError("NOT_FOUND"));
    const stored = await repos.memberships.listByTeam(teamId.value);
    const members: MembershipValue[] = [];
    for (const record of stored) {
      const built = membershipFrom(record);
      if (!built.ok) return built;
      members.push(built.value);
    }
    const actor = members.find((member) => member.userId === actorUserId.value);
    if (!actor) return err(createAppError("FORBIDDEN"));
    const allowed = can(
      { kind: "member", teamRole: actor.role, isHost: false, isFacilitator: false, roomMode: "voter" },
      action,
      { roomKind: "team", actorCreatedRoom: false },
    );
    if (!allowed) return err(createAppError("FORBIDDEN"));
    return ok({ teamId: teamId.value, actorUserId: actorUserId.value, members });
  });
}

export function membershipFrom(record: PersistedMembershipRecord): Result<Membership, AppError> {
  if (!isTeamRole(record.role)) return err(createAppError("VALIDATION"));
  return new MembershipBuilder().withUserId(record.userId).withTeamId(record.teamId).withRole(record.role).build();
}

export function parseRole(role: string): Result<TeamRole, AppError> {
  if (!isTeamRole(role)) return err(createAppError("VALIDATION"));
  return ok(role);
}

export async function saveMemberships(
  deps: UseCaseDependencies,
  members: readonly MembershipValue[],
): Promise<Result<true, AppError>> {
  return deps.persistence.transaction({}, async (repos) => {
    for (const member of members) {
      await repos.memberships.save({ userId: member.userId, teamId: member.teamId, role: member.role });
    }
    return ok(true);
  });
}

export function inviteRecord(input: {
  readonly id: InviteId;
  readonly teamId: TeamIdValue;
  readonly role: TeamRole;
  readonly tokenHash: string;
  readonly expiresAt: Date;
  readonly revokedAt: Date | null;
  readonly acceptedBy: UserIdValue | null;
}): PersistedInviteRecord {
  return input;
}

export function organizationId(): Result<OrganizationId, AppError> {
  return OrganizationId.create(MVP_ORGANIZATION_ID);
}
