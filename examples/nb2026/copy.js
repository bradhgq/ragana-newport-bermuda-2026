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
      note: '30-minute smoothed GPS speed. Switch the axis to <b>distance</b> to line every boat up on the same stretch of ocean — the fair way to compare the park. The speedo failure early Monday is invisible here because this speed is GPS-derived, which is exactly why steering to it worked when the paddlewheel quit.' },
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
  controlsHint: 'Sets the x-axis on the rhumb-offset and speed charts. <b>Distance</b> lines every boat up on the same water; <b>clock</b> shows what was happening when.',
  pills: { ghosts: 'Ghosts', rhumb: 'Rhumb line' },
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
