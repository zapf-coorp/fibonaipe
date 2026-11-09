import { computeEstimationIndicators, createAppError, err, ok, type AppError, type EstimationIndicators, type Result } from "@fibonaipe/domain";
import type { UseCaseDependencies } from "../room-session.js";
import { requireTeamAction } from "../teams/access.js";

export interface EstimationIndicatorsInput { readonly teamId: string; readonly actorUserId: string; readonly from?: Date; readonly to?: Date }
const FIBONACCI = [0, 0.5, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89] as const;

export class GetEstimationIndicators {
  constructor(private readonly deps: UseCaseDependencies) {}
  async execute(input: EstimationIndicatorsInput): Promise<Result<EstimationIndicators, AppError>> {
    if ((input.from && !Number.isFinite(input.from.getTime())) || (input.to && !Number.isFinite(input.to.getTime())) || (input.from && input.to && input.from > input.to)) return err(createAppError("VALIDATION"));
    const access = await requireTeamAction(this.deps, input.teamId, input.actorUserId, "viewDashboard");
    if (!access.ok) return access;
    return this.deps.persistence.transaction({}, async (repos) => {
      const history = await repos.history.query({ teamId: access.value.teamId });
      const sprints = await repos.sprints.listByTeam(access.value.teamId);
      const exceededByItem = new Map<string, boolean>();
      for (const record of sprints) {
        if (record.state?.status !== "closed") continue;
        for (const item of record.state.items) if (item.doneAt !== null && typeof item.estimateExceeded === "boolean") exceededByItem.set(item.id, item.estimateExceeded);
      }
      const entries = history.filter((entry) => {
        if (!(entry.estimatedAt instanceof Date) || !Number.isFinite(entry.estimatedAt.getTime())) return false;
        return (!input.from || entry.estimatedAt >= input.from) && (!input.to || entry.estimatedAt <= input.to);
      }).map((entry) => ({ itemId: entry.itemId, roundNumber: entry.roundNumber ?? 1, consensus: entry.consensus ?? entry.stats.consensus, min: entry.min ?? null, max: entry.max ?? null, finalEstimate: entry.finalEstimate ?? "", finalSuit: entry.finalSuit ?? entry.dominantSuit, estimateExceeded: exceededByItem.get(entry.itemId) }));
      return ok(computeEstimationIndicators(entries, FIBONACCI));
    });
  }
}
