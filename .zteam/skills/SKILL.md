---
name: zteam
description: >-
  Run the Dev Team Orchestrator MCP pipeline (hybrid runtime: Path A Cursor Task
  with inherit / allowlisted slugs, or Path B MCP role-agents on 9router /
  OmniRoute / OpenRouter via package .env). Use when the user invokes /zteam,
  @zteam, @zteam/config, @zteam/models, @zteam/documentation, @zteam/tests, or
  asks to run the full team / orchestrator on an idea under a project root.
disable-model-invocation: true
---

# zteam — Dev Team Orchestrator

## Commands (route first)

When the user invokes a **subcommand**, follow that path **before** a generic full pipeline. Canonical list also lives in [`.zteam/README.MD`](../../.zteam/README.MD). A local copy of this skill is kept at **`.zteam/skills/SKILL.md`** (created/refreshed whenever `.zteam/` is bootstrapped — before any pipeline LLM call).

| Trigger | Action |
|---------|--------|
| **`@zteam/config`** / `/zteam config` | Full setup — `.zteam/config.json` (`provider`, `projectType`, `models`, `cursorModels`, `maxTokens`, `scope`, `gitignoreIgnore`). Do **not** start the pipeline unless the user also asked to run it. |
| **`@zteam/models`** / `/zteam models` | **LLMs only** — guided questions for SA/TA/**UX**/SE/QA (+ fallback or `cursorModels` per role) → update `models` / `cursorModels` / `provider` in this project's `.zteam/config.json`. |
| **`@zteam/documentation`** / `/zteam documentation` / `/zteam docs` | Docs-only — `workflow: "docs"`. |
| **`@zteam/tests`** / `/zteam tests` | TDD tests only — `workflow: "tests"` + `slug` (QA-red → QA-verify). |
| **`@zteam`** / `/zteam` (no subcommand) | Normal pipeline; pick workflow from the table below. |

## MCP tools (must match GetDynamicTools after MCP restart)

| Tool | Purpose |
|------|---------|
| `get_zteam_config` | Read merged config, `provider`, `projectType`, `cursorModels`, `envEndpoint`, `needsConfig`, `llmRuntime`, suggestions |
| `write_zteam_config` | Write `.zteam/config.json` (always include **uiUxDesigner**, optional `provider`, `projectType` & `cursorModels`) |
| `ensure_zteam_setup` | Skill + `.docs` stubs + optional config template (no LLM) |
| `run_development_pipeline` | Pipeline / 2-wave playbook (`workspaceRoot` **required**, `workflow` optional) |
| `get_development_step` | Fetch only the next unfinished stage from the on-disk plan |
| `run_development_check` | Scripted red/focused/verify checks with short diagnostics and full logs on disk |
| `get_pipeline_state` | Live Canvas Dashboard state + push subagent telemetry (`recordStage`, `recordRole`, `recordStatus`, `recordMessage`, `checkGate`) |
| `approve_gate` | HITL when `ZTEAM_HITL=1` |

If GetDynamicTools shows an outdated schema (missing `provider`, `projectType`, `cursorModels`, or `recordStage`), **restart the zteam MCP server** so Cursor reloads `src/orchestrator.ts`.

## Hybrid Strategy: Using 9router / OmniRoute / OpenRouter Models as Subagents

Cursor's `Task` tool **intentionally blocks custom / BYOK / OpenAPI model slugs** (like `9r-code-heavy` or `9r-code-light`) in `Task({ model })` — only `"inherit"` and native Cursor allowlisted slugs (`composer-2.5-fast`, `claude-sonnet-5-5-high`, etc.) are accepted. Also, never pass `"auto"` to `Task({ model })` — always use `"inherit"`.

To run your 9router / OmniRoute / OpenRouter models across isolated team roles, `.zteam/config.json` supports **`provider`: `"hybrid"` (default) | `"cursor-task"` | `"ninerouter-direct"`**:

| Path | Condition (`provider: "hybrid"`) | `llmRuntime` | How it executes |
|------|----------------------------------|--------------|-----------------|
| **Path A — Cursor Task (`inherit`)** | `provider: "cursor-task"`, OR all primaries are `"inherit"`, OR all 5 roles share **one** custom model (e.g. all `9r-code-heavy` with `provider: "hybrid"`) | **`cursor`** | MCP returns `delegationPlaybook` where every `stage.model` is `"inherit"` (or an allowlisted `cursorModels` slug) and `stage.requestedModel` records the desired `9r-*` id. Select `9r-code-heavy` in the Cursor parent chat picker → all `Task(model: "inherit")` subagents run on `9r-code-heavy`! |
| **Path B — MCP Role-Agents (`.env` Gateway)** | `provider: "ninerouter-direct"`, OR `provider: "hybrid"` with **multiple distinct** custom models across roles (e.g. `SA/TA/SE = 9r-code-heavy`, `UX/QA = 9r-code-light`) | **`ninerouter`** | MCP runs LangGraph role-agents via `ChatOpenAI` directly against the OpenAI-compatible gateway configured in `dev-team-orchestrator/.env` (`NINEROUTER_BASE`/`NINEROUTER_KEY`, `OMNIROUTE_*`, or `OPENROUTER_API_KEY`). Secrets stay in `.env`, **never** in `~/.cursor/mcp.json`. |

### Gateway doctor (before any Path B run)

`get_zteam_config` returns `gatewayDoctor`. `run_development_pipeline` on `llmRuntime=ninerouter` stops **before** the graph when the gateway is not usable.

| `gatewayDoctor.failureKind` | What you tell the user | What you must not do |
|---|---|---|
| *(absent, `ok: true`)* | Continue. If `usedLocalFallback` is true, say this run used `http://127.0.0.1:20128/v1` because the configured tunnel is dead, and they should set `NINEROUTER_BASE` to that URL. | — |
| `gateway_auth` | 9router is up but rejected `NINEROUTER_KEY` (hint is only the last 4 characters). Copy the API key from the **9router UI** and set `NINEROUTER_BASE=http://127.0.0.1:20128/v1`. | Do not read `%AppData%\\Roaming\\9router` SQLite. That `key` column is not a Bearer token. |
| `gateway_down` | Open the 9router app on port 20128, or point `NINEROUTER_BASE` at a host that answers `GET /v1/models`. | Do not probe random trycloudflare hostnames. |
| `invalid_model` | The gateway is up and is missing the role ids (`9r-code-heavy` / `9r-code-light`). Quote `sampleModelIds`. | Do not start the pipeline. |
| `missing_env_credentials` | Fill `dev-team-orchestrator/.env` from `.env.example`. | Do not put the key in `mcp.json`. |

If `gatewayDoctor.ok === false`, stop. Do not start the game pipeline.

### After `run_development_pipeline` (Path A: `llmRuntime === "cursor"`) — 2-Wave Playbook, Mechanical Gates & Live Canvas Dashboard

When `run_development_pipeline` runs on `llmRuntime="cursor"`, it writes `.docs/host.json` (Node/SQLite/native-compile probe), `.zteam/dashboard/index.html`, and returns a **2-wave `delegationPlaybook`**:

- **Wave 1** (when `.docs/todo.md` has no open slugs yet): `sa-requirements` → `ux-juice` → `fidelity-critic` → `ta-stack` → `architecture-critic` → `ux-design-system` → `sa-todo-and-specs`.
- **Wave 2** (expanded per open `[ ]` slug in `.docs/todo.md` when you call `run_development_pipeline` again with `workflow: "resume"` after `sa-todo-and-specs`):
  - Three-handed spec per slug: `sa-spec:{slug}` → `ux-spec:{slug}` → `ta-spec:{slug}`
  - TDD per slug: `qa-tdd-red:{slug}` → `se-implement:{slug}` → `delivery-critic:{slug}`
  - Final suite verification: `qa-tdd-verify`

The default response contains one stage and the path of the full plan on disk. Display the two observability links once, then use this loop:

1. Use the returned stage, then call `get_development_step` for subsequent stages. Do not request the complete playbook repeatedly.
2. The host records start with `get_pipeline_state(compact:true)`. For SE keep the returned writerToken; pass it on progress/completion and to focused checks. A second writer is rejected. Do not edit the same slug while its engineer is active. Read-only review is allowed.
3. Send one worker the stage instructions, slug, exact test paths and acceptance goal. Bootstrap also receives the original idea. Do not append the full chat, checkpoint, playbook or unrelated files. Workers write artifacts to disk; their handoff is at most eight lines: changed paths, command/result, remaining failure, next action.
4. QA red uses `run_development_check(mode:"red",slug,tests:[...])`. SE uses `mode:"focused"` with explicit paths and writerToken until those tests pass. Complete logs stay in .docs/execution/logs; show only the short result and log path. On failure read the failed test and cited source range. The parent takes over only after the worker stops or the same failure occurs twice; stop the worker and record error with its token before starting a new writer. Never steal a live lock or use a timer to infer completion.
5. A delivery critic is read-only and uses the existing focused-test receipt and file presence; it does not launch another implementation or rerun passing tests. At final QA call `run_development_check(mode:"verify")`: it runs the project's npm run verify, or test fallback, and reuses success only when source/configuration/environment are unchanged. Pass exitCode and short evidence to the gate; mark tasks only after current final verification. Run commit only after verification and required UI evidence. Do not commit unless the user authorized it.
6. For UI changes, check the actual flow once (for example create room, enter room, connection state), including relevant errors. Batch deterministic actions and capture the form and final room states where sufficient; obtain additional state only when needed to choose or validate the next action. Follow browser tool observation requirements. Do not repeat the entire browser journey after an unrelated change.
7. Record done/error through get_pipeline_state with compact:true and writerToken. If a gate fails, repair only its cited reasons within the retry budget. After sa-todo-and-specs, request workflow=resume once to expand the next wave; otherwise fetch the next step. Publish a single pipeline done only after required stages, verification and report.

For happy-dom connection/navigation noise, mock the specific transport or navigation dependency in unit tests, and close connections after each test. Preserve behavioral assertions and a separate integration/browser check against the real server. Do not globally swallow console errors, disable unhandled-error detection or ignore failing assertions. If the application source is unavailable, report the missing test setup instead of claiming the noise is fixed.

### `@zteam/models`

Help the user choose models for **this** project (`provider: "hybrid"` | `"cursor-task"` | `"ninerouter-direct"`, Cursor aliases, or 9router/OmniRoute/OpenRouter ids). Do **not** start a pipeline.

```text
1. workspaceRoot = absolute Cursor open folder
2. projectRoot = user app folder if given (else ".")
3. get_zteam_config({ workspaceRoot, projectRoot })
4. Show current provider + models + cursorModels + projectType + llmRuntime + envEndpoint + modelSuggestions
5. Ask modelQuestions: for EACH role (SA/TA/**uiUxDesigner**/SE/QA) pick primary AND fallback (default fallbacks to "inherit", never "auto")
6. Prefer scope:
   - projectRoot != "." → "app" (write {appRoot}/.zteam/config.json)
   - else → "workspace" (write {workspaceRoot}/.zteam/config.json)
7. write_zteam_config({ workspaceRoot, projectRoot, scope, provider, projectType, models, cursorModels, maxTokens: keep existing })
8. Confirm path written + final provider + models + llmRuntime; point to .zteam/config.json
9. Stop (unless user asked to run a pipeline next)
```

### `@zteam/config`

```text
1. workspaceRoot = absolute Cursor open folder (Workspace Path)
2. projectRoot = user app folder if given (else ".")
3. get_zteam_config({ workspaceRoot, projectRoot })
4. Ask setup questions — provider (hybrid/cursor-task/ninerouter-direct), projectType (webgame/webapp/crud/backend/...), models (fallbacks="inherit"), cursorModels, maxTokens, gitignoreIgnore
5. write_zteam_config({ workspaceRoot, projectRoot, scope, provider, projectType, models, cursorModels, maxTokens?, gitignoreIgnore })
6. Confirm paths written; point user to .zteam/config.json and .zteam/README.MD
7. Stop (unless user asked to run a pipeline next)
```

## Adaptive execution and compact handoffs

Use the smallest workflow matching the request: fix for a defect, feature for a bounded addition, resume for interrupted work. Reuse completed stages only when their artifacts and acceptance evidence still apply. Never bypass QA or mark a task complete merely because another stage started.

Give each role its stage instructions, current slug, relevant source paths, approved constraints and any failing test excerpt. Bootstrap gets the original idea; downstream roles read the relevant requirements instead of receiving the entire chat and every document. Send changed files through the required FILE contract, with concise test evidence and remaining blockers. Do not repeat unchanged artifacts in prose.

The orchestrator may choose implementation details, targeted tests and the smallest repair scope without asking for routine confirmation. Keep scripted dependencies intact. Consult another role for a specific unresolved decision; otherwise proceed. Respect configured retry budgets and report the failing evidence when progress stops. A repair should address gate.reasons, not rerun unrelated phases.

Use compact:true on frequent get_pipeline_state event updates to avoid repeating the complete checkpoint. Request the full state only for planning/resume. For delegated execution, the host records start, concise progress at artifact milestones or every 30 seconds while waiting, and exactly one done/error per attempt through get_pipeline_state. Include measured charsIn only at dispatch and charsOut only on response; omit unknown usage, never invent token counts. Pass testExitCode and testOutput for QA gates. Keep task completion in todo.md tied to QA evidence. Publish pipeline done only after all required stages and the final report; otherwise publish pipeline error with a resume hint. Never edit live JSON directly.

The dashboard is the live MCP observer. Studio shows the graph and runs launched through its Agent Server. For MCP traces, configure LangSmith explicitly; correlate the zteamRunId metadata with the dashboard run identifier.

## Context budget

Default to one compact chat banner per milestone. Keep prose handoffs under eight lines; source artifacts and exact test evidence are exempt. Read only the failed test and the error's source range when diagnosing a focused failure. Do not paste repeated AggregateError stacks, full typecheck logs, diffs or browser trees into the conversation. The raw logs and on-disk checkpoint remain the evidence source. Use the scripted MCP checks instead of rebuilding the same shell commands in each agent. Never change assertions merely to reduce output.
