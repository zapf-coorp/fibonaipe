export const testingPackage = "@fibonaipe/testing" as const;

export { FakeClock } from "./fakes/fake-clock.js";
export { SequentialIdGenerator } from "./fakes/sequential-id-generator.js";
export { InMemoryPersistence } from "./fakes/in-memory-persistence.js";
export { FakeRealtime } from "./fakes/fake-realtime.js";
export { InMemoryRateLimiter, InMemoryRateLimiter as FakeRateLimiter } from "./fakes/fake-rate-limiter.js";
export { FakeAuthProvider } from "./fakes/fake-auth-provider.js";
export { FakeIssueTracker } from "./fakes/fake-issue-tracker.js";
export { FakeExporter } from "./fakes/fake-exporter.js";
export { FakeCryptoVault } from "./fakes/fake-crypto-vault.js";
export { FakeLogger } from "./fakes/fake-logger.js";
