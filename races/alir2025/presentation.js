/* ALIR 2025 presentation config — stage-2 MINIMUM-VIABLE authoring.
   Enough for the chain to build and the analysis to be read; the real
   presentation pass happens at stage 4. FACTS here must match config.yaml
   (shell/build.py consistency check). Dual-focus doctrine: Daffodil (hero)
   and Max (focus) carry equal visual weight and are never framed as a duel
   (decisions/stage-0-scope.yaml narrative_framing). */
window.__RACE_CONFIG__ = {
  meta: {
    title: 'ALIR 2025 — Around Long Island Regatta',
    url: '',
    description: 'Around Long Island Regatta 2025 — 207 nm, NY Harbor to Hempstead Harbour. Fleet analysis.',
    ogDescription: 'ALIR 2025: the reach, the squall, the park — 43 finishers around Long Island.',
    ogImage: 'og.png',
  },
  hero: { name: 'Daffodil', color: '#C2187E' },  // = config client_boat (pipeline pivot; NOT a duel protagonist)
  time: { utcOffset: -4, tzLabel: 'EDT' },
  course: {
    start: [40.7028, -74.0367], finish: [40.8619, -73.6603],   // = config.yaml course
    rhumbNm: 207.0,                       // official scoring distance (SI)
    dtfStartFallback: 205.8,              // routed polyline DTF at the start
    mapRange: { lon: [-74.15, -71.65], lat: [40.44, 41.36] },  // trimmed-fleet bbox + margin
    startLabel: 'START — Ellis Island', finishLabel: 'FINISH — Glen Cove',
    polyline: [                         // = config.yaml course.start + marks + finish (source of
      [40.7028, -74.0367],              //   truth; keep in lockstep) — drawn by overlays/courseline.js
      [40.6060, -74.0450], [40.5281, -74.0094], [40.5500, -73.4000],
      [40.6400, -73.0500], [40.7700, -72.6000], [40.8600, -72.1000],
      [41.0600, -71.8450], [41.1680, -72.2150], [41.0500, -73.3500],
      [40.9250, -73.6250], [40.8619, -73.6603],
    ],
  },
  phases: [                               // names per owner (stage-2 stop): self-explanatory,
                                          // "door" always reads "finish door"
    [206, 196, 'HARBOR START'],           // Ellis Island line, the Narrows, Ambrose R"14"
    [196, 95, 'THE OCEAN REACH'],         // south shore to the Montauk approach
    [95, 65, 'THE MONTAUK CORNER'],       // rounding, Gardiners Bay, Plum Gut
    [65, 15, 'THE SOUND BEAT'],           // upwind down the Sound; the squall crosses here
    [15, 0, 'THE FINISH DOOR'],           // open before ~14:00 Fri, shut until ~midnight
  ],
  groups: {
    palette: {
      hero:        { label: 'Daffodil',   colors: ['#C2187E'] },
      focus:       { label: 'Max',        colors: ['#0E8A8A'] },   // co-focus, equal weight
      spotlight:   { label: 'Habiru YCC', colors: ['#D2691E'] },
      fleet_other: { label: 'Fleet',      colors: ['#7C8C9A', '#5F7484', '#93A3B1', '#6B8299'] },
      fleet_dnf:   { label: 'Retired',    colors: ['#9AA5AC'] },
    },
    quick: ['hero', 'focus', 'spotlight'],
    chipExtras: ['Wahoo', 'Phantom', 'Dolcezza',   // the other defaults (owner, round 4)
                 "Sound's Great", 'Towhee'],       // + two that didn't make the default cut:
                                                   // the documented boat and her rival in the split
    dnfKey: 'fleet_dnf', outsideKey: '', fallbackKey: 'fleet_other',
    buttons: {                          // each button = a defensible comparison set (5-7 boats);
                                        // names asserted subset of the payload by the harness
      'Div 0 — the big boats': ['Max', 'Wahoo', 'Avalanche', 'Cougar', 'Ohana', 'Hunter'],
      'Div X — Habiru’s class': ['Habiru YCC', 'Acadia', 'Della Aurora', 'Duet', 'Lucky Luke', 'Surface Tension'],
      'Daffodil’s pace peers': ['Daffodil', 'Towhee', 'Random', 'Midnight Rider - PMP Strategy', 'Unbreakable YCC', 'Maggie', 'Inessa II'],
      'Unified podium': ['Max', 'Phantom', 'Wahoo', 'Habiru YCC', 'Acadia'],
    },
  },
  eventCategories: {                      // draw order low -> high; only the categories in use
    crew:    { c: '#B9770E', sym: 'circle', label: 'Crew — Daffodil', short: 'Crew' },
    insight: { c: '#0E5A8A', sym: 'star-diamond', label: 'Analysis notes', short: 'Insights', big: true },
  },
  defaults: {
    boats: ['Daffodil', 'Max', 'Habiru YCC', 'Wahoo', 'Phantom', 'Dolcezza'],  // I7 core set
    ev: ['crew', 'insight'], ref: 'Max',   // markers on by default (owner, round 2)                   // milestone-delta reference: the overall winner
    fleet: true, rhumb: false,   // the chord misleads on a marks course; the courseline overlay carries the course
    overlays: {},
    raceMode: 'h', raceView: 'p', axis: 'd', speedMetric: 'vmc',
  },
  race: { milestoneTop: 200, milestoneBottom: 1, milestoneStep: 1,   // every 1 nm (owner, round 3)
          correctedModel: 'tod',   // PHRF time-on-distance — first ToD race through the shell;
                                   // 'tot' (the default) would multiply partial elapsed by the
                                   // raw sec/mi rating and render garbage mid-race
          paceMinDone: 15, eventRowY: 19, ratingLabel: 'PHRF' },
  charts: {
    map: { heightScale: 0.75, legendBottom: true },  // 0.75x height (owner, round 3), legend below
    dtf: { eventTopY: 200 },
    sog: { yRange: [0, 16], eventTopY: 15,   // headroom: the trimaran's reach tops the monohull fleet
           metrics: { s: 'SOG', v: 'VMC (toward finish)' }, vmcYRange: [-3, 14] },
    xte: { eventTopY: 8 },
  },
  ratingBands: { widths: [15, 30] },      // hero-centred PHRF bands: ±15 s/mi = Daffodil/Max/
                                          // Avalanche; ±30 adds Cougar, Ohana, Hunter
  distspeed: {
    isoDays: [1.1, 1.6, 2.1],             // elapsed 26.4 / 38.4 / 50.4 h — brackets 24:11..51:32
    isoDaysCorr: [1.15, 1.5, 1.85],       // corrected 27.6 / 36 / 44.4 h — brackets 27:02..42:23
    toggle: { key: 'distMode', default: 'h',
              states: [{ v: 'e', label: 'Elapsed' }, { v: 'h', label: 'Corrected' }] },
  },
  kpis: [                                 // every number is a confirmed stage-2/3 finding, scoped
    { label: 'The door', value: '3<span class="u"> boats</span>', sub: 'finished before the squall — Max last, by 80 min' },
    { label: 'Daffodil on the reach', value: '4th<span class="u"> of 43</span>', sub: '8¼ h through the ocean leg · fleet median 12 h' },
    { label: 'Top three, corrected', value: '00:04:50<span class="u"> spread</span>', sub: 'after 27 h — inside rating noise (~10 min)' },
    { label: 'The park', value: '55<span class="u"> min</span>', sub: 'Sound&#8217;s Great at anchor 175 yd from the line' },
    { label: 'Distance sailed', value: '{stats.dist_sailed}<span class="u"> nm</span>', sub: 'Daffodil · +{stats.extra} over the 207 nm course' },
    { label: 'Unified ladder', value: '30<span class="u"> /43</span>', sub: 'Daffodil, all three circles on one scale (unofficial)' },
  ],
  mapLabels: [                            // [[dtf, label, ax, ay]] — leader lines; placement reviewed by screenshot
    [196, 'AMBROSE R“14”', 28, 22],
    [95, 'MONTAUK', 30, -18],
    [70, 'PLUM GUT', -10, -26],
    [15, 'THE DOOR', -34, 14],
  ],
  controls: { pills: ['@ghosts'] },   // no straight-line pill (owner, round 2); scored course is always on
  layout: ['map', 'dtf', 'race', '@door', '@distspeed', 'two:xte,sog', 'events'],
  modules: ['distspeed', 'door'],
  overlays: ['squall', 'courseline'],
};
