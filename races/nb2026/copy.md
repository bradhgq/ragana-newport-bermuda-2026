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

### sog, VMC mode — round-2 addition (Sebastian's request; hypothesis tested against the tracker before shipping)
VMC: how fast the boat is actually closing on Bermuda — speed × how much of it points the right way. This is the number the routing doctrine says to maximize when the rhumb is forward of the wind. The gap between a boat's SOG and its VMC is the price of its angles; dips below zero are real (tacks, and moments sailing away from the mark in the park). (Computed from positions; the tracker has no wind data, so this is VMC to the mark, not wind-VMG.) Sunday check: at equal distance sailed, RAGANA still gained — the post-shift beat was a lifted fetch for the whole comparison set, and the gain was boatspeed (7.6 vs 6.2 kt on the rating twin), not shorter routing.

### distspeed — "Distance sailed vs speed — minimum distance at maximum speed" (round-2 module)
The prime directive of long-distance racing, drawn: every mile off the rhumb is an investment that must be repaid in boatspeed. Each dot is a scored St. David's boat — how far it actually sailed (the vertical line is the 635 nm rhumb, the theoretical minimum) against how fast it went (distance sailed ÷ official elapsed, so the grey rays through the origin are lines of equal finish time — boats on the same ray finished the same water in the same time, and up-and-left wins). Distance right of the line is miles a boat chose, or was forced, to sail beyond the direct course; height above the ray it started on is speed that paid for them. RAGANA bought 52 extra miles; this chart shows who bought their miles cheaply and who paid for miles that never paid back.

### filters — round-2 controls microcopy
No-such-class state: 'No class “{x}” in the record.' · band chips: '±{w} ({n})' · custom band: 'custom … set' · titles: 'Select a whole SDL class by number' / 'F-TCF band around RAGANA (0.5945) — true rating peers'.

### park — "The park, measured fairly — each boat's own run through DTF 180 → 80"
*(CP-3 amendment 2026-07-07, decisions/CP-3-amendment-park-copy.yaml: 19–39% was 16–38%, third-slowest was second-slowest, and the Park-run KPI subtitle became "fastest shown 24.2 h (Carina)" — the shipped values quoted the debrief's 18-boat comparison set above this displayed default-12 table. The "Everyone parked" insight event keeps the 18-set numbers: it cites "the comparison set" and is correctly scoped.)*

Comparing "the park" by wall-clock window is misleading: faster boats clear the light air before slower boats reach it, so you end up comparing different water. This table instead measures the empirically slow zone — the 180-to-80-nm-to-go band, with a dead core around 140–160 where the fleet-median speed bottomed at 3.3 kts — as each boat actually traversed it, on its own clock. The finding: everyone parked (19–39% of each run under 4 kts), the whole set's traversal times fall within 5.5 hours of each other, and RAGANA's 27.9 hours was third-slowest — an honest gap of two to four hours from the most easterly lane, with an instrument failure and a sail repair both landing inside the dead core.

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

## round-3 amendments (2026-07-15 review; structural — no new claims)

- **distspeed captions moved, verbatim**, from the shared shell module
  (`starter/shell/app/modules/distspeed.js`, which had carried them since the
  round-2 promotion and was wrongly displaying them on BIR2026 too) into this
  race's `copy.js` under `distspeed.{noteElapsed,noteCorrected,refLine,vsRef,
  xNote}`. The elapsed-mode text is the §distspeed block above; the
  corrected-mode text is the round-2 toggle caption ("The same picture on
  corrected time…"), previously only in module code.
- **controls hint** corrected: the axis toggle also switches the won-and-lost
  chart between milestones and clock time — the old text named only the
  rhumb-offset and speed charts.
- **distspeed hover/labels** now write the unit as `kts` (page convention;
  they read `kt`).

## round-3 opinion layer (owner-directed 2026-07-15 — tier-1 elevation)

Three authored panels were added; **every claim is an existing synthesized
conclusion** (the five insight events in `events.yaml` + the frozen section
copy above). No new analysis number was authored; the harness machine-checks
the sourcing (verdict cards ↔ insight events; lesson cites ↔ log timestamps;
decomposition bars ↔ official margins).

- **verdict** — "The verdict — where we think the race was won and lost":
  five cards restating the five insight events, each linking to its evidence
  chart. Slots in `copy.js` under `verdict.{title,note,items}`.
- **phasegap** — "Where the minutes went — phase by phase": caption for the
  decomposition waterfall (runtime slots {ref}/{mode}/{margin}; the numbers
  are derived from the payload at render time, never written into copy).
- **lessons** — "What we'd do differently — the lessons, as logged": the
  journal's own lessons grouped as a next-race checklist, each item citing its
  log timestamp. Slots under `lessons.{title,note,groups}`.

## round-3b: Sebastian's five takeaways (owner-provided 2026-07-16)

Sebastian's five NBR'26 takeaways arrived verbatim from the owner and lead the
lessons section, **each paired with a chart zoomed into the moment that taught
it** (modules `tw{helm,reef,night,east,park}.js`; copy slots under
`takeaways.<id>.{title,note}`). His wording is kept except one edit, marked in
the lessons intro: takeaway 4's "VMG to Waypoint" reads as *closing speed on
the waypoint (VMC)* — I18, the tracker carries no wind data.

1. **One person in charge, others provide input** → `twhelm`: VMC, Monday
   12:00–22:00, tactics calls pinned (the 14:00 three-way helm split).
2. **Reef early, shake late** → `twreef`: SOG through the heavy running,
   all five sail calls pinned (the 10:30 "late, reactive" 2nd reef).
3. **Minimize sail changes shorthanded / at night** → `twnight`: elapsed gap
   to Christopher Dragon across the chaos window (DTF 620→395), night calls
   pinned; the 90–130-min price is the existing cost-of-chaos insight.
4. **Minimize distance sailed unless it pays dividends** → `tweast`: rhumb
   offset DTF 320→60 — the Sunday beat pays, the park presents the bill
   (existing insights 2 and 4).
5. **Practice light-wind sailing** → `twpark`: t = 100 nm ÷ v drawn as a
   curve with each selected boat's own park traversal on it; the two
   "+1 kt saves…" brackets are the same division evaluated at 3.5 and
   5.5 kts, computed at render time (arithmetic, not authored numbers).

The lessons checklist keeps everything logged; its "Sail handling" reefing and
night-change items now point at takeaways 2–3 (charts carry those stories).
