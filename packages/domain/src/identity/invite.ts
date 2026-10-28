import { createAppError, type AppError } from "../shared/app-error.js";
import type { InviteId, TeamId, UserId } from "../shared/ids.js";
import type { TeamRole } from "../policy/can.js";
import { err, ok, type Result } from "../shared/result.js";
import { isTeamRole } from "./membership.js";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export interface InviteAcceptance {
  readonly role: TeamRole;
  readonly teamId: TeamId;
  readonly userId: UserId;
}

interface InviteState {
  readonly id: InviteId;
  readonly teamId: TeamId;
  readonly role: TeamRole;
  readonly expiresAt: Date;
  readonly revokedAt: Date | null;
}

export class Invite {
  readonly id: InviteId;
  readonly teamId: TeamId;
  readonly role: TeamRole;
  readonly expiresAt: Date;
  readonly revokedAt: Date | null;

  private constructor(state: InviteState) {
    this.id = state.id;
    this.teamId = state.teamId;
    this.role = state.role;
    this.expiresAt = state.expiresAt;
    this.revokedAt = state.revokedAt;
    Object.freeze(this);
  }

  static create(state: InviteState): Invite {
    return new Invite(state);
  }

  accept(input: { readonly userId: UserId; readonly now: Date }): Result<InviteAcceptance, AppError> {
    if (this.revokedAt !== null || input.now.getTime() > this.expiresAt.getTime()) {
      return err(createAppError("NOT_FOUND"));
    }
    return ok({ role: this.role, teamId: this.teamId, userId: input.userId });
  }

  revoke(now: Date): Result<Invite, AppError> {
    if (this.revokedAt !== null) return err(createAppError("NOT_FOUND"));
    return ok(Invite.create({ id: this.id, teamId: this.teamId, role: this.role, expiresAt: this.expiresAt, revokedAt: now }));
  }
}

export class InviteBuilder {
  private id: InviteId | undefined;
  private teamId: TeamId | undefined;
  private role: string | undefined;
  private now: Date | undefined;

  withId(id: InviteId): this {
    this.id = id;
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

  withNow(now: Date): this {
    this.now = now;
    return this;
  }

  build(): Result<Invite, AppError> {
    if (!this.id || !this.teamId || this.role === undefined || !this.now || !isTeamRole(this.role)) {
      return err(createAppError("VALIDATION"));
    }
    const expiresAt = new Date(this.now.getTime() + WEEK_MS);
    return ok(Invite.create({ id: this.id, teamId: this.teamId, role: this.role, expiresAt, revokedAt: null }));
  }
}
