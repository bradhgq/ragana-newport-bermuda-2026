# Data acquisition (optional pre-stage)

Use when the user supplies race identifiers instead of files. Outputs feed Stage 0 directly; there is
no separate checkpoint — all verification lands in the CP-0 Scope Record.

## Where it runs

Claude Code or user-run locally — **never the chat container** (its network is restricted to package
mirrors; `cf.yb.tl` and `api.yachtscoring.com` are unreachable from it). The chat session's job is to
emit the paste-ready acquisition prompt below.

## Sources

- **YachtScoring** — event id from any `yachtscoring.com/emenu/<eventId>` URL. Public JSON API yields
  the scratch sheet (entries) and official results (elapsed/corrected in seconds, class + overall
  rank, finish status/time, ratings). Event metadata's `satTrackingUrl` is the **authoritative source
  of the YB race id** — never guess ids.
- **YB Tracking** — race id from `pro.yb.tl/<race>`. Undocumented endpoints yield the full position
  history (binary, decoded by the repo script) plus boat metadata and per-team start times.
- **Order matters:** YachtScoring first; it hands you the YB id. Some races are YB-only (Newport
  Bermuda) — results then come from the organizer's site.

## Run (scripts live in `starter/acquisition/`; run from the repo root)

```
python3 starter/acquisition/yachtscoring_download.py <eventId> --prefix <race>
python3 starter/acquisition/yb_tracker_download.py <ybRaceId>
# or one command: python3 starter/acquisition/fetch_race.py <eventId>
```

Outputs: `<race>_tracks.csv` (already canonical — boat_id, boat_name, timestamp_utc, epoch, lat, lon;
the YB adapter maps it 1:1), `<race>_scratch_sheet.csv` (ratings joined from results),
`<race>_results.csv`, and a manifest.

## Verification ritual — mandatory, feeds CP-0

- **Never trust a guessed YB id.** A valid-looking id can be a different race entirely. Verify:
  RaceSetup team names against the entry list; first/last track points in the right geography; first
  timestamps against the known start.
- **Coverage check:** tracked boats vs scratch entries vs results rows. Public YB data can be a fleet
  subset (Ida Lewis 2025: 3 of ~36 boats tracked) — that is a property of the data, not a bug. Scope
  spatial analysis accordingly and surface the gap at CP-0.
- **Names differ across sources** (case, sponsor suffixes, committee boats in the track data,
  syndicate owners). The YB↔YS join (normalized name + sail number) is *proposed*, reviewed at CP-0,
  never silent.
- **Staggered per-division starts** are visible in YB `RaceSetup.teams[].start` and YS
  `races[].startTime` — record which source informs `start_method` and cross-check against
  finish − elapsed.
- The YB binary may carry a `dtf` channel — **corroboration only**; the pipeline's own
  distance-remaining stays the spine (unknown course model behind YB's number).
- Both APIs are undocumented and unversioned. Data for past races persists in practice, but snapshot
  anything you care about, and re-run the ritual after any re-download.

## Acquisition handoff prompt (fill and hand to Claude Code)

```
Pull race data for <RACE NAME / EDITION> using the acquisition scripts in <repo>/starter/acquisition/ —
read starter/acquisition/README.md first. Identifiers: YachtScoring event <id> / YB race <id, or "take it
from satTrackingUrl">. Deliver: tracks, scratch sheet, results CSVs + manifest.json. Run the full
verification ritual (geography, start epochs, coverage vs entries, proposed name-join) and report
every warning. Stop after reporting — the CP-0 review happens in chat.
```
