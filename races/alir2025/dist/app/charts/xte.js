/* Cross-track (rhumb offset) chart — shared-axis governed. */
"use strict";

function buildXTE() {
  const tr = seriesTraces('xte', nm => nm === HERO ? 2.6 : 1.3).map(t => ({ ...t, showlegend: false }));
  const dec = eventDecor(CFG.charts.xte.eventTopY); if (dec.marker) tr.push(dec.marker);
  const wl = watchLegend(); if (wl) tr.push(wl);
  const shapes = [...overlayShapes(), ...dec.shapes,
    { type: 'line', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: 0, y1: 0, line: { color: CFG.hero.color, width: 1, dash: 'dash' } }];
  react('xte', tr, { ...BASE(), shapes, annotations: overlayAnnotations(), xaxis: sharedXaxis(),
    yaxis: { ...GAX, title: { text: CFG.charts.xte.yTitle || 'nm east (+) / west (−) of rhumb', font: AXFONT } } });
}
