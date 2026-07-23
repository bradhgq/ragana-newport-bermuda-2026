/* Authored copy, machine form. SOURCE OF TRUTH: copy.md (same folder) — edit
   both together or not at all. Every analysis claim below is a confirmed
   stage-2/3 finding (docs/FINDINGS.md, docs/SYNTHESIS.md, owner-approved);
   margins under the 10-min noise floor narrate as scoring noise (doctrine 6);
   Daffodil and Max are parallel focuses, never a duel (stage-0 record). */
window.__COPY__ = {
  titleblock: {
    eyebrow: 'Chart of the Race · Around Long Island Regatta 2025 · 24–26 July · 207 NM',
    h1: '<span class="mag">Daffodil</span> · <span style="color:#0E8A8A">Max</span> · and the finish door',
    sub: 'New York Harbor, down the Narrows and out past Ambrose R“14”, the long ocean reach to Montauk, through Plum Gut, and a beat down a dying Sound to Glen Cove — where the race stopped being about speed and became about arrival time.',
    result: '<span>ALIR Trophy <b>Max</b> · Pogo 50</span><span>Multihull line honors <b>Daffodil</b> · Corsair F31R (sole multihull)</span>' +
      '<span>Monohull line honors <b>Wahoo</b> · 24:11:49</span><span>Finishers <b>43 / 51</b> starters</span>',
    tzn: 'All times EDT. Finish times verified against the tracker (the published results carry EDT wall clock mislabeled as UTC — corrected here).',
  },
  loading: 'Loading the race record…',
  noscript: 'This dashboard is interactive and needs JavaScript to draw its charts. The underlying data is plain JSON in <a href="data/core.json">data/core.json</a> if you\'d rather read it raw.',
  sections: {
    map:    { title: 'The course', note: 'Fifty trackers, five-minute pings. The dashed magenta line is the scored course (207 nm by the SIs; routed here at 205.8) — its one mandatory mark is Ambrose Channel R“14”, lower left. 42 of 43 finishers entered the Sound through Plum Gut — <b>Yopo</b> alone took the Sluiceway.' },
    dtf:    { title: 'The race', note: 'Distance to the finish against the clock. The flat shelves on Friday night are real: the post-frontal calm parked the mid-fleet within sight of Glen Cove. The tinted band is the squall line crossing the Sound.' },
    race:   { title: 'Where the race was won and lost — vs <span id="refname" style="color:var(--magenta)"></span>' },
    xte:    { title: 'Offset from the course line', note: 'Signed distance off the routed course. The south-shore spine of this course is drawn from the fleet\'s own sailed median, so large offsets here are sailing-angle choices, not errors — this is not an off-course meter.' },
    sog:    { title: 'Speed', note: 'Speed over ground, smoothed on a 30-minute window. The race\'s fastest sustained sailing is the ocean reach — <span class="mag">Daffodil</span> peaks at 13.8 kt there, pacing boats 20 feet longer — and the slowest is Friday night off Glen Cove, where the mid-fleet drifts under 1 kt for hours. The tinted band on clock views is the squall: a two-minute, ~30 kt event a 5-minute tracker mostly records as the near-stops around it (crews dousing sail), not the gust itself.', noteVmc: 'VMC is closing speed on the finish along the routed course — computed from positions alone. The tracker carries no wind, so no VMG is shown or knowable here. Negatives are real: tacks, and drift in the park.' },
    events: { title: 'Race log — every marked moment', note: 'Nine public entries, each source-labeled: verified analysis waypoints (the east turn, the reach, Montauk, the upwind Sound, line honors, Max and the door), the squall line from the station record, the squall on Daffodil from the owner\'s deck account (corroborated by buoy 44065), and the midnight anchor 175 yards from the line (Lenoble\'s published account, confirmed by the tracker).' },
  },
  race: { notes: {
    h: 'Corrected (PHRF time-on-distance, 207 nm) offset to {ref} at each milestone; the end point is the official corrected delta, exactly. Cross-circle comparison rides the unofficial unified ladder — official scoring is per circle. The top three finished within 4:50 corrected after 27 hours: inside rating noise, so read mechanisms, not margins.',
    e: 'Elapsed offset to {ref} at each milestone; the end point is the official elapsed delta, exactly. On the water, Wahoo was the fastest boat around the course — the handicap decides the rest.',
  } },
  sog: {},
  distspeed: {
    noteElapsed: 'One dot per finisher: how far it sailed against how fast it went, on elapsed time. The rays are equal-finish-time lines.',
    noteCorrected: 'Corrected view: the same dots on handicap time. Daffodil sits mid-ladder here — the two-hour rating line she owes is invisible on the water and decisive on paper.',
    refLine: '207 nm scoring course',
    vsRef: 'vs the course length',
    xNote: 'total distance sailed (nm)',
  },
  door: {},   // race-unique module carries its own explanatory note (owner directive)
  controlsHint: 'Sets the x-axis on the offset, speed, and won-and-lost charts. <b>Distance</b> lines every boat up on the same water; <b>clock</b> shows what was happening when. The squall band appears only on clock views — every boat met it at a different point on the course.',
  pills: { ghosts: 'Ghosts', rhumb: 'Direct line' },
  morePanel: { note: 'Tap any boat to add or remove it. Ranks are the unofficial unified ladder (all three circles, one 207 nm time-on-distance scale); each boat\'s official circle standing is on its row.', rankedHead: 'Ranked — unified (unofficial)', dnfHead: 'Retired', otherHead: 'Other' },
  emptyStates: { events: 'Every event category is off. Turn one on under “Boats &amp; overlays” to fill this log back in.' },
  footer: `<h3>How to read this</h3>
  <ul>
  <li><b>Two focuses, no duel.</b> Daffodil (the only multihull entered; the owner crewed her) and Max (overall winner) are told in parallel — same water, same weather, different problems. Their curves are never a head-to-head.</li>
  <li><b>The door, not the margin.</b> Max, Phantom and Wahoo finished within 4:50 corrected after 27 hours — inside the ~10-minute rating noise floor for a 207 nm time-on-distance race. The verifiable difference is timing: only three boats finished before the squall line entered the Sound, Max last among them by 80 minutes, hours before the post-frontal calm shut the last 15 nm.</li>
  <li><b>Daffodil's race in one line:</b> fourth-fastest of 43 through the ocean reach (8¼ h where the fleet median was 12), a clean Montauk corner, then a trimaran's worst mode — a light-air beat down the Sound — and a shut door. Rumours of dismastings in the squall remain rumours: no track shows one, and no boat is named.</li>
  </ul>
  <h3>Sources &amp; method</h3>
  <ul>
  <li>YB tracker (race alir25) and YachtScoring event 50029, re-downloaded and verified identical to the July 2025 originals; official Sailing Instructions v1.3 for the course and the 207 nm scoring distance.</li>
  <li>Weather evidence: NOAA buoys 44065/44025, Kings Point; NWS OKX event page for 25 July 2025; ERA5 reanalysis (model — the Montauk corner and central Sound had no working 2025 wind platform); NOAA current predictions for Plum Gut. Wind claims from model data say so.</li>
  <li>Corrected times reproduce the official results exactly (time-on-distance, rating × 207 nm, verified for all 43 finishers). Distances-remaining are routed along the course polyline. Timezone verified by finish-line probe on five boats.</li>
  </ul>
  <div style="margin-top:10px;font-family:var(--mono);font-size:11px">Built from the race record · build 2026-07-23</div>`,
};
