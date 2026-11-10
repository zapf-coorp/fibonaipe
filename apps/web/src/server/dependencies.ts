import type { UseCaseDependencies } from "@fibonaipe/application";
import type { AppContainer } from "./composition.js";

export function dependenciesOf(container: AppContainer): UseCaseDependencies {
  return {
    persistence: container.persistence,
    realtime: container.realtime,
    ids: container.idGenerator,
    clock: container.clock,
    rateLimiter: container.rateLimiter,
    issueTracker: container.issueTracker,
    exporter: container.exporter,
    logger: container.logger,
  };
}
