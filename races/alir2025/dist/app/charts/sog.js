/* Speed chart — shared-axis governed, with an optional y-metric toggle
   (S.speedMetric: 'sog' | 'vmc') when the race config carries
   charts.sog.metrics. VMC is the pipeline's distance-remaining derivative —
   velocity made good on COURSE, toward the finish. The tracker has no wind
   data, so it is never labelled VMG; negatives are real (tacks, park drift)
   and the vmcYRange must accommodate them.
   The park/dead-core shading rectangles belong to the park analysis: they
   render only when the race config carries charts.parkShading (an authored
   stage-2 judgment), and only on the distance axis where "same water"
   comparison is meaningful — in both metrics. */
"use strict";

function buildSOG() {
  const c = CFG.charts.sog;
  const vmcMode = c.metrics && S.speedMetric === 'vmc';
  const key = vmcMode ? 'vmc' : 'sog';
  let tr = seriesTraces(key, nm => nm === HERO ? 2.4 : 1.1).map(t => ({ ...t, showlegend: false, opacity: t.name === HERO ? 1 : .7 }));
  // clipPreStart (BIR R9f): on the distance axis, pre-start milling interleaves
  // x back and forth around the start's DTF and scribbles the right edge —
  // start each boat's series at its own gun (a local-time fallback covers DNF
  // boats with no official start); the clock axis keeps the honest record.
  if (c.clipPreStart && S.axis === 'd') {
    const fallback = Date.parse(c.clipPreStart.replace(' ', 'T') + offStr(CFG.time.utcOffset)) / 1000;
    tr = tr.map(t => {
      const b = D.boats[t.name]; if (!b || !b.t) return t;
      const cut = (b.meta.el && b.meta.fin) ? startS(b) : fallback;
      let i0 = 0; while (i0 < b.t.length && b.t[i0] < cut) i0++;
      return { ...t, x: t.x.slice(i0), y: t.y.slice(i0) };
    });
  }
  const dec = eventDecor(c.eventTopY); if (dec.marker) tr.push(dec.marker);
  // watch bands render on BOTH axes (evX maps them onto distance), so the
  // legend entry is unconditional — the same guard as the sibling xte/dtf
  const wl = watchLegend(); if (wl) tr.push(wl);
  let shapes = [...overlayShapes(), ...dec.shapes];
  const park = CFG.charts.parkShading;
  if (park && S.axis === 'd') shapes = shapes.concat([
    { type: 'rect', xref: 'x', yref: 'paper', x0: park.zone[0], x1: park.zone[1], y0: 0, y1: 1, fillcolor: 'rgba(23,41,58,0.05)', line: { width: 0 } },
    { type: 'rect', xref: 'x', yref: 'paper', x0: park.core[0], x1: park.core[1], y0: 0, y1: 1, fillcolor: 'rgba(192,57,43,0.07)', line: { width: 0 } }]);
  if (vmcMode)   // zero line: below it the boat is moving AWAY from the finish
    shapes.push({ type: 'line', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: 0, y1: 0,
      line: { color: '#B9CBD4', width: 1, dash: 'dash' } });
  const axisHint = park && S.axis === 'd'
    ? { title: { text: narrow() ? COPY.sog.axisHintNarrow : COPY.sog.axisHint, font: AXFONT } } : {};
  // swap the section caption with the metric (the VMC caveat is load-bearing)
  const note = document.getElementById('sog_note');
  if (note && COPY.sections.sog.noteVmc)
    note.innerHTML = vmcMode ? COPY.sections.sog.noteVmc : COPY.sections.sog.note;
  react('sog', tr, { ...BASE(), shapes, annotations: overlayAnnotations(),
    xaxis: sharedXaxis(axisHint),
    yaxis: { ...GAX,
      title: { text: vmcMode ? 'VMC toward the finish (kts)' : 'Speed over ground (kts)', font: AXFONT },
      range: vmcMode ? c.vmcYRange : c.yRange } });
}
