/* Gulf Stream overlay — map polygon + time band, drawn from RAGANA's own
   sea-temperature log (approximate; not an oceanographic product). Band
   endpoints and polygon live in presentation.js (cfg.gulfstream). */
"use strict";

registerOverlay({
  id: 'gulfstream',
  mapLayer: 'under',   // tinted water sits beneath the boat tracks
  pill: { label: 'Gulf Stream', color: '#3E97C9', default: true },
  mapTraces(ctx) {
    const g = ctx.cfg.gulfstream;
    return [{ x: g.polygon.lon, y: g.polygon.lat, fill: 'toself', mode: 'none',
      fillcolor: 'rgba(62,151,201,0.13)', hoverinfo: 'text',
      text: ctx.h.wrapText('Gulf Stream band (approx — from the nav log: 74°F entry 17:21 Sat → 80°F core → 75°F exit 05:01 Sun)'),
      showlegend: true, name: 'Gulf Stream (approx)' }];
  },
  bands(ctx, mode) {
    const g = ctx.cfg.gulfstream;
    const enter = Date.parse(g.enterUTC) / 1000, exit = Date.parse(g.exitUTC) / 1000;
    const X = mode === 'time' ? ctx.h.tzStr : ctx.h.evX;
    return [{ type: 'rect', xref: 'x', yref: 'paper', x0: X(enter), x1: X(exit),
      y0: 0, y1: 1, fillcolor: 'rgba(62,151,201,0.10)', line: { width: 0 } }];
  },
});
