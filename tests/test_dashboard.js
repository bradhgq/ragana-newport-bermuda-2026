#!/usr/bin/env node
/* Parameterized dashboard regression harness (I10 — tests gate the build).

     TZ=America/New_York node tests/test_dashboard.js <race_dir> [regression.json]

   Loads races/<race>/dist/standalone.html (self-contained: embedded data, no
   fetches), extracts its scripts, executes them in a vm sandbox with DOM and
   Plotly mocks, boots the app, and asserts the per-race fixtures across the
   four I10 categories:

     timezone       — tz probe renders naive-local under a non-UTC TZ; duration
                      round-trip; official start inside the start sequence
     exact-endpoint — race-chart final point == official corrected / elapsed /
                      pace deltas vs the reference (I2), asserted from the
                      RENDERED traces in all three mode combinations
     derived-metric — park module canary (I3) in payload AND rendered table;
                      finstrip renders every scored boat
     name-hygiene   — every selection surface (defaults, group buttons,
                      reference, fixture lists) exists in the data keys; plus
                      the DTF axis guard (time axis regardless of the shared
                      toggle — distance never plots on both axes)

   Assertion counts are fixed per category so a silently-skipped block fails
   loudly. Every human-caught defect lands here as a new assertion (prime rule 5).
*/
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const raceDir = path.resolve(process.argv[2] || '.');
const fixPath = process.argv[3] || path.join(raceDir, 'tests', 'regression.json');
const FIX = JSON.parse(fs.readFileSync(fixPath, 'utf8'));
const html = fs.readFileSync(path.join(raceDir, 'dist', 'standalone.html'), 'utf8');

/* ── minimal DOM mock ── */
class El {
  constructor(tag, id) {
    this.tagName = (tag || 'div').toUpperCase(); this.id = id || '';
    this.children = []; this.dataset = {}; this.style = {}; this.attrs = {};
    this.hidden = false; this.disabled = false; this.innerHTML = ''; this.textContent = '';
    this.value = ''; this.selected = false; this.type = '';
    const self = this;
    this.classList = {
      set: new Set(),
      add(...c) { c.forEach(x => this.set.add(x)); },
      remove(...c) { c.forEach(x => this.set.delete(x)); },
      toggle(c, force) { (force ?? !this.set.has(c)) ? this.set.add(c) : this.set.delete(c); },
      contains(c) { return this.set.has(c); },
    };
    // className writes replace the class set (shell uses both styles)
    Object.defineProperty(this, 'className', {
      get() { return [...self.classList.set].join(' '); },
      set(v) { self.classList.set = new Set(String(v).split(/\s+/).filter(Boolean)); },
    });
  }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k.startsWith('data-')) this.dataset[k.slice(5)] = String(v); }
  getAttribute(k) { return this.attrs[k] ?? null; }
  removeAttribute(k) { delete this.attrs[k]; }
  appendChild(c) { this.children.push(c); return c; }
  remove() { this.removed = true; }
  focus() {}
  addEventListener() {}
  querySelector(sel) { return domQuery(this, sel)[0] || null; }
  querySelectorAll(sel) { return domQuery(this, sel); }
}
const byId = new Map();
function getEl(id) {
  if (!byId.has(id)) byId.set(id, new El('div', id));
  return byId.get(id);
}
// section scaffolds need child h2/.note/[data-mount] lookups; axisToggle needs buttons
function domQuery(root, sel) {
  if (sel === 'h2') return [root._h2 = root._h2 || new El('h2')];
  if (sel === '.note') return [root._note = root._note || new El('div')];
  if (sel === '[data-mount]') {
    // the mount div shares its id with the module (build.py emits <div id="<id>" data-mount>)
    return [getEl(root.id.replace(/^sec_/, ''))];
  }
  if (sel === '#axisToggle button') {
    if (!root._axbtns) root._axbtns = ['t', 'd'].map(ax => { const b = new El('button'); b.dataset.ax = ax; return b; });
    return root._axbtns;
  }
  if (sel === '.more-row' || sel === '.plot') return [];
  return [];
}

const domListeners = [];
const documentMock = {
  readyState: 'loading', hidden: false,
  body: new El('body'),
  getElementById: getEl,
  createElement: tag => new El(tag),
  addEventListener: (ev, fn) => { if (ev === 'DOMContentLoaded') domListeners.push(fn); },
  querySelectorAll: sel => sel === '#axisToggle button' ? domQuery(getEl('axisToggle'), sel) : [],
};

/* ── Plotly mock: capture every react() call ── */
const plots = {};   // id -> {traces, layout}
const PlotlyMock = { react(id, traces, layout) { plots[id] = { traces, layout }; } };

/* ── sandbox ── */
const sandbox = {
  console, Date, Math, JSON, Set, Map, Promise, Object, Array, String, Number, RegExp, Error,
  setTimeout: fn => { fn(); return 1; }, clearTimeout: () => {},
  requestAnimationFrame: fn => { fn(); return 1; },
  document: documentMock,
};
sandbox.window = sandbox;
sandbox.window.Plotly = PlotlyMock;
sandbox.window.matchMedia = () => ({ matches: false });
sandbox.window.addEventListener = () => {};
sandbox.window.scrollY = 0;
vm.createContext(sandbox);

/* ── script extraction: every inline <script> except the Plotly vendor blob ── */
const scripts = [];
const re = /<script(?![^>]*\bsrc=)([^>]*)>([\s\S]*?)<\/script>/g;
let m;
while ((m = re.exec(html)) !== null) {
  if (/id="plotlyjs"/.test(m[1])) continue;
  scripts.push(m[2]);
}
assert.ok(scripts.length >= 10, `expected the standalone script set, got ${scripts.length}`);
for (const src of scripts) vm.runInContext(src, sandbox);

/* ── fixed-count test runner ── */
let passed = 0, failed = 0;
function check(category, name, fn) {
  try { fn(); passed++; console.log(`✔ [${category}] ${name}`); }
  catch (e) { failed++; console.error(`✘ [${category}] ${name}\n   ${e.message}`); }
}
const approx = (a, b, tol, msg) => assert.ok(Math.abs(a - b) < tol, `${msg}: ${a} !≈ ${b} (tol ${tol})`);

(async function main() {
  // boot: fire the captured DOMContentLoaded handlers, then drain microtasks
  documentMock.readyState = 'complete';
  for (const fn of domListeners) fn();
  await new Promise(r => setTimeout(r, 0));
  await null; await null; await null;

  // top-level const/let in classic scripts (S, render, …) live in the context's
  // global LEXICAL scope, not on window — reach them via evaluation
  const evalIn = expr => vm.runInContext(expr, sandbox);
  const CFG = sandbox.__RACE_CONFIG__;
  const D = sandbox.__DATA_EMBEDDED__;
  const S = evalIn('S');
  const render = evalIn('render');
  const off = CFG.time.utcOffset;
  const H = { tzStr: sandbox.tzStr, parseDur: sandbox.parseDur, startOf: sandbox.startOf };
  const hero = CFG.hero.name, ref = FIX.endpoints.ref;

  /* ── timezone ── */
  check('timezone', 'suite runs under an explicit TZ', () => {
    assert.ok(process.env.TZ, 'TZ must be set — CI pins America/New_York');
    if (process.env.TZ === 'UTC')
      console.warn('   note: under TZ=UTC double-shift bugs can hide; the canonical run is America/New_York');
  });
  check('timezone', `tz probe: tzStr(${FIX.tz_probe.epoch}) renders naive-local`, () => {
    assert.equal(H.tzStr(FIX.tz_probe.epoch, off), FIX.tz_probe.rendered);
  });
  check('timezone', 'duration round-trip + official start inside the start sequence', () => {
    assert.equal(H.parseDur(FIX.duration_roundtrip.str), FIX.duration_roundtrip.seconds);
    const start = H.startOf(D.boats[FIX.start_window.boat], off);
    const s = H.tzStr(start, off);
    assert.equal(s.slice(0, 10), FIX.start_window.date);
    const hm = s.slice(11);
    assert.ok(hm >= FIX.start_window.hm_min && hm <= FIX.start_window.hm_max, `start ${hm} outside the sequence`);
  });

  /* ── exact-endpoint (I2): read the RENDERED race-chart traces ── */
  const heroEndpoint = () => {
    const tr = plots.race.traces.find(t => t.name === hero);
    assert.ok(tr, `race chart has no ${hero} trace`);
    return tr.y[tr.y.length - 1];
  };
  const setState = (mode, view) => {
    S.raceMode = mode; S.raceView = view; render('race');
  };
  check('exact-endpoint', `corrected endpoint vs ${ref} = +${FIX.endpoints.corrected_min} min`, () => {
    assert.equal(S.ref, ref, 'default reference drifted');
    setState('h', 't');
    const v = heroEndpoint();
    approx(v, FIX.endpoints.corrected_min, 0.05, 'corrected endpoint');
    assert.ok(v > 0, 'endpoint sign flipped');
  });
  check('exact-endpoint', `elapsed endpoint = +${FIX.endpoints.elapsed_min} min`, () => {
    setState('e', 't');
    const v = heroEndpoint();
    approx(v, FIX.endpoints.elapsed_min, 0.05, 'elapsed endpoint');
    assert.ok(v > 0, 'endpoint sign flipped');
  });
  check('exact-endpoint', `pace endpoint = ${FIX.endpoints.pace_min_per_100} min/100nm`, () => {
    setState('h', 'p');
    approx(heroEndpoint(), FIX.endpoints.pace_min_per_100, 0.05, 'pace endpoint');
  });

  /* ── derived-metric (I3 + module canaries) ── */
  const park = FIX.module_canaries.park;
  check('derived-metric', `park canary: ${park.boat} u4 = ${park.u4}% (own-traversal, not wall-clock)`, () => {
    assert.equal(D.parkFair[park.boat].u4, park.u4);
    S.boats.add(park.boat); render('boats');
    const el = getEl('parkfair');
    assert.ok(new RegExp(`${park.boat}[\\s\\S]*?${park.u4}%`).test(el.innerHTML),
      'rendered park table does not show the canary');
  });
  check('derived-metric', `finstrip renders every scored boat (${FIX.finstrip_count})`, () => {
    const scored = Object.values(D.boats).filter(b => b.meta.corr).length;
    assert.equal(scored, FIX.finstrip_count, 'scored-boat count drifted');
    const [dots, diamond] = plots.finstrip.traces;
    assert.equal(dots.x.length + diamond.x.length, FIX.finstrip_count,
      'finstrip dots+diamond != scored boats');
  });

  /* ── name-hygiene (I4; every selection surface ⊆ data keys) ── */
  check('name-hygiene', 'fixture names present / dirty variants absent', () => {
    for (const nm of FIX.names_present) assert.ok(D.boats[nm], `${nm} missing from data keys`);
    for (const nm of FIX.names_absent) assert.ok(!D.boats[nm], `dirty name leaked: ${nm}`);
  });
  check('name-hygiene', 'every selection surface exists in the data keys', () => {
    const surfaces = [
      ['defaults.boats', CFG.defaults.boats],
      ['defaults.ref', [CFG.defaults.ref]],
      ['scoring probe/endpoint ref', [ref]],
      ...Object.entries(CFG.groups.buttons).map(([g, names]) => [`groups.buttons[${g}]`, names]),
    ];
    for (const [where, names] of surfaces)
      for (const nm of names)
        assert.ok(D.boats[nm], `${where}: '${nm}' not in data keys (the Zélée class of bug)`);
  });
  check('name-hygiene', 'DTF chart stays clock-based under the distance toggle (no distance on both axes)', () => {
    S.axis = 'd'; render('axis'); render('ev');   // ev scope rebuilds dtf
    assert.equal(plots.dtf.layout.xaxis.type, 'date', 'dtf x-axis lost its date type');
    const x0 = plots.dtf.traces[0].x[0];
    assert.match(String(x0), /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/,
      `dtf x-values must be naive local strings, got ${x0}`);
  });

  /* ── round 2: VMC channel (I14 — VMC integrates back to the course) ── */
  const V = FIX.vmc;
  check('vmc', `channel integrity: hero official-window mean ≈ ${V.hero_mean_kt} kt, negatives real`, () => {
    const hb = D.boats[hero];
    assert.ok(Array.isArray(hb.vmc), 'hero has no vmc array');
    assert.equal(hb.vmc.length, hb.sog.length, 'vmc length != sog length');
    const start = H.startOf(hb, off);
    const finEp = start + H.parseDur(hb.meta.el);
    const inwin = hb.t.map((t, i) => [t, hb.vmc[i]]).filter(([t, v]) => v != null && t >= start && t <= finEp);
    const mean = inwin.reduce((s, [, v]) => s + v, 0) / inwin.length;
    approx(mean, V.hero_mean_kt, V.tol, '∫VMC dt must recover the rhumb ÷ elapsed');
    const anyNeg = Object.values(D.boats).some(b => (b.vmc || []).some(v => v != null && v < 0));
    assert.ok(anyNeg, 'no negative VMC anywhere — tacks/park drift got clamped?');
  });
  check('vmc', 'speed chart renders both metrics; labelled VMC never VMG; park shading stays', () => {
    assert.equal(S.axis, 'd', 'precondition: distance axis');
    S.speedMetric = 'vmc'; render('speed');
    const yt = plots.sog.layout.yaxis.title.text;
    assert.ok(yt.includes('VMC'), `y-axis title must say VMC: ${yt}`);
    assert.ok(!yt.includes('VMG'), 'must not claim VMG (no wind data)');
    const yr = plots.sog.layout.yaxis.range;   // element-wise: vm arrays fail cross-realm deepEqual
    assert.ok(yr[0] === V.y_range[0] && yr[1] === V.y_range[1],
      `VMC y-range must admit negatives: [${yr}] != [${V.y_range}]`);
    const note = getEl('sog_note').innerHTML;
    assert.ok(note.includes('not wind-VMG'), 'VMC caption must carry the no-wind-data caveat');
    assert.ok(note.includes('boatspeed'), 'VMC caption must carry the Sunday verdict');
    const park = CFG.charts.parkShading;
    assert.ok(plots.sog.layout.shapes.some(s => s.type === 'rect' && s.x0 === park.zone[0] && s.x1 === park.zone[1]),
      'park-zone shading missing in DTF-aligned VMC view');
    S.speedMetric = 'sog'; render('speed');
    assert.ok(plots.sog.layout.yaxis.title.text.includes('Speed over ground'), 'SOG mode did not restore');
  });

  /* ── round 2: class + rating-band filters ── */
  const CF = FIX.class_filter, TB = FIX.tcf_bands;
  const toggleClassFilter = evalIn('toggleClassFilter');
  const setBand = evalIn('setBand');
  const filterTargets = evalIn('filterTargets');
  const clsMembers = Object.keys(D.boats).filter(nm => D.boats[nm].meta.cls === CF.label);
  check('filters', `class input: ${CF.input} selects exactly ${CF.boats} boats; toggle removes only filter-added`, () => {
    assert.equal(clsMembers.length, CF.boats, `${CF.label} membership drifted`);
    const before = new Set(S.boats);
    const overlap = clsMembers.filter(nm => before.has(nm));
    assert.equal(overlap.length, CF.default_overlap, 'default-selection overlap drifted');
    toggleClassFilter(CF.input);
    for (const nm of clsMembers) assert.ok(S.boats.has(nm), `${nm} not selected by class filter`);
    toggleClassFilter(CF.input);   // toggle off
    for (const nm of overlap) assert.ok(S.boats.has(nm), `${nm} was default-selected and must survive`);
    for (const nm of clsMembers) if (!before.has(nm)) assert.ok(!S.boats.has(nm), `${nm} should have been removed`);
  });
  check('filters', `invalid class ${CF.invalid_input}: quiet inline state, no crash, selection untouched`, () => {
    const before = new Set(S.boats);
    toggleClassFilter(CF.invalid_input);
    assert.ok(evalIn('S.clsErr'), 'clsErr not set for unknown class');
    assert.deepEqual([...S.boats].sort(), [...before].sort(), 'selection changed on invalid input');
    toggleClassFilter(CF.input); toggleClassFilter(CF.input);   // valid action clears the error
    assert.ok(!evalIn('S.clsErr'), 'clsErr should clear on the next valid action');
  });
  check('filters', `band ±0.01 selects ${TB.width_counts['0.01']} rating peers; class composes as intersection (${TB.class3_band001})`, () => {
    const t0 = D.boats[hero].meta.tcf;
    setBand(t0 - 0.01, t0 + 0.01, '0.01');
    assert.equal(filterTargets().length, TB.width_counts['0.01'], '±0.01 match count drifted');
    for (const nm of filterTargets()) assert.ok(S.boats.has(nm), `${nm} in band but not selected`);
    toggleClassFilter(CF.input);             // compose: class ∩ ±0.01 band
    assert.equal(filterTargets().length, TB.class3_band001, 'class ∩ band intersection drifted');
    for (const nm of filterTargets())
      assert.ok(D.boats[nm].meta.cls === CF.label, `${nm} outside the class slipped through the intersection`);
    toggleClassFilter(CF.input);             // class off; band ±0.01 still active
    setBand(t0 - 0.02, t0 + 0.02, '0.02');   // replace with the wider band
    assert.equal(filterTargets().length, TB.width_counts['0.02'], '±0.02 match count drifted');
    setBand(t0 - 0.02, t0 + 0.02, '0.02');   // cleanup: same key toggles off
    assert.equal(filterTargets(), null, 'filters did not clear');
  });

  /* ── round 2: distance-vs-speed scatter (module canary) ── */
  const DS = FIX.distspeed;
  check('distspeed', `one dot per scored boat (${DS.dots}); hero at (${DS.hero}); rays exact; rhumb line`, () => {
    const [dots, diamond] = plots.distspeed.traces;
    assert.equal(dots.x.length + diamond.x.length, DS.dots, 'dots+diamond != scored boats');
    approx(diamond.x[0], DS.hero[0], 0.05, 'hero sailed distance');
    approx(diamond.y[0], DS.hero[1], 0.01, 'hero average speed');
    const ray = plots.distspeed.layout.shapes.find(s =>
      s.line && s.line.dash === 'dot' && Math.abs(s.y1 - s.x1 / (DS.iso_check_days * 24)) < 1e-9);
    assert.ok(ray, `no iso-elapsed ray consistent with v=d/t at ${DS.iso_check_days} d`);
    assert.ok(Math.abs(ray.y0 - ray.x0 / (DS.iso_check_days * 24)) < 1e-9, 'ray does not pass through the origin line');
    assert.ok(plots.distspeed.layout.shapes.some(s => s.x0 === DS.rhumb_x && s.x1 === DS.rhumb_x),
      `no rhumb reference line at ${DS.rhumb_x}`);
  });

  /* ── round 2: record corrections ── */
  const CO = FIX.corrections;
  check('corrections', `crew record: '${CO.events_contain}' present, Kevin note memorialized, '${CO.absent}' gone`, () => {
    assert.ok(D.events.some(e => e.txt.includes(CO.events_contain)), 'corrected seasickness event missing');
    const kev = D.recon.find(r => (r.note || '').includes(CO.recon_contains));
    assert.ok(kev, 'Kevin memorial note missing from the reconciliation');
    assert.equal(kev.verdict, 'match', 'Kevin row must read as a normal match, not an anomaly');
    const all = JSON.stringify(D.events) + JSON.stringify(D.recon);
    assert.ok(!all.includes(CO.absent), `'${CO.absent}' still present in the record`);
  });

  const EXPECTED = 18;   // fixed: a silently-skipped block must fail loudly
  console.log(`\n${passed} passed, ${failed} failed (of ${EXPECTED})`);
  if (failed || passed + failed !== EXPECTED) process.exit(1);
})().catch(e => { console.error(e); process.exit(1); });
