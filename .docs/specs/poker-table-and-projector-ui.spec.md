# Spec: `poker-table-and-projector-ui` — Voting table, suit toggle, reveal, queue, host tools, timer, and projector mode

## Traceability & Scope

| Attribute | Value |
| :--- | :--- |
| **Slug** | `poker-table-and-projector-ui` |
| **Release** | `R1` |
| **Priority** | `M` (projector `RF-27` is `S`) |
| **Dependencies** | `api-and-room-entry-ui`, `domain-scales-and-stats` (labels), `.docs/ui-ux.md` |
| **Requirements** | `RF-22`, `RF-27`, `RF-30`–`RF-33`, `RF-40`–`RF-49`, `RF-51`, `RF-52`, `RF-54`, `RF-55`, `RNF-06`–`RNF-11`, juice addendum |
| **App** | `apps/web` feature `planning` |

### Perspectives

- **SA:** The table renders `RoomView` only. It never computes mean or suit divergence locally. Commands go through the API use cases.
- **UX:** Mobile-first sticky deck, one extra tap for suit, reveal readable without color alone, projector route for a 1920×1080 screen with type at least 48px and a QR that does not take a seat.
- **TA:** CSS Modules and tokens from `web-pwa-shell`. Custom SVG for nothing heavy here except the QR already specified. Motion respects `prefers-reduced-motion`. Bundle for the room route stays ≤ 150 KB gzip.

---

## Functionalities & Core Capabilities

1. **Presence list.** Up to 30 seats. Each seat shows nickname, informational role, mode, text `Online` or `Offline`, text `Votou` or `Aguardando`, and `AFK` when set. Current user is marked in text, not only by color.
2. **Deck.** One button per active Fibonacci card, minimum 44×44px, `aria-pressed` for the selected card. Specials `?`, `Coringa`, and an AFK control. Observer sees the table and no deck.
3. **Suit toggle.** One control, one tap cycles or opens a five-option set: Paus Alto, Copas Médio, Espadas Baixo, Ouros Insignificante, Coringa. The chosen suit shows symbol plus the word. No suit selected means Coringa on the suit axis. If the room turned the axis off, the control is absent.
4. **Voting actions.** Select card, change selection, retract. Disabled with an explanation when the round is revealed.
5. **Reveal.** Button visible to host and facilitator. On reveal, cards flip in sequence capped at 450ms total. Reduced motion uses a cross-fade under 200ms. One `aria-live=polite` announcement summarizes the result (mean if `showAverage`, median, consensus or suit-divergence sentence).
6. **Result banner.** Mean (hidden if `showAverage` is false), median, mode, min, max, consensus badge, near-consensus badge, extremes called out in text, suit distribution, and a divergence banner when `suitDivergence` is true even if points match. `?` votes listed as doubts.
7. **New round and final estimate.** Facilitator controls. Final estimate is a scale picker and may differ from the mean. Confirmation text states the chosen card.
8. **Queue drawer.** Current item highlighted. Add form (title, description, http(s) link, optional figure tag). Import modal: paste text or CSV, preview rows, per-line errors, confirm. Reorder by drag and by up/down buttons that are keyboard accessible and announced. Skip and defer. Estimated items show their final card.
9. **Host settings and timer.** Scale subset, suit on/off and label, auto-reveal, show average, timer length. Copy explains that "who votes" changes apply next round. Timer uses `serverTime` offset. Last 10 seconds get a text state `Últimos 10 segundos`. At `00:00`, a polite live message and an optional chime that is muteable. Timer does not reveal.
10. **Projector `/r/:code/screen`.** Read-only, no deck, no permissions, does not join as a participant (API viewer kind `screen`). Large type ≥ 48px for the current item and result, persistent QR, high contrast. Leak rule: while voting, the screen shows `hasVoted` only.

---

## Use Cases & Scenarios

### UC-1 — Three people vote and reveal

**Given** host, voter, and observer in three Playwright contexts, **when** host and voter vote and host reveals, **then** both see cards and stats, the observer never had a deck, and the network log for the voter before reveal does not contain the host's card. Suit divergence `[5♣, 5♠]` shows the banner with the words Alto and Baixo.

### UC-2 — Queue of 50 and keyboard reorder

**Given** a 50-line paste, **when** import is confirmed, **then** 50 items appear in order. **When** the user moves item 3 up with the keyboard, **then** the live region announces the new position. An external link renders with `rel=noopener noreferrer` and rejects non-http(s).

### UC-3 — Projector does not consume a seat

**Given** 30 participants, **when** a browser opens `/screen`, **then** the room stays open and the screen renders. **When** a 31st human joins, **then** they still get `ROOM_FULL`. While voting, the screen HTML contains no other person's card value.

### UC-4 — Reduced motion and average hidden

**Given** `prefers-reduced-motion: reduce`, **when** reveal happens, **then** no 3D flip animation class is applied. **Given** `showAverage` off, **then** the mean number is not in the DOM.

---

## Interface Contracts (Inputs, Outputs & Error Codes)

Components receive `RoomView` and callbacks `castVote(card, suit, clientOpId)`, `retract`, `reveal`, `newRound`, `setEstimate`, `addItem`, `importItems`, `reorder`, `skip`, `defer`, `patchSettings`, `startTimer`. They do not call repositories.

Query keys and mutation invalidation: on `vote.changed`, patch `hasVoted` if version is contiguous; otherwise refetch snapshot.

---

## Flow & states

Table regions, only one modal at a time: queue drawer, import preview, settings sheet, final-estimate picker, QR. Opening a second closes the first.

Round UI states: `voting-empty`, `voting-own-card`, `revealed`, `estimated`. AFK replaces the deck with "Você está ausente" and a return button.

Timer states: `off`, `running`, `last10`, `elapsed`. Elapsed does not change round status.

Projector states: `waiting`, `voting`, `revealed`. No settings controls.

---

## Technical design / how-to

1. Feature folder `apps/web/src/features/planning/` with `Table`, `SeatList`, `Deck`, `SuitToggle`, `ResultBanner`, `QueueDrawer`, `ImportDialog`, `SettingsSheet`, `Timer`, `Projector`.
2. CSS Modules consume tokens (`--touch-min: 44px`, suit colors plus a pattern or prefix so color is redundant). Projector uses a separate module with `--text-display: 48px`.
3. Reveal choreography: CSS, capped at 450ms, disabled under `prefers-reduced-motion`.
4. Drag reorder is pointer-only enhancement. Up/down buttons are the accessible path and call the same reorder mutation.
5. Do not add a chart library or a component kit. Keep the room route under the gzip budget; lazy-load the import parser preview if needed.
6. i18n every string, including `aria-label` patterns like "5 pontos, Paus, Risco Alto".
7. E2E covers the three-browser reveal, network leak assertion, keyboard reorder, projector seat count, axe at 360, 1280, and 1920, both themes.

---

## Files to touch

- `apps/web/src/features/planning/Table.tsx`
- `apps/web/src/features/planning/Deck.tsx`
- `apps/web/src/features/planning/SuitToggle.tsx`
- `apps/web/src/features/planning/ResultBanner.tsx`
- `apps/web/src/features/planning/QueueDrawer.tsx`
- `apps/web/src/features/planning/ImportDialog.tsx`
- `apps/web/src/features/planning/SettingsSheet.tsx`
- `apps/web/src/features/planning/Timer.tsx`
- `apps/web/src/routes/r.$code.tsx`
- `apps/web/src/routes/r.$code.screen.tsx`
- `apps/web/src/features/planning/*.module.css`
- `apps/web/e2e/table.spec.ts`
- `apps/web/e2e/projector.spec.ts`
- `docs/a11y/R1.md` (manual screen-reader script checklist, results filled at release gate)

---

## Acceptance Criteria & TDD Plan (`QA-red` → `SE-green` → `QA-verify`)

| Given | When | Then |
| :--- | :--- | :--- |
| Observer | render table | no deck |
| `showAverage` false | revealed | mean absent |
| 5♣ and 5♠ | revealed | divergence banner with text labels |
| 360px | deck | targets ≥ 44px, no horizontal scroll |
| Reveal | live region | polite announcement |
| 50-line import | confirm | 50 items in order |
| Keyboard up | reorder | announced move |
| 30 humans + screen | open screen | not `ROOM_FULL`; 31st human is |
| Screen while voting | DOM | no foreign card values |
| Reduced motion | reveal | no flip animation |
| Network of B | before reveal | A's card absent |
| axe both themes | 360 and 1280 | no serious/critical issues |

**QA-red:** component tests for banner flags and one e2e skeleton. **SE-green:** UI. **QA-verify:** leak, axe, and bundle budget.
