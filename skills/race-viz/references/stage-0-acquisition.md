# Stage 0 — Acquisition, intake & scope

Goal: the data in hand and verified, a parsed fleet, a verified time base,
and a draft `config.yaml` — before any analysis runs. Acquisition is part of
this stage: if required data is missing and acquirable through
`starter/acquisition/`, fetching it IS stage-0 work, not a separate step.

## Kickoff — inventory, then ask

A race starts as a Claude Code session in the monorepo ("run race-viz on
<race>"). No kickoff template exists; this checklist is the kickoff.

1. **Inventory before asking.** Check `races/<race>/` (raw/, config.yaml,
   decisions/, events.yaml) and everything the user has already attached or
   said in the session. Never re-ask for something already provided.
2. **Present the manifest as a have / missing checklist:**
   - *Required (Tier 1 floor):* tracker export + vendor (YB, Kattack,
     TracTrac, PredictWind, other) · scratch sheet / entry list with ratings ·
     official results (elapsed + corrected + rank, per division).
   - *Race identity:* name + edition · course (point-to-point endpoints or an
     ordered mark list) + official length per a named document · the
     organizer's claimed timezone (to be probe-verified, never trusted) ·
     scoring system + division(s) in scope.
   - *Intent:* tier (1 fleet commentary · 2 boat-annotated · 3 story site) ·
     client boat (or none) · comparison boats (or "propose a set").
   - *Optional — each raises what's possible:* crew journal → events layer
     (Tier 2) · nav log → reconciliation module (Tier 2) · weather brief /
     routing notes → phase-attribution evidence · broadcast or interview
     transcripts → primary research sources · watch schedule → watch-split
     module candidate.
3. **Offer to fetch what's fetchable.** Missing data + a YachtScoring event
   id or YB race id ⇒ offer acquisition (below) and run it on the user's go.
   Ask the USER only for what remains unfetchable.
4. **Conflict precedence** when inputs disagree: official results > tracker >
   transcripts > press. Flag conflicts; never smooth them.

Determine **tier** from inputs plus user intent — never assume. If intent
implies a tier the inputs can't support, say what's missing and what tier the
current inputs do support.

## Acquisition (when data is missing and identifiers exist)

Scripts live in `starter/acquisition/` (read its README first); run from the
repo root.

- **Sources.** YachtScoring: event id from any
  `yachtscoring.com/emenu/<eventId>` URL — public JSON API yields the scratch
  sheet and official results (elapsed/corrected seconds, class + overall
  rank, finish status/time, ratings); event metadata's `satTrackingUrl` is the
  **authoritative source of the YB race id** — never guess ids. YB Tracking:
  race id from `pro.yb.tl/<race>` — undocumented endpoints yield the full
  position history (binary, decoded by the repo script) plus boat metadata
  and per-team start times. **Order matters:** YachtScoring first; it hands
  you the YB id. Some races are YB-only (Newport Bermuda) — results then come
  from the organizer's site.

```
# one command, straight into the race's raw/ dir:
python3 starter/acquisition/fetch_race.py <eventId> --prefix <race> --out-dir races/<race>/raw/
# or the single-source scripts (they write to the CURRENT dir — cd races/<race>/raw first):
python3 ../../../starter/acquisition/yachtscoring_download.py <eventId> --prefix <race>
python3 ../../../starter/acquisition/yb_tracker_download.py <ybRaceId>
```

Outputs (in `races/<race>/raw/`): `<race>_tracks.csv` (already canonical — the
YB adapter maps it 1:1), `<race>_scratch_sheet.csv` (ratings joined from
results), `<race>_results.csv`, and a manifest. Without `--prefix` the files
name themselves `ys<eventId>_*`. Report every warning the run produces.

**Verification ritual — mandatory; its findings land in the stage-0 record:**
- **Never trust a guessed YB id.** A valid-looking id can be a different race
  entirely. Verify: RaceSetup team names against the entry list; first/last
  track points in the right geography; first timestamps against the known
  start.
- **Coverage check:** tracked boats vs scratch entries vs results rows.
  Public YB data can be a fleet subset (Ida Lewis 2025: 3 of ~36 boats
  tracked) — a property of the data, not a bug. Scope spatial analysis
  accordingly and surface the gap at the stage-0 stop.
- **Names differ across sources** (case, sponsor suffixes, committee boats,
  syndicate owners). The YB↔YS join (normalized name + sail number) is
  *proposed*, reviewed at the stage-0 stop, never silent.
- **Staggered per-division starts** are visible in YB `RaceSetup.teams[].
  start` and YS `races[].startTime` — record which source informs
  `start_method` and cross-check against finish − elapsed.
- A YB binary `dtf` channel is **corroboration only** — the pipeline's own
  distance-remaining stays the spine (unknown course model behind YB's
  number).
- Both APIs are undocumented and unversioned. Data for past races persists in
  practice, but keep what you downloaded in `raw/`, and re-run the ritual
  after any re-download.

## Scope procedures

1. **Vendor → canonical schema.** Map the export to `(boat_id, name, t_utc,
   lat, lon)`. Record ping-cadence statistics and gaps; choose `grid_minutes`
   (default 15; justify deviations in the stage-0 record). An unrecognized
   vendor means an adapter gets written — with a real test loop — and
   recorded before anything else consumes the data.
2. **Trim each boat to its own racing window.** A tracker is switched on at the
   dock and often stays on for the delivery home, so a raw export carries motion
   that never happened during the race. Cut per boat to `[that boat's gun − a
   short pad, its official finish + a short pad]`; for a boat with no finish, cut
   at the moment it reached its minimum routed distance-to-finish — the furthest
   it ever got — since everything after that is delivery, tow, or trailer. Do NOT
   use minimum-DTF for finishers: the routed model clamps to zero at the finish
   waypoint's abeam plane, which can precede the real crossing. Drop duplicate
   `(boat, epoch)` rows here too, reporting any that disagree on position.
   **Never solve run-on by excluding a boat that actually raced** — ALIR 2025's
   Scarlett retired, and her tracker then rode to Kingston NY, adding 38 nm of
   phantom extent to every map frame; trimming kept her 49 racing pings.
   Reference implementation: `races/alir2025/trim_tracks.py`, writing a
   `*_tracks_clean.csv` the config points at (`races/bir2026/despike.py` is the
   precedent for a race-local cleaning script).
3. **Name normalization.** Trim and collapse whitespace; Unicode-normalize
   keys while preserving display diacritics; detect duplicate names and
   disambiguate by sail number (display as "Name SAIL"); resolve
   syndicate-vs-boat-name mismatches with the user. Emit an anomalies list.
   Never silently drop a boat — a name-resolution miss is an anomaly, not a
   filter.
4. **Timezone verification.** Take one boat's official finish time, find its
   track crossing of the finish line, and compute the offset. Record the
   probe (boat, official local time, track epoch, offset). If the probe
   disagrees with the claimed timezone, stop and resolve before proceeding.
   Never assume DST behavior; never trust the claimed timezone without the
   probe.
5. **Course model.** Point-to-point → great-circle distance-to-finish spine.
   Marks → routed distance-remaining along the ordered course line
   (`pipeline/route.py`); geometry route.py can't express (e.g. multi-lap
   courses) means new geometry code plus its tests before analysis. Record
   the official course length from race documents when available, rather than
   a computed guess.
6. **Division scoping.** Corrected times are never mixed across scoring
   divisions. Record which division(s) are in scope and which results columns
   apply to each.
7. **Start-time derivation.** Default method: official finish − official
   elapsed. Pursuit starts, staggered multi-day starts, and shortened courses
   break this — verify the method against the notice of race and record it in
   config as `start_method`.
8. **Draft `config.yaml`** (schema in `schemas.md`) carrying everything above.

## Stage-0 stop — scope record (hard stop)

Fill the stage-0 record template (`schemas.md`): fleet count + anomalies,
proposed reference boats with a one-line rationale each, verified timezone +
probe, course model, division scope, tier, grid cadence, scoring system +
params. Present it per the stop mechanic (SKILL.md): deliverables clickable,
then plan mode for stage 1. Stages 1+ require the confirmed record as input.
