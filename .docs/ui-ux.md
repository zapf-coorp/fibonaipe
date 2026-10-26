# Fibonaipe — UI/UX Architecture, Look-and-Feel & Sensory Specification (v1.0)

**Project:** Fibonaipe (Fibonacci + Naipe — Two-Dimensional Planning Poker, Sprint Management & Forecasting)  
**Version:** 1.0 (Official Design System & Interaction Blueprint)  
**Date:** 2026-10-26  
**Source of Truth Alignment:** `.docs/requirements.md` (RF-01..RF-96, RNF-01..RNF-26, UX/Juice Addendum) & `.docs/technologies.md` (ADR-02, ADR-06, ADR-07)

---

## 1. Design Philosophy, Emotional Direction & Technical Guardrails

### 1.1 Aesthetic & Emotional North Star: *"Tactile Tabletop Precision"*
Fibonaipe merges the **tactile familiarity of a classic card table** with the **analytical rigor of an engineering observability console**.
- **During Voting (`Round.status === 'voting'`):** The interface evokes **calm, focused deliberation**. Visual noise is suppressed; the current item, the timer, the poker table seats, and the voter's personal hand of Fibonacci cards take center stage. Secret ballots feel physically protected (cards sit face-down with a crisp geometric back pattern until reveal).
- **At Reveal (`Round.status === 'revealed'`):** The interface transitions into **structured diagnostic clarity**. Consensus is celebrated with restrained elegance, while hidden risk misalignment (`suitDivergence >= 2`) or numeric spread immediately surfaces an actionable debate banner without blaming individuals.
- **In Sprint & Forecast Dashboards (`/teams/:id/dashboard`):** The aesthetic shifts to **high-signal editorial data visualization**—clean tabular numerals, multi-modal SVG encodings (color + pattern + shape), and explicit uncertainty bands (`low` – `predicted` – `high`) paired 1:1 with accessible HTML tables.

### 1.2 Hard Engineering & Architectural Constraints (`technologies.md`)
1. **Styling Engine (`ADR-06`):** 100% Native **CSS Modules** (`*.module.css`) + **CSS Custom Properties** (`apps/web/src/client/styles/tokens.css` & `global.css`). Zero runtime CSS-in-JS, zero Tailwind, zero heavy component library bloat (no MUI, Chakra, AntD, Radix-UI mega-bundles, or Recharts/Chart.js).
2. **Bundle Budget (`RNF-02`):** The initial JavaScript payload for `/r/:code` must remain **`≤ 150 KB` gzipped**. Every icon, card face, suit emblem, and chart is rendered via lightweight inline SVG symbols or pure CSS geometry.
3. **Zero Hardcoded Strings (`RNF-11`):** Every visible label, badge, tooltip, table header, `aria-label`, and `aria-live` announcement must resolve through the typed `t('...')` i18n catalog (`pt-BR` default, `en-US`, `es-ES`) and native `Intl.NumberFormat` / `Intl.DateTimeFormat`.
4. **Strict WCAG 2.2 AA & Color Independence (`RNF-08`, `RNF-09`):**
   - Text contrast **`≥ 4.5:1`** for normal text, **`≥ 3.0:1`** for large text (`≥ 24px` or `≥ 18.66px` bold) and non-text UI boundaries/icons.
   - **Never rely on color or suit symbol alone:** Traditional red/black card suits fail semantic risk mapping and color-vision deficiency safety. Fibonaipe assigns **distinct semantic hues, distinct geometric suit silhouettes, and mandatory visible text labels** (`♣ Alto`, `♥ Médio`, `♠ Baixo`, `♦ Insignificante`, `Coringa Neutro`) everywhere a suit appears.

---

## 2. Complete Design Tokens & Color Palette (`tokens.css`)

All colors are engineered and verified against **WCAG 2.2 AA** contrast ratios across both **Light Theme** (`[data-theme="light"]`, default when system is light) and **Dark Theme** (`[data-theme="dark"]`, default when system is dark, and forced in `/r/:code/screen` Projector Mode for high ambient-light legibility).

### 2.1 Semantic Color & Contrast Verification Table

| Token Name | CSS Variable | Light Theme (`#Hex`) | Contrast vs. Light Surface | Dark Theme (`#Hex`) | Contrast vs. Dark Surface | Semantic Purpose |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **App Canvas** | `--bg-canvas` | `#F4F6F9` | — | `#0B0F17` | — | Root page background |
| **Primary Surface** | `--bg-surface` | `#FFFFFF` | — (Base `1.0`) | `#131B2E` | — (Base `1.0`) | Cards, drawers, modals, table rows |
| **Elevated Surface** | `--bg-elevated` | `#EEF2F6` | `1.12:1` (subtle) | `#1C2742` | `1.28:1` (subtle) | Hover states, secondary panels, code pills |
| **Poker Felt Surface** | `--bg-table-felt` | `#E6F0EC` | — | `#0F2922` | — | Central poker table arena surface |
| **Poker Felt Rim** | `--border-table-rim` | `#2B6CB0` / `#1E4E3A` | `5.8:1` | `#2C7A5B` | `3.9:1` (UI `≥ 3:1`) | Table inner/outer stadium border |
| **Text Primary** | `--text-primary` | `#0F172A` | **`17.8:1`** (AAA) | `#F8FAFC` | **`16.4:1`** (AAA) | Body copy, card numbers, headings |
| **Text Secondary** | `--text-secondary` | `#334155` | **`10.1:1`** (AAA) | `#CBD5E1` | **`11.3:1`** (AAA) | Metadata, subtitles, secondary labels |
| **Text Muted** | `--text-muted` | `#475569` | **`7.2:1`** (AAA) | `#94A3B8` | **`6.1:1`** (AA) | Placeholders, disabled hints, axis ticks |
| **Border Subtle** | `--border-subtle` | `#CBD5E1` | `1.48:1` (decorative) | `#263554` | `1.52:1` (decorative) | Dividers, table cell hairlines |
| **Border Strong / Control** | `--border-control` | `#64748B` | **`4.6:1`** (AA UI) | `#64748B` | **`3.4:1`** (AA UI) | Inputs, unselected cards, button borders |
| **Brand Primary** | `--accent-primary` | `#0F52BA` | **`7.1:1`** (on `#FFF`) | `#60A5FA` | **`7.4:1`** (on `#131B2E`) | Primary CTAs, active card border, links |
| **Brand Primary Ink** | `--accent-primary-ink` | `#FFFFFF` | **`7.1:1`** (on `#0F52BA`) | `#090D16` | **`8.3:1`** (on `#60A5FA`) | Text inside primary buttons |
| **Focus Ring** | `--focus-ring` | `#0047AB` | **`8.4:1`** | `#38BDF8` | **`9.2:1`** | `:focus-visible` `3px` outline |
| **Status: Consensus / Done** | `--status-success-fg` | `#065F46` | **`7.6:1`** (on `#FFF`) | `#34D399` | **`8.8:1`** (on `#131B2E`) | Consensus badge, `Done` items, online dot |
| **Status: Consensus Surface** | `--status-success-bg` | `#D1FAE5` | **`6.1:1`** (with `#065F46`) | `#064E3B` | **`5.9:1`** (with `#34D399`) | Consensus banner background |
| **Status: Near-Consensus / Warn** | `--status-warning-fg` | `#92400E` | **`6.8:1`** (on `#FFF`) | `#FBBF24` | **`9.9:1`** (on `#131B2E`) | Near-consensus, 10s timer alert, `addedAfterStart` |
| **Status: Warning Surface** | `--status-warning-bg` | `#FEF3C7` | **`5.9:1`** (with `#92400E`) | `#451A03` | **`6.4:1`** (with `#FBBF24`) | Warning banner background |
| **Status: Danger / Divergence** | `--status-danger-fg` | `#991B1B` | **`7.9:1`** (on `#FFF`) | `#F87171` | **`6.5:1`** (on `#131B2E`) | Suit divergence (`>=2`), timer `00:00`, overrun |
| **Status: Danger Surface** | `--status-danger-bg` | `#FEE2E2` | **`6.4:1`** (with `#991B1B`) | `#450A0A` | **`5.4:1`** (with `#F87171`) | Divergence alert banner background |

### 2.2 Suit Risk Hierarchy Tokens (`RF-51`, `RF-52`, `RF-54`)

To eliminate ambiguity between traditional red/black playing cards and risk severity, each suit has a dedicated **high-contrast semantic palette**, **ordinal rank**, **distinct SVG silhouette**, and **mandatory text label**:

| Suit & Ordinal Level | Meaning (`pt-BR` Default) | Icon & Badge Border Shape | Light FG / BG / Border | Dark FG / BG / Border | Contrast Ratio (FG vs. BG) |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **♣ Paus** (`level = 4`) | **`Alto`** (High Risk) | `♣` Trefoil + **Double-bordered octagon pill** | FG `#991B1B`<br>BG `#FEE2E2`<br>Border `#DC2626` | FG `#FCA5A5`<br>BG `#450A0A`<br>Border `#EF4444` | Light: **`6.4:1`**<br>Dark: **`7.8:1`** |
| **♥ Copas** (`level = 3`) | **`Médio`** (Medium Risk) | `♥` Heart + **Solid angled-corner pill** | FG `#9A3412`<br>BG `#FFEDD5`<br>Border `#EA580C` | FG `#FDBA74`<br>BG `#431407`<br>Border `#F97316` | Light: **`6.2:1`**<br>Dark: **`8.5:1`** |
| **♠ Espadas** (`level = 2`) | **`Baixo`** (Low Risk) | `♠` Spade + **Rounded pill** | FG `#075985`<br>BG `#E0F2FE`<br>Border `#0284C7` | FG `#7DD3FC`<br>BG `#082F49`<br>Border `#38BDF8` | Light: **`6.5:1`**<br>Dark: **`8.1:1`** |
| **♦ Ouros** (`level = 1`) | **`Insignificante`** (Minimal) | `♦` Diamond + **Dashed-border pill** | FG `#065F46`<br>BG `#D1FAE5`<br>Border `#059669` | FG `#6EE7B7`<br>BG `#064E3B`<br>Border `#10B981` | Light: **`6.1:1`**<br>Dark: **`8.4:1`** |
| **Coringa** (`level = 0`) | **`Abstenção`** (Neutral) | `★` / `∅` Jester Star + **Dotted pill** | FG `#334155`<br>BG `#F1F5F9`<br>Border `#64748B` | FG `#CBD5E1`<br>BG `#1E293B`<br>Border `#64748B` | Light: **`8.9:1`**<br>Dark: **`7.6:1`** |

### 2.3 Deck Figure Item Tag Tokens (`A`, `K`, `Q`, `J` — `RF-30`, `RF-56`)

| Figure Tag | Default Category (`pt-BR`) | Visual Badge Prefix | Light FG / BG | Dark FG / BG | Contrast |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **`A` (Ás)** | *Feature / Entrega de Valor* | `[A · Feature]` | `#3730A3` on `#E0E7FF` | `#A5B4FC` on `#1E1B4B` | `7.1:1` / `7.9:1` |
| **`K` (Rei)** | *Tech Debt / Arquitetura* | `[K · Tech Debt]` | `#6B21A8` on `#F3E8FF` | `#D8B4FE` on `#3B0764` | `7.4:1` / `8.2:1` |
| **`Q` (Dama)** | *Bug / Correção* | `[Q · Bug]` | `#9D174D` on `#FCE7F3` | `#F9A8D4` on `#500724` | `6.8:1` / `7.7:1` |
| **`J` (Valete)** | *Spike / Investigação* | `[J · Spike]` | `#115E59` on `#CCFBF1` | `#5EEAD4` on `#134E4A` | `6.5:1` / `7.5:1` |

### 2.4 Complete CSS Custom Properties Definition (`apps/web/src/client/styles/tokens.css`)

```css
:root,
[data-theme='light'] {
  /* Surfaces */
  --bg-canvas: #f4f6f9;
  --bg-surface: #ffffff;
  --bg-elevated: #eef2f6;
  --bg-overlay: rgba(15, 23, 42, 0.55);
  --bg-table-felt: #e6f0ec;
  --border-table-rim: #1e4e3a;

  /* Typography Ink */
  --text-primary: #0f172a;
  --text-secondary: #334155;
  --text-muted: #475569;
  --text-on-accent: #ffffff;

  /* Borders & Focus */
  --border-subtle: #cbd5e1;
  --border-control: #64748b;
  --accent-primary: #0f52ba;
  --accent-primary-hover: #0a3d8f;
  --accent-primary-subtle: #dbeafe;
  --focus-ring: #0047ab;

  /* Status Tokens */
  --status-success-fg: #065f46;
  --status-success-bg: #d1fae5;
  --status-success-border: #059669;
  --status-warning-fg: #92400e;
  --status-warning-bg: #fef3c7;
  --status-warning-border: #d97706;
  --status-danger-fg: #991b1b;
  --status-danger-bg: #fee2e2;
  --status-danger-border: #dc2626;

  /* Suit Tokens (♣=4 High, ♥=3 Med, ♠=2 Low, ♦=1 Insignificant, Joker=0 Neutral) */
  --suit-clubs-fg: #991b1b;
  --suit-clubs-bg: #fee2e2;
  --suit-clubs-border: #dc2626;
  --suit-hearts-fg: #9a3412;
  --suit-hearts-bg: #ffedd5;
  --suit-hearts-border: #ea580c;
  --suit-spades-fg: #075985;
  --suit-spades-bg: #e0f2fe;
  --suit-spades-border: #0284c7;
  --suit-diamonds-fg: #065f46;
  --suit-diamonds-bg: #d1fae5;
  --suit-diamonds-border: #059669;
  --suit-joker-fg: #334155;
  --suit-joker-bg: #f1f5f9;
  --suit-joker-border: #64748b;

  /* Item Figure Tag Tokens (A, K, Q, J) */
  --tag-ace-fg: #3730a3;
  --tag-ace-bg: #e0e7ff;
  --tag-king-fg: #6b21a8;
  --tag-king-bg: #f3e8ff;
  --tag-queen-fg: #9d174d;
  --tag-queen-bg: #fce7f3;
  --tag-jack-fg: #115e59;
  --tag-jack-bg: #ccfbf1;

  /* Typography Families & Weights */
  --font-sans: 'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  --font-mono: 'JetBrains Mono', 'Fira Code', ui-monospace, SFMono-Regular, Consolas, monospace;

  /* Spacing & Sizing (4px base grid, 44px minimum touch target) */
  --space-1: 0.25rem;  /* 4px */
  --space-2: 0.5rem;   /* 8px — minimum safe gap between interactive cards/suits */
  --space-3: 0.75rem;  /* 12px */
  --space-4: 1rem;     /* 16px */
  --space-5: 1.25rem;  /* 20px */
  --space-6: 1.5rem;   /* 24px */
  --space-8: 2rem;     /* 32px */
  --space-10: 2.5rem;  /* 40px */
  --touch-min: 2.75rem; /* 44px — RNF-06 mandatory minimum */

  /* Radii & Shadows */
  --radius-sm: 0.375rem; /* 6px */
  --radius-md: 0.625rem; /* 10px — playing cards */
  --radius-lg: 1rem;     /* 16px — panels & modals */
  --radius-pill: 9999px;
  --shadow-card: 0 2px 5px rgba(15, 23, 42, 0.08), 0 1px 2px rgba(15, 23, 42, 0.06);
  --shadow-card-selected: 0 10px 20px rgba(15, 82, 186, 0.22), 0 4px 8px rgba(15, 23, 42, 0.12);
  --shadow-modal: 0 20px 32px rgba(15, 23, 42, 0.24);

  /* Motion & Choreography Tokens (UX Addendum §1) */
  --dur-instant: 90ms;
  --dur-state: 180ms;
  --dur-reveal: 320ms;
  --dur-reveal-cap: 450ms;
  --ease-out-fast: ease-out;
  --ease-spring: cubic-bezier(0.22, 1, 0.36, 1);
}

[data-theme='dark'] {
  --bg-canvas: #0b0f17;
  --bg-surface: #131b2e;
  --bg-elevated: #1c2742;
  --bg-overlay: rgba(2, 6, 23, 0.75);
  --bg-table-felt: #0f2922;
  --border-table-rim: #2c7a5b;

  --text-primary: #f8fafc;
  --text-secondary: #cbd5e1;
  --text-muted: #94a3b8;
  --text-on-accent: #090d16;

  --border-subtle: #263554;
  --border-control: #64748b;
  --accent-primary: #60a5fa;
  --accent-primary-hover: #93c5fd;
  --accent-primary-subtle: #1e3a8a;
  --focus-ring: #38bdf8;

  --status-success-fg: #34d399;
  --status-success-bg: #064e3b;
  --status-success-border: #10b981;
  --status-warning-fg: #fbbf24;
  --status-warning-bg: #451a03;
  --status-warning-border: #f59e0b;
  --status-danger-fg: #f87171;
  --status-danger-bg: #450a0a;
  --status-danger-border: #ef4444;

  --suit-clubs-fg: #fca5a5;
  --suit-clubs-bg: #450a0a;
  --suit-clubs-border: #ef4444;
  --suit-hearts-fg: #fdba74;
  --suit-hearts-bg: #431407;
  --suit-hearts-border: #f97316;
  --suit-spades-fg: #7dd3fc;
  --suit-spades-bg: #082f49;
  --suit-spades-border: #38bdf8;
  --suit-diamonds-fg: #6ee7b7;
  --suit-diamonds-bg: #064e3b;
  --suit-diamonds-border: #10b981;
  --suit-joker-fg: #cbd5e1;
  --suit-joker-bg: #1e293b;
  --suit-joker-border: #64748b;

  --tag-ace-fg: #a5b4fc;
  --tag-ace-bg: #1e1b4b;
  --tag-king-fg: #d8b4fe;
  --tag-king-bg: #3b0764;
  --tag-queen-fg: #f9a8d4;
  --tag-queen-bg: #500724;
  --tag-jack-fg: #5eead4;
  --tag-jack-bg: #134e4a;

  --shadow-card: 0 2px 6px rgba(0, 0, 0, 0.45);
  --shadow-card-selected: 0 10px 24px rgba(56, 189, 248, 0.28), 0 4px 10px rgba(0, 0, 0, 0.5);
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --dur-instant: 0ms;
    --dur-state: 100ms;
    --dur-reveal: 120ms;
    --dur-reveal-cap: 120ms;
  }
}
```

---

## 3. Typography & Visual Hierarchy

- **Zero External Font Blocking (`RNF-02`):** Uses system UI sans-serif (`--font-sans`) and monospace (`--font-mono`) stacks with `font-variant-numeric: tabular-nums` enforced on all Fibonacci card numbers, timers, room codes, round statistics, and sprint metrics so digits never jitter during live updates.
- **Type Scale & Hierarchy:**

| Role | Token | Mobile (`360px`) | Desktop (`1280px`) | Projector Screen (`/r/:code/screen`, `1920×1080`) | Weight / Line Height / Numerals |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Screen Mode Hero Metric** | `--type-screen-hero` | — | — | **`64px` (`4rem`)** (Median / Final Estimate / Room Code) | `800` / `1.1` / `tabular-nums` |
| **Screen Mode Primary** | `--type-screen-primary` | — | — | **`48px` (`3rem`)** (Current Item Title, Timer, Revealed Seat Cards — satisfies `RF-27 ≥ 48px`) | `700` / `1.15` / `tabular-nums` |
| **Card Face Numeral** | `--type-card-num` | `24px` (`1.5rem`) | `28px` (`1.75rem`) | `48px` (`3rem`) | `800` / `1.0` / `tabular-nums` |
| **Page / Room Title (`h1`)** | `--type-h1` | `20px` (`1.25rem`) | `24px` (`1.5rem`) | `36px` (`2.25rem`) | `700` / `1.25` |
| **Section / Item Title (`h2`)** | `--type-h2` | `18px` (`1.125rem`) | `20px` (`1.25rem`) | `48px` (`3rem`) | `600` / `1.3` |
| **Body Primary** | `--type-body` | `16px` (`1rem`) | `16px` (`1rem`) | `28px` (`1.75rem`) | `400` / `1.5` |
| **UI Control / Label** | `--type-label` | `14px` (`0.875rem`) | `14px` (`0.875rem`) | `24px` (`1.5rem`) | `600` / `1.3` |
| **Badge / Caption** | `--type-caption` | `12px` (`0.75rem`) | `12px` (`0.75rem`) | `20px` (`1.25rem`) | `600` / `1.2` / `tabular-nums` |

---

## 4. Responsive Breakpoints & Layout Architecture (`RNF-06`, `RNF-07`, `RF-27`)

No horizontal scrolling (`overflow-x: hidden` on body; fluid CSS Grid & Flexbox) is permitted at any viewport width from `360px` upward.

| Breakpoint | Viewport Target | Layout Structure (`/r/:code` & `/teams/:id/*`) |
| :--- | :--- | :--- |
| **Mobile-First Base** | **`360px – 767px`** | **Single-column vertical stack with sticky bottom hand dock.**<br>1. Compact Top Bar (`ConnectionStatusPill`, Room Code button, Timer, Queue Drawer trigger with item count badge).<br>2. Current Item Banner (`[Tag]` + Title + collapsible description).<br>3. Compact Poker Table Grid (2 columns of participant seat pills, max-height scrollable or auto-flow for up to 30 seats).<br>4. Sticky Bottom Dock: **1-Tap Suit Selector Bar** (`44px` height) directly above a horizontally scrollable or 2-row wrapped **Fibonacci Card Deck** (`min 52×72px` per card, `8px` gap). Item Queue opens as a slide-over bottom/side sheet (`ItemQueueDrawer`). |
| **Tablet** | **`768px – 1279px`** | **Two-zone split.**<br>Top bar includes inline Share/QR trigger and Facilitator actions. Center arena renders the oval Poker Table with up to 16 perimeter seats + inner overflow ring for 17–30 participants. Bottom dock displays the full active Fibonacci scale in a single centered row with the Suit Selector docked directly above. Item Queue can be pinned as a `300px` right drawer or toggled. |
| **Desktop** | **`1280px – 1919px`** | **Three-zone workspace (`CSS Grid: 1fr 360px`).**<br>- **Left/Center Main Stage (`1fr`):** Room Header + Current Item Card + Stadium Poker Table (`PokerTable`) + Inline Round Stats & Suit Divergence Panel (when revealed) + Fixed Bottom Voter Hand (`CardDeck` + `SuitSelector`).<br>- **Right Persistent Sidebar (`360px`):** `ItemQueueDrawer` pinned open (active item, pending list, drag-and-drop / keyboard reorder, CSV import trigger, session summary export). |
| **Projector Screen Mode** | **`1920×1080` (`/r/:code/screen`)** | **Dedicated read-only 16:9 broadcast layout (`RF-27`, `INV-01`).**<br>Forced high-contrast Dark Theme (`#0B0F17` canvas). Zero voter hand dock, zero editing controls, consumes `0` participant slots.<br>- **Top Broadcast Bar (`120px`):** Room Name, **`48px` monospace Room Code** (`ABCD-2345`), **`48px` live Round Timer**, and a persistent **`180×180px` high-contrast SVG QR Code** in the top-right corner for instant walk-in joining.<br>- **Upper Stage:** Current Item Tag (`A/K/Q/J`) + **`48px` bold Item Title**.<br>- **Center Arena:** 30-seat Stadium Grid where each seat displays nickname (`24px`), status/suit badge, and **`48px` card value** upon reveal.<br>- **Bottom Telemetry Strip:** Upon reveal, displays **`64px` Median & Final Estimate**, **`48px` Mean/Min/Max**, Consensus trophy badge, or full-width Suit Divergence alert banner. |

---

## 5. Component Anatomy & Interaction Specifications

### 5.1 Poker Table & Participant Seats (`PokerTable.tsx`, `SeatBadge.tsx`)
- **Anatomy of the Table (`PokerTable`):**
  - Central stadium/oval container (`background: var(--bg-table-felt)`, `border: 3px solid var(--border-table-rim)`).
  - **Center Hub (Dynamic by `Round.status`):**
    - When `voting`: Displays vote progress counter (`"12 de 15 votantes prontos"`), synchronized `RoundTimer`, and Host/Facilitator primary CTA (`"Revelar Cartas"`).
    - When `revealed`: Displays the primary `RoundStatsPanel` (Median, Mean, Modes, Min/Max), `ConsensusBanner`, `SuitDivergenceAlert`, and Host controls (`"Nova Rodada (Round n+1)"` or `"Fechar Estimativa Final"` selector).
- **Anatomy of a Seat (`SeatBadge`, up to `MAX_PARTICIPANTS = 30`):**
  - **Card Slot (`48×68px` mobile/desktop, `76×104px` Projector Screen):**
    - `voting` + not voted: Dashed outline slot (`--border-control`) with subtlehourglass icon + screen-reader text `"Aguardando voto"`.
    - `voting` + `hasVoted === true`: Face-down card with cross-hatch SVG pattern and solid `--accent-primary` border + visible pill `"Votou ✓"`. **Security invariant (`RF-40`, `RNF-13`):** The DOM contains zero trace of the card or suit value for other participants until reveal.
    - `revealed`: 3D Y-axis flip (`rotateY(180deg)` in `320ms`, or `120ms` opacity cross-fade under `prefers-reduced-motion: reduce`) revealing the large Fibonacci numeral (`tabular-nums`) in the center and the semantic Suit badge (`♣ Alto`, `♥ Médio`, `♠ Baixo`, `♦ Insignif.`) at the top-right corner.
    - **Extreme / Question Highlights (`RF-44`, `RF-47`):** Seats holding the numeric `min` or `max` vote receive an explicit text ribbon below the card (`"Menor voto"` / `"Maior voto"`). Seats holding `?` display a high-contrast `"Dúvida ?"` callout badge.
  - **Participant Identity Bar:**
    - Nickname (`1..30` chars, truncated with ellipsis only if needed, full name in `title`), Connection dot + text (`online` green circle / `offline` hollow ring with `"Offline"` label), Role/Mode badge (`Host ★`, `Facilitador`, `Observador 👁`, or `AFK ⏸`).

### 5.2 Fibonacci Card Deck & 1-Tap Suit Selector (`CardButton.tsx`, `SuitSelector.tsx`)
- **Hidden for Observers (`RF-55`):** If `participant.mode === 'observer'`, the entire bottom deck dock is replaced by a slim informational bar: `"Modo Observador ativo — você acompanha a mesa sem votar [Alternar para Votante]"`.
- **1-Tap Suit Selector Bar (`SuitSelector`, `RF-51`, `RF-52`):**
  - Rendered directly above the Fibonacci cards (when `room.settings.suitsEnabled === true`).
  - Displays the configurable axis title (`room.settings.suitAxisLabel`, default `"Risco:"`) followed by 5 pill buttons (`role="radiogroup"`, each `min-height: 44px`, `min-width: 44px`, `gap: 8px`):
    1. `♣ Paus · Alto`
    2. `♥ Copas · Médio`
    3. `♠ Espadas · Baixo`
    4. `♦ Ouros · Insignificante`
    5. `★ Coringa · Abstenção` (Default active when no suit is explicitly tapped).
  - **1-Tap Interaction (`RF-51`):** Tapping any suit pill immediately attaches that suit to the currently selected Fibonacci card (or pre-selects it for the next card tap) in a single click/tap. Tapping an already-active suit pill toggles it back to `Coringa` (neutral).
- **Fibonacci & Special Card Deck (`CardButton`, `RF-47`, `RF-48`):**
  - Renders only the active subset configured in `room.settings.activeCards` from `0, ½, 1, 2, 3, 5, 8, 13, 21, 34, 55, 89`, followed by a visual divider and the 3 special cards:
    - **`?` (`Dúvida`):** Signals need for discussion; excluded from numeric stats.
    - **`Coringa` (`Abstenção Total`):** Abstains from both points and suit.
    - **`AFK` (`Ausente`):** Toggles participant into `AFK` mode, clearing any active vote and excluding them from auto-reveal blocking (`INV-03`).
  - **Card Anatomy (`min 52×76px` mobile, `64×92px` desktop):**
    - Top-left corner: Small index numeral + active suit icon.
    - Center: Large `24px–28px` bold Fibonacci numeral.
    - Bottom-right: Mirrored index or `"Selecionada ✓"` badge when active.
    - Active state: `translateY(-10px) scale(1.04)` (or `3px` solid border + high-contrast fill under `prefers-reduced-motion: reduce`), `aria-pressed="true"`, and full accessible label (`aria-label="Carta 8 pontos, Paus: Risco Alto, selecionada"`). Tapping the currently selected card retracts the vote (`DELETE /api/rooms/:code/votes`, `RF-41`).

### 5.3 Round Stats & Suit Divergence Banner (`ConsensusBanner.tsx`, `SuitDivergenceAlert.tsx`)
- **Round Statistics Strip (`RF-44`):**
  - Displayed immediately upon `Round.status === 'revealed'`.
  - Shows 5 metric cards in a responsive grid: **Mediana** (highlighted as primary reference), **Média** (1 decimal place, hidden if `showAverage === false`), **Moda** (comma-separated list or `"Sem moda"`), **Mín – Máx** (`min` to `max` with voter count), and **Especiais** (count of `?`, `Coringa`, `AFK`).
  - **Multi-Round History Pills (`RF-45`):** When `roundNumber > 1`, displays compact collapsible comparison pills for previous rounds (`"Rodada 1: Mediana 8, Divergência ♣/♦ → Rodada 2: Mediana 5, Consenso"`).
- **Consensus vs. Near-Consensus Banner (`RF-44`):**
  - `consensus === true`: Green `--status-success-bg` banner with trophy icon: `"Consenso atingido! Todos os votos numéricos convergiram em {value} pontos."`
  - `nearConsensus === true`: Amber `--status-warning-bg` banner with target icon: `"Quase-consenso (distância máxima de 1 carta: {min} a {max})."`
- **Suit Divergence Alert Banner (`SuitDivergenceAlert`, `RF-54`):**
  - Triggered automatically whenever `max(suitLevel) - min(suitLevel) >= 2` (ignoring `Coringa`), **even if numeric Fibonacci votes are in 100% consensus**.
  - Renders a high-priority `--status-danger-bg` alert banner with warning triangle icon, suit distribution bar (`♣: 2 | ♥: 1 | ♠: 0 | ♦: 3`), and actionable facilitator guidance:
    > **"Alerta de Divergência de {suitAxisLabel} (≥ 2 níveis):"** Embora os pontos estejam próximos, a percepção de {suitAxisLabel} variou entre **♣ Paus (Alto)** e **♦ Ouros (Insignificante)**. Recomenda-se alinhar premissas antes de fechar a estimativa.
- **Final Estimate Confirmation Bar (`RF-46`, `INV-07`):**
  - Visible to Host / Delegated Facilitator: Pre-selects the closest active Fibonacci card to the round's median, allows 1-click override to any valid Fibonacci card in the scale, and commits via `"Confirmar Estimativa Final ({value} pts)"`, automatically advancing to the next pending item in the queue.

### 5.4 Item Queue Drawer & Batch Import (`ItemQueue.tsx`, `CsvImportModal.tsx`, `ItemTagBadge.tsx`)
- **Anatomy:**
  - Header with item counter (`"Fila de Itens (4 estimados / 12 total)"`), `"+ Novo Item"` button, and `"Importar (Texto/CSV/ClickUp/Jira)"` button (`RF-30`, `RF-31`, `RF-91`, `RF-92`).
  - **Item Card in Queue:**
    - Status indicator pill: `Em votação ●` (highlighted with `--accent-primary` left border), `Pendente`, `Estimado ({finalEstimate} pts + {dominantSuit})`, `Pulado (Skipped)`, or `Adiado (Deferred)`.
    - Optional Figure Tag Badge (`ItemTagBadge`: `[A · Feature]`, `[K · Tech Debt]`, `[Q · Bug]`, `[J · Spike]`, `RF-56`).
    - External tracker link chip (`ClickUp #CU-104` / `Jira PROJ-42`) opening safely with `rel="noopener noreferrer"`.
    - **Accessible Reordering (`RF-32`):** Each item has a drag handle (`∷`) for pointer drag-and-drop **plus explicit keyboard action buttons** (`↑ Subir posição`, `↓ Descer posição`, `Selecionar para votar`, `Pular`, `Adiar`) with `44×44px` hit areas so keyboard and screen-reader users never depend on pointer drag.
- **Batch CSV / Free-Text Import Modal (`CsvImportModal`, `RF-31`):**
  - Tabbed selector: `Colar Texto (1 por linha)`, `Arquivo CSV (, ou ;)`, `ClickUp (R4)`, `Jira (R4)`.
  - Live preview table validating up to `500` rows (`MAX_ITEMS_PER_ROOM`), highlighting any row exceeding `200` chars title or `2000` chars description before committing import.

### 5.5 Sprint Capacity Grid (`SprintCapacityGrid.tsx` — `RF-70` to `RF-75`)
- **Sprint Lifecycle Header:** Displays Sprint Name, Date Range (`startDate` – `endDate`), Working Days count (automatically discounting team `Holidays`, `RF-75`), Sprint Status badge (`Planejada`, `Ativa`, `Encerrada 🔒`), and lifecycle action button (`"Ativar Sprint"` or `"Encerrar Sprint"`).
- **Interactive Capacity Table (`RF-71`):**
  - Columns: **Membro do Time**, **Dias Úteis Base** (`workingDays`), **Dias de Ausência (`absenceDays` stepper input `0..workingDays`)**, **Foco na Sprint (`focusPct` slider/input `0%..100%`, default `100%`)**, and **Capacity Calculada (`capacity_i` in `pessoa-dias`, `tabular-nums`, 2 decimals)**.
  - Footer summary row displays **Capacity Total da Equipe (`capacityTotal` pessoa-dias)** and **Pontos Comprometidos (`committedPoints`)**, with a lock indicator when `Sprint.status === 'closed'` (`INV-10`).
- **Scope & Delivery Tracker (`RF-72`, `RF-73`):**
  - Lists sprint items with checkboxes to mark `Done` (awards 100% of `finalEstimate` to `deliveredPoints`; incomplete items show `0 pts → Carry-over`), a badge for items added after sprint activation (`"Adicionado após início"`), and a toggle switch for **"Estourou estimativa inicial"** (`estimateExceeded = true`, feeding the `RF-83` Suit × Overrun observability matrix).

### 5.6 Custom SVG Charts & Paired Accessible Data Tables (`charts/*` — `RF-80` to `RF-86`, `RNF-09`)

Every chart in `/teams/:id/dashboard` is built with **zero external charting libraries** (`ADR-06`), uses responsive `<svg viewBox="0 0 720 320" role="region" aria-labelledby="...">`, encodes series using **both color and SVG `<pattern>` fills / stroke styles**, supports keyboard `Tab` focus on data nodes, and is accompanied by a **synchronized HTML `<table>` twin** directly below or inside an accessible disclosure (`<details open>` / toggleable `"Exibir tabela de dados completa"` that is always present in the DOM for assistive tech).

1. **Velocity Chart (`VelocitySvgChart.tsx` — `RF-80`):**
   - **Visual Encoding:** Grouped vertical bar chart per closed sprint:
     - **Committed Points (`committedPoints`):** Solid `--accent-primary` fill.
     - **Added After Start (`addedAfterStart`):** Diagonal SVG hatch pattern (`<pattern id="hatch-warn">`) in `--status-warning-fg` stacked or adjacent.
     - **Delivered Points (`deliveredPoints`):** Solid `--status-success-fg` fill with a top diamond marker.
   - **Twin Table:** Columns: `Sprint`, `Período`, `Pontos Comprometidos`, `Escopo Adicionado Após Início`, `Pontos Entregues (Velocity)`, `Carry-over (pts)`.
2. **Capacity & Normalized Pace Chart (`CapacitySvgChart.tsx` — `RF-81`):**
   - **Visual Encoding:** Dual-metric SVG chart showing **Available Person-Days** (bar with dotted fill), **Focus-Adjusted Capacity (`capacityTotal`)** (solid bar), and **Normalized Pace (`pace = velocity / capacity`)** overlaid as a connected polyline with circular `<g tabIndex={0}>` focusable nodes (`2 decimal places`).
   - **Twin Table:** Columns: `Sprint`, `Dias Úteis`, `Capacity Bruta (pessoa-dias)`, `Capacity Ajustada pelo Foco (pessoa-dias)`, `Velocity (pts)`, `Ritmo (pts / pessoa-dia)`.
3. **Statistical Forecast Band & Accuracy Chart (`ForecastBandChart.tsx` — `RF-82`, `RF-84`, `RF-85`):**
   - **Insufficient Data Guard (`RF-85`):** When the team has `< 3` closed sprints (`status: 'insufficient_data'`), the predictive numbers and chart are **completely hidden** and replaced by an educational empty-state card with a 3-step progress bar:
     > *"Dados insuficientes para previsão estatística (mínimo de 3 sprints encerradas — atual: {have} de 3)."*
   - **Active Forecast Card & Fan Chart (`3 ≤ N ≤ 6` sprints):**
     - Displays the planned capacity input (`plannedCapacity` person-days) multiplied by historical pace:
       - **Conservador (`low`):** P25 (when $N=6$) or $\min(\text{pace})$ (when $3 \le N < 6$).
       - **Previsão Central (`predicted`):** $\text{plannedCapacity} \times \text{medianPace}$ (prominent `36px` numeral).
       - **Otimista (`high`):** P75 (when $N=6$) or $\max(\text{pace})$.
     - **High-Risk Suit Warning (`§5.3.5`):** If the planned sprint's ratio of **♣ Paus (Risco Alto)** items exceeds the team's historical average, renders an amber warning pill: *"Concentração elevada de itens com Risco Alto (♣ Paus): recomenda-se comprometer próximo ao limite conservador ({low} pts)."*
     - **Mandatory Disclaimer (`§5.3.5`):** Always displays the caption: *"Estimativa estatística orientativa baseada no histórico do time — não representa um compromisso fechado."*
     - **Accuracy Tracking (`RF-84`):** Plots historical `predicted` (dashed line with square markers) vs. actual `deliveredPoints` (solid line with circle markers) and displays mean absolute percentage error (`|errorPct|%`).
4. **Estimation Quality & Suit × Overrun Matrix (`RF-83`):**
   - Displays 1st-round consensus rate (`%`), Fibonacci card frequency histogram, high-divergence items list (`≥ 3` Fibonacci steps apart in Round 1 or `≥ 3` rounds to converge), and a 5×2 semantic heatmap table crossing **Dominant Suit (`♣, ♥, ♠, ♦, Coringa`) × Estimate Overrun (`Dentro da estimativa` vs. `Estourou estimativa`)** to validate whether `♣ Paus` accurately predicts delivery overruns.

---

## 6. Sensory Choreography, Micro-Interactions & `prefers-reduced-motion` (`RNF-09`)

Every interactive element follows the **Action → Immediate Reaction (`< 100ms`) → Consolidated State** loop defined in the Requirements UX/Juice Addendum:

| Interaction | Standard Motion (`no-preference`) | Reduced Motion (`prefers-reduced-motion: reduce`) | Screen Reader & ARIA Announcement |
| :--- | :--- | :--- | :--- |
| **Card Hover / Focus** | `transform: translateY(-4px)` over `90ms ease-out`; subtle shadow elevation. | `transform: none`; immediate `2px` border thickening. | Focus reads card value, current suit, and selection state. |
| **Card Selection (`RF-40`)** | `transform: translateY(-10px) scale(1.04)` over `180ms cubic-bezier(0.22, 1, 0.36, 1)`; single optimistic pulse on the user's table seat. | `transform: none`; instant `3px` solid `--accent-primary` border, high-contrast background tint, and `"✓ Selecionada"` badge. | `aria-pressed="true"`; seat status updates to `"Votou"`. |
| **1-Tap Suit Toggle (`RF-51`)** | Suit badge on active card pops `scale(0.85 → 1.08 → 1.0)` in `160ms`; suit label pill updates immediately. | Instant icon and text swap (`♣ Alto`, `♥ Médio`, etc.) with `2px` solid border on active pill. | `role="radiogroup"` announces selected suit and risk level (`"Paus: Risco Alto selecionado"`). |
| **Table Card Reveal (`RF-43`)** | 3D Y-axis card flip `rotateY(0deg → 180deg)` in `320ms` with `min(20ms, 130ms / N)` stagger per seat so total choreography **never exceeds `450ms`** even with 30 participants. | Instant `120ms` opacity cross-fade from card back to revealed face across all seats simultaneously; zero 3D rotation. | Single debounced `aria-live="polite"` announcement: *"Cartas reveladas. Mediana {median}, Média {mean}. {consensusOrDivergenceStatus}"*. |
| **Round Timer (`RF-49`)** | Smooth progress bar; subtle 1Hz pulse during final `10s`; `±3px` horizontal shake (`240ms`) + optional short Web Audio chime at `00:00` (with persistent Mute toggle in top bar). Never blocks voting. | Numeric countdown updates each second; icon swaps from hourglass to warning bell at `10s` and `00:00`; zero shake or pulse. | `aria-live` announces only at **`30s`**, **`10s`**, and **`00:00` (`"Tempo da rodada esgotado"`)** to prevent per-second chatter. |
| **Connection & Cold Start Pill (`RNF-04`, `RNF-05`)** | Non-blocking header pill: discreet green dot when connected; smooth indeterminate bar after `1.5s` of disconnect/cold start (`"Reconectando / Acordando servidor..."`) while keeping selected card locked with `"Salvo localmente"`. Collapses `2s` after reconciliation. | Static status icons (`● Conectado`, `⏳ Sincronizando`, `⚠ Reconectando`, `✓ Sincronizado`); zero spinning loaders or animated bars. | `role="status"` (`aria-live="polite"`) announces disconnect and reconnection without stealing keyboard focus. |

---

## 7. Accessibility & Keyboard Navigation Map (`WCAG 2.2 AA` — `RNF-08`, `RNF-09`, `RNF-10`)

### 7.1 Global Focus & Landmark Architecture
- **Visible Focus Ring:** Every interactive element (`button`, `a`, `input`, `select`, `[tabindex="0"]`) renders `:focus-visible { outline: 3px solid var(--focus-ring); outline-offset: 2px; }` which is never clipped by `overflow: hidden` containers.
- **Skip Links & Semantic Landmarks:**
  - First focusable element on every page is a `"Pular para a mesa de votação / conteúdo principal"` skip link.
  - Landmarks in `/r/:code`:
    1. `<header role="banner">`: Room title, `ConnectionStatusPill` (`role="status"`), Share/QR modal trigger, Theme/Language selectors, Audio mute toggle, Round Timer.
    2. `<main id="main-stage">`: Current Item card (`<section aria-labelledby="current-item-heading">`), Poker Table (`<section aria-label="Mesa de votação e participantes">`), and Revealed Round Stats (`<section aria-live="polite">`).
    3. `<nav aria-label="Seu baralho de votação">` (Voters only): 1-Tap Suit Selector (`role="radiogroup"`) + Fibonacci Card Deck (`role="group"`).
    4. `<aside aria-label="Fila de itens a estimar">`: Item Queue list and import/export actions.

### 7.2 Keyboard Shortcut & Roving Tabindex Map

| Component / Region | Key / Combination | Behavior |
| :--- | :--- | :--- |
| **Global Navigation** | `Tab` / `Shift + Tab` | Moves sequentially between landmarks: Header Controls → Current Item Actions → Host Table Controls → Suit Selector → Fibonacci Card Deck → Item Queue Drawer. |
| **Fibonacci Card Deck (`CardButton[]`)** | `←` / `→` (Left / Right Arrow) or `Tab` | Moves focus across active Fibonacci cards (`0, ½, 1, 2, 3, 5, 8, 13, 21, ...`) and special cards (`?`, `Coringa`, `AFK`). `Home` / `End` jumps to first/last card. |
| **Select / Retract Card** | `Enter` or `Space` | Casts vote for the focused card (`aria-pressed="true"`). Pressing `Enter`/`Space` again on the already-selected card retracts the vote (`RF-41`). |
| **1-Tap Suit Selector (`SuitSelector`)** | `↑` / `↓` or `←` / `→` inside radiogroup | Cycles between `♣ Paus (Alto)`, `♥ Copas (Médio)`, `♠ Espadas (Baixo)`, `♦ Ouros (Insignificante)`, and `Coringa (Abstenção)` (`RF-51`). |
| **Item Queue Reordering (`RF-32`)** | `Enter` / `Space` on `↑` or `↓` buttons | Moves the item up or down one position in the queue and announces the new position via `aria-live="polite"` (`"Item movido para a posição 2 de 8"`), keeping focus on the moved button. |
| **Modals & Drawers (`CsvImportModal`, Share QR)** | `Escape` | Closes the active modal/drawer and restores focus to the exact trigger button that opened it. Focus is trapped inside modal dialogs (`role="dialog" aria-modal="true"`). |
| **SVG Dashboard Charts (`charts/*`)** | `Tab` / `←` / `→` on data points | Moves focus across sprint data points (`<g tabIndex={0} role="graphics-symbol" aria-label="Sprint 14: Comprometido 34 pts, Entregue 31 pts, Ritmo 1,42">`), opening the accessible tooltip without requiring a mouse hover. |

### 7.3 Automated & Manual Verification Gate (`RNF-10`)
- Every route (`/`, `/r/:code` during voting & revealed states, `/r/:code/screen`, `/teams/:id/sprints`, `/teams/:id/dashboard`, `/teams/:id/history`, `/admin`) is tested in CI via `@axe-core/playwright` across **`360×640` (Mobile)**, **`1280×720` (Desktop)**, and **`1920×1080` (Projector Screen)** in both **Light** and **Dark** themes with **zero serious or critical violations**.
