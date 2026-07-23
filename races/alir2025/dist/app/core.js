/* Shell core — loader, state model, scoped rAF-batched renderer, controls,
   bottom sheet, tap-to-inspect, module/overlay registry, boot.

   Everything here is race-agnostic: race facts arrive via window.__RACE_CONFIG__
   (races/<race>/presentation.js), narrative copy via window.__COPY__
   (generated from copy.md), data via the three payloads. Modules register with
   registerModule()/registerOverlay() and receive the frozen ctx ABI
   (shell/INVARIANTS.md + RETROSPECTIVE §2); they read S, mutate only their own
   keys, and never call Plotly directly — react() carries invariant I6. */
"use strict";

/* ═══ data + readiness ═══ */
let D = null;            // core payload (authoritative; never recompute race numbers)
let FLEET = null;        // ghost layer, lazy
let ORDER = [], boatColor = {};
let chartsOK = false;    // Plotly loaded and core data present
let moreP = null;        // in-flight more.json fetch
let CFG = null, COPY = null, HERO = '';

const plotlyReady = new Promise(res => {
  const go = () => {
    if (window.Plotly) { res(); return; }
    const s = document.getElementById('plotlyjs');
    if (!s) { res(); return; }
    s.addEventListener('load', res);
    s.addEventListener('error', res);   // charts show an error via the guard below
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', go);
  else go();
});

function dataURL(name) { return 'data/' + name + '?v=a47c168821'; }
async function loadJSON(name) {
  const r = await fetch(dataURL(name));
  if (!r.ok) throw new Error(name + ': HTTP ' + r.status);
  return r.json();
}

/* ═══ module / overlay registry (the plugin ABI) ═══ */
const SECTION_MODULES = [];   // {id, deps, section:{title,note,kind}, build(ctx)}
const OVERLAYS = [];          // {id, pill:{label,color,default}, mapTraces?, bands?, legendTrace?, mapLayer?}
function registerModule(m) { SECTION_MODULES.push(m); }
function registerOverlay(o) { OVERLAYS.push(o); }
const overlayById = id => OVERLAYS.find(o => o.id === id);

/* ═══ state ═══ */
const S = {};   // seeded from CFG.defaults at boot; one object, pure build*() re-renders (I5)

const hasTrack = nm => !!(D.boats[nm] && D.boats[nm].t);

/* ═══ geometry over core data (hero pivot — was ragDTFat/ragT) ═══ */
function heroDTFat(t) {
  const r = D.boats[HERO];
  if (t <= r.t[0]) return CFG.course.dtfStartFallback;
  if (t >= r.t[r.t.length - 1]) return 0;
  let i = r.t.findIndex(x => x >= t); if (i <= 0) return r.dtf[0];
  const f = (t - r.t[i - 1]) / (r.t[i] - r.t[i - 1]);
  return r.dtf[i - 1] + f * (r.dtf[i] - r.dtf[i - 1]);
}
const heroT = m => hitTime(D.boats[HERO], m);   // hero's clock at a DTF milestone

/* tz-bound helper shorthands (helpers.js stays pure; the offset binds once here) */
const tzS = ts => tzStr(ts, CFG.time.utcOffset);
const fmtS = ts => fmt(ts, CFG.time.utcOffset);
const startS = b => startOf(b, CFG.time.utcOffset);

/* which x value does a given ping map to, under the current shared axis */
const axVal = (b, i) => S.axis === 't' ? tzS(b.t[i]) : b.dtf[i];
const evX = t => S.axis === 't' ? tzS(t) : heroDTFat(t);

/* every chart renders through here. On touch-width screens a finger-drag must
   scroll the PAGE, not zoom the plot — freeze the axes and kill dragmode (I6);
   tap-to-inspect and tap-hover still work. Desktop keeps drag-zoom + hover. */
function react(id, traces, layout) {
  if (!document.getElementById(id)) return;   // chart not in this race's layout
  if (narrow()) {
    layout.dragmode = false;
    for (const k of Object.keys(layout))
      if (/^[xy]axis\d*$/.test(k)) layout[k] = { ...layout[k], fixedrange: true };
  }
  Plotly.react(id, traces, layout, PLOTCFG);
}

/* shared x-axis config for the toggle-driven charts */
function sharedXaxis(extra) {
  const base = S.axis === 't'
    ? { ...GAX, tickformat: '%a %H:%M', type: 'date' }
    : { ...GAX, title: { text: 'Distance to finish (nm) — race runs right to left ⟵', font: AXFONT }, autorange: 'reversed' };
  return { ...base, ...(extra || {}) };
}

/* event dotted lines + top-pinned hoverable markers; axis mode 'shared' follows
   S.axis, 'time' is always clock-based (the DTF chart) */
function eventDecor(topY, mode) {
  const EVCAT = CFG.eventCategories;
  const X = mode === 'time' ? tzS : evX;
  const evs = D.events.filter(e => S.ev.has(e.cat));
  const shapes = evs.map(e => ({ type: 'line', xref: 'x', yref: 'paper', x0: X(e.t), x1: X(e.t), y0: 0, y1: 1,
    line: { color: EVCAT[e.cat].c, width: 1, dash: 'dot' }, opacity: .5 }));
  const marker = evs.length ? { x: evs.map(e => X(e.t)), y: evs.map(() => topY), mode: 'markers',
    marker: { symbol: evs.map(e => EVCAT[e.cat].sym), size: evs.map(e => EVCAT[e.cat].big ? 12 : 9),
      color: evs.map(e => EVCAT[e.cat].c), line: { width: 1, color: '#fff' } },
    text: evs.map(e => wrapText(`${e.label} · ${fmtS(e.t)} ${CFG.time.tzLabel} · ${Math.round(heroDTFat(e.t))} nm to go — ${e.txt}`)),
    hoverinfo: 'text', showlegend: false } : null;
  return { shapes, marker };
}

/* overlay band shapes for the x-band charts (gs rect, watch rects, …) */
function overlayShapes(mode) {
  const shapes = [];
  for (const o of OVERLAYS) {
    if (!S.ov[o.id] || !o.bands) continue;
    shapes.push(...o.bands(makeCtx(), mode));
  }
  return shapes;
}
/* optional overlay band LABELS (additive ABI field bandAnnotations — BIR act
   bands carry titles; consumed by the same charts that consume overlayShapes) */
function overlayAnnotations(mode) {
  const ann = [];
  for (const o of OVERLAYS) {
    if (!S.ov[o.id] || !o.bandAnnotations) continue;
    ann.push(...o.bandAnnotations(makeCtx(), mode));
  }
  return ann;
}
/* optional overlay legend entries (null-trace); watches only when its pill is on */
function watchLegend() {
  const o = overlayById('watches');
  return (o && S.ov.watches && o.legendTrace) ? o.legendTrace(makeCtx()) : null;
}

/* generic line-series builder over selected boats; valueKey ∈ dtf|xte|sog|vmc */
const SERIES_UNIT = { sog: ' kts', vmc: ' kts VMC', xte: ' nm', dtf: ' nm to go' };
function seriesTraces(valueKey, widthFn) {
  const tr = [];
  for (const nm of ORDER) {
    if (!S.boats.has(nm) || !hasTrack(nm) || !D.boats[nm][valueKey]) continue; const b = D.boats[nm];
    const xs = [], ys = [];
    for (let i = 0; i < b.t.length; i++) { xs.push(axVal(b, i)); ys.push(b[valueKey][i]); }
    tr.push({ x: xs, y: ys, mode: 'lines', name: nm, showlegend: valueKey === 'dtf',
      line: { color: boatColor[nm], width: widthFn(nm) }, opacity: nm === HERO ? 1 : .82,
      hovertemplate: `${nm} · %{x}${S.axis === 't' ? '' : ' nm to go'} · %{y}${SERIES_UNIT[valueKey] ?? ''}<extra></extra>` });
  }
  return tr;
}

/* ═══ the frozen ctx ABI (do not extend without updating INVARIANTS.md) ═══ */
function makeCtx(el) {
  return {
    D, S, cfg: CFG, el,
    copy: COPY,   // additive ABI field (2026-07-15): shared modules read their
                  // per-race captions from COPY.<module id> — narrative never
                  // lives in shared module code (found shipping NB copy on BIR)
    h: { tzStr: tzS, fmt: fmtS, parseDur, hitTime, startOf: startS, wrapText,
         axVal, evX, sharedXaxis, eventDecor, watchLegend,
         heroT, heroDTFat,
         narrow, BASE, GAX, AXFONT, boatColor, hasTrack },
    render,
  };
}

/* ═══ scoped re-rendering, batched through rAF ═══ */
let PLOTLY_CHARTS, BUILDERS, SCOPES;
function initRegistry() {
  // charts.<id>.height (additive, config-gated — ALIR stage-5 review): a race
  // may override a shell chart's CSS height with any CSS size string; absent
  // key = stylesheet default (nb/bir unaffected). Same licence as map heightScale.
  for (const id of ['dtf', 'race', 'xte', 'sog']) {
    const h = CFG.charts && CFG.charts[id] && CFG.charts[id].height;
    const el = h && document.getElementById(id);
    if (el && el.style) el.style.height = h;
  }
  PLOTLY_CHARTS = new Set(['map', 'dtf', 'race', 'xte', 'sog']);
  BUILDERS = { controls: buildControls, map: buildMap, dtf: buildDTF, race: buildRace,
               xte: buildXTE, sog: buildSOG, events: buildEventTable };
  SCOPES = {
    boats: ['controls', 'map', 'dtf', 'race', 'xte', 'sog'],
    ev: ['controls', 'map', 'dtf', 'race', 'xte', 'sog', 'events'],
    bands: ['controls', 'map', 'dtf', 'race', 'xte', 'sog'],   /* overlay band pills */
    map: ['controls', 'map'],                                  /* map-only pills */
    axis: ['controls', 'race', 'xte', 'sog'],
    race: ['controls', 'race'],
    speed: ['controls', 'sog'],                                /* SOG|VMC y-metric toggle */
    controls: ['controls'],                                    /* filter feedback only */
  };
  for (const m of SECTION_MODULES) {
    const el = document.getElementById('sec_' + m.id);
    const ctx = makeCtx(el ? el.querySelector('[data-mount]') : null);
    BUILDERS[m.id] = m.section.kind === 'plot'
      ? () => { const r = m.build(ctx); if (r) react(m.id, r.traces, r.layout); }
      : () => m.build(ctx);
    if (m.section.kind === 'plot') PLOTLY_CHARTS.add(m.id);
    for (const dep of m.deps || []) (SCOPES[dep] = SCOPES[dep] || []).push(m.id);
    SCOPES[m.id] = ['controls', m.id];   // self-scope: a module toggle rebuilds just itself (+ its buttons)
  }
  SCOPES.all = Object.keys(BUILDERS);
}
const pending = new Set(); let rafId = 0;
function render(scope) {
  for (const c of SCOPES[scope]) pending.add(c);
  if (rafId) return;
  rafId = 1;
  // rAF batches rapid toggles into one paint; it never fires in a hidden tab,
  // so fall back to a timeout there (I11: page loaded in a background tab)
  if (document.hidden) setTimeout(flush, 0); else requestAnimationFrame(flush);
}
function flush() {
  rafId = 0;
  const todo = [...pending]; pending.clear();
  for (const c of todo) {
    if (PLOTLY_CHARTS.has(c) && !chartsOK) continue;
    BUILDERS[c]();
    if (PLOTLY_CHARTS.has(c)) { attachTap(c); tapAffordance(c); }
  }
}

/* tap-to-inspect: click equivalent of hover, for touch */
const tapped = new Set();
/* on touch widths, advertise the tap affordance until the first tap replaces
   it — evaluated on every render (not just first attach) so crossing the
   breakpoint desktop→mobile still advertises it */
function tapAffordance(id) {
  if (!narrow()) return;
  const el = document.getElementById('tap_' + id);
  if (el && !el.classList.contains('show')) { el.textContent = 'Tap any point for details.'; el.classList.add('show'); }
}
function attachTap(id) {
  if (tapped.has(id)) return; tapped.add(id);
  const gd = document.getElementById(id);
  if (!gd || !gd.on) return;
  gd.on('plotly_click', ev => {
    const p = ev.points && ev.points[0]; if (!p) return;
    let txt = p.hovertext || (typeof p.text === 'string' ? p.text : '');
    if (!txt) {
      const nm = (p.data && p.data.name) || '';
      const y = typeof p.y === 'number' ? (+p.y).toFixed(1) : p.y;
      txt = `<b>${nm}</b> · ${p.x} · ${y}`;
    }
    const el = document.getElementById('tap_' + id);
    if (el) { el.innerHTML = txt; el.classList.add('show'); }
  });
}

/* ═══ lazy layers ═══ */
function ensureTracks(nm) {
  if (hasTrack(nm)) return Promise.resolve();
  if (!moreP) moreP = loadJSON('more.json').then(more => {
    for (const [k, v] of Object.entries(more)) Object.assign(D.boats[k], v);
  }).catch(e => { moreP = null; throw e; });
  return moreP;
}
function loadFleet() {
  if (FLEET) return;
  loadJSON('fleet.json').then(f => { FLEET = f; if (S.fleet) render('map'); })
    .catch(e => console.warn('fleet layer unavailable:', e));
}

/* ═══ controls ═══ */
function makeChip(label, color, active, onclick, locked, cls) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = (cls || 'chip') + (active ? ' on' : '') + (locked ? ' locked' : '');
  el.style.color = active ? '#fff' : color;
  if (active) el.style.background = color;
  if (cls === 'pill') el.style.borderColor = active ? color : color + '66';
  el.setAttribute('aria-pressed', active ? 'true' : 'false');
  el.innerHTML = `<span class="dot" aria-hidden="true"></span>${label}`;
  if (locked) el.disabled = true; else el.onclick = onclick;
  return el;
}
/* loading/error live in state (not the DOM) — buildMorePanel re-renders them,
   so a queued re-render can't wipe them out */
const trackLoading = new Set();
let trackLoadErr = null;
function toggleBoat(nm) {
  if (S.boats.has(nm)) { S.boats.delete(nm); render('boats'); return; }
  S.boats.add(nm);
  if (!hasTrack(nm)) {
    trackLoading.add(nm);
    ensureTracks(nm)
      .then(() => { trackLoadErr = null; })
      .catch(() => { S.boats.delete(nm);
        trackLoadErr = 'Couldn’t load that boat’s track — check your connection and try again.'; })
      .finally(() => { trackLoading.delete(nm); render('boats'); });
  }
  render('boats');
}
/* ═══ class + rating-band selection (round 2) ═══
   Both are set-selection ACTIONS over the one S.boats set, with filter state
   kept so they compose: when a class and a band are both active the target is
   the INTERSECTION. S.filterSel tracks only the boats the filters added, so
   toggling a filter off never removes a manually- or default-selected boat. */
const clsLabel = n => `${CFG.classFilter.prefix} ${n}`;
function filterTargets() {
  if (!S.clsSel.size && !S.band) return null;
  const out = [];
  for (const nm of ORDER) {
    const m = D.boats[nm].meta;
    if (S.clsSel.size && !S.clsSel.has(m.cls)) continue;
    if (S.band && !(m.tcf != null && m.tcf >= S.band.min - 1e-9 && m.tcf <= S.band.max + 1e-9)) continue;
    if (!S.clsSel.size && S.band && !m.corr) continue;   // band alone: scored boats only
    out.push(nm);
  }
  return out;
}
function applyFilters() {
  const target = filterTargets();
  for (const nm of [...S.filterSel])
    if (!target || !target.includes(nm)) { if (nm !== HERO) S.boats.delete(nm); S.filterSel.delete(nm); }
  if (target) for (const nm of target)
    if (!S.boats.has(nm)) { S.boats.add(nm); S.filterSel.add(nm); }
  const missing = [...S.filterSel].filter(nm => !hasTrack(nm));
  if (missing.length) ensureTracks(missing[0]).then(() => render('boats')).catch(() => {});
  render('boats');
}
function toggleClassFilter(n) {
  if (!CFG.classFilter) return;
  const label = clsLabel(n);
  if (!Number.isFinite(n) || !ORDER.some(nm => D.boats[nm].meta.cls === label)) {
    S.clsErr = (COPY.filters?.noSuchClass || 'No class “{x}” in the record.').replace('{x}', label);
    render('controls');
    return;
  }
  S.clsErr = null;
  S.clsSel.has(label) ? S.clsSel.delete(label) : S.clsSel.add(label);
  applyFilters();
}
function bandCount(min, max) {
  let n = 0;
  for (const nm of ORDER) { const m = D.boats[nm].meta;
    if (m.corr && m.tcf != null && m.tcf >= min - 1e-9 && m.tcf <= max + 1e-9) n++; }
  return n;
}
function setBand(min, max, key) {
  S.clsErr = null;
  S.band = (S.band && S.band.key === key && key !== 'custom') ? null
    : (min <= max ? { min, max, key } : null);
  applyFilters();
}

function buildControls() {
  // an async render('boats') (e.g. a lazy track fetch settling) rebuilds this
  // whole panel — carry in-progress filter input text and focus across it
  const keepInputs = {};
  for (const id of ['clsInput', 'bandMin', 'bandMax']) {
    const el = document.getElementById(id);
    if (el && (el.value || document.activeElement === el))
      keepInputs[id] = { v: el.value, focus: document.activeElement === el,
                         s: el.selectionStart, e: el.selectionEnd };
  }
  const chips = document.getElementById('chips'); chips.innerHTML = '';
  // chip row = quick groups + hand-picked cross-division extras (groups.chipExtras);
  // the rank tag reads groups.chipRank ('sdl' overall, default | 'clsPos' in-class)
  const extras = CFG.groups.chipExtras || [];
  const rankKey = CFG.groups.chipRank || 'sdl';
  const quick = ORDER.filter(nm => CFG.groups.quick.includes(D.boats[nm].meta.grp) || extras.includes(nm));
  for (const nm of quick) {
    const b = D.boats[nm];
    const el = makeChip(`${nm}<span style="opacity:.6;font-size:10px">${b.meta[rankKey] ? ' #' + b.meta[rankKey] : ''}</span>`,
      boatColor[nm], S.boats.has(nm),
      () => toggleBoat(nm), nm === HERO);
    el.title = `${b.meta.typ} · ${CFG.race.ratingLabel} ${b.meta.tcf ?? '—'} · corrected ${b.meta.corr ?? '—'}`;
    chips.appendChild(el);
  }
  const moreBtn = makeChip(`+ More boats (${ORDER.length - quick.length})`, '#17293A', S.showMore,
    () => { S.showMore = !S.showMore; buildControls(); });
  moreBtn.setAttribute('aria-expanded', S.showMore ? 'true' : 'false');
  moreBtn.setAttribute('aria-controls', 'morePanel');
  chips.appendChild(moreBtn);
  buildMorePanel();

  const gb = document.getElementById('grpbtns'); gb.innerHTML = '';
  for (const [g, names] of Object.entries(CFG.groups.buttons)) {
    const on = names.every(n => S.boats.has(n));
    const btn = document.createElement('button'); btn.type = 'button';
    btn.className = 'grpbtn' + (on ? ' allon' : ''); btn.textContent = (on ? '− ' : '+ ') + g;
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.onclick = () => {
      const all = names.every(n => S.boats.has(n));
      names.forEach(n => all ? S.boats.delete(n) : S.boats.add(n));
      // a group may name boats whose tracks live in more.json (first race to do
      // so: alir2025 — nb/bir buttons only referenced core-shipped boats, which
      // hid this); one ensureTracks suffices, more.json carries every lazy boat
      const missing = names.filter(n => S.boats.has(n) && !hasTrack(n));
      if (missing.length) ensureTracks(missing[0]).then(() => render('boats')).catch(() => {});
      render('boats');
    };
    gb.appendChild(btn);
  }
  const clr = document.createElement('button'); clr.type = 'button'; clr.className = 'grpbtn';
  clr.textContent = 'Clear'; clr.title = `Reset the selection to ${HERO} only`;
  clr.onclick = () => { S.boats = new Set([HERO]); S.clsSel.clear(); S.band = null; S.filterSel.clear(); render('boats'); }; gb.appendChild(clr);

  // ── Filter row: class-number input + rating-band chips (their own labeled row
  //    so the band group doesn't wrap as a block and strand the Groups line) ──
  const fb = document.getElementById('filterctl'); fb.innerHTML = '';
  // class-number input: one control instead of a button per class (round 2)
  if (CFG.classFilter) {
    const cf = CFG.classFilter;
    const wrapEl = document.createElement('span'); wrapEl.className = 'clsadd';
    wrapEl.title = COPY.filters?.classTitle || '';
    const lab = document.createElement('span'); lab.className = 'clsadd-label'; lab.textContent = cf.inputLabel;
    const inp = document.createElement('input');
    inp.id = 'clsInput'; inp.type = 'text'; inp.inputMode = 'numeric';
    inp.placeholder = cf.placeholder; inp.setAttribute('aria-label', COPY.filters?.classTitle || cf.inputLabel);
    const go = document.createElement('button'); go.type = 'button'; go.className = 'grpbtn clsadd-go'; go.textContent = 'Add';
    const submit = () => { toggleClassFilter(parseInt(inp.value, 10)); };
    go.onclick = submit;
    inp.onkeydown = e => { if (e.key === 'Enter') submit(); };
    for (const el of [lab, inp, go]) wrapEl.appendChild(el);
    fb.appendChild(wrapEl);
    for (const label of [...S.clsSel]) {   // active classes read as toggled-on filter chips
      const b = document.createElement('button'); b.type = 'button';
      b.className = 'grpbtn allon'; b.textContent = '− ' + label;
      b.setAttribute('aria-pressed', 'true');
      b.onclick = () => { S.clsSel.delete(label); applyFilters(); };
      fb.appendChild(b);
    }
    if (S.clsErr) {
      const err = document.createElement('span'); err.className = 'clserr';
      err.setAttribute('role', 'status'); err.textContent = S.clsErr;
      fb.appendChild(err);
    }
  }
  // F-TCF band chips: true rating peers around the hero (round 2)
  if (CFG.ratingBands) {
    const t0 = D.boats[HERO].meta.tcf;
    const bandRow = document.createElement('span'); bandRow.className = 'bandrow';
    bandRow.title = COPY.filters?.bandTitle || '';
    const lab = document.createElement('span'); lab.className = 'clsadd-label';
    lab.textContent = `${CFG.race.ratingLabel} ${t0}`;
    bandRow.appendChild(lab);
    for (const w of CFG.ratingBands.widths) {
      const key = String(w), n = bandCount(t0 - w, t0 + w);
      const on = S.band && S.band.key === key;
      const b = document.createElement('button'); b.type = 'button';
      b.className = 'grpbtn' + (on ? ' allon' : '');
      b.textContent = (COPY.filters?.bandChip || '±{w} ({n})').replace('{w}', key).replace('{n}', n);
      b.setAttribute('aria-pressed', on ? 'true' : 'false');
      b.onclick = () => setBand(t0 - w, t0 + w, key);
      bandRow.appendChild(b);
    }
    // custom min/max band
    const mkNum = (id, ph) => { const i = document.createElement('input');
      i.id = id; i.type = 'text'; i.inputMode = 'decimal'; i.placeholder = ph; i.className = 'bandnum'; return i; };
    const lo = mkNum('bandMin', S.band?.key === 'custom' ? String(S.band.min) : 'min');
    const hi = mkNum('bandMax', S.band?.key === 'custom' ? String(S.band.max) : 'max');
    const setb = document.createElement('button'); setb.type = 'button';
    setb.className = 'grpbtn' + (S.band?.key === 'custom' ? ' allon' : '');
    setb.textContent = COPY.filters?.bandApply || 'set';
    setb.onclick = () => {
      if (S.band?.key === 'custom' && !lo.value && !hi.value) { setBand(1, 0, 'custom'); return; }  // clear
      const mn = parseFloat(lo.value), mx = parseFloat(hi.value);
      if (Number.isFinite(mn) && Number.isFinite(mx)) setBand(mn, mx, 'custom');
    };
    const cl = document.createElement('span'); cl.className = 'clsadd-label';
    cl.textContent = COPY.filters?.bandCustomLabel || 'custom';
    for (const el of [cl, lo, hi, setb]) bandRow.appendChild(el);
    fb.appendChild(bandRow);
  }
  // hide the whole Filter row if neither filter is configured
  const filterRow = document.getElementById('filterRow');
  if (filterRow) filterRow.style.display = (CFG.classFilter || CFG.ratingBands) ? '' : 'none';
  for (const [id, k] of Object.entries(keepInputs)) {   // restore in-progress input
    const el = document.getElementById(id);
    if (!el) continue;
    if (k.v && !el.value) el.value = k.v;
    if (k.focus) { el.focus({ preventScroll: true }); try { el.setSelectionRange(k.s, k.e); } catch (e) { /* number inputs */ } }
  }

  const ov = document.getElementById('overlays'); ov.innerHTML = '';
  const add = (label, color, get, set) => { ov.appendChild(makeChip(label, color, get(), () => { set(!get()); }, false, 'pill')); };
  for (const [k, v] of Object.entries(CFG.eventCategories)) {
    if (!D.events.some(e => e.cat === k)) continue;   // a category with no events gets no pill (BIR R9c)
    add(v.short || v.label, v.c, () => S.ev.has(k), x => { x ? S.ev.add(k) : S.ev.delete(k); render('ev'); });
  }
  for (const p of CFG.controls.pills) {
    if (p === '@ghosts') add(COPY.pills.ghosts, '#7A93A3', () => S.fleet, x => { S.fleet = x; render('map'); if (x) loadFleet(); });
    else if (p === '@rhumb') add(COPY.pills.rhumb, CFG.hero.color, () => S.rhumb, x => { S.rhumb = x; render('map'); });
    else {
      const o = overlayById(p); if (!o) continue;
      const scope = o.bands ? 'bands' : 'map';
      add(o.pill.label, o.pill.color, () => S.ov[o.id], x => { S.ov[o.id] = x; render(scope); });
    }
  }

  const sel = document.getElementById('refsel'); sel.innerHTML = '';
  // reference candidates: never a cross-course boat (its times are not
  // comparable at all), and in division-scoped races never a boat outside the
  // hero's division — another division's meta.tcf may not even be a ToT
  // multiplier (BIR PHRF stores raw sec/mi), so corrected milestone math would
  // render garbage against it (2026-07-15 review)
  const crossRef = new Set(CFG.race.crossCourse || []);
  const heroCls = D.boats[HERO].meta.cls;
  for (const nm of ORDER) {
    if (!D.boats[nm].meta.tcf) continue;
    if (crossRef.has(nm)) continue;
    if (CFG.race.divisionScoped && D.boats[nm].meta.cls !== heroCls) continue;
    const o = document.createElement('option'); o.value = nm;
    // division-scoped races label each candidate with its scoring division
    o.textContent = (CFG.race.divisionScoped && D.boats[nm].meta.cls)
      ? `${nm} (${D.boats[nm].meta.cls})` : nm;
    if (nm === S.ref) o.selected = true; sel.appendChild(o);
  }
  sel.onchange = e => {
    // fall back to a reference that HAS a track — after two rapid changes the
    // previous value may itself be a still-trackless boat (I13)
    const prev = hasTrack(S.ref) ? S.ref : CFG.defaults.ref;
    S.ref = e.target.value;
    if (!hasTrack(S.ref)) ensureTracks(S.ref).then(() => render('race'))
      .catch(() => { S.ref = prev; render('race'); });   // fetch failed: revert (I13)
    render('race');
  };
  bindMode('mode_h', 'h', 'raceMode'); bindMode('mode_e', 'e', 'raceMode');
  bindMode('view_p', 'p', 'raceView'); bindMode('view_t', 't', 'raceView');
  if (CFG.charts.sog && CFG.charts.sog.metrics) {   // SOG|VMC y-metric buttons live in the speed card header
    bindMode('sogm_s', 'sog', 'speedMetric', 'speed');
    bindMode('sogm_v', 'vmc', 'speedMetric', 'speed');
  }
  for (const m of SECTION_MODULES) {   // module y-metric toggles (distspeed elapsed|corrected)
    const t = CFG[m.id] && CFG[m.id].toggle;
    if (t) for (const s of t.states) if (document.getElementById(`mtog_${m.id}_${s.v}`)) bindMode(`mtog_${m.id}_${s.v}`, s.v, t.key, m.id);
  }
  document.querySelectorAll('#axisToggle button').forEach(btn => {
    const on = btn.dataset.ax === S.axis;
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    btn.onclick = () => { S.axis = btn.dataset.ax; render('axis'); };
  });
  const axlabel = S.axis === 't' ? 'clock time' : 'distance to finish';
  ['xte_axnote', 'sog_axnote'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = 'x-axis: ' + axlabel; });
  const cc = document.getElementById('ctlCollapse'), body = document.getElementById('ctlBody');
  if (narrow()) {
    // inside the bottom sheet the body is always shown; the header button closes the sheet
    body.style.display = '';
    cc.textContent = 'Done';
    cc.setAttribute('aria-expanded', 'true');
    cc.removeAttribute('aria-controls');
    cc.onclick = closeSheet;
  } else {
    body.style.display = S.panelOpen ? '' : 'none';
    cc.textContent = S.panelOpen ? 'Hide controls ▲' : 'Show controls ▼';
    cc.setAttribute('aria-expanded', S.panelOpen ? 'true' : 'false');
    cc.setAttribute('aria-controls', 'ctlBody');
    cc.onclick = () => { S.panelOpen = !S.panelOpen; buildControls(); };
  }
  const lbl = document.getElementById('sheetBarLabel');
  if (lbl) lbl.textContent = `Boats & overlays · ${S.boats.size} shown`;
}

/* ═══ phone bottom sheet ═══ */
function openSheet() {
  document.getElementById('controls').classList.add('open');
  document.getElementById('scrim').hidden = false;
  document.getElementById('sheetBar').setAttribute('aria-expanded', 'true');
  document.body.style.overflow = 'hidden';
  document.getElementById('ctlCollapse').focus({ preventScroll: true });
}
function closeSheet() {
  document.getElementById('controls').classList.remove('open');
  document.getElementById('scrim').hidden = true;
  const bar = document.getElementById('sheetBar');
  bar.setAttribute('aria-expanded', 'false');
  document.body.style.overflow = '';
  if (narrow()) bar.focus({ preventScroll: true });
}
function bindMode(id, val, key, scope) {
  const el = document.getElementById(id);
  el.className = 'modebtn' + (S[key] === val ? ' on' : '');
  el.setAttribute('aria-pressed', S[key] === val ? 'true' : 'false');
  el.onclick = () => { S[key] = val; render(scope || 'race'); };
}

function buildMorePanel() {
  const panel = document.getElementById('morePanel');
  if (!S.showMore) { panel.style.display = 'none'; panel.innerHTML = ''; return; }
  panel.style.display = 'block';
  const ft = filterTargets();   // class/band matches get a highlight rail
  const row = nm => {
    const b = D.boats[nm];
    return `<button type="button" class="more-row${S.boats.has(nm) ? ' on' : ''}${trackLoading.has(nm) ? ' loading' : ''}${ft && ft.includes(nm) ? ' match' : ''}" aria-pressed="${S.boats.has(nm)}" data-nm="${nm.replace(/"/g, '&quot;')}">
      <span class="more-rank">${b.meta.sdl ? '#' + b.meta.sdl : '—'}</span><span class="more-name">${nm}</span>
      <span class="more-type">${b.meta.typ || ''}</span><span class="more-corr">${b.meta.corr || (b.meta.retireReason ? 'DNF' : '—')}</span></button>`;
  };
  // the three buckets must be disjoint: BIR's PHRF boats carry BOTH a rank
  // (meta.sdl) and grp === outsideKey, so rank alone would list them twice and
  // interleave two divisions' rank scales in one "ranked" column
  const ranked = ORDER.filter(nm => D.boats[nm].meta.sdl != null
    && D.boats[nm].meta.grp !== CFG.groups.dnfKey
    && D.boats[nm].meta.grp !== CFG.groups.outsideKey).sort((a, b) => D.boats[a].meta.sdl - D.boats[b].meta.sdl);
  const dnf = ORDER.filter(nm => D.boats[nm].meta.grp === CFG.groups.dnfKey);
  const others = ORDER.filter(nm => D.boats[nm].meta.grp === CFG.groups.outsideKey);
  panel.innerHTML = `${trackLoadErr ? `<div class="note" style="color:#A33;margin-bottom:6px">${trackLoadErr}</div>` : ''}
    <div class="note" style="margin-bottom:8px">${COPY.morePanel.note}</div>
    <div class="more-cols">
      <div><div class="more-head">${COPY.morePanel.rankedHead} (${ranked.length})</div><div class="more-list">${ranked.map(row).join('')}</div></div>
      <div><div class="more-head">${COPY.morePanel.dnfHead} (${dnf.length})</div><div class="more-list" style="margin-bottom:12px">${dnf.map(row).join('')}</div>
        <div class="more-head">${COPY.morePanel.otherHead} (${others.length})</div><div class="more-list">${others.map(row).join('')}</div>
    </div>
    </div>`;
  panel.querySelectorAll('.more-row').forEach(r => { r.onclick = () => toggleBoat(r.dataset.nm); });
}

/* ═══ KPIs (static; built once). Values are authored templates from config;
   {stats.x} / {park.hero.x} resolve against the data payload; a _abs suffix
   takes Math.abs of the base field. ═══ */
function buildKPIs() {
  const scope = { stats: D.stats, park: { hero: D.parkFair[HERO] || {} } };
  const resolve = tpl => tpl.replace(/\{([a-z_.]+)\}/gi, (_, path) => {
    let abs = false;
    if (path.endsWith('_abs')) { abs = true; path = path.slice(0, -4); }
    let v = scope;
    for (const seg of path.split('.')) v = (v ?? {})[seg];
    if (v == null) return '—';
    return String(abs ? Math.abs(v) : v);
  });
  document.getElementById('kpis').innerHTML = CFG.kpis.map(k =>
    `<div class="kpi"><div class="lab">${k.label}</div><div class="val">${resolve(k.value)}</div><div class="sub">${resolve(k.sub)}</div></div>`).join('');
}

/* ═══ event log table (shell — every race has events) ═══ */
function buildEventTable() {
  const EVCAT = CFG.eventCategories;
  const evs = D.events.filter(e => S.ev.has(e.cat));
  const rows = evs.map(e => {
    const c = EVCAT[e.cat];
    return `<tr><td>${fmtS(e.t)} ${CFG.time.tzLabel}</td><td><span class="badge" style="background:${c.c}22;color:${c.c}">${c.label}</span></td>
      <td>${Math.round(heroDTFat(e.t))} nm</td><td style="font-weight:600">${e.label}</td>
      <td style="white-space:normal;min-width:320px">${e.txt}</td></tr>`;
  }).join('');
  document.getElementById('eventtable').innerHTML = evs.length
    ? `<table><thead><tr><th scope="col">Time</th><th scope="col">Type</th><th scope="col">To go</th><th scope="col">Moment</th><th scope="col">Detail</th></tr></thead><tbody>${rows}</tbody></table>`
    : `<div class="note">${COPY.emptyStates.events}</div>`;
}

/* ═══ boot ═══ */
function showError(e) {
  const el = document.getElementById('appstate');
  el.className = 'appstate err';
  el.innerHTML = 'The race data didn’t load (' + (e && e.message ? e.message : e) + ').<br>' +
    'Check your connection and retry. Opened as a local file? Serve the folder instead: <kbd>python3 -m http.server</kbd>.<br>' +
    '<button type="button" class="retry" onclick="location.reload()">Retry</button>';
}
function showChartError() {
  document.querySelectorAll('.plot').forEach(el => {
    el.innerHTML = '<div class="note" style="padding:20px">The charts didn’t load (the plotting library failed to download). The tables below still work — reload to try the charts again.</div>';
  });
}

async function boot() {
  CFG = window.__RACE_CONFIG__; COPY = window.__COPY__; HERO = CFG.hero.name;
  // seed state from config (I7: every defaults.boats track must ship in core.json)
  S.boats = new Set(CFG.defaults.boats);
  S.ev = new Set(CFG.defaults.ev);
  S.fleet = CFG.defaults.fleet; S.rhumb = CFG.defaults.rhumb;
  S.ov = {};   // config wins; a pill's own default is the fallback
  for (const o of OVERLAYS) S.ov[o.id] = (CFG.defaults.overlays || {})[o.id] ?? (o.pill && o.pill.default) ?? false;
  S.ref = CFG.defaults.ref; S.showMore = false;
  S.raceMode = CFG.defaults.raceMode; S.raceView = CFG.defaults.raceView;
  S.axis = CFG.defaults.axis; S.panelOpen = true;
  S.speedMetric = CFG.defaults.speedMetric || 'sog';
  S.clsSel = new Set(); S.band = null; S.filterSel = new Set(); S.clsErr = null;
  // module y-metric toggles (e.g. distspeed elapsed|corrected): seed S[key]
  for (const m of SECTION_MODULES) { const t = CFG[m.id] && CFG[m.id].toggle; if (t) S[t.key] = t.default; }

  try {
    D = window.__DATA_EMBEDDED__
      ? window.__DATA_EMBEDDED__
      : await (window.__CORE_FETCH || loadJSON('core.json'));
  } catch (e) { console.error(e); showError(e); return; }
  if (D.fleet) FLEET = D.fleet;   // embedded build ships everything in one payload
  ORDER = Object.keys(D.boats);
  { // palette walks insertion order (I8); the hero always gets the accent
    const idx = {};
    for (const nm of ORDER) {
      const g = D.boats[nm].meta.grp, pal = (CFG.groups.palette[g] || CFG.groups.palette[CFG.groups.fallbackKey]).colors;
      idx[g] = (idx[g] ?? -1) + 1; boatColor[nm] = pal[idx[g] % pal.length];
    }
    boatColor[HERO] = CFG.hero.color;
  }

  initRegistry();
  // fill each module's section scaffold (title/note authored in the module file)
  for (const m of SECTION_MODULES) {
    const sec = document.getElementById('sec_' + m.id);
    if (!sec) continue;
    sec.hidden = false;
    sec.querySelector('h2').innerHTML = m.section.title;
    if (m.section.note) sec.querySelector('.note').innerHTML = m.section.note;
    if (m.section.kind === 'plot') {
      const mount = sec.querySelector('[data-mount]');
      mount.classList.add('plot');
      // Plotly needs an explicit height; modules declare theirs (CSS min()
      // keeps it responsive) instead of leaking their ids into shell CSS
      if (m.section.height) mount.style.height = m.section.height;
    }
  }

  document.getElementById('appstate').remove();
  document.getElementById('controls').hidden = false;
  const sheetBar = document.getElementById('sheetBar');
  sheetBar.hidden = false;                      // shown/hidden by breakpoint CSS
  sheetBar.onclick = () => { document.getElementById('controls').classList.contains('open') ? closeSheet() : openSheet(); };
  document.getElementById('scrim').onclick = closeSheet;
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && narrow()) closeSheet(); });
  buildKPIs();
  for (const m of SECTION_MODULES) if (!(m.deps || []).length) BUILDERS[m.id]();   // static modules render once
  render('all');                       // controls + tables now; charts gated on Plotly
  plotlyReady.then(() => {
    if (!window.Plotly) { showChartError(); return; }
    chartsOK = true; render('all');
    if (!FLEET) loadFleet();           // ghost layer after first paint
    // safety net: if a default-selected boat's track isn't in core (build
    // drift from defaults.boats), pull the on-demand payload rather than
    // silently dropping the boat from the charts (I7)
    const missing = [...S.boats].find(nm => !hasTrack(nm));
    if (missing) ensureTracks(missing).then(() => render('boats')).catch(() => {});
  });

  // compress the sticky controls bar once the page scrolls under it
  const ctl = document.getElementById('controls');
  let ticking = false;
  window.addEventListener('scroll', () => {
    if (ticking) return; ticking = true;
    requestAnimationFrame(() => { ctl.classList.toggle('scrolled', window.scrollY > 40); ticking = false; });
  }, { passive: true });

  // re-lay charts when crossing the mobile breakpoint (legend/margin/dragmode changes)
  let wasNarrow = narrow(), rt = 0;
  window.addEventListener('resize', () => {
    clearTimeout(rt);
    rt = setTimeout(() => { if (narrow() !== wasNarrow) { wasNarrow = narrow(); closeSheet(); render('all'); } }, 200);
  });
}

document.addEventListener('DOMContentLoaded', boot);
