/* Map chart — own axis; unaffected by the time/DTF toggle. Race facts
   (range, start/finish labels, leader-line labels, rhumb) come from config;
   overlay layers come from registered overlays (mapLayer: under|over|top). */
"use strict";

function overlayMapTraces(layer) {
  const tr = [];
  for (const o of OVERLAYS) {
    if (!S.ov[o.id] || !o.mapTraces) continue;
    if ((o.mapLayer || 'over') !== layer) continue;
    tr.push(...o.mapTraces(makeCtx()));
  }
  return tr;
}

function buildMap() {
  const EVCAT = CFG.eventCategories, course = CFG.course;
  const tr = [];
  if (S.fleet && FLEET) {
    /* one null-separated trace for all ghosts — two orders of magnitude
       fewer SVG nodes than one trace per boat */
    const xs = [], ys = [];
    for (const f of FLEET) { xs.push(...f.lon, null); ys.push(...f.lat, null); }
    tr.push({ x: xs, y: ys, mode: 'lines', line: { color: 'rgba(120,140,155,0.16)', width: 1 }, hoverinfo: 'skip', showlegend: false });
  }
  tr.push(...overlayMapTraces('under'));
  if (S.rhumb) tr.push({ x: [D.start[1], D.fin[1]], y: [D.start[0], D.fin[0]], mode: 'lines',
    line: { color: CFG.hero.color, width: 1.6, dash: 'dash' },
    name: `${COPY.pills.rhumb} ${Math.round(course.rhumbNm)} nm`, hoverinfo: 'name' });
  for (const nm of ORDER) {
    if (!S.boats.has(nm) || !hasTrack(nm)) continue; const b = D.boats[nm];
    tr.push({ x: b.lon, y: b.lat, mode: 'lines', name: nm,
      line: { color: boatColor[nm], width: nm === HERO ? 3 : 1.6 }, opacity: nm === HERO ? 1 : .85,
      text: b.t.map((t, i) => `${nm} · ${fmtS(t)} ${CFG.time.tzLabel} · ${b.dtf[i]} nm to go · ${b.sog[i] ?? '—'} kts`), hoverinfo: 'text' });
  }
  tr.push(...overlayMapTraces('over'));
  const rb = D.boats[HERO], evs = D.events.filter(e => S.ev.has(e.cat));
  if (evs.length) {
    const pos = evs.map(e => { let i = rb.t.findIndex(t => t >= e.t); return i < 0 ? rb.t.length - 1 : i; });
    for (const [cat, cfg] of Object.entries(EVCAT)) {
      const sub = evs.map((e, j) => ({ e, j })).filter(o => o.e.cat === cat); if (!sub.length) continue;
      tr.push({ x: sub.map(o => rb.lon[pos[o.j]]), y: sub.map(o => rb.lat[pos[o.j]]), mode: 'markers',
        marker: { symbol: cfg.sym, size: cfg.big ? 14 : 11, color: cfg.c, line: { width: 1, color: '#fff' } },
        name: cfg.label, text: sub.map(o => wrapText(`${o.e.label} · ${fmtS(o.e.t)} ${CFG.time.tzLabel} — ${o.e.txt}`)), hoverinfo: 'text' });
    }
  }
  tr.push(...overlayMapTraces('top'));
  tr.push({ x: [D.start[1]], y: [D.start[0]], mode: 'markers+text', marker: { symbol: 'circle', size: 10, color: '#17293A' },
    text: [course.startLabel], textposition: narrow() ? 'middle right' : 'top center', textfont: { size: 10, family: 'SF Mono, Menlo, monospace' }, showlegend: false, hoverinfo: 'skip' });
  tr.push({ x: [D.fin[1]], y: [D.fin[0]], mode: 'markers+text', marker: { symbol: 'square', size: 10, color: '#17293A' },
    text: [course.finishLabel], textposition: narrow() ? 'middle left' : 'bottom center', textfont: { size: 10, family: 'SF Mono, Menlo, monospace' }, showlegend: false, hoverinfo: 'skip' });
  // phase labels: thin leader lines from empty corners to the hero's track at each phase midpoint
  const posAtDTF = m => {
    for (let i = 0; i < rb.dtf.length; i++) { if (rb.dtf[i] <= m) return [rb.lon[i], rb.lat[i]]; }
    return [rb.lon[rb.lon.length - 1], rb.lat[rb.lat.length - 1]];
  };
  const nw = narrow();
  // the leader-line labels need open water around them — no room on a phone
  const mapAnn = nw ? [] : CFG.mapLabels.map(([m, txt, ax, ay]) => {
    const [x, y] = posAtDTF(m);
    return { x, y, ax, ay, xref: 'x', yref: 'y', text: txt, showarrow: true, arrowhead: 0, arrowwidth: .7,
      arrowcolor: 'rgba(81,103,122,0.55)', standoff: 3,
      font: { size: 8.5, color: '#4C6274', family: 'SF Mono, Menlo, monospace' }, align: 'left' };
  });
  react('map', tr, { ...BASE(), annotations: mapAnn,
    xaxis: { ...GAX, title: nw ? undefined : { text: 'Longitude', font: AXFONT }, range: course.mapRange.lon },
    yaxis: { ...GAX, title: nw ? undefined : { text: 'Latitude', font: AXFONT }, range: course.mapRange.lat },
    legend: nw ? { orientation: 'h', y: -0.08, font: { size: 10 } } : { orientation: 'v', x: 1.001, y: 1, font: { size: 10.5 } },
    margin: nw ? { l: 36, r: 10, t: 8, b: 30 } : { l: 56, r: 150, t: 8, b: 40 } });
}
