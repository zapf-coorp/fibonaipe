# Agent notes

All project documentation, requirements and specs are indexed in [`docs/README.md`](docs/README.md). Start there.

Fibonaipe is an npm workspaces monorepo. Dependency direction is `domain` ← `application` ← `adapters` ← `apps/web`.

`packages/domain` has zero runtime dependencies and must not call `Date.now`, `new Date()`, `Math.random`, or `process.env`. Pass time, ids, and randomness in from the outside.

Expected errors use `Result` and `AppError`. Aggregates are built with builders.

The gate is `npm run verify`.

Query the graph by the feature symbol, such as `TasksModal` or `QueueDrawer`. `AppError` and `Result` are hubs on purpose, so they are a poor place to start. CSS is outside the graph: after a query names a component, read the `.module.css` beside that file.

New interface copy goes only in `apps/web/src/client/i18n/locales/pt-BR.json`. `en-US` and `es-ES` stay frozen until localization.
