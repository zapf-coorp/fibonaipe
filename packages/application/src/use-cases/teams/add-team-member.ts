import { createAppError, err, ok, type AppError, type Result } from "@fibonaipe/domain";
import type { UseCaseDependencies } from "../room-session.js";
import { requireTeamAction } from "./access.js";

export interface AddTeamMemberInput {
  readonly teamId: string;
  readonly actorUserId: string;
  readonly email: string;
}

export class AddTeamMember {
  constructor(private readonly deps: UseCaseDependencies) {}

  async execute(input: AddTeamMemberInput): Promise<Result<{ readonly userId: string; readonly name: string }, AppError>> {
    const email = input.email.trim().toLowerCase();
    if (!email.includes("@")) return err(createAppError("VALIDATION"));
    const allowed = await requireTeamAction(this.deps, input.teamId, input.actorUserId, "manageTeam");
    if (!allowed.ok) return allowed;
    return this.deps.persistence.transaction({}, async (repos) => {
      const user = await repos.users.findByEmail(email);
      if (!user || user.status === "suspended") return err(createAppError("NOT_FOUND"));
      const members = await repos.memberships.listByTeam(allowed.value.teamId);
      if (members.some((member) => member.userId === user.id)) return err(createAppError("VALIDATION"));
      await repos.memberships.save({ userId: user.id, teamId: allowed.value.teamId, role: "dev" });
      return ok({ userId: user.id, name: user.displayName });
    });
  }
}
