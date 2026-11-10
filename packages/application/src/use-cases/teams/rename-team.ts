import { createAppError, err, ok, type AppError, type Result } from "@fibonaipe/domain";
import type { UseCaseDependencies } from "../room-session.js";
import { requireTeamAction } from "./access.js";

export interface RenameTeamInput {
  readonly teamId: string;
  readonly actorUserId: string;
  readonly name: string;
}

export class RenameTeam {
  constructor(private readonly deps: UseCaseDependencies) {}

  async execute(input: RenameTeamInput): Promise<Result<{ readonly name: string }, AppError>> {
    const name = input.name.trim();
    if (name.length === 0 || name.length > 80) return err(createAppError("VALIDATION"));
    const allowed = await requireTeamAction(this.deps, input.teamId, input.actorUserId, "manageTeam");
    if (!allowed.ok) return allowed;
    const saved = await this.deps.persistence.transaction({}, async (repos) => {
      const team = await repos.teams.findById(allowed.value.teamId);
      if (!team) return err(createAppError("NOT_FOUND"));
      await repos.teams.save({ ...team, name });
      return ok({ name });
    });
    return saved;
  }
}
