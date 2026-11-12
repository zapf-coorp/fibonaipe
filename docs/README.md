# Fibonaipe documentation

Single entry point. PRDs say what and why; specs say how. Requirement IDs (`RF-*`, `RNF-*`, `INV-*`) are stable and cross-referenced.

## PRDs (product requirements)

| Document | Contents |
| :--- | :--- |
| [prd/product.md](prd/product.md) | Vision, goals, product decisions, roles and the permission matrix. |
| [prd/functional-requirements.md](prd/functional-requirements.md) | RF-01 to RF-96 by area, with priority and release. |
| [prd/non-functional-requirements.md](prd/non-functional-requirements.md) | RNF-01 to RNF-26 and the operational limits. |
| [prd/roadmap.md](prd/roadmap.md) | Releases R0 to R4, exit gates, current status, pending work and risks. |

## Specs (technical)

| Document | Contents |
| :--- | :--- |
| [specs/architecture.md](specs/architecture.md) | Hexagonal layers, packages, ports, `Result`, Builders, ADRs, dependency policy. |
| [specs/domain.md](specs/domain.md) | Aggregates, invariants INV-01 to INV-14, formulas, policy and test-locked decisions. |
| [specs/api-and-realtime.md](specs/api-and-realtime.md) | REST endpoints, error envelopes, events, vote secrecy, versioned sync. |
| [specs/data-model.md](specs/data-model.md) | Tables, privacy guarantees, locking, RLS. |
| [specs/ui-ux.md](specs/ui-ux.md) | Tokens, layouts, components, charts, motion, accessibility and keyboard map. |
| [specs/integrations-and-auth.md](specs/integrations-and-auth.md) | Issue trackers, import and export rules, authentication, credentials. |
| [specs/operations.md](specs/operations.md) | `npm run verify`, running locally, environment variables, security, deployment and quotas. |

## Implementation Tasks (for Smaller LLMs)

| Document | Contents |
| :--- | :--- |
| [tasks/README.md](tasks/README.md) | Ordered micro-tasks (`T1`–`T9`) for production auth, persistence, data linking, and Clean Code modularization. |

## Where to look

| Question | Start at |
| :--- | :--- |
| What does the product do, and for whom? | [product](prd/product.md) |
| Is requirement RF-xx or RNF-xx in scope, and when? | [functional](prd/functional-requirements.md), [non-functional](prd/non-functional-requirements.md) |
| What is done and what is next? | [roadmap](prd/roadmap.md) |
| Which layer may import which? | [architecture](specs/architecture.md) |
| What is the exact rule or formula? | [domain](specs/domain.md) |
| How do I run, configure or verify the project? | [operations](specs/operations.md) |

For code questions, query the knowledge graph first (see [operations](specs/operations.md#knowledge-graph)).
