import { createAppError, type AppError } from "../shared/app-error.js";
import type { TeamId, UserId } from "../shared/ids.js";
import type { TeamRole } from "../policy/can.js";
import { err, ok, type Result } from "../shared/result.js";

const TEAM_ROLES: ReadonlySet<string> = new Set(["teamAdmin", "pm", "po", "dev", "qa", "observer"]);

export function isTeamRole(value: string): value is TeamRole {
  return TEAM_ROLES.has(value);
}

export class Membership {
  readonly userId: UserId;
  readonly teamId: TeamId;
  readonly role: TeamRole;

  private constructor(userId: UserId, teamId: TeamId, role: TeamRole) {
    this.userId = userId;
    this.teamId = teamId;
    this.role = role;
    Object.freeze(this);
  }

  static create(userId: UserId, teamId: TeamId, role: TeamRole): Membership {
    return new Membership(userId, teamId, role);
  }

  withRole(role: TeamRole): Membership {
    return new Membership(this.userId, this.teamId, role);
  }
}

export class MembershipBuilder {
  private userId: UserId | undefined;
  private teamId: TeamId | undefined;
  private role: string | undefined;

  withUserId(userId: UserId): this {
    this.userId = userId;
    return this;
  }

  withTeamId(teamId: TeamId): this {
    this.teamId = teamId;
    return this;
  }

  withRole(role: TeamRole): this {
    this.role = role;
    return this;
  }

  build(): Result<Membership, AppError> {
    if (!this.userId || !this.teamId || this.role === undefined || !isTeamRole(this.role)) {
      return err(createAppError("VALIDATION"));
    }
    return ok(Membership.create(this.userId, this.teamId, this.role));
  }
}

function adminCount(members: readonly Membership[]): number {
  return members.filter((member) => member.role === "teamAdmin").length;
}

function losesOnlyAdmin(members: readonly Membership[], target: Membership, nextRole: TeamRole | null): boolean {
  if (target.role !== "teamAdmin" || members.length <= 1) return false;
  if (nextRole === "teamAdmin") return false;
  return adminCount(members) === 1;
}

export function changeMemberRole(
  members: readonly Membership[],
  userId: UserId,
  role: TeamRole,
): Result<Membership[], AppError> {
  if (!isTeamRole(role)) return err(createAppError("VALIDATION"));
  const target = members.find((member) => member.userId === userId);
  if (!target) return err(createAppError("NOT_FOUND"));
  if (losesOnlyAdmin(members, target, role)) return err(createAppError("LAST_ADMIN"));
  return ok(members.map((member) => (member.userId === userId ? member.withRole(role) : member)));
}

export function removeMember(members: readonly Membership[], userId: UserId): Result<Membership[], AppError> {
  const target = members.find((member) => member.userId === userId);
  if (!target) return err(createAppError("NOT_FOUND"));
  if (losesOnlyAdmin(members, target, null)) return err(createAppError("LAST_ADMIN"));
  return ok(members.filter((member) => member.userId !== userId));
}
