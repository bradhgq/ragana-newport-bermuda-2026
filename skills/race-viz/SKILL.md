---
name: race-viz
description: Turn yacht-race tracker data plus supporting documents into researched race analysis, quantitative insights, and an interactive dashboard through a staged pipeline with owner stops. Use this skill whenever the user provides a race tracker export (YB, Kattack, TracTrac, PredictWind, or similar), a scratch sheet or entry list, official race results, crew journals, or navigation logs — or asks for race analysis, a race debrief, a race dashboard or visualization, post-race commentary, "how did we do," "where did we win or lose the race," a race blog / story site, or to kick off / run race-viz on a race. Also use when resuming any stage of an existing race-viz project, or when the user provides a YB Tracking or YachtScoring race link or event id to pull data from — even if the user doesn't name the skill.
---

# race-viz — staged race analysis and visualization

Three tiers, each a strict superset of the previous:
1. **Fleet commentary** (public data: map, race shape, phases, duels, 1–2 race-unique metrics)
2. **Boat-annotated debrief** (+ client boat highlighted, log events on the track, log↔tracker reconciliation, benchmarks, private debrief)
3. **Story site** (+ narrative post with embedded visualizations, hosted)

Worked examples: `races/nb2026/` (point-to-point) and `races/bir2026/` (marks course — routed distance-remaining, division-scoped scoring). Their numbers are settled pinned values — never re-derive or "correct" them.

## Vocabulary

- **Stage / stage stop** — six stages; each ends at a stop where the owner reviews before anything further runs.
- **Stage record** — the confirmed decision file a stop produces (`races/<race>/decisions/stage-N-*.yaml`; older `CP-*.yaml` files are the same thing, historical).
- **Pinned values** — the hand-pinned expected numbers (config `pinned_values:` + `tests/regression.json`) the harness asserts on every build.
- **Snapshot reference** — `races/<race>/snapshot/dashboard_data.json`, the byte-pinned payload; every rebuild diffs against it (the **snapshot compare**, tie-exempt).
- **Doctrine checks** — the enforceable process rules below; each was paid for with a real bug.

## Environment

Claude Code, in this monorepo, runs everything — stage 0 (acquisition) through stage 5 (publication); state lives in the repo. Chat appears exactly once: as stage 1's optional owner-run deep-research input.

## The stop mechanic

At every stage stop: (1) write the stage's deliverables as clickable artifacts; (2) host them on a temporary localhost preview (session-scoped, never committed — screenshots are never committed anywhere, not in `docs/`, not in PR bodies); (3) enter plan mode for the next stage, so the owner's comments land before anything runs. Degrade to present-inline-and-wait where preview or plan mode is unavailable. A missing stage record is a missing input — never begin the next stage's artifacts in the turn that presents a stop, even when asked to "run the whole thing."

## Prime rules

1. **Shipped numbers come only from the pipeline** — the one-command chain `.venv/bin/python starter/build_race.py races/<race>`, invocation logged in the stage record. Exploration is free.
2. **Stage records are input dependencies** — each stage requires the previous stop's confirmed record (templates in `references/schemas.md`).
3. **Pinned once, then fixtures** (I16) — values pin at the stage-2 stop from official results + one hand-verified probe; changing a pinned value or the snapshot reference requires an explicit owner instruction in a `decisions/` ledger entry, never a silent rebuild.
4. **Privacy: what the dashboard doesn't show is discarded** — private inputs (journals, nav logs, transcripts) never enter the repo; each derived item ships only by a case-by-case human decision flagged at the stop.
5. **Every human-caught correction becomes a regression assertion** (where expressible) before stage 5 ships.

## Stage router

Read the stage's reference file before executing it; do not load ahead of need.

| Stage | Read first | Needs | Stop & deliverable |
|---|---|---|---|
| 0 Acquisition, intake & scope | `references/stage-0-acquisition.md` | raw inputs and/or race identifiers | **hard** · scope record — manifest, fleet parse, TZ probe, draft `config.yaml` |
| 1 Research | `references/stage-1-research.md` | stage-0 record | soft · research brief + claims-in-circulation list |
| 2 Analysis | `references/stage-2-analysis.md` | stage-0 record | **hard** · findings memo + module list + pinned values |
| 3 Synthesis | `references/stage-3-synthesis.md` | stage-2 record (+ research brief) | **hard** · corrections record over the narrative pack |
| 4 Visualization | `references/stage-4-visualization.md` | stage-3 record + module list | **hard** · review-round log — hosted build, ≥1 owner round |
| 5 Productionize & publish | `references/stage-5-handoff.md` | stage-4 record + green suite | publication ledger — public cut, live build |

Tier 1 may merge stage 3's stop into stage 2's, and stage 5's ledger into stage 4's sign-off; stage 0, stage 2, and stage 4's minimum one review round are mandatory at every tier. Resuming mid-project: find the latest confirmed record in `decisions/`, enter at the following stage; never skip past a missing stage-0 or stage-2 record.

## Doctrine checks

Enforce as testable predicates, not advice.

1. **Spatial phenomena → spatial metrics** — slow-zone/park metrics run over each boat's own traversal of the same band, never a wall-clock window; checked by a module canary. (Origin: the "0% parked" artifact.)
2. **Endpoints come from official results** — comparative charts end at official elapsed/corrected values; asserted in both scoring modes. (Origin: a truncation that flipped three finish signs.)
3. **One verified time base, rendered timezone-naive** — TZ probe at stage 0; chart x-values are naive local strings, never Date objects; suite runs under two TZs. Expect participant logs to carry clock-base errors.
4. **Names are dirty** — normalize early, disambiguate duplicates by sail number; asserted: every selection-set name exists in the data keys.
5. **Loss decomposition is benchmark-dependent** — every "lost X here" names its reference and reconciles to the official delta (stage-3 sum-check).
6. **Corrected margins have a noise floor** (`noise_floor_min`, default 30) — sub-floor margins narrate as scoring noise; the stage-1 controversy check gates tight-margin language.
7. **Test the stakeholder's hypothesis before building their view** — verify the bundled claim against the tracker first; ship the view with the verdict in its caption, whichever way it lands. (Origin: the "shorter routing" claim the data reversed.)
8. **Buy the cheapest sufficient view** — restate every visualization request as the question it answers; if a cheaper surface answers it, ship that and record the deferral in `decisions/`.

Soft doctrines: show the arithmetic; primary sources beat aggregators.

## Contracts

`references/schemas.md` holds every format: `config.yaml`, `events.yaml`, `dashboard_data.json`, stage-record templates, findings-memo and discrepancy-register formats, the stage-5 productionization checklist. This skill defines process and judgment; the starter repo defines code; `config.yaml` defines the race. A race kicks off as a session in this repo — stage 0 carries the checklist; no kickoff template exists.
