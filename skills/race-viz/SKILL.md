---
name: race-viz
description: Turn yacht-race tracker data plus supporting documents into researched race analysis, quantitative insights, and an interactive dashboard through a staged, checkpointed pipeline. Use this skill whenever the user provides a race tracker export (YB, Kattack, TracTrac, PredictWind, or similar), a scratch sheet or entry list, official race results, crew journals, or navigation logs — or asks for race analysis, a race debrief, a race dashboard or visualization, post-race commentary, "how did we do," "where did we win or lose the race," or a race blog / story site. Also use when resuming any stage of an existing race-viz project (reviewing findings, iterating on dashboard screenshots, preparing or executing a Claude Code handoff) — or when the user provides a YB Tracking or YachtScoring race link or event id to pull data from — even if the user doesn't name the skill.
---

# race-viz — staged race analysis and visualization

Produces one of three tiers, each a strict superset of the previous:

- **Tier 1 — Fleet commentary** (public data only): fleet-level analysis page — course/fleet map, leaders' race shape, phase structure, notable duels, 1–2 race-unique metrics.
- **Tier 2 — Boat-annotated debrief** (client logs): Tier 1 plus the client boat highlighted, log events pinned to the track, log↔tracker reconciliation, benchmark comparisons, and a private debrief document.
- **Tier 3 — Story site**: Tier 2 plus a narrative post with embedded visualizations, productionized via Claude Code.

Worked examples, kept in the monorepo: RAGANA / Newport Bermuda 2026 (`races/nb2026/` — point-to-point, the original) and Ragana / Block Island Race 2026 (`races/bir2026/` — marks course with routed distance-remaining, division-scoped scoring, race postprocess). Their numbers are settled golden fixtures — never re-derive or "correct" them.

## Operating environments

The same skill files serve both environments; each stage file states its default home.

- **Claude chat** is the orchestration home: stages 0–4, every checkpoint conversation, the research pass (use the deep Research feature when available), and the screenshot-iteration loop. The chat container may execute the pipeline for exploration and for normal-size fleets. The chat session is also the **coordinator**: at every Claude-Code-bound step (data acquisition, escalated analysis, new geometry code, productionization) it emits a complete, paste-ready prompt — the user never composes a handoff themselves.
- **Claude Code** executes data acquisition (the race APIs are unreachable from the chat container's restricted network), always executes stage 5 (productionize), and executes stage 2's pipeline from the start when an escalation trigger fires: fleet > ~150 boats, raw pings > ~1M, a course geometry the repo's route model can't express (standard mark courses are covered by `pipeline/route.py`), or a new tracker-vendor adapter. (Thresholds are provisional — calibrated on one race; revisit after race #2.)
- State passes between environments as files: `config.yaml`, `events.yaml`, `decisions/CP-*.yaml`, `dashboard_data.json`, and a thin per-race `PROMPT.md` for the Claude Code session.

## Prime rules

1. **Exploration is free; shipped numbers come only from the pipeline.** Ad-hoc analysis may generate hypotheses, but every number that lands in a findings memo, synthesis document, or `dashboard_data.json` must be produced by the repo pipeline run against `config.yaml`, with the exact invocation logged into the handoff.
2. **Checkpoints are input dependencies.** Each stage requires the named decision record from the previous checkpoint as a literal input. If the record is missing, emit the checkpoint form (templates in `references/schemas.md`) and end the turn. Never begin the next stage's artifacts in the same response that presents a checkpoint form — even if the user asked to "run the whole thing." A missing record is a missing input, not an invitation to proceed.
3. **Golden numbers are generated once, then frozen** (I16). At CP-2 each race gets golden regression values from official results plus one hand-verified probe; after that they are fixtures. Changing a golden — *or the frozen GATE-A oracle* — requires an explicit user instruction captured in a `decisions/` ledger entry; the re-freeze and its rationale live in that record, never silently in a rebuild.
4. **Privacy defaults private.** Crew journals and nav logs are private performance data. Anything derived from them appears publicly only with per-item opt-in recorded in the CP-5 publication ledger. Never publish claims about *other* boats' crew decisions beyond their own public statements.
5. **Every human-caught correction becomes a regression assertion** (where expressible) before the Claude Code handoff. The test suite is the accumulated memory of screenshot review.

## Stage router

Read the stage's reference file before executing it. Do not load stage files ahead of need.

| Stage | Read first | Runs in | Requires | Emits | Checkpoint |
|---|---|---|---|---|---|
| acq (optional) | `references/data-acquisition.md` | Claude Code or user-run locally | race identifiers (YachtScoring event id / YB race id) | tracks, scratch sheet, results CSVs + manifest | none — verification lands in CP-0 |
| 0 Intake & scope | `references/stage-0-intake.md` | chat | user's raw inputs | manifest, fleet parse, TZ verification, draft `config.yaml` | **CP-0 Scope Record** — hard stop |
| 1 Research | `references/stage-1-research.md` | chat (Research feature preferred) | CP-0 | research brief + claims-in-circulation list | soft review, no hard stop |
| 2 Analysis | `references/stage-2-analysis.md` | chat-orchestrated; pipeline in container or Claude Code per triggers | CP-0 | `dashboard_data.json`, findings memo, frozen goldens | **CP-2 Findings & Modules Record** — hard stop |
| 3 Synthesis | `references/stage-3-synthesis.md` | chat | CP-2 (+ research brief) | narrative pack: acts, decompositions, discrepancy register, lessons | **CP-3 Corrections Record** — hard stop |
| 4 Visualization | `references/stage-4-visualization.md` | chat | CP-3 + CP-2 module list | built dashboard v1…vN | **CP-4 Screenshot Log** (≥1 round) — hard stop |
| 5 Handoff & publication | `references/stage-5-handoff.md` | Claude Code | CP-4 + green regression suite | handoff package, public cut, hosted build | **CP-5 Publication Ledger** |

**Tier relaxation:** Tier 1 may merge CP-3 into CP-2, and CP-5 into CP-4. CP-0, CP-2, and CP-4's minimum one screenshot round are mandatory at every tier — CP-2 is where fixed-window-class artifacts get caught by human eyes, and no tier is exempt from that.

**Resuming mid-project:** identify the latest confirmed decision record (ask the user, or locate `decisions/CP-*.yaml` in the repo). Enter at the following stage. Never skip past a missing CP-0 or CP-2.

## Doctrine gates

Enforce these as testable predicates, not advice. Each was paid for with a real bug in the worked example.

1. **Spatial phenomena → spatial metrics.** Any slow-zone / current-gate / park metric is computed over each boat's own traversal of the same distance-remaining or geographic band — never a wall-clock window. Gate: stage-2 validation plus a module canary assertion in the test harness. (Origin: the Gemini II "0% parked" artifact.)
2. **Endpoints come from official results.** Comparative charts end at values parsed from official elapsed/corrected; tracker-derived milestones are estimates only. Gate: endpoint assertions against official results, in both scoring modes. (Origin: a DTF-20 truncation that flipped finish signs for three boats.)
3. **One verified time base, rendered timezone-naive.** Timezone verified at stage 0 by triangulating an official finish against the track; all chart x-values are naive local strings — never Date objects; the suite runs under a non-UTC `TZ`. Expect participant logs to carry clock-base errors and reconcile them explicitly. Gate: the tz-probe assertion.
4. **Names are dirty.** Normalize whitespace and Unicode early; disambiguate duplicate names by sail number; resolve syndicate-vs-boat-name mismatches with the user. Gate: assertion that every selection-set name exists in the data keys.
5. **Loss decomposition is benchmark-dependent.** Every "lost X here" claim names its reference boat and shows arithmetic that reconciles to the official delta. Gate: stage-3 sum-check on every decomposition table.
6. **Corrected margins have a noise floor** (`noise_floor_min` in config, default 30). Margins under the floor are narrated as scoring noise, and the stage-1 scoring-controversy check is mandatory before narrating any tight margin. Gate: stage-3 language check.
7. **Test the stakeholder's hypothesis before building their view.** When a stakeholder requests a view to demonstrate X, test X against the data before speccing the view — and ship the view with the verdict in its caption, whichever way it lands. A view built to confirm a wrong hypothesis is a printed error. Gate: the caption of any stakeholder-requested view names the verdict. (Origin: round 2's "show the Sunday gain came from sailing shorter" — ten minutes against the tracker reversed it; the gain was boatspeed, and the shipped caption says so.)
8. **Buy the cheapest sufficient view.** Restate every visualization request as the question it answers; if a cheaper existing surface answers it, ship that and record the deferral with its rationale in `decisions/` — deferred-with-reason keeps stakeholder trust, silently dropped requests don't. Gate: every deferred request has a decisions/ entry. (Origin: the sailed-distance x-axis, near-degenerate with the DTF axis; a y-metric toggle + one scatter answered the real question at a fraction of the cost.)

7. **Test the stakeholder's hypothesis before building the view.** When a request arrives bundled with a claim ("show that we gained because we sailed shorter"), verify the claim against the tracker *first*, in minutes, before speccing anything — then ship the view with the verdict, whichever way it lands. (Origin: the round-2 "we gained on shorter routing" hypothesis, which the data reversed — the gain was boatspeed; the shipped captions say so.)
8. **Translate the request into the analytical question, then pick the cheapest sufficient view.** A literal feature ask is not always the cheapest answer to the need behind it. Name the question, choose the lowest-cost view that answers it, and defer the literal ask with rationale if a cheaper view suffices. (Origin: a sailed-distance x-axis — near-degenerate with DTF here — deferred in favor of the VMC toggle + dist-vs-speed scatter.)

Soft doctrines: **show the arithmetic** (every derived number traceable in-document) and **primary sources beat aggregators** (official notices and transcripts over press summaries; press for corroboration).

## Contracts

All formats live in `references/schemas.md`: `config.yaml`, `events.yaml`, `dashboard_data.json`, decision-record templates CP-0…CP-5, the findings-memo format, the discrepancy-register format, and the Claude Code `PROMPT.md` skeleton. Build commands and code live in the starter repo — one command, always the full chain: `.venv/bin/python starter/build_race.py races/<race>` (build_data → postprocess → harness-gated shell build → harness under the second TZ → frozen-oracle compare). This skill defines process and judgment; the repo defines code; `config.yaml` defines the race.

Monorepo: `github:bradhgq/yacht-race-visualization` (public). Layout: `starter/` holds the engine code (shell, pipeline, adapters, acquisition, tests); `skills/race-viz/` is this skill (the authoritative source of truth); `docs/` holds the spec and build logs; `races/<race>/` holds each race's config + data + committed `dist/`. Acquisition scripts: `starter/acquisition/`; worked examples: `races/nb2026/`, `races/bir2026/`; kickoff prompt template: `docs/KICKOFF_TEMPLATE.md`.
