# Agent notes

Fibonaipe is an npm workspaces monorepo. Dependency direction is `domain` ← `application` ← `adapters` ← `apps/web`.

`packages/domain` has zero runtime dependencies and must not call `Date.now`, `new Date()`, `Math.random`, or `process.env`. Pass time, ids, and randomness in from the outside.

Expected errors use `Result` and `AppError`. Aggregates are built with builders.

The gate is `npm run verify`.
