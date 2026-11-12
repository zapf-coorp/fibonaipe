# T6 — Data Linking & Room Claiming (Guest ↔ Account ↔ Room ↔ Team)

**Status:** TODO  
**Depends on:** T5  
**Max files to touch:** 4 (`apps/web/src/server/routes/rooms.ts`, `packages/application/src/use-cases/rooms/join-room.ts`, `apps/web/src/client/pages/RoomPage.tsx`, `apps/web/src/client/i18n/locales/pt-BR.json`)

## Goal

Connect the already-implemented domain/application use cases `ClaimRoom` and `LinkGuestToAccount` to HTTP endpoints and the Room UI, and ensure authenticated users who join or create rooms have their `userId` and `teamId` linked and persisted.

## Step-by-Step Instructions

### 1. Expose Claim & Link Endpoints in `apps/web/src/server/routes/rooms.ts`

1. Import `ClaimRoom` and `LinkGuestToAccount` from `@fibonaipe/application`.
2. Add `POST /api/rooms/:code/claim`:
   ```ts
   const claimSchema = z.object({
     teamId: z.string().trim().min(1).max(64),
   });

   app.post("/api/rooms/:code/claim", async (c) => {
     const user = await accountUser(c, container);
     if (!user) return fail(container, createAppError("FORBIDDEN"));
     const hostToken = readSessionToken(c.req.header("cookie"));
     if (!hostToken) return fail(container, createAppError("FORBIDDEN"));
     const parsed = await parseBody(c, claimSchema);
     if (!parsed.ok) return fail(container, parsed.error);
     const claimed = await new ClaimRoom(useCases.deps).execute({
       roomCode: c.req.param("code"),
       hostToken,
       teamId: parsed.value.teamId,
     });
     if (!claimed.ok) return fail(container, claimed.error);
     return ok(container, claimed.value);
   });
   ```
3. Add `POST /api/rooms/:code/link-account`:
   ```ts
   app.post("/api/rooms/:code/link-account", async (c) => {
     const user = await accountUser(c, container);
     if (!user) return fail(container, createAppError("FORBIDDEN"));
     const sessionToken = readSessionToken(c.req.header("cookie"));
     if (!sessionToken) return fail(container, createAppError("FORBIDDEN"));
     const linked = await new LinkGuestToAccount(useCases.deps).execute({
       roomCode: c.req.param("code"),
       sessionToken,
       userId: user.id,
     });
     if (!linked.ok) return fail(container, linked.error);
     return ok(container, linked.value);
   });
   ```

### 2. Link Authenticated User on Join (`JoinRoom`)

1. Inspect `packages/application/src/use-cases/rooms/join-room.ts`. If `JoinRoomInput` does not yet accept `readonly userId?: string | null`, add it as an optional field and pass it when building `Participant.create({ ..., userId })`.
2. In `apps/web/src/server/routes/rooms.ts` (`POST /api/rooms/:code/join`), check `const account = await accountUser(c, container);` and pass `userId: account?.id ?? null` to `useCases.joinRoom.execute(...)`.

### 3. Add UI Trigger in `apps/web/src/client/pages/RoomPage.tsx`

1. When the room is loaded and the user has an authenticated session (`/api/auth/me` returns a non-null `user`):
   - Automatically call `POST /api/rooms/${code}/link-account` once to bind their guest seat to their `userId`.
   - If the room is a guest room and the viewer is the Host (`actorCreatedRoom` / `isHost`), and the user belongs to at least one team (`/api/teams`), display a compact "Vincular sala ao time" (`ClaimRoom`) control in the room header/settings allowing the host to convert the ephemeral room into a persistent team room.
2. Add any new translation keys exclusively to `apps/web/src/client/i18n/locales/pt-BR.json`.

### 4. Write Integration Tests

Add tests in `apps/web/test` verifying:
- `POST /api/rooms/:code/claim` converts a guest room to `kind: "team"` and clears `expiresAt`.
- `POST /api/rooms/:code/link-account` links the participant seat to the authenticated `userId`.

## Verification

Run:
```sh
npm run lint
npm run typecheck
npm run check:i18n
npx vitest run
```
