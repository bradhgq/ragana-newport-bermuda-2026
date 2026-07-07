# NB2026 / RAGANA — authored copy (frozen)

Every narrative block from the shipped dashboard, in structured slots (source:
`src/index.html` and `src/app.js` RACE_NOTES at commit `5df5a19`). This copy is
explicitly frozen: *light copyediting fine; new claims are not* (RETROSPECTIVE
§5.2). The voice is first-person-crew; a skill/shell may propose microcopy
(labels, errors, empty states) but must not write analysis claims.

## titleblock

- **eyebrow**: Chart of the Race · 54th Newport Bermuda Race · 19–23 June 2026 · 636 NM
- **h1**: `<span class="mag">RAGANA</span> · Newport Bermuda 2026`
- **sub**: Cape Fear 38 · USA 52238 · a crew's-eye reconstruction of the race from the YB tracker, the nav log, and the on-course broadcast — compared against class, fleet, and the St. David's podium
- **result line**: SDL Overall **46 / 86** · SDL 3 **8 / 10** · Elapsed **4d 01:34:52** · Corrected **2d 10:00:43** @ F-TCF 0.5945 · vs 2022 **71 / 99** → ~19 pctl gain
- **tzn**: All times EDT (UTC−4). Finish 15:54:52 verified against the tracker on the line at 19:55 UTC.

## app states

- **loading**: Loading the race record — 88 boat tracks, four days of racing…
- **noscript**: This dashboard is interactive and needs JavaScript to draw its charts. The underlying data is plain JSON in `data/core.json` if you'd rather read it raw.

## sections

### map — "The course"
Every selected boat's track, the rhumb line, and the Gulf Stream band as RAGANA measured it (74°F entry 17:21 Sat → 80°F core → 75°F exit 05:01 Sun, from the nav log). It's a plain lat/lon plot stretched to fill the width — positions are exact but the aspect isn't to scale. Grey ghosts are the tracked fleet. Hover — or tap — anything.

### dtf — "The race"
The whole race at a glance — distance still to sail, one line per boat, divided into the same phases used throughout. Steeper is faster; the Monday flattening is the light-air wall. The detailed story is in the next chart.

### race — "Where the race was won and lost — vs {ref}"
RACE_NOTES (mode-dependent, app.js:433-436):

- **h (corrected)**: Corrected time at each 10-nm milestone, minus the reference boat's. **Pace view** divides by miles completed (min per 100 nm), so early and late phases read on the same scale — a flat line means matched pace, a rising line means losing in that stretch. **Total view** shows raw cumulative minutes; the finish point is exact from official results. Event markers sit at RAGANA's position (or clock) when each happened.
- **e (elapsed)**: Raw elapsed time at each milestone, minus the reference boat's — position on the water, no handicap. Against her rating twin Christopher Dragon, RAGANA fell behind in the heavy running, took the lead back on the Sunday beat, then gave it up in the light air. Switch to Pace view to compare phases on an equal footing.

### finstrip — "The finish — how tight the mid-pack really was"
Every scored St. David's Lighthouse boat by corrected time. Each dot is a boat; RAGANA is the magenta diamond. Thirteen boats finished within half an hour of her on corrected time — the densest stretch of the whole fleet. The dashed markers show what one and two hours of corrected time were worth: **one hour ≈ 16 places, two hours ≈ 29**. In a race this compressed, every one of the small losses in the story above carried real scoreboard weight.

### xte — "Distance from the rhumb line"
Plus is east of the direct line, minus is west. RAGANA held the most easterly track of the quick-select set (23 nm east at most, never more than 8 west). East wasn't wrong on its own — the St. David's podium won from the east — but among boats hitting the light air the same evening, the ones nearer the rhumb got through it faster.

### sog — "Speed over ground"
30-minute smoothed GPS speed. Switch the axis to **distance** to line every boat up on the same stretch of ocean — the fair way to compare the park. The speedo failure early Monday is invisible here because this speed is GPS-derived, which is exactly why steering to it worked when the paddlewheel quit.

### park — "The park, measured fairly — each boat's own run through DTF 180 → 80"
Comparing "the park" by wall-clock window is misleading: faster boats clear the light air before slower boats reach it, so you end up comparing different water. This table instead measures the empirically slow zone — the 180-to-80-nm-to-go band, with a dead core around 140–160 where the fleet-median speed bottomed at 3.3 kts — as each boat actually traversed it, on its own clock. The finding: everyone parked (16–38% of each run under 4 kts), the whole set's traversal times fall within 5.5 hours of each other, and RAGANA's 27.9 hours was second-slowest — an honest gap of two to four hours from the most easterly lane, with an instrument failure and a sail repair both landing inside the dead core.

**in-table note** (app.js:547): The boats you've selected, fastest crossing first. For context on RAGANA's run, Carina makes the cleanest match: she reached the zone 20 min before RAGANA, ~10 nm nearer the rhumb, and got through 3.7 hours quicker.

### events — "Race log — every marked moment"
Everything driving the markers and shading above, in order, with the boat's distance-to-finish at each point. Includes the analysis notes (the "insight" rows). Filter by category in the Overlays row.

### recon — "Nav log vs. tracker — a reconciliation"
Each hand-written fix from the nav log matched to the tracker position at that moment, with the log's own columns restored. Ten usable fixes, nine within 2 nm. Two were exactly an hour off — the nav watch and some instruments were set to UTC−5 instead of the race's UTC−4 — and one couldn't be reconciled and was dropped. A small, honest audit of how well the paper record held up.

## controls hint

Sets the x-axis on the rhumb-offset and speed charts. **Distance** lines every boat up on the same water; **clock** shows what was happening when.

## footer

### How to read this
- **The race chart** plots, at each 10-nm distance-to-finish milestone, one boat's time minus a reference boat's — negative means ahead. **Corrected** applies each boat's handicap (the actual competition); **elapsed** is raw boat-for-boat position on the water. Endpoints at the finish are exact from official results; the points between are tracker estimates.
- **The park table** measures each boat's own traversal of the slow zone, so it compares like with like regardless of when a boat got there.
- Start-sequence differences (classes started 13:40–14:30) are removed from the race chart. Two boats are named Phoenix — USA25329 (J/120, 45th) is in the quick-select; USA93063 (First 40.7, 24th) is under "+ More."

### Sources & method
- YB tracker export (252,046 positions, 144 boats, ~5-min interval); the boat's nav log; the Commanders' Weather routing brief; and "The Gulf Stream Show" daily broadcast plus the pre-race Navigators' Forum. Speed is derived from position over a centered 30-min window; distance-to-finish and rhumb offset by great-circle math against a finish line triangulated from six boats' official finish times. Race timing verified EDT. Gulf Stream band is approximate, drawn from RAGANA's own sea-temperature log — not an oceanographic product.

### On the wishlist for a future round
- NOAA Gulf Stream overlay · GFS wind underlay · animated time scrubber · synced hover across charts.

### build line
Built from the 2026 race record · times EDT (UTC−4) · build `__BUILT__`
