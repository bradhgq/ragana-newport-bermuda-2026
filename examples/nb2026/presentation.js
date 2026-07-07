/* NB2026 / RAGANA presentation config — the RETROSPECTIVE §2 race.config.js
   extraction target: every (b)-column value from the shipped src/app.js and
   src/index.html, verbatim. Phase 2's shell consumes this; until then it is
   the frozen record of what was hardcoded where (refs are app.js lines at
   commit 5df5a19).

   KNOWN SHIPPED DEFECT (found during extraction, logged in REPO_NOTES.md):
   app.js:259 groups.buttons Neighbors listed 'Zélée' but the data key is
   'Zelee' — the group button toggled a phantom name that no chart could
   render. Corrected here to 'Zelee'; flag at GATE B review. */
export default {
  meta: {
    title: 'RAGANA · Newport Bermuda 2026 · Race Analysis',
    url: 'https://hgq.fyi/ragana-newport-bermuda-2026/',
    description: "A crew's-eye reconstruction of RAGANA's 2026 Newport Bermuda Race — 88 boat tracks, the Gulf Stream, the Monday park, and where the race was won and lost. 46/86 St. David's Lighthouse Overall.",
    ogDescription: "A crew's-eye reconstruction of the 2026 Newport Bermuda Race from the YB tracker and the nav log — 46/86 St. David's Lighthouse Overall.",
    ogImage: 'og.png',
  },
  hero: { name: 'RAGANA', color: '#C2187E' },                       // app.js:64 etc (~20 sites)
  time: { utcOffset: -4, tzLabel: 'EDT' },                          // helpers.js:14,21,49
  course: {
    start: [41.4868, -71.3415], finish: [32.3618, -64.6303],
    rhumbNm: 635.1,                                                 // app.js:459,464,467
    dtfStartFallback: 636,                                          // app.js:65 (ragDTFat pre-start)
    mapRange: { lon: [-72, -63.6], lat: [31.9, 42] },               // app.js:426-427
    startLabel: 'NEWPORT', finishLabel: "ST. DAVID'S",              // app.js:407,409
  },
  phases: [                                                          // app.js:437 — authored narrative
    [635, 505, 'START + HEAVY RUNNING'], [505, 395, 'GS APPROACH'],
    [395, 300, 'STREAM + A3'], [300, 180, 'SUNDAY BEAT'],
    [180, 80, 'THE PARK'], [80, 0, 'REBUILD + FINISH'],
  ],
  groups: {                                                          // app.js:33-42
    palette: {
      ragana:    { label: 'RAGANA', colors: ['#C2187E'] },
      class:     { label: 'SDL 3', colors: ['#C1550C', '#E0891B', '#B23A2E', '#D9A017', '#8C3B1E', '#C97B3D', '#9C4A2E', '#D96B2C', '#B4651A'] },
      nbr:       { label: 'Neighbors', colors: ['#6B4FA0', '#8A63C4', '#5B3E8E', '#7D5BA6', '#9B7BC4', '#4D3579', '#8467B8', '#6F4E9E'] },
      podium:    { label: 'SDL podium', colors: ['#0E7C7B', '#159B95', '#3FBDB4'] },
      club:      { label: 'CPYC clubmates', colors: ['#2E7D4F', '#4C9F6E'] },
      maxi:      { label: 'Maxi', colors: ['#2B2B2B', '#6B6B6B'] },
      sdl_other: { label: 'SDL fleet', colors: ['#4A6B7A', '#6E8B98', '#8DA5AF', '#5C7D8C', '#7C99A6', '#3F5C69'] },
      sdl_dnf:   { label: 'Retired', colors: ['#9AA5AC'] },
    },
    quick: ['ragana', 'class', 'nbr', 'podium', 'club', 'maxi'],     // app.js:52; drives build data split
    buttons: {                                                       // app.js:258-260
      'SDL 3': ['Gesture', 'Blue Skies', 'Flying Lady', 'Christopher Dragon', 'In Theory', 'Cercavento', 'Divide By Zero', 'Legacy', 'Quickdraw'],
      'Neighbors': ['Palantir 5', 'Rumble', 'Escapado', 'Hissy Fit II', 'Phoenix USA25329', 'Banter', 'Zelee', 'Dire Wolf', 'Blitzen'],
      'Podium': ['Nicole', 'Selkie', 'Towhee'],
      'Clubmates': ['Touch of Grey', 'Gemini II'],
      'Maxi': ['Black Jack 100', 'OC 86'],
    },
  },
  eventCategories: {                                                 // app.js:44-49; order = draw order low→high
    crew:      { c: '#B9770E', sym: 'circle', label: 'Crew', short: 'Crew' },
    systems:   { c: '#C0392B', sym: 'x', label: 'Systems', short: 'Systems' },
    sail:      { c: '#0E5A8A', sym: 'triangle-up', label: 'Sail changes', short: 'Sails' },
    tactics:   { c: '#7D3C98', sym: 'diamond', label: 'Tactics', short: 'Tactics' },
    insight:   { c: '#C2187E', sym: 'star-diamond', label: 'Analysis notes', short: 'Insights' },
    milestone: { c: '#17293A', sym: 'star', label: 'Milestones', short: 'Milestones' },
  },
  defaults: {                                                        // app.js:53-59 (I7: every boat here ships in core.json)
    boats: ['RAGANA', 'Christopher Dragon', 'Divide By Zero', 'In Theory', 'Gesture', 'Nicole',
            'Carina', 'Hissy Fit II', 'Phoenix USA25329', 'Banter', 'Touch of Grey', 'Gemini II'],
    ev: ['milestone', 'systems', 'tactics', 'sail', 'insight', 'crew'],
    ref: 'Christopher Dragon',
    watches: false, log: true, fleet: true, gs: true, rhumb: true,
    raceMode: 'h', raceView: 'p', axis: 'd',
  },
  race: {                                                            // app.js:445,452,464
    milestoneTop: 620, milestoneBottom: 30, milestoneStep: 10,
    paceMinDone: 50, eventRowY: 19,
  },
  charts: {
    dtf: { yRange: [680, -15] },                                     // app.js:511
    sog: { yRange: [0, 14] },                                        // app.js:532
    parkShading: { zone: [180, 80], core: [160, 140] },              // app.js:528-529 (park module owns these)
  },
  finstrip: { whatIfHours: [1, 2] },                                 // app.js:590
  kpis: [                                                            // app.js:361-368; {stats.*} resolve from data.stats
    { label: 'Result', value: '46 / 86', sub: 'St. David’s Lighthouse · 8/10 in class' },
    { label: 'Distance sailed', value: '{stats.dist_sailed}<span class="u"> nm</span>', sub: '+{stats.extra} over the 635 nm rhumb' },
    { label: 'Average speed', value: '{stats.avg_sog}<span class="u"> kts</span>', sub: 'peaked {stats.max_sog} in the Stream' },
    { label: 'Park run', value: '{park.hero.hrs}<span class="u"> h</span>', sub: 'through DTF 180→80 · fastest in set 22.9 h' },
    { label: 'Easting', value: '{stats.max_xte_e}<span class="u"> nm</span>', sub: 'most east · only {stats.max_xte_w_abs} nm west, ever' },
    { label: 'vs 2022', value: '+19<span class="u"> pctl</span>', sub: '72nd → 53rd percentile of finishers' },
  ],
  mapLabels: [                                                       // app.js:416-418 — authored leader-line labels
    [570, 'START + HEAVY RUNNING', 96, -6], [450, 'GULF STREAM APPROACH', 116, -14],
    [345, 'STREAM + A3 RUN', 122, -8], [238, 'SUNDAY BEAT — the recovery', -128, 44],
    [128, 'THE PARK — Mon dead core', -118, 36], [4, 'FINISH · Tue 15:55 EDT', 58, -52],
  ],
  gulfstream: {                                                      // app.js:121,383-386 — from RAGANA's own temp log
    enterUTC: '2026-06-20T21:21:00Z', exitUTC: '2026-06-21T09:01:00Z',
    polygon: { lon: [-70.6, -66.2, -66.2, -70.6], lat: [38.6, 37.55, 36.35, 37.4] },
    color: '#3E97C9',
  },
  watchesOverlay: { color: '#B8944A', legend: "Brad on watch", pill: "Brad's watches" },  // app.js:117-127
  modules: ['parkfair', 'finstrip', 'navlog'],
  overlays: ['gulfstream', 'watches'],
};
