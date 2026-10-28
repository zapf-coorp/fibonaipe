import { UserId, changeMemberRole, ok, type AppError, type Result, type TeamRole } from "@fibonaipe/domain";
import type { UseCaseDependencies } from "../room-session.js";
import { parseRole, requireTeamAction, saveMemberships } from "./access.js";

export interface ChangeMemberRoleInput {
  readonly teamId: string;
  readonly actorUserId: string;
  readonly memberUserId: string;
  readonly role: TeamRole;
}

export class ChangeMemberRole {
  constructor(private readonly deps: UseCaseDependencies) {}

  async execute(input: ChangeMemberRoleInput): Promise<Result<{ readonly role: TeamRole }, AppError>> {
    const role = parseRole(input.role);
    if (!role.ok) return role;
    const memberUserId = UserId.create(input.memberUserId);
    if (!memberUserId.ok) return memberUserId;
    const allowed = await requireTeamAction(this.deps, input.teamId, input.actorUserId, "manageTeam");
    if (!allowed.ok) return allowed;
    const changed = changeMemberRole(allowed.value.members, memberUserId.value, role.value);
    if (!changed.ok) return changed;
    const saved = await saveMemberships(this.deps, changed.value);
    if (!saved.ok) return saved;
    return ok({ role: role.value });
  }
}
