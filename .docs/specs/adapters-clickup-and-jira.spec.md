# Spec: `adapters-clickup-and-jira` — Read-only ClickUp and Jira imports with encrypted team credentials

## Traceability & Scope

| Attribute | Value |
| :--- | :--- |
| **Slug** | `adapters-clickup-and-jira` |
| **Release** | `R4` |
| **Priority** | `S` |
| **Dependencies** | `adapters-r1-infrastructure` (manual tracker and AES vault), `api-and-room-entry-ui` (import UI hook) |
| **Requirements** | `RF-91`, `RF-92`, `RNF-20`, `RNF-26` |
| **Out of scope** | Writing the estimate back (`RF-93`) and any other tracker (`RF-94`). Those stay post-MVP. |

### Perspectives

- **SA:** Both adapters implement `IssueTracker.importItems` only. `writeEstimate` is absent. The use case `ImportItems` already creates domain items; adapters return `ExternalItem[]`.
- **UX:** Team settings store a token once. The import modal in the queue lets the facilitator filter and preview before adding rows. Failures are translated and never echo the token.
- **TA:** Tokens encrypted with AES-256-GCM in `adapter-system` before they touch Postgres. Decrypt only inside the adapter process. Free-tier HTTP from the server to ClickUp and Jira public REST APIs. No browser call to those APIs.

---

## Functionalities & Core Capabilities

1. **Credential record.** Per team and provider (`clickup` | `jira`): ciphertext, nonce, key version, optional site URL (Jira), optional workspace/list id (ClickUp). Plaintext token is accepted once on write and is not returned on read. API responses expose `configured: true` and a last-four hint at most.
2. **`adapter-issuetracker-clickup`.** `kind = 'clickup'`. Reads tasks from a configured list or a filter the user typed (list id or a simple search string). Maps id, name, description, and URL into `ExternalItem`. Sprint points field, if present, is copied to a suggested estimate string and is not auto-applied as `finalEstimate`. Read methods only (`GET`). Timeouts and 401 become `ImportError` codes `PROVIDER_UNAVAILABLE` and `CREDENTIAL_INVALID`.
3. **`adapter-issuetracker-jira`.** `kind = 'jira'`. Reads issues with a bounded JQL (project key plus optional text), cloud REST. Same `ExternalItem` mapping. Same error codes. No write endpoint is called; a contract test fails if the fake server observes `POST`, `PUT`, or `DELETE`.
4. **Preview modal.** Facilitator opens import, chooses ClickUp, Jira, or the existing text/CSV tab. For a provider, they see a busy state, then a checklist of tasks with title and key. Confirm calls `ImportItems` with the selected external items only. One modal at a time, same rule as the queue drawer.
5. **Authorization.** Saving credentials requires `can(manageTeam)`. Importing into a room still requires host or facilitator. Tokens are team-scoped; another team's id in the body returns `NOT_FOUND` or `FORBIDDEN` without decrypting.
6. **Logs.** Errors log `provider`, `status`, `useCase`. They do not log the Authorization header, token, or ciphertext.

---

## Use Cases & Scenarios

### UC-1 — Save and round-trip encryption

**Given** a team admin submits a ClickUp token, **when** it is stored, **then** the database column is not equal to the token and a decrypt in the adapter yields the original. **When** the settings page reloads, **then** the token field is empty and `configured` is true.

### UC-2 — Preview and import without writes

**Given** a fake ClickUp server with three tasks, **when** the facilitator previews and selects two, **then** the room gains two items with `externalKey` and URL. The fake server's request log contains only `GET`. **When** the token is wrong, **then** the modal shows `CREDENTIAL_INVALID` and the queue is unchanged.

### UC-3 — Jira confirms the port

**Given** the same contract suite used for the manual tracker, **when** it runs against the Jira adapter with a fake HTTP server, **then** `importItems` returns external items and the domain use case, not the adapter, constructs `Item`. A second team cannot read the first team's ciphertext.

---

## Interface Contracts (Inputs, Outputs & Error Codes)

`IssueTracker.importItems` stays as specified in the ports spec. New `ImportError` codes: `CREDENTIAL_INVALID`, `PROVIDER_UNAVAILABLE`, `PROVIDER_RATE_LIMITED`. No `writeEstimate` method on these classes. If the port type still has an optional `writeEstimate`, these adapters omit it.

`SaveTrackerCredential` input: `{ teamId, provider, token, siteUrl? }`. Success: `{ configured: true }`. The token is wiped from the request log middleware.

Limits: preview returns at most 100 tasks. The room still enforces 500 items total.

---

## Flow & states

Settings: `unconfigured → saving → configured → revoking → unconfigured`. Revoke deletes the ciphertext.

Import modal: `choose-source → loading → preview → confirming → closed`. Error returns to `choose-source` or `preview` with a message and keeps previous room items. The modal cannot open on top of the final-estimate dialog; opening import closes other queue overlays first.

---

## Technical design / how-to

1. Packages `packages/adapter-issuetracker-clickup` and `packages/adapter-issuetracker-jira`. Each depends on `@fibonaipe/application` and receives `fetch`, `CryptoVault`, and `Clock` via the constructor. They do not import Postgres. The repository for credentials lives in `adapter-persistence-postgres` behind a small `TrackerCredentialStore` port added in `packages/application/src/ports/tracker-credentials.ts` so the HTTP adapters stay free of SQL.
2. AES-256-GCM: random 12-byte nonce per write, key from env `INTEGRATION_KEY` (32 bytes, base64). Never ship this key to the client. If the key is missing, credential routes return 503 and CSV import still works.
3. Migration `006_r4_tracker_credentials.sql`.
4. HTTP client: `fetch` with a 10s timeout, user-agent `fibonaipe`, no retry storm (one retry on 429 after `Retry-After` or 2s). Respect free-tier API quotas by capping preview at 100.
5. Fake servers in tests are in-process (undici `MockAgent` or a hand-rolled fetch mock). No live ClickUp calls in CI.
6. UI extends `ImportDialog` with provider tabs. Token forms live on team settings, not in the room, so a guest facilitator cannot see them.
7. Document in `docs/limits.md` the ClickUp and Jira free API limits the implementer verified, and that write-back is not in this release.

---

## Files to touch

- `packages/application/src/ports/tracker-credentials.ts`
- `packages/application/src/use-cases/integrations/save-tracker-credential.ts`
- `packages/application/src/use-cases/integrations/import-from-provider.ts`
- `packages/adapter-issuetracker-clickup/src/clickup-tracker.ts`
- `packages/adapter-issuetracker-jira/src/jira-tracker.ts`
- `packages/adapter-persistence-postgres/migrations/006_r4_tracker_credentials.sql`
- `packages/adapter-system/src/crypto-vault.ts`
- `apps/web/src/features/planning/ImportDialog.tsx`
- `apps/web/src/routes/teams.$id.settings.tsx`
- `packages/adapter-issuetracker-clickup/src/clickup-tracker.test.ts`
- `packages/adapter-issuetracker-jira/src/jira-tracker.test.ts`

---

## Acceptance Criteria & TDD Plan (`QA-red` → `SE-green` → `QA-verify`)

| Given | When | Then |
| :--- | :--- | :--- |
| Token saved | read database | ciphertext ≠ token; decrypt matches |
| Settings reload | GET credential | no plaintext token |
| Fake ClickUp, select 2 of 3 | import | 2 items; server saw GET only |
| HTTP 401 | preview | `CREDENTIAL_INVALID`, queue unchanged |
| Jira adapter | contract suite | passes against fake server |
| Jira fake | any import | zero POST/PUT/DELETE |
| Other team's id | read credential | `FORBIDDEN` or `NOT_FOUND` |
| Logs on failure | scan | no token or Authorization value |
| Missing `INTEGRATION_KEY` | save | 503; CSV import still works |
| Guest | team settings | route denied |

**QA-red:** fake-server tests assert method list and error mapping. **SE-green:** adapters, vault, modal. **QA-verify:** contract suite green and a log redaction test.
