import { ok, type AppError, type Result } from "@fibonaipe/domain";
import type { UseCaseDependencies } from "../room-session.js";

export interface PurgeExpiredRoomsResult {
  readonly count: number;
}

export class PurgeExpiredRooms {
  constructor(private readonly deps: UseCaseDependencies) {}

  async execute(): Promise<Result<PurgeExpiredRoomsResult, AppError>> {
    const now = this.deps.clock.now();
    const purged = await this.deps.persistence.transaction({}, async (repos) => {
      const count = await repos.rooms.deleteExpiredAnonymous(now);
      return ok(count);
    });
    if (!purged.ok) return purged;
    const entry = { event: "rooms.purged", useCase: "PurgeExpiredRooms", count: purged.value };
    this.deps.logger.info(entry);
    return ok({ count: purged.value });
  }
}
