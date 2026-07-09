/* Presentation config template — the shell's window.__RACE_CONFIG__.
   Copy alongside config.yaml and fill in. FACTS shared with config.yaml
   (course, hero/client_boat, time, defaults) must MATCH it — shell/build.py
   runs a consistency check and refuses to build on divergence. Presentation
   judgment (phases, KPI copy, map leader-labels, palette tweaks) lives only
   here. The worked example (examples/nb2026/presentation.js) documents every
   key with its origin. */
window.__RACE_CONFIG__ = {
  meta: { title: '', url: '', description: '', ogDescription: '', ogImage: 'og.png' },
  hero: { name: '', color: '#C2187E' },        // must equal config.yaml client_boat; color pairs with --magenta
  time: { utcOffset: -4, tzLabel: 'EDT' },     // must equal config.yaml time
  course: {
    start: [0, 0], finish: [0, 0],             // must equal config.yaml course
    rhumbNm: 0, dtfStartFallback: 0,
    mapRange: { lon: [0, 0], lat: [0, 0] },
    startLabel: '', finishLabel: '',
  },
  phases: [],                                  // [[fromDTF, toDTF, 'LABEL'], …] — authored narrative
  groups: {
    palette: {},                               // group key -> {label, colors:[…]}
    quick: [],                                 // chip-row groups; drives the core.json data split
    dnfKey: '', outsideKey: '', fallbackKey: '',
    buttons: {},                               // group button label -> [display names]
  },
  eventCategories: {},                         // key -> {c, sym, label, short, big?}; order = draw order
  defaults: {
    boats: [],                                 // I7: every boat here ships in core.json
    ev: [], ref: '',
    fleet: true, rhumb: true,
    overlays: {},                              // overlay id -> bool
    raceMode: 'h', raceView: 'p', axis: 'd',
  },
  race: { milestoneTop: 620, milestoneBottom: 30, milestoneStep: 10,
          paceMinDone: 50, eventRowY: 19, ratingLabel: '' },
  charts: {
    dtf: { yRange: [0, 0], eventTopY: 0 },
    sog: { yRange: [0, 14], eventTopY: 0 },
    xte: { eventTopY: 0 },
    // parkShading: { zone: [hi, lo], core: [hi, lo] },   // only with a park module (CP-2)
  },
  kpis: [],                                    // {label, value, sub}; {stats.*}/{park.hero.*} resolve from data
  mapLabels: [],                               // [[dtf, 'LABEL', ax, ay], …] — authored leader lines
  controls: { pills: ['@ghosts', '@rhumb'] },  // pill order; '@' = shell pills, ids = overlays
  layout: ['map', 'dtf', 'race', 'two:xte,sog', 'events'],   // '@<id>' mounts a section module
  modules: [],
  overlays: [],
};
