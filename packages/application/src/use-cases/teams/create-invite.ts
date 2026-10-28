import { InviteBuilder, InviteId, ok, type AppError, type Result, type TeamRole } from "@fibonaipe/domain";
import type { UseCaseDependencies } from "../room-session.js";
import { inviteRecord, parseRole, requireTeamAction } from "./access.js";

export interface CreateInviteInput {
  readonly teamId: string;
  readonly actorUserId: string;
  readonly role: TeamRole;
}

export interface CreateInviteResult {
  readonly token: string;
  readonly expiresAt: Date;
  readonly role: TeamRole;
}

export class CreateInvite {
  constructor(private readonly deps: UseCaseDependencies) {}

  async execute(input: CreateInviteInput): Promise<Result<CreateInviteResult, AppError>> {
    const role = parseRole(input.role);
    if (!role.ok) return role;
    const allowed = await requireTeamAction(this.deps, input.teamId, input.actorUserId, "manageTeam");
    if (!allowed.ok) return allowed;
    const inviteId = InviteId.create(this.deps.ids.newId());
    if (!inviteId.ok) return inviteId;
    const now = this.deps.clock.now();
    const invite = new InviteBuilder().withId(inviteId.value).withTeamId(allowed.value.teamId).withRole(role.value).withNow(now).build();
    if (!invite.ok) return invite;
    const token = this.deps.ids.newToken();
    const saved = await this.deps.persistence.transaction({}, async (repos) => {
      await repos.invites.save(
        inviteRecord({
          id: invite.value.id,
          teamId: invite.value.teamId,
          role: invite.value.role,
          tokenHash: this.deps.ids.sha256(token),
          expiresAt: invite.value.expiresAt,
          revokedAt: null,
          acceptedBy: null,
        }),
      );
      return ok(true);
    });
    if (!saved.ok) return saved;
    return ok({ token, expiresAt: invite.value.expiresAt, role: invite.value.role });
  }
}
