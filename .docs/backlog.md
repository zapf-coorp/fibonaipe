# Backlog

Open questions found while writing contract tests. Each item records the stricter reading the tests enforce.

- Persistence has no `Clock`. A locked update stores the caller-supplied `lastActivityAt` and version `previousCommittedVersion + 1`. The first insert stores the caller-supplied `version` so a room can be seeded at version 1 or 5. `Room.version` is not taken from the value the callback wrote on an update.
- Guest versus team rooms use `kind: "guest" | "team"` and `teamId: null` for guests. `deleteExpiredAnonymous` removes guest rooms with `expiresAt <= before` and keeps guests with a later or null `expiresAt`, plus every team room.
- Missing `findById` / `findByCode` / history `findById` results are `null`. Edits to the object returned inside a transaction are committed only when `save` runs and the callback returns `ok`.
- `hasProcessed(actorId, clientOpId, now)` does not expire records. The pair is not scoped by room. A second `record` of the same pair stays a single processed op and does not change `Room.version` when the room is not saved.
- `onVersionGap` receives one object `{ roomId, expectedVersion, receivedVersion }`. `subscribe` has no `sinceVersion`; a client starts at version 0 and emits `connected` immediately. Connection state is `{ status, pendingOpCount, lastSyncedVersion }` and `pendingOpCount` stays 0 because this port has no local-op queue. `round.revealed` fixtures use `{ roundId }` and must not carry card, suit, comment, or vote fields.
- Thrown transaction defects propagate after rollback. `err` results are returned, not thrown.
- CSV row breaks are `\n` or `\r\n`. Null cells are empty fields. Simple cells are not double-quoted; formula protection is a leading single quote. A timestamp exactly `windowSeconds` old is still inside the rate-limit window (`older than` is strict). JSON `content` is the JSON text of `data`.
- Manual text import is one trimmed non-empty line per title. Blank lines are ignored. List-marker stripping and localized CSV headers are not asserted. The deterministic Google identity email is `google.user@example.com`. Revoked sessions use `AUTH_LINK_INVALID`. Magic-link and OAuth tokens are observed through the auth contract harness (`latestMagicLinkToken`, `latestGoogleCode`, `latestSessionToken`, `suspendCurrentUser`), not through `AuthProvider`.
- `SequentialIdGenerator` room-code successors after `23456789`, and ULID counter radix after `01J00000000000000000000002`, are not specified and are not locked beyond alphabet, length, uniqueness, and `reset`.
- InMemoryPersistence patches only records written in the transaction onto the latest committed store. Replacing the whole opening snapshot would erase another room that committed while this room lock was held.
