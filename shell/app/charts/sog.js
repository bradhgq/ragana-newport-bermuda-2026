/* Speed-over-ground chart — shared-axis governed. The park/dead-core shading
   rectangles belong to the park analysis: they render only when the race
   config carries charts.parkShading (an authored CP-2 judgment), and only on
   the distance axis where "same water" comparison is meaningful. */
"use strict";

function buildSOG() {
  const tr = seriesTraces('sog', nm => nm === HERO ? 2.4 : 1.1).map(t => ({ ...t, showlegend: false, opacity: t.name === HERO ? 1 : .7 }));
  const dec = eventDecor(CFG.charts.sog.eventTopY); if (dec.marker) tr.push(dec.marker);
  const wl = watchLegend(); if (wl && S.axis === 't') tr.push(wl);
  let shapes = [...overlayShapes(), ...dec.shapes];
  const park = CFG.charts.parkShading;
  if (park && S.axis === 'd') shapes = shapes.concat([
    { type: 'rect', xref: 'x', yref: 'paper', x0: park.zone[0], x1: park.zone[1], y0: 0, y1: 1, fillcolor: 'rgba(23,41,58,0.05)', line: { width: 0 } },
    { type: 'rect', xref: 'x', yref: 'paper', x0: park.core[0], x1: park.core[1], y0: 0, y1: 1, fillcolor: 'rgba(192,57,43,0.07)', line: { width: 0 } }]);
  const axisHint = park && S.axis === 'd'
    ? { title: { text: narrow() ? COPY.sog.axisHintNarrow : COPY.sog.axisHint, font: AXFONT } } : {};
  react('sog', tr, { ...BASE(), shapes,
    xaxis: sharedXaxis(axisHint),
    yaxis: { ...GAX, title: { text: 'Speed over ground (kts)', font: AXFONT }, range: CFG.charts.sog.yRange } });
}
