# Community 4

> 59 nodes · cohesion 0.08

## Key Concepts

- **AppError** (298 connections) — `packages/domain/src/shared/app-error.ts`
- **Result** (297 connections) — `packages/domain/src/shared/result.ts`
- **AuthProvider** (25 connections) — `packages/application/src/ports/auth-provider.port.ts`
- **suspend-user.ts** (17 connections) — `packages/application/src/use-cases/identity/suspend-user.ts`
- **fake-crypto-vault.ts** (12 connections) — `packages/testing/src/fakes/fake-crypto-vault.ts`
- **auth-provider.port.ts** (11 connections) — `packages/application/src/ports/auth-provider.port.ts`
- **purge-expired-rooms.ts** (10 connections) — `packages/application/src/use-cases/rooms/purge-expired-rooms.ts`
- **RoomView** (9 connections) — `packages/domain/src/room/room.test.ts`
- **.execute()** (8 connections) — `packages/application/src/use-cases/identity/send-magic-link.ts`
- **.execute()** (8 connections) — `packages/application/src/use-cases/identity/suspend-user.ts`
- **.decrypt()** (7 connections) — `packages/testing/src/fakes/fake-crypto-vault.ts`
- **.revokeUserSessions()** (6 connections) — `packages/application/src/ports/auth-provider.port.ts`
- **CryptoVault** (6 connections) — `packages/application/src/ports/crypto-vault.port.ts`
- **.execute()** (6 connections) — `packages/application/src/use-cases/identity/complete-sign-in.ts`
- **RolledBack** (5 connections) — `packages/adapter-persistence-postgres/src/postgres-persistence.ts`
- **crypto-vault.port.ts** (5 connections) — `packages/application/src/ports/crypto-vault.port.ts`
- **FakeCryptoVault** (5 connections) — `packages/testing/src/fakes/fake-crypto-vault.ts`
- **.encrypt()** (5 connections) — `packages/testing/src/fakes/fake-crypto-vault.ts`
- **.sendMagicLink()** (4 connections) — `packages/application/src/ports/auth-provider.port.ts`
- **.verifyMagicLink()** (4 connections) — `packages/application/src/ports/auth-provider.port.ts`
- **.ping()** (4 connections) — `packages/application/src/ports/persistence.port.ts`
- **.execute()** (4 connections) — `packages/application/src/use-cases/items/item-commands.ts`
- **.execute()** (4 connections) — `packages/application/src/use-cases/items/item-commands.ts`
- **.execute()** (4 connections) — `packages/application/src/use-cases/items/item-commands.ts`
- **.execute()** (4 connections) — `packages/application/src/use-cases/voting/voting-commands.ts`
- *... and 34 more nodes in this community*

## Relationships

- [Community 8](Community_8.md) (76 shared connections)
- [Community 11](Community_11.md) (73 shared connections)
- [Community 10](Community_10.md) (37 shared connections)
- [Community 14](Community_14.md) (36 shared connections)
- [Community 5](Community_5.md) (29 shared connections)
- [Community 16](Community_16.md) (28 shared connections)
- [Community 31](Community_31.md) (26 shared connections)
- [Community 32](Community_32.md) (26 shared connections)
- [Community 38](Community_38.md) (25 shared connections)
- [Community 2](Community_2.md) (21 shared connections)
- [Community 30](Community_30.md) (21 shared connections)
- [Community 46](Community_46.md) (16 shared connections)

## Source Files

- `packages/adapter-auth-devfake/src/dev-fake-auth-provider.ts`
- `packages/adapter-persistence-postgres/src/postgres-persistence.ts`
- `packages/application/src/ports/auth-provider.port.ts`
- `packages/application/src/ports/crypto-vault.port.ts`
- `packages/application/src/ports/issue-tracker.port.ts`
- `packages/application/src/ports/persistence.port.ts`
- `packages/application/src/use-cases/identity/complete-sign-in.ts`
- `packages/application/src/use-cases/identity/send-magic-link.ts`
- `packages/application/src/use-cases/identity/suspend-user.ts`
- `packages/application/src/use-cases/items/item-commands.ts`
- `packages/application/src/use-cases/rooms/purge-expired-rooms.ts`
- `packages/application/src/use-cases/voting/voting-commands.ts`
- `packages/domain/src/planning/planning-table.test.ts`
- `packages/domain/src/room/room.test.ts`
- `packages/domain/src/shared/app-error.ts`
- `packages/domain/src/shared/result.ts`
- `packages/testing/src/fakes/fake-crypto-vault.ts`

## Audit Trail

- EXTRACTED: 732 (99%)
- INFERRED: 7 (1%)
- AMBIGUOUS: 0 (0%)

---

*Part of the graphify knowledge wiki. See [index](index.md) to navigate.*