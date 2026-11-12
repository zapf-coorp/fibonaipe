# PRD: Product

Fibonaipe (Fibonacci + naipe) is a free, open-source, mobile-first Planning Poker. It matches PlanITPoker feature for feature and adds sprint management, estimate observability, capacity and velocity dashboards, and statistical forecasting from each team's real history.

Its differentiator is two-dimensional voting. Each vote is a Fibonacci value plus an optional playing-card suit. By default the suit expresses **Risk**, so the team sees hidden misalignment even when the numbers agree.

Related: [functional requirements](functional-requirements.md), [non-functional requirements](non-functional-requirements.md), [roadmap](roadmap.md).

## Goals and success metrics

| Goal | Success metric |
| :--- | :--- |
| Replace PlanITPoker with no usage limits | The team runs 100% of refinement and planning sessions in the tool for 3 consecutive sprints. |
| Estimate history and observability | 100% of final estimates, aggregated rounds and suit divergences are queryable and exportable. |
| Capacity and velocity | Dashboard shows at least 3 closed sprints with Committed vs Delivered. |
| Statistical forecast | Per-sprint forecast error (`errorPct`) is tracked between predicted and delivered points. |
| Organizational scale | A second team adopts the tool with no direct technical support. |

## Product decisions

1. **Identity.** The product is named Fibonaipe. It runs on a free hosting subdomain during validation and moves to its own domain later.
2. **Scale.** Only Fibonacci: `0, ½, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89`. A team or host chooses which values are active and documents what they mean.
3. **Suit axis.** A vote is `Fibonacci value + suit (optional)`.

   | Suit | Meaning | Level |
   | :--- | :--- | :---: |
   | ♣ Paus (clubs) | High | 4 |
   | ♥ Copas (hearts) | Medium | 3 |
   | ♠ Espadas (spades) | Low | 2 |
   | ♦ Ouros (diamonds) | Insignificant | 1 |
   | Coringa (joker, no suit) | Abstention on the suit axis | none |

   The axis defaults to **Risk**. It can be renamed (for example Uncertainty or External dependency) or turned off per team or room.
4. **Item tags.** `A`, `K`, `Q`, `J` classify an item (default meanings: Feature, Tech Debt, Bug, Spike). Teams can reconfigure the meanings.
5. **Special cards, excluded from numeric stats.**
   - `?` (doubt): counted in round indicators, ignored by mean, median and mode.
   - `Coringa`: abstains from both number and suit.
   - `AFK`: marks the participant absent, clears their vote and never blocks auto-reveal.
6. **Participation is independent of job role.** Anyone (PO, PM, Dev, QA, guest) picks Voter or Observer when joining. The organizational role grants management permissions but does not prevent voting.
7. **Strict history privacy.** Persistent storage never holds individual votes or comments. Only each round's aggregate (mean, median, modes, min, max, special counts, suit distribution) and the item's final estimate are stored.
8. **Ephemeral rooms.** Rooms not linked to a team are deleted for good 60 minutes after their last connection drops (`ANON_ROOM_TTL_MINUTES`), leaving no content logs. Before deletion the session summary can be exported (CSV or JSON).
9. **Claiming.** The creator of an anonymous room holds a host token. If they log in while the room is active they can claim it for a team, converting estimated items into persistent history.
10. **Full points on delivery.** A `Done` item counts 100% of its points in the sprint where it finished. An unfinished item counts 0 and carries over to the backlog.
11. **Official stack.** npm workspaces only (no pnpm or yarn), Node.js LTS, TypeScript strict, React with TanStack Router and Query on Vite as a mobile-first PWA, hexagonal architecture, Builder pattern, `Result<T, AppError>`. See [architecture](../specs/architecture.md).
12. **Issue trackers.** Through the `IssueTracker` port. Release 1 ships manual text and CSV import. ClickUp read-only comes next, then Jira read-only. Writing estimates back is post-MVP.
13. **Licensing.** Public repository under a permissive license (Apache-2.0 or MIT), automated dependency license checks in CI, and DCO/CLA for external contributions.

## Roles and session modes

Three separate concepts:

- **Organizational role:** SuperAdmin, Team Admin, PM, PO, Dev/QA, Team Observer, Guest. It controls permissions in the system and the team.
- **Room mode:** Voter or Observer, chosen on entry. AFK is a flag, not a mode.
- **Session function:** Host or delegated Facilitator.

### Permission matrix (`can`)

`✔` allowed, `✘` denied, `Host/Fac.` allowed only to the Host or a delegated Facilitator, `Deleg.` can be delegated.

| Capability | SuperAdmin | Team Admin | PM | PO | Dev / QA | Team Observer | Guest |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| Manage the instance (all teams, users, global metrics) | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ | ✘ |
| Create, edit, delete a team; manage members and invites | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ | ✘ |
| Configure sprints, holidays, team capacity | ✔ | ✔ | ✔ | ✘ | ✘ | ✘ | ✘ |
| Create a persistent team room | ✔ | ✔ | ✔ | ✔ | ✘ | ✘ | ✘ |
| Create an ephemeral room | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Act as Host or Facilitator | ✔ | ✔ | ✔ | ✔ | Deleg. | Deleg. | Only in the room they created |
| Vote (when entered as Voter) | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |
| Reveal, open a new round, manage the queue, set the final estimate | Host/Fac. | Host/Fac. | Host/Fac. | Host/Fac. | Host/Fac. | Host/Fac. | Host/Fac. |
| View team dashboard, observability and history | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ (read) | ✘ |
| Export team history and sprint reports | ✔ | ✔ | ✔ | ✔ | ✔ | ✘ | ✘ |
| Export the active room's own summary | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ | ✔ |

The Host can transfer the Host role or delegate Facilitator to any online participant. If the Host stays offline for more than 60 seconds while others are online, the role transfers automatically. Priority: delegated Facilitator, then PM > PO > Dev > QA > Observer, ties broken by earliest join.

The exact semantics of this matrix, as locked by tests, are in [domain](../specs/domain.md#policy).
