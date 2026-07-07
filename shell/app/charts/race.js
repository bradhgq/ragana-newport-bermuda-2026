/* The won/lost race chart (own DTF axis unless the shared toggle is on time).
   INVARIANT I2 lives here and is shell, not a feature: each boat's final point
   comes from official corrected/elapsed results, never the last tracker
   milestone — a previous build truncated at DTF 20 and flipped three boats'
   signs. Mode notes are authored copy (COPY.race.notes). */
"use strict";

const raceX = m => S.axis === 't'
  ? tzS(m === 0 ? Date.parse(D.boats[HERO].meta.fin.replace(' ', 'T') + offStr(CFG.time.utcOffset)) / 1000 : heroT(m))
  : m;

function buildRace() {
  document.getElementById('refname').textContent = S.ref;
  document.getElementById('racenote').innerHTML = COPY.race.notes[S.raceMode];
  if (!hasTrack(S.ref)) {
    // reference's track still downloading — blank the chart rather than leave
    // the previous reference's traces under the new header (I13)
    react('race', [], { ...BASE(), xaxis: { ...GAX, visible: false }, yaxis: { ...GAX, visible: false },
      annotations: [{ text: 'loading ' + S.ref + '’s track…', xref: 'paper', yref: 'paper', x: .5, y: .5, showarrow: false,
        font: { size: 12, color: '#4C6274', family: 'SF Mono, Menlo, monospace' } }] });
    return;
  }
  const EVCAT = CFG.eventCategories, R = CFG.race, rhumb = CFG.course.rhumbNm;
  const ref = D.boats[S.ref], refStart = startS(ref), refTCF = ref.meta.tcf || 1;
  const ms = []; for (let m = R.milestoneTop; m >= R.milestoneBottom; m -= R.milestoneStep) ms.push(m);
  const refT = ms.map(m => hitTime(ref, m));
  const refFin = S.raceMode === 'h' ? parseDur(ref.meta.corr) : parseDur(ref.meta.el);
  const pace = S.raceView === 'p';
  const tr = [];
  for (const nm of ORDER) {
    if (!S.boats.has(nm) || !hasTrack(nm)) continue; const b = D.boats[nm];
    if (S.raceMode === 'h' && !b.meta.tcf) continue; if (!b.meta.el) continue;
    const st = startS(b), tcf = b.meta.tcf || 1;
    const xs = [], ys = [];
    ms.forEach((m, i) => {
      const t = hitTime(b, m); if (t === null || refT[i] === null) { xs.push(raceX(m)); ys.push(null); return; }
      const mine = t - st, theirs = refT[i] - refStart;
      let v = S.raceMode === 'h' ? (mine * tcf - theirs * refTCF) / 60 : (mine - theirs) / 60;
      if (pace) { const done = rhumb - m; if (done < R.paceMinDone) { xs.push(raceX(m)); ys.push(null); return; } v = v / done * 100; }
      xs.push(raceX(m)); ys.push(v);
    });
    let fin = ((S.raceMode === 'h' ? parseDur(b.meta.corr) : parseDur(b.meta.el)) - refFin) / 60;
    if (pace) fin = fin / rhumb * 100;
    xs.push(raceX(0)); ys.push(fin);
    tr.push({ x: xs, y: ys, mode: 'lines+markers', name: nm, connectgaps: false, marker: { size: xs.map((x, i) => i === xs.length - 1 ? 7 : 0) },
      line: { color: boatColor[nm], width: nm === HERO ? 3 : 1.5 }, opacity: nm === HERO ? 1 : .8,
      hovertemplate: `${nm} · %{x}${S.axis === 't' ? '' : ' nm to go'} · %{y:.1f} ${pace ? 'min/100nm' : 'min'} vs ${S.ref}<extra></extra>` });
  }
  const shapes = [], ann = [];
  const top = CFG.phases[0][0];
  CFG.phases.forEach(([a, b, l], i) => {
    const x0 = raceX(a === top ? a - 1 : a), x1 = raceX(b === 0 ? 1 : b);
    shapes.push({ type: 'rect', xref: 'x', yref: 'paper', x0, x1, y0: 0, y1: 1, fillcolor: i % 2 ? 'rgba(23,41,58,0.028)' : 'rgba(0,0,0,0)', line: { width: 0 } });
    if (!narrow()) ann.push({ x: S.axis === 't' ? tzS((heroT(a === top ? a - 1 : a) + heroT(b === 0 ? 2 * R.milestoneStep : b)) / 2) : (a + b) / 2,
      y: 1.03, xref: 'x', yref: 'paper', text: l, showarrow: false, font: { size: 9, color: '#4C6274', family: 'SF Mono, Menlo, monospace' } });
  });
  shapes.push(...overlayShapes());
  const evs = D.events.filter(e => S.ev.has(e.cat));
  for (const e of evs) shapes.push({ type: 'line', xref: 'x', yref: 'paper', x0: evX(e.t), x1: evX(e.t), y0: 0, y1: 1, line: { color: EVCAT[e.cat].c, width: 1, dash: 'dot' }, opacity: .45 });
  if (evs.length) tr.push({ x: evs.map(e => evX(e.t)), y: evs.map(() => R.eventRowY), yaxis: 'y2', mode: 'markers',
    marker: { symbol: evs.map(e => EVCAT[e.cat].sym), size: evs.map(e => EVCAT[e.cat].big ? 12 : 9), color: evs.map(e => EVCAT[e.cat].c), line: { width: 1, color: '#fff' } },
    text: evs.map(e => wrapText(`${e.label} · ${fmtS(e.t)} ${CFG.time.tzLabel} — ${e.txt}`)), hoverinfo: 'text', showlegend: false });
  const yTitle = narrow()
    ? (pace ? 'min/100nm' : 'min') + ' vs ref (+ = behind)'
    : (pace ? 'Min per 100 nm' : 'Minutes') + ' behind (+) / ahead (−) of ' + S.ref + (S.raceMode === 'h' ? ' — corrected' : ' — elapsed');
  react('race', tr, { ...BASE(), shapes, annotations: ann, margin: { ...BASE().margin, t: 26 },
    xaxis: sharedXaxis(narrow() ? { title: undefined } : undefined),
    yaxis: { ...GAX, title: { text: yTitle, font: AXFONT } },
    yaxis2: { overlaying: 'y', side: 'right', range: [0, R.eventRowY + 1], visible: false, fixedrange: true } });
}
