# Spec: Integrations and auth

Requirements: RF-03 to RF-05, RF-31, RF-63, RF-90 to RF-94, RNF-12, RNF-26.

## Issue trackers (`IssueTracker` port)

The port is tracker-agnostic: `importItems(...)` returns candidate items, and `writeEstimate` is reserved for post-MVP (RF-93). New trackers are new `adapter-issuetracker-*` packages and never touch the domain (RF-94).

| Adapter | Release | Notes |
| :--- | :---: | :--- |
| `adapter-issuetracker-manual` | R1 | Free text (one trimmed non-empty line per title) and RFC 4180 CSV. |
| `adapter-issuetracker-clickup` | R4 | ClickUp REST v2, read-only. Maps external key, title, description, URL and the Sprint Points custom field. |
| `adapter-issuetracker-jira` | R4 | Jira Cloud REST/JQL, read-only. |

### Manual and CSV import behavior

- Input fields are `rawText` or `csvContent`. The delimiter is auto-detected (`,` or `;`) when omitted. A leading BOM is accepted; localized headers are recognized.
- One leading `-`, `*` or `1.` list marker is stripped from a text line. Control characters are removed. Blank lines are ignored.
- A CSV without a title column returns `MISSING_TITLE_COLUMN` (`errors.MISSING_TITLE_COLUMN`; it is not an `AppErrorCode` member). More than 500 lines or 1,000,000 UTF-8 bytes returns `LIMIT_EXCEEDED`, checked before title length validation. CSV row breaks are `\n` or `\r\n`.
- The import preview validates row by row before commit (max 500 items per room).

### Credentials (RNF-26)

Tracker tokens are stored per team, encrypted at rest with AES-256-GCM (unique 96-bit IV and 128-bit auth tag per record) through the `CryptoVault` port in `adapter-system`, keyed by `INTEGRATION_KEY`. They are never serialized to client responses. Scope is the minimum needed for read-only import. Security tests assert both properties.

## Export (`Exporter` port, `adapter-exporter-csvjson`)

- CSV is UTF-8 with BOM. Any cell starting with `=`, `+`, `-`, `@`, tab or carriage return is prefixed with a single quote (formula-injection protection, RNF-12). Null cells are empty fields. Simple cells are not double-quoted.
- JSON export sorts keys recursively and pretty-prints with two spaces. The `content` field is the JSON text of `data`.
- Used for the ephemeral room summary (RF-64), the filtered team history (RF-63) and dashboard datasets (RF-86).

## Authentication (`AuthProvider` port)

- Release 2 target: Supabase Auth with Magic Link and Google OAuth (`adapter-auth-supabase`, pending), plus the guest cookie session.
- Today, `adapter-auth-devfake` and `FakeAuthProvider` stand in. The dev fake login at `/dev/login` is enabled by the Vite dev server and is ignored when `NODE_ENV=production`. Without provider keys the app stays on the unavailable auth driver.
- Revoked sessions return `AUTH_LINK_INVALID`. The deterministic fake Google identity email is `google.user@example.com`. Magic-link and OAuth tokens are observed through the contract harness (`latestMagicLinkToken`, `latestGoogleCode`, `latestSessionToken`, `suspendCurrentUser`), not through `AuthProvider`.
- Sessions for accounts: planned sliding 7-day session. Invites last 7 days and are revocable. SuperAdmin emails come from `SUPERADMIN_EMAILS` (lowercased at login).
- Account deletion (RF-05) revokes the session, removes personal data and keeps team aggregated history.

## Locked decisions

- Adapter infrastructure tests call the issue-tracker port with `rawText` or `csvContent` and an omitted delimiter.
- The logger drops nickname, email, token, card, suit and comment at any depth.
- A timestamp exactly `windowSeconds` old is still inside the rate-limit window (the `older than` check is strict).
- `SequentialIdGenerator` room-code successors after `23456789`, and the ULID counter radix after `01J00000000000000000000002`, are not specified; only alphabet, length, uniqueness and `reset` are locked.
