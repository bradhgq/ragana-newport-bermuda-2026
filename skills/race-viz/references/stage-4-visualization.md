# Stage 4 — Visualization

Runs in chat — this stage **is** the screenshot loop, and the loop is the quality engine. Requires the confirmed CP-3 record and the CP-2 module list.

## The core five (always render)

1. **The Course** — lat/lon tracks, rhumb or course line, hourly fleet ghosts, phase labels with leader lines, event pins.
2. **The Race** — distance-remaining vs time, compact and introductory, with phase divides.
3. **Where the Race Was Won and Lost** — milestone deltas versus a selectable reference boat; handicap/elapsed toggle; Pace (min/100 nm) vs Total toggle; events overlaid; endpoints taken exactly from official results.
4. **Distance/Speed pair** — XTE and SOG on a shared, central time↔distance axis toggle. SOG carries a **SOG | VMC** y-metric toggle (VMC = closing speed on the finish; **label it VMC, never VMG — no wind data**, I18); in distance-aligned VMC view the park-zone shading is the sharpest "who kept making progress" read.
5. **Race Log table** — every event, categorized, with position.
6. **Distance sailed vs speed** (promoted to standard in R2) — one dot per scored boat, x = sailed distance, y = sailed ÷ time with an **elapsed | corrected** toggle; iso-time rays through the origin; rhumb reference line. Mode-aware outlier clamp (a much-faster boat peels off the elapsed scale and is labelled at the edge rather than flattening the pack). Needs `meta.sailedNm/avgKt` — standard fields, so it renders for any race.

## Race-unique modules (1–3 per race, chosen at CP-2 — this is where the differentiating insight lives)

| Module | Detection heuristic (defaults; provisional — calibrated on one race) |
|---|---|
| Slow-zone / park table | the stage-2 zone-detection heuristic fires |
| Finish-spread strip | ≥ `min_boats` (10) finish within `noise_floor_min` (30) corrected, in-division |
| Nav-log reconciliation | a paper or electronic log was supplied |
| Current / tidal-gate analysis | the course crosses a documented current or gate AND crossing timing/geometry varies materially across the fleet |
| Two-boat duel panel | two boats within ~15 min at ≥10 consecutive milestones |
| Watch-performance split | a watch schedule was supplied (client data — private by default) |
| Squall / system crossing | evidence of a **moving** slowdown propagating through the fleet — requires a moving-frame metric, not a fixed band; treat as advanced and budget extra validation |

Propose modules from the heuristics; the user disposes at CP-2. Vetoed modules stay vetoed.

## Build protocol

- The neutral shell **exists** (`starter/shell/` — both deployed races build through it): a race is `config.yaml` (facts) + `presentation.js` (presentation config) + `copy.js`/`copy.md` (narrative slots) + `events.yaml` + optional `modules/`/`overlays/`. New races are config + modules — **never duplicate-and-edit a monolith** (that era is retired to tags).
- Race-unique charts go through the frozen ctx ABI (`registerModule`/`registerOverlay`, `shell/INVARIANTS.md`): scoped re-rendering, tap-to-inspect, and the mobile touch contract come free; ABI amendments are additive-only, each logged in REPO_NOTES. Modules own their geometry (I15) — a `kind:plot` module declares `section.height`; needing a shell-CSS edit for a module is a bug. (Origin: a zero-height chart found by screenshot.)
- Shared shell modules read per-race captions from `COPY.<module id>` slots via `ctx.copy` — narrative never lives in shared module code. (Origin: the promoted dist-vs-speed module shipping NB2026 claims verbatim on the BIR page.)
- All chart x-values are timezone-naive local strings; never hand Date objects to the plotting layer (doctrine 3).
- Build with the one-command chain — `.venv/bin/python starter/build_race.py races/<race>` — which runs the harness under both `TZ=America/New_York` and `TZ=UTC` in order; piecemeal invocations invite the stale-standalone trap (stage-5).

## Screenshot loop (first-class, scheduled — not "iteration if needed")

- Expect 2–4 rounds; **minimum 1 before handoff**. Each round: user screenshots + verbal notes → fixes → rebuild → suite.
- Every human-caught defect gets (a) fixed and (b) captured as a regression assertion when expressible (prime rule 5). Log the defect→assertion mapping in the CP-4 record.
- Aesthetic calls are conversation, not unilateral taste: when the decision is design rather than correctness, present options.
- Copy discipline: propose microcopy freely (labels, errors, empty states, tap notes) — never author analysis claims; those come only from synthesis and the user.

## Public cut (Tier 2 → any public artifact)

Strip private-log candor by default; re-admit items only with per-item opt-in (recorded in the CP-5 ledger). Events carry a `visibility` field in `events.yaml` — the cut itself is mechanical; the opt-ins are human decisions.

## CP-4 Screenshot Log — hard stop

Round count, the defect→assertion table, and the user's approval to hand off. Emit the template and **end the turn**.
