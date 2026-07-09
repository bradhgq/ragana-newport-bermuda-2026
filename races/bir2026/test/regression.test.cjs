/* Regression suite for the BIR 2026 dashboard — every human-caught defect from
   the 8 screenshot rounds (CP-4 assertions block) as a named, runnable test.

   Run:  TZ=America/New_York node --test test/
   (build.py runs this as a build gate — a red suite refuses to ship.)

   Two tiers:
     · data/logic — helpers.js + the FROZEN oracle payload, no DOM.
     · render/DOM — the real app driven under jsdom with a capturing Plotly
       stub (test/harness.cjs); asserts on the figure specs the app emits.

   The FROZEN payload is the oracle (prime rule 3). These tests assert what it
   says and what the approved monolith drew — they never re-derive a number. */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const H = require(path.join(__dirname, '..', 'src', 'helpers.js'));
const { loadDashboard, FROZEN, css, indexHtml, DIR } = require(path.join(__dirname, 'harness.cjs'));

const D = FROZEN();
const boats = D.boats;
const hms = H.parseHMS;

/* small helpers */
const hav = (la1, lo1, la2, lo2) => {          // nautical miles
  const R = 3440.065, rad = Math.PI / 180;
  const dp = (la2 - la1) * rad, dl = (lo2 - lo1) * rad;
  const x = Math.sin(dp / 2) ** 2 + Math.cos(la1 * rad) * Math.cos(la2 * rad) * Math.sin(dl / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
};
const rectShapes = layout => (layout.shapes || []).filter(s => s.type === 'rect');
const actAnns = layout => (layout.annotations || []).filter(a => /ACT [123]/.test(a.text || ''));

/* ─────────────────────── GOLDENS (G1–G5) ─────────────────────── */

test('G1 · race chart Ragana endpoint, corrected+total = 276.07 min (+4:36:04)', () => {
  const min = (hms(boats['Ragana'].meta.corr) - hms(boats['Christopher Dragon XII'].meta.corr)) / 60;
  assert.ok(Math.abs(min - 276.07) < 0.02, `corrected endpoint ${min.toFixed(2)} ≠ 276.07`);
  // and it must actually reach the chart: Total view, corrected, m=0 endpoint
  const { CAP } = loadDashboard({ select: ['Ragana', 'Christopher Dragon XII'], state: { raceMode: 'h', raceView: 't' } });
  const rag = CAP.race.traces.find(t => t.name === 'Ragana');
  const end = rag.y[rag.x.indexOf(0)];
  assert.ok(Math.abs(end - 276.07) < 0.02, `race chart endpoint ${end} ≠ 276.07`);
});

test('G2 · race chart Ragana endpoint, elapsed+total = 288.55 min (+4:48:33)', () => {
  const min = (hms(boats['Ragana'].meta.el) - hms(boats['Christopher Dragon XII'].meta.el)) / 60;
  assert.ok(Math.abs(min - 288.55) < 0.02, `elapsed endpoint ${min.toFixed(2)} ≠ 288.55`);
  const { CAP } = loadDashboard({ select: ['Ragana', 'Christopher Dragon XII'], state: { raceMode: 'e', raceView: 't' } });
  const rag = CAP.race.traces.find(t => t.name === 'Ragana');
  const end = rag.y[rag.x.indexOf(0)];
  assert.ok(Math.abs(end - 288.55) < 0.02, `race chart endpoint ${end} ≠ 288.55`);
});

test('G3 · upwind bar Ragana − CD = 4.7 nm (from stored meta.up1bi, not recomputed)', () => {
  const diff = boats['Ragana'].meta.up1bi - boats['Christopher Dragon XII'].meta.up1bi;
  assert.ok(Math.abs(diff - 4.7) < 0.001, `up1bi diff ${diff} ≠ 4.7`);
  // the chart reads the stored value; CD is the anchor, Ragana labelled +4.7
  const { CAP } = loadDashboard({ select: ['Ragana', 'Christopher Dragon XII'] });
  const bar = CAP.upwind.traces[0];
  const i = bar.y.indexOf('Ragana');
  assert.equal(bar.text[i], '+4.7 nm · fin 9th', `Ragana bar label was "${bar.text[i]}"`);
});

test('G4 · edtStr(1779602689) === "2026-05-24 02:04" under TZ=America/New_York', () => {
  assert.equal(process.env.TZ, 'America/New_York',
    'run with TZ=America/New_York — the point is to catch double-shifting in Eastern browsers');
  assert.equal(H.edtStr(1779602689), '2026-05-24 02:04');
});

test('G5 · ORC finstrip band = 33, PHRF = 23, corrected times NEVER pooled', () => {
  const pool = cls => Object.keys(boats).filter(nm => nm !== 'Lucky'
    && boats[nm].meta.cls === cls && boats[nm].meta.corr && boats[nm].meta.el);
  const orc = pool('ORC'), phrf = pool('PHRF');
  assert.equal(orc.length, 33, `ORC finishers ${orc.length} ≠ 33`);
  assert.equal(phrf.length, 23, `PHRF finishers ${phrf.length} ≠ 23`);
  assert.equal(orc.filter(nm => phrf.includes(nm)).length, 0, 'ORC/PHRF pools overlap — divisions pooled');
  // and the chart draws two separate bands, each labelled with its own count
  const { CAP } = loadDashboard({ select: ['Ragana'] });
  const anns = CAP.finstrip.layout.annotations.map(a => a.text);
  assert.ok(anns.some(t => /ORC .* 33 finishers/.test(t)), 'ORC band not labelled 33');
  assert.ok(anns.some(t => /PHRF .* 23 finishers/.test(t)), 'PHRF band not labelled 23');
});

/* ─────────────────────── A1–A5 (round 2) ─────────────────────── */

test('A1 · despike — no implied speed > 25 kt in shipped tracks; Fri 20:00 phantom cluster removed', () => {
  // (a) every payload track (despiked + finish-trimmed) is physically sailable
  let worst = 0, worstBoat = '';
  for (const [nm, b] of Object.entries(boats)) {
    if (!b.t) continue;
    for (let i = 1; i < b.t.length; i++) {
      const dt = b.t[i] - b.t[i - 1]; if (dt <= 0) continue;
      const kt = hav(b.lat[i - 1], b.lon[i - 1], b.lat[i], b.lon[i]) / (dt / 3600);
      if (kt > worst) { worst = kt; worstBoat = nm; }
    }
  }
  assert.ok(worst <= 25, `implied speed ${worst.toFixed(1)} kt on ${worstBoat} exceeds 25 — teleport/car-ride leaked through`);

  // (b) the simultaneous phantom fixes at Fri 2026-05-22 20:00 EDT (epoch
  // 1779494400) that teleported ~15 boats near Block Island are gone from clean
  const PH = 1779494400;
  const parse = f => {
    const rows = fs.readFileSync(path.join(DIR, 'raw', f), 'utf8').trim().split('\n').slice(1);
    return rows.map(r => { const c = r.split(','); return { key: c[0] + ':' + c[3], ep: +c[3], la: +c[4], lo: +c[5] }; });
  };
  const clean = new Set(parse('tracks_clean.csv').map(r => r.key));
  const removedAtPhantom = parse('tracks.csv').filter(r => r.ep === PH && !clean.has(r.key)
    && Math.abs(r.la - 41.2) < 0.3 && Math.abs(r.lo + 71.55) < 0.4);
  assert.ok(removedAtPhantom.length >= 16,
    `only ${removedAtPhantom.length} phantom near-BI fixes removed at Fri 20:00 (expected ≥16)`);
});

test('A2 · corrected mode hides cross-division boats with a visible note (PHRF never crossed with ORC)', () => {
  // Young American is PHRF; the reference (CD XII) is ORC → hidden under corrected
  const { CAP, document } = loadDashboard({
    select: ['Ragana', 'Christopher Dragon XII', 'Young American'],
    state: { raceMode: 'h', ref: 'Christopher Dragon XII' } });
  assert.ok(!CAP.race.traces.some(t => t.name === 'Young American'),
    'PHRF boat drawn on the corrected race chart against an ORC reference');
  const note = document.getElementById('racenote').innerHTML;
  assert.match(note, /hidden/);
  assert.match(note, /never compared across scoring divisions/);
  // and in elapsed mode the same boat IS drawn (boat-for-boat is allowed)
  const el = loadDashboard({ select: ['Ragana', 'Christopher Dragon XII', 'Young American'],
    state: { raceMode: 'e', ref: 'Christopher Dragon XII' } });
  assert.ok(el.CAP.race.traces.some(t => t.name === 'Young American'), 'elapsed mode wrongly hid a boat');
});

test('A3 · payload events === rendered log rows (14 public events; 2 private third-party items withheld)', () => {
  assert.equal(D.events.length, 14, `public payload has ${D.events.length} events, expected 14`);
  const { document } = loadDashboard();
  const rows = document.querySelectorAll('#eventtable tbody tr');
  assert.equal(rows.length, D.events.length, `rendered ${rows.length} log rows ≠ ${D.events.length} events`);
});

test('A4 · fleet ghost layer === 57 boats (out-and-back arrival guard)', () => {
  assert.equal(D.fleet.length, 57, `fleet ghosts ${D.fleet.length} ≠ 57`);
});

test('A5 · Daffodil absent (DNC, stationary at mooring); MXM & Towhee absent', () => {
  for (const nm of ['Daffodil', 'MXM', 'Towhee']) assert.ok(!boats[nm], `${nm} leaked into the payload`);
});

/* ─────────────────────── A6 (round 3, narrative honesty) ─────────────────────── */

test('A6 · upwind module shows finish place per bar; copy states 4.7nm≈53min vs a 276-min gap, Zélée +8.9 counterexample', () => {
  const { CAP } = loadDashboard({ select: ['Ragana', 'Christopher Dragon XII', 'Zélée', 'In Theory'] });
  const bar = CAP.upwind.traces[0];
  // every Class-6 bar is labelled with a finish place (or the reference line)
  const c6 = ['Ragana', 'In Theory'];
  for (const nm of c6) {
    const lbl = bar.text[bar.y.indexOf(nm)];
    assert.match(lbl, /fin \d/, `${nm} bar missing finish place: "${lbl}"`);
  }
  assert.equal(bar.text[bar.y.indexOf('Christopher Dragon XII')], 'reference · won class');
  // the approved copy carries the honest framing (4.7 nm is ~53 min of a 276-min gap; Zélée sailed further, finished ahead)
  const copy = indexHtml();
  assert.match(copy, /\+4\.7 nm/);
  assert.match(copy, /≈53 minutes of a 276-minute corrected gap/);
  assert.match(copy, /Zélée sailed \+8\.9/);
});

/* ─────────────────────── A7–A16 (rounds 4–8, layout + correctness) ─────────────────────── */

test('A7 · finstrip is a bidirectional beeswarm (y-spread non-monotonic), not a diagonal', () => {
  const { CAP } = loadDashboard({ select: ['Ragana'] });
  // ORC "others" trace: the larger of the two scatter clusters near y≈0
  const clusters = CAP.finstrip.traces.filter(t => t.mode === 'markers' && t.y.length > 5);
  assert.ok(clusters.length >= 1, 'no populated finstrip cluster');
  const orc = clusters.sort((a, b) => b.y.length - a.y.length)[0];
  // x is sorted ascending (by corrected time); if it were a diagonal, y would be
  // monotonic in x. A real beeswarm fans y both up and down as x increases.
  let ups = 0, downs = 0;
  for (let i = 1; i < orc.y.length; i++) { if (orc.y[i] > orc.y[i - 1]) ups++; else if (orc.y[i] < orc.y[i - 1]) downs++; }
  assert.ok(ups > 0 && downs > 0, `finstrip y is monotonic (ups=${ups} downs=${downs}) — diagonal, not beeswarm`);
  // and there are two distinct bands (ORC near 0, PHRF near 2*BAND+GAP≈23)
  const ys = CAP.finstrip.traces.flatMap(t => t.y);
  assert.ok(Math.max(...ys) > 15, 'second (PHRF) band not separated from the ORC band');
});

test('A8 · boat tracks carry periodic mid-line direction arrows (scaled to selection size)', () => {
  const { CAP } = loadDashboard({ select: ['Ragana', 'Christopher Dragon XII'] });
  const arrows = CAP.map.traces.filter(t => t.marker && t.marker.symbol === 'arrow' && t.marker.angleref === 'previous');
  assert.ok(arrows.length >= 2, 'expected an arrow trace per selected boat');
  assert.ok(arrows.every(a => a.x.length >= 3 && a.x.length <= 6), 'arrow count per track out of the 3–6 range');
});

test('A9 · .note paragraphs render at full column width (max-width:none, not an 80ch clamp)', () => {
  assert.match(css(), /\.note\{[^}]*max-width:none/,
    '.note must not be clamped — the r5 defect was an 80ch/601px column');
});

test('A10 · chip row is the Class-6 superset — 15 boats incl. the six cross-division extras', () => {
  const { document } = loadDashboard();
  const chips = [...document.querySelectorAll('#chips button')];
  const boatChips = chips.filter(b => !/\+ More/.test(b.textContent));
  assert.equal(boatChips.length, 15, `chip row has ${boatChips.length} boat chips, expected 15`);
  const labels = boatChips.map(b => b.textContent);
  for (const nm of ['Ragana', 'Young American', 'Max', 'Loki', 'Banter', 'Touch of Grey', 'Full Tilt'])
    assert.ok(labels.some(l => l.startsWith(nm)), `${nm} missing from the chip row`);
});

test('A11 · upwind-lane on distance-sailed x (0 → ~105 nm), fills frame, rounding marked', () => {
  const { CAP } = loadDashboard({ select: ['Ragana', 'Christopher Dragon XII', 'Sleeper', 'Zélée'] });
  const xr = CAP.xte.layout.xaxis.range;
  assert.equal(xr[0], 0, 'lane x-axis must start at 0 nm sailed');
  assert.ok(xr[1] > 90 && xr[1] < 130, `lane x-axis max ${xr[1]} outside 90–130 nm`);
  const yr = CAP.xte.layout.yaxis.range;   // element-wise (arrays are cross-realm from jsdom)
  assert.equal(yr[0], -6.5); assert.equal(yr[1], 6.5);
  // rounding markers (circle-open at each line's end)
  assert.ok(CAP.xte.traces.some(t => t.marker && t.marker.symbol === 'circle-open'), 'no Block Island rounding markers');
});

test('A12 · DTF + race + SOG charts all carry the identical 3 act bands', () => {
  const { CAP } = loadDashboard({ select: ['Ragana', 'Christopher Dragon XII'] });
  for (const id of ['dtf', 'race', 'sog']) {
    assert.equal(rectShapes(CAP[id].layout).length, 3, `${id} does not have 3 act bands`);
    const labels = actAnns(CAP[id].layout).map(a => a.text).sort();
    assert.equal(labels.length, 3, `${id} missing act-band labels`);
    assert.ok(labels.some(t => /OUT/.test(t)) && labels.some(t => /SOUND → BLOCK ISLAND/.test(t)) && labels.some(t => /ROUNDING & HOME/.test(t)),
      `${id} act labels wrong: ${labels}`);
  }
});

test('A13 · rounding annotation is on the EAST side of the island (starboard geometrically clear)', () => {
  const { CAP } = loadDashboard({ select: ['Ragana'] });
  const a = CAP.map.layout.annotations.find(x => /island to starboard/.test(x.text || ''));
  assert.ok(a, 'starboard rounding annotation missing');
  // island centre is ~ -71.578 lon; the label sits east of it (less negative lon)
  assert.ok(a.x > -71.578, `starboard label at lon ${a.x} is not east of the island centre`);
});

test('A14 · map y-range clipped to lat p1–p99 with no scaleanchor (content fills the frame)', () => {
  const { CAP } = loadDashboard({ select: ['Ragana', 'Christopher Dragon XII'] });
  const y = CAP.map.layout.yaxis;
  assert.ok(!y.scaleanchor, 'map yaxis must NOT be aspect-locked (scaleanchor wastes ~80% height)');
  assert.ok(Array.isArray(y.range) && y.range[1] > y.range[0], 'map yaxis range not set to the data band');
  // the clip is tight: latitude span under ~1° (a p1–p99 band, not the raw extent)
  assert.ok(y.range[1] - y.range[0] < 1.0, `map lat span ${(y.range[1] - y.range[0]).toFixed(2)}° too wide — outliers not clipped`);
});

test('A15 · race + upwind-lane (xte) + SOG charts are all 360px tall', () => {
  const c = css();
  for (const id of ['race', 'xte', 'sog'])
    assert.match(c, new RegExp('#' + id + '\\{height:360px\\}'), `#${id} is not 360px`);
});

test('A16 · race log: nm column 44px, notes column sans-serif at full width', () => {
  const { document } = loadDashboard();
  const html = document.getElementById('eventtable').innerHTML;
  assert.match(html, /width:44px/, 'nm column is not 44px');
  const heads = [...document.querySelectorAll('#eventtable thead th')];
  assert.equal(heads.length, 5, `log table has ${heads.length} columns, expected 5`);
  assert.match(css(), /\.logtable td:nth-child\(5\)\{font-family:-apple-system/, 'notes column not set to sans-serif');
});

/* ─────────────────────── new finding (prime rule 5) ─────────────────────── */

test('NF1 · Windfall ships meta-only (untracked PHRF finisher, injected post-postprocess)', () => {
  // The FROZEN oracle injects Windfall as a meta-only PHRF finisher — WITHOUT it,
  // the PHRF finstrip band would be 22, not the golden 23. goldens.json/config.yaml
  // still list Windfall under names_absent; that golden is stale vs the oracle.
  const w = boats['Windfall'];
  assert.ok(w, 'Windfall missing — PHRF band would be 22, breaking G5');
  assert.equal(w.meta.cls, 'PHRF');
  assert.ok(w.meta.corr && w.meta.el, 'Windfall must carry corrected/elapsed to score in the PHRF band');
  assert.ok(!w.t || w.t.length === 0, 'Windfall is untracked — it must ship with no track points');
});

test('NF2 · display-name override applied: payload uses "Zélée" (goldens.json still shows the raw "Zèlèe")', () => {
  assert.ok(boats['Zélée'], 'display name Zélée not applied');
  assert.ok(!boats['Zèlèe'], 'raw pre-override name leaked into the payload');
});
