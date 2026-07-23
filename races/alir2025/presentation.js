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
    dnfKey: 'fleet_dnf', outsideKey: '', fallbackKey: 'fleet_other',
    buttons: {},
  },
  eventCategories: {},                    // no public events yet (Tier 1; owner squall testimony
                                          // lands via events.yaml at stage 3 if opted in)
  defaults: {
    boats: ['Daffodil', 'Max', 'Habiru YCC', 'Wahoo', 'Phantom', 'Dolcezza'],  // I7 core set
    ev: [], ref: 'Max',                   // milestone-delta reference: the overall winner
    fleet: true, rhumb: true,
    overlays: {},
    raceMode: 'h', raceView: 'p', axis: 'd', speedMetric: 'vmc',
  },
  race: { milestoneTop: 200, milestoneBottom: 20, milestoneStep: 20,
          correctedModel: 'tod',   // PHRF time-on-distance — first ToD race through the shell;
                                   // 'tot' (the default) would multiply partial elapsed by the
                                   // raw sec/mi rating and render garbage mid-race
          paceMinDone: 15, eventRowY: 19, ratingLabel: 'PHRF' },
  charts: {
    dtf: { eventTopY: 200 },
    sog: { yRange: [0, 16], eventTopY: 15,   // headroom: the trimaran's reach tops the monohull fleet
           metrics: { s: 'SOG', v: 'VMC (toward finish)' }, vmcYRange: [-3, 14] },
    xte: { eventTopY: 8 },
  },
  distspeed: {
    isoDays: [1.1, 1.6, 2.1],             // elapsed 26.4 / 38.4 / 50.4 h — brackets 24:11..51:32
    isoDaysCorr: [1.15, 1.5, 1.85],       // corrected 27.6 / 36 / 44.4 h — brackets 27:02..42:23
    toggle: { key: 'distMode', default: 'h',
              states: [{ v: 'e', label: 'Elapsed' }, { v: 'h', label: 'Corrected' }] },
  },
  kpis: [],                               // authored at stage 4
  mapLabels: [],
  controls: { pills: ['@ghosts', '@rhumb'] },
  layout: ['map', 'dtf', 'race', '@distspeed', 'two:xte,sog', 'events'],
  modules: ['distspeed'],
  overlays: [],
};
