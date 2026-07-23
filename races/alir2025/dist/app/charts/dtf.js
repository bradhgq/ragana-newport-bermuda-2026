/* DTF chart — inherently time-based (distance-remaining over the race);
   not governed by the shared axis toggle. Phase divides at the hero's
   boundary times; the milestone/phase structure comes from config. */
"use strict";

function buildDTF() {
  const tr = [];
  for (const nm of ORDER) {
    if (!S.boats.has(nm) || !hasTrack(nm)) continue; const b = D.boats[nm];
    tr.push({ x: b.t.map(tzS), y: b.dtf, mode: 'lines', name: nm, showlegend: true,
      line: { color: boatColor[nm], width: nm === HERO ? 3 : 1.5 }, opacity: nm === HERO ? 1 : .82,
      hovertemplate: `${nm} · %{x} · %{y} nm to go<extra></extra>` });
  }
  const dec = eventDecor(CFG.charts.dtf.eventTopY, 'time'); if (dec.marker) tr.push(dec.marker);
  const wl = watchLegend(); if (wl) tr.push(wl);
  // phase divides at the hero's boundary times, same labels as the won/lost chart
  const shapes = [...overlayShapes('time'), ...dec.shapes], ann = [...overlayAnnotations('time')];
  const top = CFG.phases.length ? CFG.phases[0][0] : 0;
  CFG.phases.forEach(([a, b, l], i) => {
    const t0 = heroT(a === top ? a - 1 : a),
      t1 = (b === 0 ? Date.parse(D.boats[HERO].meta.fin.replace(' ', 'T') + offStr(CFG.time.utcOffset)) / 1000 : heroT(b));
    if (i > 0) shapes.push({ type: 'line', xref: 'x', yref: 'paper', x0: tzS(t0), x1: tzS(t0), y0: 0, y1: 1, line: { color: '#B9CBD4', width: 1 } });
    if (!narrow()) ann.push({ x: tzS((t0 + t1) / 2), y: 1.05, xref: 'x', yref: 'paper', text: l, showarrow: false,
      font: { ...AXFONT, size: 8.5 } });
  });
  react('dtf', tr, { ...BASE(), shapes, annotations: ann, margin: { ...BASE().margin, t: 22, b: 36 },
    xaxis: { ...GAX, tickformat: '%a %H:%M', type: 'date' },
    yaxis: { ...GAX, title: { text: 'nm to finish', font: AXFONT },
             ...(CFG.charts.dtf.yRange ? { range: CFG.charts.dtf.yRange } : { rangemode: 'tozero' }) } });
}
