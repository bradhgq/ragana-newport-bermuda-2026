/* NB2026 authored copy, machine form. SOURCE OF TRUTH: copy.md (same folder) —
   this file is its structured-slot rendering; edit both together or not at all.
   The copy is frozen: light copyediting fine; new claims are not. build.py
   injects the static slots (titleblock/footer/meta) at build time and ships
   this file so the shell can read the dynamic strings at runtime. */
window.__COPY__ = {
  titleblock: {
    eyebrow: 'Chart of the Race · 54th Newport Bermuda Race · 19–23 June 2026 · 636 NM',
    h1: '<span class="mag">RAGANA</span> · Newport Bermuda 2026',
    sub: "Cape Fear 38 · USA 52238 · a crew's-eye reconstruction of the race from the YB tracker, the nav log, and the on-course broadcast — compared against class, fleet, and the St. David's podium",
    result: '<span>SDL Overall <b>46 / 86</b></span><span>SDL 3 <b>8 / 10</b></span>' +
      '<span>Elapsed <b>4d 01:34:52</b></span><span>Corrected <b>2d 10:00:43</b> @ F-TCF 0.5945</span>' +
      '<span>vs 2022 <b>71 / 99</b> → ~19 pctl gain</span>',
    tzn: 'All times EDT (UTC−4). Finish 15:54:52 verified against the tracker on the line at 19:55 UTC.',
  },
  loading: 'Loading the race record — 88 boat tracks, four days of racing…',
  noscript: 'This dashboard is interactive and needs JavaScript to draw its charts. The underlying data is plain JSON in <a href="data/core.json">data/core.json</a> if you\'d rather read it raw.',
  sections: {
    map: { title: 'The course',
      note: "Every selected boat's track, the rhumb line, and the Gulf Stream band as RAGANA measured it (74°F entry 17:21 Sat → 80°F core → 75°F exit 05:01 Sun, from the nav log). It's a plain lat/lon plot stretched to fill the width — positions are exact but the aspect isn't to scale. Grey ghosts are the tracked fleet. Hover — or tap — anything." },
    dtf: { title: 'The race',
      note: 'The whole race at a glance — distance still to sail, one line per boat, divided into the same phases used throughout. Steeper is faster; the Monday flattening is the light-air wall. The detailed story is in the next chart.' },
    race: { title: 'Where the race was won and lost — vs <span id="refname" style="color:var(--magenta)"></span>' },
    xte: { title: 'Distance from the rhumb line',
      note: "Plus is east of the direct line, minus is west. RAGANA held the most easterly track of the quick-select set (23 nm east at most, never more than 8 west). East wasn't wrong on its own — the St. David's podium won from the east — but among boats hitting the light air the same evening, the ones nearer the rhumb got through it faster." },
    sog: { title: 'Speed over ground',
      note: '30-minute smoothed GPS speed. Switch the axis to <b>distance</b> to line every boat up on the same stretch of ocean — the fair way to compare the park. The speedo failure early Monday is invisible here because this speed is GPS-derived, which is exactly why steering to it worked when the paddlewheel quit.',
      noteVmc: 'VMC: how fast the boat is actually closing on Bermuda — speed × how much of it points the right way. This is the number the routing doctrine says to maximize when the rhumb is forward of the wind. The gap between a boat\'s SOG and its VMC is the price of its angles; dips below zero are real (tacks, and moments sailing away from the mark in the park). (Computed from positions; the tracker has no wind data, so this is VMC to the mark, not wind-VMG.) Sunday check: at equal distance sailed, RAGANA still gained — the post-shift beat was a lifted fetch for the whole comparison set, and the gain was boatspeed (7.6 vs 6.2 kt on the rating twin), not shorter routing.' },
    events: { title: 'Race log — every marked moment',
      note: 'Everything driving the markers and shading above, in order, with the boat\'s distance-to-finish at each point. Includes the analysis notes (the "insight" rows). Filter by category in the Overlays row.' },
  },
  race: {
    notes: {
      h: "Corrected time at each 10-nm milestone, minus the reference boat's. <b>Pace view</b> divides by miles completed (min per 100 nm), so early and late phases read on the same scale — a flat line means matched pace, a rising line means losing in that stretch. <b>Total view</b> shows raw cumulative minutes; the finish point is exact from official results. Event markers sit at RAGANA's position (or clock) when each happened.",
      e: "Raw elapsed time at each milestone, minus the reference boat's — position on the water, no handicap. Against her rating twin Christopher Dragon, RAGANA fell behind in the heavy running, took the lead back on the Sunday beat, then gave it up in the light air. Switch to Pace view to compare phases on an equal footing.",
    },
  },
  sog: {
    axisHint: 'Distance to finish (nm) ⟵ (grey = park zone, red = dead core)',
    axisHintNarrow: 'nm to finish ⟵ (grey = park, red = dead core)',
  },
  // distspeed captions (moved verbatim from the shared module 2026-07-15 —
  // the module is shell-shared and must not carry race narrative)
  distspeed: {
    noteElapsed: 'The prime directive of long-distance racing, drawn: every mile off the rhumb is an investment that must be repaid in boatspeed. Each dot is a scored St. David’s boat — how far it actually sailed (the vertical line is the 635 nm rhumb, the theoretical minimum) against how fast it went (distance sailed ÷ official elapsed, so the grey rays through the origin are lines of equal finish time — boats on the same ray finished the same water in the same time, and up-and-left wins). Distance right of the line is miles a boat chose, or was forced, to sail beyond the direct course; height above the ray it started on is speed that paid for them. RAGANA bought 52 extra miles; this chart shows who bought their miles cheaply and who paid for miles that never paid back. (Boudicca, a much larger Class-8 boat, is a genuine speed outlier and sits off the top of the elapsed scale — not a peer; switch to corrected to see the fleet on one scale.)',
    noteCorrected: 'The same picture on <b>corrected</b> time — distance sailed ÷ each boat’s official corrected time, so the grey rays are lines of equal <b>corrected result</b> (the actual scoreboard). Handicap pulls the fleet together: the fast boats that ran away on elapsed time come back to the pack here, and up-and-left is a better finish. RAGANA’s 52 extra miles cost the same on either clock; what changes is who she’s measured against.',
    refLine: 'rhumb 635.1 nm — minimum distance',
    vsRef: 'vs rhumb',
    xNote: 'right of the dashed line is miles beyond the rhumb',
  },
  controlsHint: 'Sets the x-axis on the rhumb-offset, speed, and won-and-lost charts. <b>Distance</b> lines every boat up on the same water; <b>clock</b> shows what was happening when.',
  // ── round 3: the tier-1 opinion layer (owner-directed 2026-07-15). Every
  // claim below is an existing synthesized conclusion: the five verdict cards
  // restate the five insight events (events.yaml, source: analysis) and the
  // park/xte/vmc section copy; the lessons restate what the journal logged in
  // the moment (each item carries its log timestamp, machine-checked against
  // D.events by the harness). No new analysis numbers were authored here. ──
  verdict: {
    title: 'The verdict — where we think the race was won and lost',
    note: 'The analysis, distilled to five calls. These are the same conclusions pinned as <span style="color:var(--magenta)">◆</span> insight markers on the charts below — this panel just says them plainly. Each card links to the chart that carries its evidence; the opinions are ours, the numbers are the record\'s.',
    items: [
      { k: 'Fri night – Sat · heavy running', c: '#B23A2E',
        t: 'The race was lost in the chaos, not in the park.',
        body: 'RAGANA bled roughly 90–130 minutes to her rating twin across Friday night and Saturday — the window with the un-carded 01:45 all-hands sail change, the reactive reefs, and the lost sheet. Against the class winner Gesture, most of the final deficit accrued here.',
        link: { href: '#race', label: 'See the won-and-lost chart' },
        src: 'INSIGHT · The cost of chaos' },
      { k: 'Sunday · the beat', c: '#0E7C7B',
        t: 'The Sunday beat is what this boat is for.',
        body: 'From 265 to 180 nm to go, the east lane gained ~20 minutes per 10 nm on Christopher Dragon\'s west lane — continuously, for 80 nm — flipping a 94-minute deficit into a 75-minute lead. The gain was boatspeed at equal distance sailed (7.6 vs 6.2 kt on the rating twin), not shorter routing: upwind in 8–11 kts of flat water is the design sweet spot.',
        link: { href: '#race', label: 'See the won-and-lost chart' },
        src: 'INSIGHT · The Sunday beat paid' },
      { k: 'Monday · the park', c: '#4C6274',
        t: 'The park was an honest penalty — two to four hours, not the race.',
        body: 'Measured fairly — each boat\'s own run through the same water — everyone in the comparison set parked (16–38% of each traversal under 4 kts) and the whole spread was 5.5 hours. RAGANA\'s 27.9 h was second-slowest in that set: the price of the most-east lane, with the speedo failure and the sail repair both landing inside the dead core.',
        link: { href: '#sec_parkfair', label: 'See the park table' },
        src: 'INSIGHT · Everyone parked' },
      { k: 'The lanes', c: '#7D3C98',
        t: 'Lane and arrival timing mattered together — east wasn\'t simply wrong.',
        body: 'Within the cohort entering the light air the same evening, boats nearer the rhumb got through it 1.5–4 hours faster (Carina: same entry hour, ~10 nm further west, 3.7 h quicker). Yet the podium won from the east — as lower-rated boats they arrived 3–5 hours later, when the Monday-evening rebuild was closer.',
        link: { href: '#xte', label: 'See the rhumb-offset chart' },
        src: 'INSIGHT · Position × timing' },
      { k: 'The back half', c: '#C2187E',
        t: 'The back half was sailed well — 9 minutes short of a 159-minute comeback.',
        body: 'RAGANA closed Hissy Fit II from 159 minutes behind at 400 nm to go to just 9 minutes at 20 to go, and lost to her by 2m15s corrected. The recovery was real; it started from the hole dug on Saturday.',
        link: { href: '#dtf', label: 'See the race overview' },
        src: 'INSIGHT · The near-catch' },
    ],
  },
  phasegap: {
    note: 'Each bar is the {mode} time <span class="mag">RAGANA</span> gained (teal, downward) or lost (rust, upward) against {ref} inside each phase — the same milestone math as the chart above, cut at the six phase boundaries. The running total ends on the official margin ({margin} min) by construction: a decomposition that doesn\'t reconcile to the scoreboard is a story, not an analysis. Change the reference or switch corrected/elapsed above — the bars follow.',
  },
  lessons: {
    title: 'What we\'d do differently — Sebastian\'s five takeaways, then the checklist',
    note: 'Sebastian\'s five takeaways from the race lead this section — each paired below with a chart zoomed into the moment that taught it (his wording, lightly edited to this page\'s VMC terminology; the tracker carries no wind data). The checklist items were logged during the race, not reconstructed after it — the race log above carries each one at the cited time.',
    // the five takeaway cards follow this one in the layout; jump links render
    // from this list (href = the paired chart's div id)
    fiveUp: [
      { n: 1, href: '#twhelm', txt: 'One person in charge, others provide input' },
      { n: 2, href: '#twreef', txt: 'Reef early, shake late' },
      { n: 3, href: '#twnight', txt: 'Minimize sail changes when shorthanded — especially at night' },
      { n: 4, href: '#tweast', txt: 'Minimize distance sailed unless it pays dividends' },
      { n: 5, href: '#twpark', txt: 'Practice light-wind sailing' },
    ],
    groups: [
      { head: 'Before the start', items: [
        { txt: 'Build the maneuver card and walk the boat as a full crew — the 01:45 all-hands change was coordinated by yelling because no card existed.', cite: 'Sat 01:45', t: '2026-06-20 01:45' },
        { txt: 'Pre-medicate for seasickness — cheap insurance; two of five felt Friday\'s sea state.', cite: 'Fri 16:00', t: '2026-06-19 16:00' },
        { txt: 'Vet the galley\'s electrolyte mixes for artificial sweeteners.', cite: 'Fri 16:00', t: '2026-06-19 16:00' },
        { txt: 'Drill the whole satcomm workflow — GRIBs, phone, every app — before the dock.', cite: 'Sun 18:00', t: '2026-06-21 18:00' },
        { txt: 'Foulies on before the start, not after the first wave.', cite: 'Fri 14:20', t: '2026-06-19 14:20' },
      ]},
      { head: 'Sail handling', items: [
        { txt: 'Stopper knots on every sheet end — a bare end cost the Reacher a douse instead of a furl.', cite: 'Sat 13:30', t: '2026-06-20 13:30' },
        { txt: 'Reefing and night changes: see takeaways 2 and 3 below — the charts carry the story.', cite: 'Sat 01:45', t: '2026-06-20 01:45' },
      ]},
      { head: 'Systems', items: [
        { txt: 'Charge on a schedule, not on memory — the house bank died at 01:00 and took every instrument with it.', cite: 'Sun 01:00', t: '2026-06-21 01:00' },
        { txt: 'Build display fallback profiles (including a no-boatspeed page) and helm hot-keys before the race needs them.', cite: 'Mon 11:45', t: '2026-06-22 11:45' },
        { txt: 'GPS speed is the failover — steering to SOG worked the moment the paddlewheel quit.', cite: 'Mon 02:45', t: '2026-06-22 02:45' },
      ]},
      { head: 'Crew & rest', items: [
        { txt: 'Bank rest in the calm windows — the midday recovery stretch paid for the light-air night that followed.', cite: 'Sun 12:00', t: '2026-06-21 12:00' },
        { txt: 'Watch pairs covered for the unwell without drama — keep the flexible-extension norm.', cite: 'Sat 06:00', t: '2026-06-20 06:00' },
      ]},
    ],
  },
  // ── Sebastian's five takeaways (owner-provided 2026-07-16), each the title
  // of a zoomed chart module (modules/tw*.js). The notes restate his rules and
  // the record's EXISTING claims (insight events / section copy) — no new
  // analysis numbers; chart-derived values (the t=100/v curve) are arithmetic
  // computed at render time. ──
  takeaways: {
    twhelm: {
      title: 'Takeaway 1 · One person in charge, others provide input',
      note: 'Monday afternoon, 130 nm out, the log shows the opposite of Sebastian\'s rule: a <b>three-way helm split</b> (14:00) — closing speed, boat speed, and layline, each helm steering their own idea while the fleet visibly sailed higher. Steve committed to the layline at 16:45. The chart zooms into that afternoon: VMC toward the finish for RAGANA and the boats around her, with the log\'s tactics calls pinned. Dips below zero are real — moments sailing away from Bermuda.',
    },
    twreef: {
      title: 'Takeaway 2 · Reef early, shake late',
      note: 'Saturday is the case study. The first reef went in at the 01:45 all-hands; the <b>2nd reef went in late and reactive</b> at 10:30 — after the eased main had chafed a visible mark into itself at the first spreader — and most of Brad\'s day was broach management on the vang and main. The chart zooms into the heavy running: GPS speed with every sail call pinned, from the midnight all-hands to shaking the reef back out at 18:30.',
    },
    twnight: {
      title: 'Takeaway 3 · Minimize sail changes when shorthanded — especially at night',
      note: 'The 01:45 all-hands reef-plus-Reacher was coordinated by yelling and relay — no maneuver card, confusion over halyard and sheets, two crew on the foredeck at night. The analysis priced the whole window: <b>roughly 90–130 minutes bled to the rating twin across Friday night and Saturday</b>, and against the class winner most of the final deficit accrued here — not in the light air. The chart zooms the boat-for-boat gap to Christopher Dragon through exactly that stretch, with the night\'s calls pinned where they happened.',
    },
    tweast: {
      title: 'Takeaway 4 · Minimize distance sailed unless it pays dividends',
      note: 'Sebastian\'s rule is about leaving the rhumb line at the cost of closing speed on the waypoint — and RAGANA bought <b>52 extra miles</b>, most of them east. This chart shows both sides of that bet on one axis. The Sunday beat: the east lane flipped a 94-minute deficit into a 75-minute lead over 80 nm. The park: among boats entering the light air the same evening, the ones nearer the rhumb got through 1.5–4 hours faster. The bet paid, then charged interest.',
    },
    twpark: {
      title: 'Takeaway 5 · Practice light-wind sailing',
      note: 'Sebastian\'s arithmetic: <b>an extra knot at 2 kts is worth roughly three times an extra knot at 6</b>. The curve below is that arithmetic drawn — the time to cross the park\'s 100 nm at a given made-good speed, pure division, no model. The dots are the boats you\'ve selected, placed by their own traversal (same fair basis as the park table). At the slow end of the curve an extra knot returns hours, not minutes.',
    },
  },
  pills: { ghosts: 'Ghosts', rhumb: 'Rhumb line' },
  filters: {
    noSuchClass: 'No class “{x}” in the record.',
    bandChip: '±{w} ({n})', bandCustomLabel: 'custom', bandApply: 'set',
    bandTitle: 'F-TCF band around RAGANA (0.5945) — true rating peers',
    classTitle: 'Select a whole SDL class by number',
  },
  morePanel: {
    note: "Tap any boat to add or remove it. Ranked by St. David's Lighthouse corrected time.",
    rankedHead: 'SDL Overall', dnfHead: 'Retired', otherHead: 'Outside SDL',
  },
  emptyStates: {
    events: 'Every event category is off. Turn one on under “Boats &amp; overlays” to fill this log back in.',
  },
  footer: `<h3>How to read this</h3>
  <ul>
    <li><b>The race chart</b> plots, at each 10-nm distance-to-finish milestone, one boat's time minus a reference boat's — negative means ahead. <b>Corrected</b> applies each boat's handicap (the actual competition); <b>elapsed</b> is raw boat-for-boat position on the water. Endpoints at the finish are exact from official results; the points between are tracker estimates.</li>
    <li><b>The park table</b> measures each boat's own traversal of the slow zone, so it compares like with like regardless of when a boat got there.</li>
    <li>Start-sequence differences (classes started 13:40–14:30) are removed from the race chart. Two boats are named Phoenix — USA25329 (J/120, 45th) is in the quick-select; USA93063 (First 40.7, 24th) is under "+ More."</li>
  </ul>
  <h3>Sources &amp; method</h3>
  <ul>
    <li>YB tracker export (252,046 positions, 144 boats, ~5-min interval); the boat's nav log; the Commanders' Weather routing brief; and "The Gulf Stream Show" daily broadcast plus the pre-race Navigators' Forum. Speed is derived from position over a centered 30-min window; distance-to-finish and rhumb offset by great-circle math against a finish line triangulated from six boats' official finish times. Race timing verified EDT. Gulf Stream band is approximate, drawn from RAGANA's own sea-temperature log — not an oceanographic product.</li>
  </ul>
  <h3>On the wishlist for a future round</h3>
  <ul>
    <li>NOAA Gulf Stream overlay · GFS wind underlay · animated time scrubber · synced hover across charts.</li>
  </ul>
  <div style="margin-top:10px;font-family:var(--mono);font-size:11px">Built from the 2026 race record · times EDT (UTC−4) · build __BUILT__</div>`,
};
