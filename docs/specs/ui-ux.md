# Spec: UI and UX

Direction: **tactile tabletop precision**. A calm card table while voting, structured diagnostics at reveal, and editorial data visualization on dashboards. Requirements: RNF-02, RNF-06 to RNF-11, RF-27. CSS is outside the knowledge graph: after a graph query names a component, read the `.module.css` beside it.

## Constraints

1. **Styling.** Native CSS Modules plus CSS custom properties in `apps/web/src/client/styles/tokens.css` and `global.css`. No CSS-in-JS, Tailwind, component libraries or charting libraries (ADR-06). The color and spacing tokens in `tokens.css` are the source of truth; this spec does not duplicate hex values.
2. **Bundle.** Room route at most 150 KB gzip. Icons, card faces, suit emblems and charts are inline SVG or CSS geometry. Dashboard charts and tracker import modals load lazily.
3. **No hardcoded strings.** Every label, tooltip, header, `aria-label` and live announcement goes through the typed `t()` catalog and `Intl`.
4. **Accessibility.** WCAG 2.2 AA. Text contrast at least 4.5:1 (3:1 for large text and non-text UI). Never rely on color or suit symbol alone: suits have distinct hues, distinct silhouettes and a mandatory visible text label everywhere they appear.

## Themes and tokens

- Themes: `[data-theme="light"]` and `[data-theme="dark"]`, following the system by default. `/r/:code/screen` forces dark.
- Semantic tokens: canvas, surface, elevated, table felt and rim, text primary/secondary/muted, border subtle/control, accent primary (and its ink), focus ring, and success, warning, danger (foreground and background pairs). Success marks consensus and `Done`; warning marks near-consensus, the 10 s timer and `addedAfterStart`; danger marks suit divergence, `00:00` and overrun.
- Suits and figure tags each have their own foreground, background and border tokens per theme, all at 6:1 or better.

| Suit | Level | Meaning (pt-BR) | Badge shape |
| :--- | :---: | :--- | :--- |
| ♣ Paus | 4 | Alto | Double-bordered octagon pill |
| ♥ Copas | 3 | Médio | Solid angled-corner pill |
| ♠ Espadas | 2 | Baixo | Rounded pill |
| ♦ Ouros | 1 | Insignificante | Dashed-border pill |
| Coringa | none | Abstenção | Dotted pill with star |

Figure tags: `A` Feature, `K` Tech Debt, `Q` Bug, `J` Spike, shown as `[A · Feature]` badges, configurable per team.

## Typography

System sans and mono stacks only (no external font blocking). `font-variant-numeric: tabular-nums` on every Fibonacci numeral, timer, room code, round statistic and sprint metric.

| Role | Mobile 360 | Desktop 1280 | Projector 1920 |
| :--- | :--- | :--- | :--- |
| Screen hero (median, final estimate, room code) | n/a | n/a | 64 px |
| Screen primary (item title, timer, revealed cards) | n/a | n/a | 48 px (RF-27 minimum) |
| Card numeral | 24 px | 28 px | 48 px |
| `h1` | 20 px | 24 px | 36 px |
| `h2` | 18 px | 20 px | 48 px |
| Body | 16 px | 16 px | 28 px |
| Label | 14 px | 14 px | 24 px |
| Caption | 12 px | 12 px | 20 px |

## Layouts

No horizontal scroll from 360 px up (`overflow-x: hidden`, `min-width: 360px`).

| Breakpoint | Layout |
| :--- | :--- |
| 360–767 px | Single column. Compact top bar (connection pill, room code, timer, queue trigger with count), current item banner, two-column seat grid, sticky bottom dock with the suit selector (44 px) above the scrollable Fibonacci deck (cards at least 52×72 px, 8 px gap). Queue opens as a sheet. |
| 768–1279 px | Oval table (up to 16 perimeter seats plus an inner ring for 17 to 30). Full deck in one row with the suit selector above. Queue can pin as a 300 px right drawer. |
| 1280–1919 px | Grid `1fr 360px`: main stage (header, current item, table, inline round stats and divergence panel, voter hand) plus a pinned queue sidebar. |
| 1920×1080, `/r/:code/screen` | Read-only broadcast layout, dark and high contrast. Top bar (room name, 48 px room code, 48 px timer, 180×180 px QR). Item tag and 48 px title. 30-seat grid with 24 px nicknames and 48 px values at reveal. Bottom strip with 64 px median and final estimate, mean/min/max, consensus badge or divergence banner. No hand dock, no editing, zero seats. |

## Components

### Poker table and seats (`PokerTable`, `SeatBadge`)

- Stadium container on the felt token with a rim border. The center hub depends on round state: while `voting`, a progress counter, the synced `RoundTimer` and the host's Reveal button; when `revealed`, the stats panel, consensus banner, divergence alert and the host's New Round or Final Estimate controls.
- Seat card slot (48×68 px; 76×104 px on the projector): dashed slot with hourglass when not voted; face-down hatched card with a "Voted" pill when voted; flipped face with numeral and suit badge when revealed. The DOM holds no trace of another participant's card or suit before reveal.
- Lowest and highest numeric votes get a text ribbon ("Menor voto", "Maior voto"); `?` seats get a "Dúvida ?" badge.
- Identity bar: nickname (full name in `title` if truncated), connection dot plus text, and a mode badge (Host, Facilitator, Observer, AFK).

### Deck and suit selector (`CardButton`, `SuitSelector`)

- Observers get no deck. A slim bar says they are following without voting, with a switch-to-Voter action (RF-55).
- Suit selector sits above the cards when suits are enabled: the axis label (default "Risco:") plus five pill buttons in a `radiogroup`, each at least 44×44 px with 8 px gaps. One tap attaches the suit to the selected or next card; tapping the active suit returns to Coringa.
- Deck shows only `settings.activeCards`, then a divider and the specials `?`, `Coringa`, `AFK`. Cards are at least 52×76 px (mobile) or 64×92 px (desktop). The active card lifts and carries `aria-pressed="true"` and a full label such as `Carta 8 pontos, Paus: Risco Alto, selecionada`. Tapping the selected card retracts the vote (RF-41).

### Round stats and banners

- Stat strip on reveal: median (primary), mean (hidden when `showAverage` is false), mode ("Sem moda" when none), min–max with voter count, and specials. From round 2, collapsible pills compare earlier rounds.
- Consensus banner (success) and near-consensus banner (warning).
- Suit divergence alert (danger): triggered whenever the suit spread is 2 or more levels, even with numeric consensus. Shows the distribution bar and facilitator guidance to align assumptions before closing.
- Final estimate bar (host or facilitator): pre-selects the card nearest the median, allows one-click override, commits, and advances to the next pending item.

### Item queue (`ItemQueue`, `CsvImportModal`, `ItemTagBadge`)

- Header with counter and add and import actions. Each item shows a status pill (voting, pending, estimated with points and suit, skipped, deferred), an optional tag badge and an external link chip opened with `rel="noopener noreferrer"`.
- Reordering works by drag handle and by explicit up, down, select, skip and defer buttons with 44×44 px targets, so keyboard users never need a pointer.
- Import modal tabs: pasted text, CSV (`,` or `;`), ClickUp and Jira (R4). A live preview validates up to 500 rows and flags titles over 200 chars or descriptions over 2,000.

### Sprint capacity grid (`SprintCapacityGrid`, R3)

Header with sprint name, dates, working days (net of holidays), status badge and a lifecycle action. A table per member: working days, absence-days stepper, focus slider (0 to 100, default 100) and computed capacity (2 decimals). Footer with total capacity and committed points, with a lock when `closed`. A delivery tracker lists items with `Done` checkboxes, an "added after start" badge and an "exceeded estimate" toggle (feeds RF-83).

### Charts (R3, R4)

Every chart uses a responsive SVG (`viewBox="0 0 720 320"`, `role="region"` with a label), encodes series by color **and** SVG pattern or stroke style, makes data nodes keyboard-focusable, and ships a synchronized HTML table twin always present in the DOM (a disclosure may hide it visually).

| Chart | Encoding | Twin table columns |
| :--- | :--- | :--- |
| Velocity (RF-80) | Grouped bars: committed solid accent, added-after-start diagonal hatch (warning), delivered solid success with diamond marker. | Sprint, period, committed, added after start, delivered, carry-over. |
| Capacity and pace (RF-81) | Dotted bar for available person-days, solid bar for focus-adjusted capacity, polyline with focusable nodes for pace (2 decimals). | Sprint, working days, gross capacity, adjusted capacity, velocity, pace. |
| Forecast and accuracy (RF-82, 84, 85) | Planned capacity × historical pace gives conservative (`low`), central (`predicted`, large numeral) and optimistic (`high`). Accuracy plots predicted (dashed, squares) against delivered (solid, circles) with mean `|errorPct|`. | Same filtered series. |
| Quality and suit × overrun (RF-83) | First-round consensus rate, card histogram, high-divergence list, 5×2 heatmap of dominant suit against within-estimate or exceeded. | Same data. |

Forecast rules in the UI:

- With fewer than 3 closed sprints, predictive numbers and the chart are fully hidden, replaced by an announced (`role="status"`) empty state showing the eligible sprint count ("atual: {have} de 3"). No predicted value renders.
- A high concentration of ♣ items shows an amber warning recommending a commitment near `low`.
- The card always renders the translated disclaimer that this is a guiding statistical estimate, not a commitment.
- Charts have an accessible image label and are paired with an HTML table. Period controls are native date inputs with visible labels; export buttons carry explicit labels. Team observers can read the dashboard, but CSV and JSON export routes return `FORBIDDEN` and the UI hides those controls.

## Motion and feedback

Action → immediate reaction (under 100 ms) → settled state.

- Timing: touch feedback 80–120 ms; component transitions 150–220 ms (`cubic-bezier(0.22, 1, 0.36, 1)`); the reveal choreography never exceeds 450 ms in total even with 30 seats (stagger `min(20 ms, 130 ms / N)`).
- Under `prefers-reduced-motion: reduce`, all spatial animation (3D flip, translate, scale, spring, stagger) becomes instant or an opacity change of 120 ms or less. No feedback depends on motion alone: border, icon, text label and ARIA state change together. `global.css` sets `transform: none` in this mode.

| Interaction | Standard | Reduced motion | Assistive |
| :--- | :--- | :--- | :--- |
| Card hover or focus | Lift 4 px with soft shadow, 90–120 ms. | No transform; 2 px border. | Focus reads value, suit and selection. |
| Card selection | Lift 10 px and scale 1.04; one pulse on the user's seat; previous card returns in 150 ms. | 3 px border, tint and a check badge. | `aria-pressed`; seat text changes to "Votou". |
| Suit toggle | Badge pop (0.85 → 1.08 → 1.0, 160 ms); pill shows meaning immediately. | Instant swap with solid border. | `radiogroup` announces suit and level. |
| Reveal | Y-axis flip 320 ms with capped stagger; stats fade in at the end. | 120 ms cross-fade, stats immediate. | One debounced `aria-live="polite"` message with median, mean and consensus or divergence status. |
| Consensus and divergence | 400 ms border pulse and badge; frame on extremes; banner. | Static badges with distinct icons and solid or dashed borders. | Text labels beside seats ("Menor voto", "Risco Alto ♣", "Dúvida ?"). |
| Timer | Progress bar; 1 Hz pulse in the last 10 s; 3 px shake and optional chime at `00:00` (persistent mute). Never blocks voting or forces reveal. | Numeric countdown; icon swap; no shake or pulse. | `aria-live` only at 30 s, 10 s and "Tempo da rodada esgotado". |
| Connection pill | Discreet dot when connected; "Sincronizando voto..." with queued ops; indeterminate bar after 1.5 s offline ("Reconectando / Acordando servidor...") with "Salvo localmente"; "Conectado e sincronizado" for 2 s. | Static icons, no spinners. | `role="status"` messages without stealing focus. |
| Dashboard charts | 220 ms transitions on filter change; keyboard or hover highlights with a guide line and rich tooltip. | Immediate render and high-contrast highlight. | Focusable data nodes with descriptive labels. |

## Accessibility and keyboard

- Focus ring `outline: 3px solid var(--focus-ring); outline-offset: 2px` on every interactive element, never clipped by `overflow: hidden`.
- First focusable element on each page is a skip link. Landmarks in `/r/:code`: `header` (banner) with title, connection pill, share/QR, theme and language, mute and timer; `main#main-stage` with the current item, table and revealed stats; a labelled `nav` for the voter's deck (voters only); an `aside` for the queue.
- Live regions use `polite`; `assertive` only for timer exhaustion and critical connection loss, with debounce.

| Region | Keys | Behavior |
| :--- | :--- | :--- |
| Global | `Tab`, `Shift+Tab` | Header, current-item actions, host controls, suit selector, deck, queue. |
| Deck | `←`/`→` (or `Tab`), `Home`, `End` | Move across cards and specials. |
| Card | `Enter`, `Space` | Cast; again on the selected card retracts. |
| Suit selector | Arrow keys | Cycle ♣, ♥, ♠, ♦, Coringa. |
| Queue reorder | `Enter`, `Space` on up or down | Move one place; announce "Item movido para a posição 2 de 8"; keep focus on the button. |
| Modals and drawers | `Escape` | Close and restore focus to the trigger; focus is trapped while open (`role="dialog" aria-modal="true"`). |
| Charts | `Tab`, arrows on data points | Move across sprints and open the accessible tooltip. |

Verification (RNF-10): every route (`/`, `/r/:code` in voting and revealed states, `/r/:code/screen`, `/teams/:id/sprints`, `/teams/:id/dashboard`, `/teams/:id/history`, `/admin`) runs `@axe-core/playwright` at 360×640, 1280×720 and 1920×1080 in light and dark, with zero serious or critical violations. A manual screen-reader script runs each release.

## Locked decisions

- `header.theme.system` in pt-BR is `Automático do Sistema`; `announcements.themeChanged` is `Tema alterado para {theme}`. en-US and es-ES keep `{theme}` and do not copy the Portuguese sentence. Locale option labels are the endonyms `Português (BR)`, `English`, `Español` in every catalog.
- An unsupported `fibonaipe.locale` falls back to `pt-BR`; an unsupported `fibonaipe.theme` falls back to `system`.
- `useI18n()` returns `{ locale, t, formatNumber, formatDate, setLocale }`. `useLiveAnnouncer()` returns `{ announce }`. `ThemeProvider` is outside `LiveAnnouncerProvider` in the provider list while theme changes call `useLiveAnnouncer()`; provider tests wrap the announcer outside the theme. Shell tests import `main.tsx`, which must mount into an existing `#root`.
- The pt-BR home screen must include `♣ Alto`, `♥ Médio`, `♠ Baixo`, `♦ Insignificante`. Suit badge key names are otherwise free. `errors.SERVICE_UNAVAILABLE` is catalog-only and not an `AppErrorCode`.
- The root shell outline tests require `banner` and `main#main-stage` only. `/r/$code/screen` forces `data-theme="dark"` and renders no banner, even when the stored theme is light.
- happy-dom leaves `clientWidth` at 0, so horizontal overflow is locked on `overflow-x: hidden` and `min-width: 360px`; touch size uses the rendered box when it is non-zero, otherwise computed `min-width` and `min-height`.
- `check-i18n.mjs --self-test` exits 0 and reports both a caught missing key and hardcoded JSX. Tests spawn it because the foundation stub calls `process.exit` on import.
