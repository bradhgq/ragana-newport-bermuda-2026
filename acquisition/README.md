# acquisition/ — race-data download tooling

Stdlib-only, self-contained scripts (keep them dependency-free). Everything
here was live-verified against four real races (nb2026, 79birace2026, alir25,
ildr2025) in the acquisition session of 2026-07-07; distilled from that
session's retrospective.

```
python3 acquisition/fetch_race.py <ysEventId> --out-dir races/<race>/raw/   # the one command
python3 acquisition/fetch_race.py --yb nb2026 …                             # YB-only race
python3 acquisition/yb_tracker_download.py <ybRaceId> [--include-dtf]       # tracks only
python3 acquisition/yachtscoring_download.py <ysEventId> [--prefix p]       # results/scratch only
```

`fetch_race.py` chains YachtScoring → `satTrackingUrl` → YB, writes a
`*_manifest.json` (ids, counts, coverage, per-division start times, sha256s)
and a **proposed** `*_name_join.csv` (normalized name + sail). Every
CP-0-relevant problem is printed loudly and recorded in the manifest. The join
is a proposal — review at CP-0, never auto-merge (doctrine 4). All of this is
NETWORK-DEPENDENT and stays out of CI; the offline decoder regression in
`tests/` is the CI-safe part.

## YB Tracking

No public documented API; the race-viewer webapp pulls from open,
unauthenticated endpoints:

```
https://cf.yb.tl/JSON/{race}/RaceSetup      boat list/metadata, start times, ratings (tcf1-3)
https://cf.yb.tl/JSON/{race}/leaderboard    standings, elapsed, finish epochs
https://cf.yb.tl/BIN/{race}/AllPositions3   FULL position history, binary
```

(`https://yb.tl/JSON/…` works too; `?t=<anything>` cache-bust is conventional,
not required.)

### AllPositions3 binary layout (all big-endian)

- byte 0: flags — bit0 altitude, bit1 dtf, bit2 lap, bit3 pc
- bytes 1–4: uint32 base epoch
- per-boat blocks: uint16 boat id, uint16 moment count, then moments.
  Moment header bit 7 set → delta record (uint16 −Δt, int16 Δlat, Δlon vs the
  previous moment); clear → absolute record (uint32 t−base, int32 lat, lon).
  lat/lon are integers ×1e5. Moments arrive **newest-first**.
- boat ids join to `RaceSetup.teams[].id` for names.

`--include-dtf` emits YB's embedded dtf channel when present — raw YB units,
**corroboration only**: the pipeline's own distance-remaining is the spine.

### Decoder provenance & license — READ BEFORE ANYTHING GOES PUBLIC

`parse_positions` is a Python port of the decoder in the open-source **decyb**
project (github.com/rahra/decyb, `html/decyb.js` → `function parse(e)`), which
itself was reverse-engineered from YB's own JS client. **decyb declares NO
license** (checked 2026-07-07: no LICENSE file, no README terms, GitHub API
license field null; author Bernhard R. Fischer <bf@abenteuerland.at>). An
unlicensed repo is all-rights-reserved by default. Before this code ships in
anything public or client-facing, contact the author for terms or replace the
port with a cleanroom implementation from the byte-layout notes above (which
describe a data format, not decyb's code). Tracked in DOC_GAPS.md #16.

### Gotchas (all hit in practice)

- **CloudFront 503s**: `cf.yb.tl` intermittently 500/503s on cache misses;
  the scripts retry with backoff (4 attempts). Never conclude a race id is
  wrong from one 503.
- **Latin-1**: JSON endpoints are served `text/plain;charset=ISO-8859-1` and
  really contain Latin-1 bytes ("Stäuber") — decode `latin-1`, not utf-8.
- **`/JSON/{race}/AllPositions3.json` usually 500s** — use the BIN endpoint.
- **Race-id guessing is a trap**: ids are arbitrary and a valid guess can hit
  the WRONG race (`c6002026` = RORC Caribbean 600, not Around Block Island).
  Always verify: `RaceSetup.teams` names against the entry list, first track
  points against the known start area/time. Best source of truth: the
  YachtScoring `satTrackingUrl`.
- **Public YB data can be a subset of the fleet** (ildr2025: 3 of ~36 boats).
  A property of the data, not a bug — `fetch_race.py` flags it; surface at CP-0.
- The viewer HTML is a JS SPA — fetching the page tells you nothing.

### Verification ritual (repeat after any re-download)

First/last track points land in the right geography; timestamps match the
official start (ildr2025: epoch 1755272400 = Aug 15 2025 11:00 EDT); finishes
agree with the leaderboard.

## YachtScoring

React SPA over an open, unauthenticated JSON API (endpoints found by reading
the Vite bundle's lazy chunks):

```
https://api.yachtscoring.com/v1/public/event/{eventId}                    metadata (incl. satTrackingUrl!)
…/event/{eventId}/boats?page=N      entries, fixed 10/page (limit params ignored)
…/event/{eventId}/splits            divisions/classes
…/event/{eventId}/races             scored races (+ per-split start times)
…/event/{eventId}/result-detail-report?raceNumber=N     the money endpoint
…/event/{eventId}/cumulative-result
```

- `result-detail-report` per boat: `placeClass`, `placeOverall`,
  `elapsedTime`/`correctedTime` (seconds), `finishTime` (UTC ISO),
  `finishStatus` (AOK/DNF/…), `rating`, nested division/class,
  `localGMTOffset`.
- The `boats` scratch sheet has **no rating** — `yachtscoring_download.py`
  joins ratings in from the results report by `eventBoatId`. INACTIVE =
  withdrawn (kept in the CSV; `fetch_race.py` excludes them from coverage math).
- Legacy `.cfm` URLs are dead; the eventId numbering survived into
  `/emenu/<id>`. Pre-2025 events (other id range) untested.
- Newport Bermuda is NOT on YachtScoring — YB-only; results from the
  organizer's site.

## Start times

Staggered per-division starts appear in YB `RaceSetup.teams[].start` and YS
`races[].startTime`; the manifest records both, and they can disagree (ILDR:
YS shows 11:50/12:00Z placeholders vs YB's 15:00Z = 11:00 EDT actual). The
config's `start_method` (default finish − elapsed) must be cross-checked
against these, and the config records which source was used.

## Stability

Both APIs are undocumented and could change or be restricted without notice.
The binary format is stable in practice, but re-verify with the ritual after
any re-download. Completed-race data persists (nb2026 two weeks post-race,
alir25 a year on) — but snapshot races you care about; don't assume retention.

## Tests

`python3 -m unittest discover -s acquisition/tests` — offline decoder
regression on a real 41 KB ildr2025 blob (3 boats, 5190 moments, expected
endpoints frozen from a cross-checked independent download). CI-safe; the
network paths above are not in CI by design.
