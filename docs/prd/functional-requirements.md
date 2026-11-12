# PRD: Functional requirements

Priority is MoSCoW: **M** must, **S** should, **C** could. Release is the roadmap phase that delivers it (see [roadmap](roadmap.md)). Formulas and invariants live in [domain](../specs/domain.md).

## Access, identity and session

| ID | Requirement | Prio | Rel |
| :--- | :--- | :---: | :---: |
| RF-01 | **Quick guest entry.** Join with a nickname (1 to 30 chars, unique in the room, case-insensitive), informational role and mode (Voter or Observer), via direct link, 8-char code or QR Code. | M | R1 |
| RF-02 | **Transparent reconnection.** Same browser reconnects through a secure session cookie, keeping identity, host/facilitator permissions and the vote already cast in the active round. | M | R1 |
| RF-03 | **Passwordless and social login.** Magic Link by email and Google OAuth. | M | R2 |
| RF-04 | **Claim an active room.** The creator of an ephemeral room logs in during the session, links the room to a team and converts estimates into persistent history. | S | R2 |
| RF-05 | **Self-service account deletion (LGPD).** Delete own account and personal data after explicit confirmation; team aggregated history stays intact. | M | R2 |

## Teams, organizations and administration

| ID | Requirement | Prio | Rel |
| :--- | :--- | :---: | :---: |
| RF-10 | **Teams and invites.** Create teams; generate invite links valid 7 days, revocable, with a preset role. | M | R2 |
| RF-11 | **Team roles.** Assign, change and remove member roles per the permission matrix; every team keeps at least one Team Admin (`LAST_ADMIN`). | M | R2 |
| RF-12 | **Multiple teams per user.** One account in several teams, with switching. | S | R2 |
| RF-13 | **SuperAdmin panel** (`/admin`). List teams and users, suspend or reactivate accounts, see global operational metrics (active rooms, participants, teams). No access to votes or private content. | S | R2 |
| RF-14 | **Multi-organization model.** `Organization` groups `Teams`, with an implicit default organization in the MVP, so enterprise expansion needs no destructive migration. | C | R2 |

## Planning Poker rooms

| ID | Requirement | Prio | Rel |
| :--- | :--- | :---: | :---: |
| RF-20 | **Create a room.** Name, subset of Fibonacci cards, suit activation and meaning, facilitation rules; with or without login. | M | R1 |
| RF-21 | **Easy sharing.** Direct link (`/r/:code`), 8-char code without ambiguous characters (`0/O/1/I/L`) and a QR Code generated locally in the browser. | M | R1 |
| RF-22 | **Realtime presence.** Participant list with connection state (online/offline), role, mode (Voter/Observer/AFK) and a textual indicator of who has voted. | M | R1 |
| RF-23 | **Host and Facilitator management.** Manual host transfer, facilitator delegation and automatic transfer after 60 s of host disconnection. | M | R1 |
| RF-24 | **Dynamic room settings.** Host configures active cards, suit axis on/off and label, auto-reveal, default timer and showing or hiding the numeric mean. | M | R1 |
| RF-25 | **Capacity limit.** Up to 30 simultaneous participants (Voters plus Observers). The 31st entry gets a clear `ROOM_FULL` message. | M | R1 |
| RF-26 | **Persistent vs ephemeral rooms.** Team rooms persist, link to sprints and record history automatically. Ephemeral rooms expire and are purged 1 hour after their last connection drops. | M | R2 |
| RF-27 | **Projector mode** (`/r/:code/screen`). Read-only, enlarged type (at least 48 px on primary elements), high contrast and a visible QR Code; consumes no participant slot. | S | R1 |

## Item queue

| ID | Requirement | Prio | Rel |
| :--- | :--- | :---: | :---: |
| RF-30 | **Manual item.** Title (max 200 chars), description (max 2,000), external link (`http`/`https`) and optional figure tag (`A`, `K`, `Q`, `J`). | M | R1 |
| RF-31 | **Batch import.** Paste text (one item per line) or upload CSV (auto-detect `,` or `;`, UTF-8/BOM, row-by-row validated preview, up to 500 items per room). | M | R1 |
| RF-32 | **Queue management.** Reorder by drag-and-drop and by keyboard (up/down); highlight the item currently being voted (`current`). | M | R1 |
| RF-33 | **Skip, defer, reopen.** Skip (`skipped`) or defer (`deferred`) the current item without losing past rounds; select any item to start or resume estimating. | S | R1 |

## Voting, suits and results

| ID | Requirement | Prio | Rel |
| :--- | :--- | :---: | :---: |
| RF-40 | **Hidden vote, network-safe.** A vote's value never travels to other clients before the round is revealed. | M | R1 |
| RF-41 | **Change or retract.** The participant can change card or suit, or retract, while the round is `voting`. | M | R1 |
| RF-42 | **Voted indicator.** The table shows who has voted (`hasVoted`) without revealing the card. | M | R1 |
| RF-43 | **Manual and automatic reveal.** Host/Facilitator reveals any time, or automatically once every online non-AFK Voter has voted (minimum 1 valid vote). | M | R1 |
| RF-44 | **Full round stats.** After reveal: mean, median, mode, min, max, **consensus** (all numeric votes equal), **near-consensus** (max distance 1 card on the scale) and a textual highlight of the lowest and highest votes. | M | R1 |
| RF-45 | **Multiple rounds per item.** Open `Round n+1` for the same item, clearing the table but keeping earlier aggregate stats to compare convergence. | M | R1 |
| RF-46 | **Final estimate.** Host/Facilitator closes the estimate with a Fibonacci value, which may differ from the mathematical mean. | M | R1 |
| RF-47 | **Special cards** `?`, `Coringa`, `AFK`. None enter mean, median or mode. | M | R1 |
| RF-48 | **Customizable Fibonacci deck** per room or team (for example hide `0`, `½` or values above 21). Fibonacci is the only scale. | M | R1 |
| RF-49 | **Synchronized round timer.** Optional, based on server time, with a visual and accessible (`aria-live`) alert at zero; never forces reveal. | S | R1 |
| RF-50 | **Short vote comment.** Optional, up to 140 chars, hidden until reveal and discarded at session end; never saved in permanent history. | C | R3 |
| RF-51 | **Quick suit selection.** Attach a suit with at most one extra tap or click. With no suit selected, the vote counts as `Coringa` on the suit axis. | M | R1 |
| RF-52 | **Suit hierarchy.** Four levels, always with a text label: ♣ High, ♥ Medium, ♠ Low, ♦ Insignificant, Coringa = abstention. | M | R1 |
| RF-53 | **Team suit-axis config.** Team sets the axis name (default Risk) or disables suits by default. | S | R2 |
| RF-54 | **Suit divergence alert.** Show the suit distribution and flag **a spread of 2 or more levels** (for example ♣ vs ♠ or ♦), even if Fibonacci points are identical. | S | R1 |
| RF-55 | **Strict Observer mode.** Observers see the table, presence and revealed results, get no deck and do not count toward auto-reveal. | M | R1 |
| RF-56 | **Item figure tags** `A`, `K`, `Q`, `J` with team-configurable meanings for visual and analytic grouping. | C | R3 |

## History and audit

| ID | Requirement | Prio | Rel |
| :--- | :--- | :---: | :---: |
| RF-60 | **Automatic aggregated history.** When a final estimate is set in a team room, store per item: title or external key, tag, per-round stats (mean, median, mode, min, max, suit distribution, `?`/`Coringa` counts), final estimate, dominant suit, date, room and sprint. | M | R2 |
| RF-61 | **No individual votes in history.** Architecturally guarantee that per-person votes and round comments are never written to permanent history tables. | M | R2 |
| RF-62 | **History search and filters.** Text search plus filters by period, sprint, room, point range, suit level and tag. | S | R2 |
| RF-63 | **History export.** Filtered history as CSV (UTF-8 with BOM, CSV-injection safe) and structured JSON. | M | R2 |
| RF-64 | **Ephemeral room summary export.** Any participant of an anonymous room can download the full session summary (CSV/JSON) before the room expires. | M | R1 |
| RF-65 | **Edit with audit trail.** Authorized users can change a final estimate; an `EstimateAudit` records previous value, new value, author and UTC timestamp. | S | R2 |

## Sprints and capacity

| ID | Requirement | Prio | Rel |
| :--- | :--- | :---: | :---: |
| RF-70 | **Sprint lifecycle.** `planned` → `active` → `closed`, with name, start, end (no date overlap within a team) and goal. | M | R3 |
| RF-71 | **Per-member capacity.** Planned absence days and focus percentage (`focusPct`, 0 to 100, default 100) yield available person-days from working days. | M | R3 |
| RF-72 | **Scope commitment.** Link estimated items to the planned sprint. Activation freezes the `committedPoints` snapshot; items added later are flagged `addedAfterStart`. | M | R3 |
| RF-73 | **Delivery, carry-over and overrun.** Mark `Done` items (full points to `deliveredPoints`), carry unfinished items over (0 points), and flag when an item **exceeded its estimate**. | M | R3 |
| RF-74 | **Immutable closure.** Closing freezes the `SprintReport` (committed, delivered, added after start, carry-over, total capacity, pace) to feed the forecast engine. | M | R3 |
| RF-75 | **Holiday calendar.** Team holidays and non-working days are discounted from working days. | S | R3 |

## Observability, dashboard and forecast

| ID | Requirement | Prio | Rel |
| :--- | :--- | :---: | :---: |
| RF-80 | **Velocity chart.** Committed vs Delivered per sprint, highlighting scope added after start, with an equivalent accessible table. | M | R3 |
| RF-81 | **Capacity and pace chart.** Per sprint: available person-days, focus-adjusted capacity and **pace** (`velocity ÷ capacity`). | M | R3 |
| RF-82 | **Next-sprint forecast.** Recommended points from planned capacity and the median historical pace, with a central value and an optimistic/conservative range. | M | R4 |
| RF-83 | **Estimate-quality observability.** First-round consensus rate, Fibonacci card frequency, high-divergence items (distance of 3 or more cards in round 1, or 3 or more rounds to converge) and a suit (Risk) × estimate-overrun matrix. | S | R3 |
| RF-84 | **Forecast accuracy over time.** Record the forecast at sprint activation, compare with delivered points at close; show Predicted vs Delivered and the mean `|errorPct|`. | S | R4 |
| RF-85 | **Insufficient-data guard.** Show "Insufficient data for statistical forecast (minimum 3 closed sprints)" and hide predictive numbers with fewer than 3 valid sprints. | M | R4 |
| RF-86 | **Dashboard filters and export.** Filter by team and time window; export datasets (CSV/JSON) and charts (SVG/PNG). | S | R4 |

## Integrations

| ID | Requirement | Prio | Rel |
| :--- | :--- | :---: | :---: |
| RF-90 | **`IssueTracker` port and manual/CSV adapter.** A tracker-agnostic contract for importing items, shipped first with the text/CSV adapter. | M | R1 |
| RF-91 | **ClickUp adapter (read-only).** Import tasks (external key, title, description, URL, Sprint Points custom field) with a per-team token encrypted on the server. | S | R4 |
| RF-92 | **Jira adapter (read-only).** Import Jira Cloud issues through REST/JQL, validating the port with a second provider. | S | R4 |
| RF-93 | **Reverse sync.** Write the approved final estimate back to ClickUp or Jira. | C | Post-MVP |
| RF-94 | **More adapters** (GitHub Issues, GitLab, Azure DevOps, Linear, Trello) by adding `adapter-issuetracker-*` packages without touching the domain. | C | Post-MVP |

## Internationalization and preferences

| ID | Requirement | Prio | Rel |
| :--- | :--- | :---: | :---: |
| RF-95 | **Language and theme.** Language selector (pt-BR default, ready for en-US and es-ES) and theme selector (Light, Dark, System). | S | R1 |
| RF-96 | **Preference persistence.** Language and theme in `localStorage` for guests, synced to the profile when authenticated. | S | R2 |
