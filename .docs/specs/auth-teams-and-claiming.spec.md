# Spec: `auth-teams-and-claiming` — Magic link and Google auth, teams, invites, room claim, persistent team rooms, SuperAdmin, and account deletion

## Traceability & Scope

| Attribute | Value |
| :--- | :--- |
| **Slug** | `auth-teams-and-claiming` |
| **Release** | `R2` |
| **Priority** | `M` (`RF-12` and `RF-13` are `S`, `RF-14` is `C`) |
| **Dependencies** | `api-and-room-entry-ui`, `domain-policy-and-room` |
| **Requirements** | `RF-03`–`RF-05`, `RF-10`–`RF-14`, `RF-26`, `RNF-13`, `RNF-14`, `RNF-26` (session side) |
| **Packages** | domain aggregates, application use cases, `adapter-auth-supabase`, Postgres migrations, `apps/web` screens |

### Perspectives

- **SA:** Login creates `User` on first success. Team roles use the existing `can` matrix. Guest rooms stay ephemeral until `ClaimRoom` with a valid host token.
- **UX:** Asking for a magic link always shows the same confirmation, whether or not the email exists. Suspended users see `ACCOUNT_SUSPENDED`. Deleting an account asks the user to retype the email.
- **TA:** Auth provider behind `AuthProvider`. Supabase Auth or an equivalent free-tier magic-link plus Google OAuth. Sessions slide 7 days. Invite links last 7 days. One implicit `Organization` row in the MVP, no organization screen.

---

## Functionalities & Core Capabilities

1. **`AuthProvider` adapter.** `sendMagicLink`, `startGoogleSignIn`, `completeSignIn`, `getIdentity`, `signOut`, `deleteIdentity`. Email is stored lowercased. Expired or reused link → `AUTH_LINK_INVALID`. Response to "send link" is identical if the account is missing (no enumeration). Limits: 5 links per hour per email, 20 per hour per IP. Suspended user → `ACCOUNT_SUSPENDED` at completion, not at send time.
2. **User.** `id`, `email`, `displayName`, `status` (`active` | `suspended`), `isSuperAdmin`, `locale`, `theme`. SuperAdmin emails come from env `SUPERADMIN_EMAILS` at login, not from a client flag.
3. **Team and membership.** `CreateTeam` makes the creator `TeamAdmin`. `CreateInvite` issues a link with a preset role, 7-day expiry, revocable. `AcceptInvite` adds membership. A person may belong to several teams (`RF-12`). `ChangeMemberRole` and `RemoveMember` require `can(manageTeam)`. Removing or demoting the last admin returns `LAST_ADMIN`.
4. **`LinkGuestToAccount`.** Binds the current `guestSessionId` to `userId` and keeps participant rows.
5. **`ClaimRoom`.** Logged-in host with the raw host token (hashed compare) sets `kind` from `guest` to `team` or attaches `teamId`. The room stops expiring. Items already estimated are kept for the history spec to record. Invalid token → `FORBIDDEN`.
6. **Persistent team rooms.** `CreateTeamRoom` requires `can(createTeamRoom)`. Members join with their team role and still pick voter or observer. `allowGuests` defaults on. Team rooms have no TTL.
7. **SuperAdmin `/admin`.** List teams and users, suspend and reactivate, usage counts (active rooms, participants, teams) without nicknames or votes. Non-admins receive 403 on every `/admin` route and API. Suspend invalidates sessions.
8. **`DeleteAccount`.** Removes user, memberships, auth identity, and preferences. History authorship becomes the label key `participant.removed`. If the user is the only admin of a team that still has other members, `LAST_ADMIN`. If the team has no other members, the team is deleted with the account. Privacy page and short usage notice in i18n, naming the product and the 60-minute guest retention.
9. **Preferences.** Locale and theme saved on the user. On login, the account value overwrites `localStorage`.

Organization: a single row created by migration. Teams reference it. No UI.

---

## Use Cases & Scenarios

### UC-1 — Magic link without enumeration

**Given** an unknown email and a known email, **when** each requests a link, **then** the HTTP body and status match. **When** the link is opened twice, **then** the second attempt is `AUTH_LINK_INVALID`. **When** the user is suspended, **then** completion returns `ACCOUNT_SUSPENDED` and no session cookie.

### UC-2 — Invite and last admin

**Given** an admin invite, **when** a second user accepts, **then** they are on the team with the preset role. **When** the only admin tries to leave or self-demote, **then** `LAST_ADMIN`. **When** a member of team B uses team A's id in the URL, **then** 404 or 403 and no data (IDOR test).

### UC-3 — Claim an active guest room

**Given** a guest room with two estimated items and a valid host token, **when** the creator logs in and claims it for their team, **then** `expiresAt` is cleared, `teamId` is set, and the items remain. **When** the token is wrong, **then** `FORBIDDEN` and the room stays ephemeral.

### UC-4 — Delete account

**Given** the user retypes their email, **when** delete runs, **then** auth identity and memberships are gone and a database scan finds no remaining email. **Given** they are the sole admin beside other members, **then** delete is refused until they promote someone.

---

## Interface Contracts (Inputs, Outputs & Error Codes)

New codes already in the enum: `LAST_ADMIN`, `AUTH_LINK_INVALID`, `ACCOUNT_SUSPENDED`.

HTTP: auth routes under `/api/auth/*`, teams under `/api/teams/*`, admin under `/api/admin/*`. Same Origin rule and error shape as R1.

`ClaimRoom` input: `{ roomCode, hostToken, teamId }`. Success: `{ roomId, teamId }`.

---

## Flow & states

Auth screens: `signed-out → link-sent → signed-in` and `signed-out → google-redirect → signed-in`. `link-sent` is the same component for new and existing emails.

Team switcher: one active team id in the session. Changing it refetches team-scoped queries.

Admin suspend: user status flips to `suspended`, session row deleted, next request is `ACCOUNT_SUSPENDED`.

Delete confirmation is a single modal. It closes on success and returns home signed out. It does not stack on the invite modal.

---

## Technical design / how-to

1. Domain: `packages/domain/src/identity/user.ts`, `team.ts`, `membership.ts`, `invite.ts` with builders. Invariants `LAST_ADMIN` and invite expiry checked in the aggregate using the injected `now`.
2. Use cases in `packages/application/src/use-cases/identity/` and `teams/`.
3. Migrations `002_r2_identity.sql`: `organizations`, `users`, `teams`, `memberships`, `invites`. Still no per-person vote history table.
4. `adapter-auth-supabase` implements the port. A fake in `@fibonaipe/testing` satisfies the same contract tests (expired link, reuse, normalization).
5. Composition root gains `auth` when env has the provider keys. Without keys, login routes return 503 and guest rooms still work (R1 remains usable on a free deploy that has not configured email yet).
6. UI routes: `/login`, `/teams`, `/teams/:id`, `/admin`, `/privacy`. TanStack Query keys include `teamId`.
7. Authorization e2e or HTTP table: each new route × SuperAdmin, TeamAdmin, PM, PO, Dev, QA, Observer, guest, anonymous, other-team user. The test fails if a route has no row.

---

## Files to touch

- `packages/domain/src/identity/*.ts`
- `packages/application/src/use-cases/identity/*.ts`
- `packages/application/src/use-cases/teams/*.ts`
- `packages/adapter-auth-supabase/src/auth-provider.ts`
- `packages/adapter-persistence-postgres/migrations/002_r2_identity.sql`
- `packages/testing/src/fakes/fake-auth-provider.ts`
- `apps/web/src/routes/login.tsx`
- `apps/web/src/routes/teams.tsx`
- `apps/web/src/routes/admin.tsx`
- `apps/web/src/routes/privacy.tsx`
- `apps/web/e2e/authz.spec.ts`

---

## Acceptance Criteria & TDD Plan (`QA-red` → `SE-green` → `QA-verify`)

| Given | When | Then |
| :--- | :--- | :--- |
| Unknown and known email | send link | identical responses |
| Reused link | complete | `AUTH_LINK_INVALID` |
| Suspended user | complete | `ACCOUNT_SUSPENDED` |
| Last admin demotes self | change role | `LAST_ADMIN` |
| Expired invite | accept | `NOT_FOUND` |
| Valid host token | claim | room no longer expires |
| Invalid host token | claim | `FORBIDDEN` |
| Non-admin | `GET /api/admin/users` | 403 |
| Delete last admin with other members | delete | refused |
| Delete sole member team | delete | user and team gone, email absent |
| Account locale `en-US`, local `pt-BR` | login | UI uses `en-US` |

**QA-red:** contract tests for auth fake and last-admin unit tests. **SE-green:** use cases, migration, screens. **QA-verify:** IDOR table green.
