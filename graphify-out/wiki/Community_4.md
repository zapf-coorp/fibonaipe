# Community 4

> 72 nodes · cohesion 0.06

## Key Concepts

- **AppError** (298 connections) — `packages/domain/src/shared/app-error.ts`
- **Result** (297 connections) — `packages/domain/src/shared/result.ts`
- **send-magic-link.ts** (19 connections) — `packages/application/src/use-cases/identity/send-magic-link.ts`
- **suspend-user.ts** (17 connections) — `packages/application/src/use-cases/identity/suspend-user.ts`
- **rate-limiter.ts** (14 connections) — `packages/adapter-system/src/rate-limiter.ts`
- **fake-rate-limiter.ts** (13 connections) — `packages/testing/src/fakes/fake-rate-limiter.ts`
- **fake-crypto-vault.ts** (12 connections) — `packages/testing/src/fakes/fake-crypto-vault.ts`
- **auth-provider.port.ts** (11 connections) — `packages/application/src/ports/auth-provider.port.ts`
- **RoomView** (9 connections) — `packages/domain/src/room/room.test.ts`
- **.copy()** (9 connections) — `packages/domain/src/sprints/sprint.ts`
- **.hit()** (9 connections) — `packages/testing/src/fakes/fake-rate-limiter.ts`
- **rate-limiter.port.ts** (9 connections) — `packages/application/src/ports/rate-limiter.port.ts`
- **.activate()** (8 connections) — `packages/domain/src/sprints/sprint.ts`
- **.close()** (8 connections) — `packages/domain/src/sprints/sprint.ts`
- **.markDone()** (8 connections) — `packages/domain/src/sprints/sprint.ts`
- **.setCapacity()** (8 connections) — `packages/domain/src/sprints/sprint.ts`
- **.unlinkItem()** (8 connections) — `packages/domain/src/sprints/sprint.ts`
- **RateLimitRule** (7 connections) — `packages/application/src/ports/rate-limiter.port.ts`
- **.execute()** (7 connections) — `packages/application/src/use-cases/sprints/sprint-commands.ts`
- **.open()** (7 connections) — `packages/domain/src/planning/planning-table.ts`
- **.decrypt()** (7 connections) — `packages/testing/src/fakes/fake-crypto-vault.ts`
- **CryptoVault** (6 connections) — `packages/application/src/ports/crypto-vault.port.ts`
- **.execute()** (6 connections) — `packages/application/src/use-cases/identity/complete-sign-in.ts`
- **.execute()** (6 connections) — `packages/application/src/use-cases/sprints/sprint-commands.ts`
- **.execute()** (6 connections) — `packages/application/src/use-cases/sprints/sprint-commands.ts`
- *... and 47 more nodes in this community*

## Relationships

- [Community 8](Community_8.md) (155 shared connections)
- [Community 5](Community_5.md) (47 shared connections)
- [Community 10](Community_10.md) (40 shared connections)
- [Community 14](Community_14.md) (39 shared connections)
- [Community 31](Community_31.md) (35 shared connections)
- [Community 49](Community_49.md) (28 shared connections)
- [Community 9](Community_9.md) (22 shared connections)
- [Community 2](Community_2.md) (22 shared connections)
- [Community 30](Community_30.md) (21 shared connections)
- [Community 61](Community_61.md) (20 shared connections)
- [Community 11](Community_11.md) (18 shared connections)
- [Community 32](Community_32.md) (16 shared connections)

## Source Files

- `packages/adapter-auth-devfake/src/dev-fake-auth-provider.ts`
- `packages/adapter-persistence-sqlite/src/sqlite-persistence.ts`
- `packages/adapter-system/src/rate-limiter.ts`
- `packages/application/src/ports/auth-provider.port.ts`
- `packages/application/src/ports/crypto-vault.port.ts`
- `packages/application/src/ports/issue-tracker.port.ts`
- `packages/application/src/ports/rate-limiter.port.ts`
- `packages/application/src/use-cases/identity/complete-sign-in.ts`
- `packages/application/src/use-cases/identity/send-magic-link.ts`
- `packages/application/src/use-cases/identity/suspend-user.ts`
- `packages/application/src/use-cases/rooms/purge-expired-rooms.ts`
- `packages/application/src/use-cases/sprints/sprint-commands.ts`
- `packages/domain/src/planning/planning-table.test.ts`
- `packages/domain/src/planning/planning-table.ts`
- `packages/domain/src/room/room.test.ts`
- `packages/domain/src/shared/app-error.ts`
- `packages/domain/src/shared/result.ts`
- `packages/domain/src/sprints/sprint.ts`
- `packages/testing/src/fakes/fake-auth-provider.ts`
- `packages/testing/src/fakes/fake-crypto-vault.ts`

## Audit Trail

- EXTRACTED: 797 (99%)
- INFERRED: 12 (1%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [index](index.md) to navigate.*