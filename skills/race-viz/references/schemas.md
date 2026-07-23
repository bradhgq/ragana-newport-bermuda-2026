# Contracts & templates

Boundary rule: **facts about the race → `config.yaml`; judgment about races → the skill; code → the repo.** Narrative content is data (`events.yaml`), never pipeline code.

## config.yaml — per-race facts

```yaml
race: { name: "", edition: 2026, slug: "", organizer_url: "" }   # slug = output filename stem
tracker: { vendor: auto, path: raw/tracks.csv }      # yb | kattack | tractrac | predictwind | auto
official_results:
  path: raw/results.csv
  columns: { rank: , name: , sail: , rating: , elapsed: , corrected: , type: ,
             finish_local: , division: , class_rank: , status: , retire_reason: }
                                # class_rank drives meta.clsPos; status/retire_reason carry DNF rows
  finish_statuses: [FIN, AOK]   # status values counted as finishers; anything else retires
entries: { path: raw/scratch.csv }                   # optional scratch sheet
course:
  type: point_to_point          # point_to_point | marks (marks = routed DTF via pipeline/route.py)
  start: [lat, lon]
  finish: [lat, lon]
  official_length_nm: 635.1     # from official documents; marks builds log the polyline delta
  finish_radius_nm: 0.7         # arrival cut for boats without an official finish
  marks: []                     # ordered [lat, lon] turning marks; required when type: marks
  mark_radius_nm: 1.0           # rounding radius (conventions documented in pipeline/route.py)
time:
  official_tz: America/New_York
  utc_offset: -4                # fixed offset for the race window (I1: naive-local rendering)
  tz_label: EDT
  race_start_utc: ''            # ISO, tz-aware — data trim (a little before the first warning)
  tz_probe:                     # REQUIRED — stage-0 verified, never assumed
    boat: ""
    official_finish_local: "YYYY-MM-DD HH:MM:SS"
    track_epoch_utc: 0
scoring:
  system: tot                   # tot | tod | custom
  params: { rating_column: rating }
  probe_boats: ["", ""]         # official corrected must reproduce exactly before fleet math
start_method: finish_minus_elapsed   # finish_minus_elapsed | pursuit | staggered | custom (document it)
divisions_in_scope: []
client_boat: null               # null for Tier 1
reference_boats: []
tier: 1                         # 1 | 2 | 3
name_overrides:                 # structured, not a flat map (I4)
  by_id: {}                     # tracker boat_id -> name (duplicate-name split)
  by_name: {}                   # tracker name -> name (syndicate/sponsor cleanup)
  display: {}                   # results name -> shipped display name (dupes by sail number)
groups:                         # chip-group semantics; membership is stage-0/stage-2 judgment
  hero_key: hero
  by_rank: {}                   # e.g. { class: [3,7,9], podium: [1,2,3] }
  default_key: fleet_other
  dnf_key: fleet_dnf
extra_boats: []                 # tracked but unscored: { track_name, display, type, group }
grid: { minutes: 15, end_utc: '', interpolate_limit: 4 }
sog: { half_window_s: 900, min_span_s: 600 }         # centered 30-min SOG window
fleet: { resample: 1h, min_points: 5 }               # hourly ghost layer
milestones: { start_nm: 600, step_nm: 20 }
finish_pad_min: 3
events: { path: events.yaml }
event_categories: [crew, systems, sail, tactics, insight, milestone]   # draw order, low -> high
# reconcile: { path: navlog.yaml, matched_key: matched_local }   # Tier 2+, paper nav log only
zone_detection:                 # defaults find ZERO candidates on the worked example (NB2026's
  band_nm: 10                   # only sub-threshold run traverses ~3 h vs min 6) — they are
  collapse_frac: 0.5            # proposal knobs, not truth. Detection PROPOSES and logs its
  min_traversal_hours: 6        # band-median table; the stage-2 stop DECIDES; config RECORDS it:
  # zone: { upper_nm: 180, lower_nm: 80 }   # authored stage-2 bounds (NB2026's shipped park)
finish_spread: { window_min: 30, min_boats: 10 }
noise_floor_min: 30             # per-race; scoring-system dependent
privacy: { default: private }
output:
  dir: out/
  # generated: 'YYYY-MM-DD'     # pin only to reproduce a shipped build byte-for-byte
pinned_values:                  # pinned at the stage-2 stop; changing one requires a recorded instruction (I16)
  tz_probe: { epoch: 0, rendered: "YYYY-MM-DD HH:MM" }
  endpoints: { ref: "", corrected_min: 0.0, elapsed_min: 0.0 }
  module_canaries: {}           # e.g. { park: { boat: "Gemini II", u4: 31 } } — numbers, not "31%"
  names_present: []             # I4 name-hygiene fixtures (dupes disambiguated, normalization)
  names_absent: []
  finstrip_count: 0
```

`starter/template/config.yaml` is the fill-me copy of this schema, kept in
lockstep: when the pipeline grows a key, the template and this block move
together (the first cold-start had to reverse-engineer a dozen
keys from pipeline code). The pace endpoint value
(`endpoints.pace_min_per_100`) is deliberately NOT a config.yaml key: it lives
in `tests/regression.json` only, asserted from the rendered traces by the
harness; `shell/build.py`'s consistency check cross-checks just
ref/corrected_min/elapsed_min between config and fixtures.

**Presentation config is a separate file** — `races/<race>/presentation.js`
(`window.__RACE_CONFIG__`): layout/section order, palette + group presentation,
defaults, chart y-ranges + heights, KPI slots, `modules`/`overlays` lists, and
the selection filters (`classFilter: { prefix, inputLabel, placeholder }` and
`ratingBands: { widths: [...] }` — presence of a block renders
its control; absence renders nothing, so one-design races simply omit them).
Facts shared with `config.yaml` (course, hero/client boat, time) must MATCH —
`shell/build.py` runs a consistency check and refuses the build on divergence.
Narrative copy lives in `copy.js`/`copy.md`, never in either config. The worked
example (`races/nb2026/presentation.js`) documents every key with its origin.

## events.yaml — narrative as data

```yaml
- t: "2026-06-20 03:30"         # official-TZ local, naive string
  cat: crew                     # crew | systems | sail | tactics | insight | milestone
  label: ""
  txt: ""
  source: journal               # journal | navlog | transcript | analysis
  visibility: private           # private | public — public requires a stage-5 opt-in
```

## dashboard_data.json — canonical pipeline output

```
{
  start: [lat, lon], fin: [lat, lon],
  boats: { <displayName>: { t:[epochUTC...], lat:[], lon:[], dtf:[], xte:[], sog:[],
           vmc:[],                               // standard: closing speed on the finish =
                                                 // centered diff of gridded dtf (~30-min window),
                                                 // knots; negatives are real (tacks / sailing away).
                                                 // For mark courses, requires routed dtf (route.py).
           meta: { grp, typ, sail, tcf, el:"4d 01:34:52", corr:"2d 10:00:43",
                   fin:"YYYY-MM-DD HH:MM:SS", sdl:<rank>, retireReason?,
                   sailedNm, avgKt,              // standard: total sailed distance from raw pings,
                                                 // and sailedNm ÷ official elapsed (dist-vs-speed chart)
                   cls, clsPos } } },            // standard: division label + rank-in-division
                                                 // (from official results; drives class/rating filters)
  fleet: [ { name, lat:[], lon:[] } ],           // hourly ghost layer, all boats
  events: [ { t, cat, label, txt } ],            // from events.yaml, post privacy cut
  watches: [ [t0,t1], ... ],
  parkFair: { <name>: { enter, hrs, mean, u4, u2, xte } },  // u4/u2 are NUMBERS (whole pct
                                                 // points, e.g. 31) — never "31%" strings
  recon: [ { t, <matched_key>, log:[lat,lon], trk:[lat,lon], d, speed, course, wind,
             temp, verdict: match|warn, note } ], // matched-time key is named by config
                                                 // reconcile.matched_key (template default
                                                 // matched_local; the NB2026 snapshot payload
                                                 // ships matched_edt — parity won)
  mil: { milestones:[...], series:{...} },
  stats: { dist_sailed, rhumb, extra, avg_sog, max_sog, pct_under3, pct_under5,
           max_xte_e, max_xte_w },
  meta: { generated: "YYYY-MM-DD", tz: "EDT (UTC-4)" }
}
```

## Stage-record templates — `decisions/stage-N-*.yaml`

(Older races carry `CP-*.yaml` filenames — the same artifacts, historical.)

Fill as a draft for the owner to confirm or edit at the stage stop; write the confirmed record to `races/<race>/decisions/` — the committed file is the artifact.

```yaml
# stage-0 — Scope Record
fleet_count: 0
anomalies: []                   # every name-resolution miss, gap, duplicate
reference_boats: [ { name: "", why: "" } ]
tz: { official: "", probe: { boat: "", official_finish_local: "", track_epoch_utc: 0, offset: "" } }
course_model: point_to_point    # or marks (routed distance-remaining via pipeline/route.py)
divisions_in_scope: []
tier: 1
grid_minutes: 15
scoring: { system: tot }
confirmed_by: ""                # user
date: ""
```

```yaml
# stage-2 — Findings & Modules Record
modules_selected: []
modules_vetoed: []
reference_set_confirmed: true
corrections: []                 # factual flags raised at review
values_pinned: true
pipeline_invocation: ""         # exact command that produced the shipped numbers
confirmed_by: ""
date: ""
```

```yaml
# stage-3 — Corrections Record
corrections:                    # may be empty, but the record must exist and say so
  - { before: "", after: "", source: "", propagated_to: [] }
spine_approved: true
confirmed_by: ""
date: ""
```

```yaml
# stage-4 — Review-Round Log
rounds: 0                       # minimum 1
defects:
  - { found: "", fix: "", assertion: "" }   # assertion: test id, or "not expressible"
approved_for_handoff: true
confirmed_by: ""
date: ""
```

```yaml
# stage-5 — Publication Ledger
public_items:                   # each log-derived item going public, individually opted in
  - { item: "", opted_in: true }
private_confirmed: true         # everything not listed stays private
regression: green
artifact: { hash: "", url: "" }
confirmed_by: ""
date: ""
```

## Findings-memo format (stage-2 output)

1. **Headline candidates** — for each: claim / evidence pointer (chart or values) / confidence / benchmark-dependence note.
2. **Proposed race-unique modules** — which heuristic fired, with its evidence.
3. **Data-quality anomalies.**
4. **Open questions** for the user.
5. The stage-2 record, ready to confirm.

## Discrepancy-register row (stage-3 output)

| claim | source | what the track shows | verdict | note |
Verdicts: confirmed / contradicted / partial / unresolvable.

## Stage-5 productionization checklist

```markdown
# <RACE> dashboard — productionize

## Invariants — violating any of these fails the stage
- Timezone-naive rendering: chart x-values are naive local strings; never Date objects.
- Chart endpoints are exact official-results values.
- State-model conventions: <one state object, pure build*() re-renders, axis helpers>.
- The shell invariant list (shell/INVARIANTS.md, I1–I18) — I5–I13 and I15–I18 govern productionization work.
- Pinned values: <the config pinned_values block>.
- <anything added during stage-4 rounds>

## Do not touch
Pinned values; dashboard_data.json semantics; module math.

## Jobs
Mobile breakpoints; lazy-loading; performance budget; hosting; accessibility.

## Protocol
Run the full chain — `.venv/bin/python starter/build_race.py races/<race>` (harness under both
TZ=America/New_York and TZ=UTC, then the snapshot compare) — BEFORE starting and AFTER
finishing: all green both times. Any newly human-caught defect becomes a new assertion.
Before shipping: scan docs/OPEN_THREADS.md — close what this round resolved, raise the rest.
```
