/* Watch overlay — the skipper's watch spans (crew-specific, from events.yaml's
   watches list via the data payload). Gold bands on the x-band charts, thick
   track segments on the map, one shared legend entry. */
"use strict";

registerOverlay({
  id: 'watches',
  mapLayer: 'over',   // segments paint on top of the hero's track line
  pill: { label: "Brad's watches", color: '#B8944A', default: false },
  bands(ctx, mode) {
    const X = mode === 'time' ? ctx.h.tzStr : ctx.h.evX;
    return ctx.D.watches.map(([a, b]) => ({ type: 'rect', xref: 'x', yref: 'paper', x0: X(a), x1: X(b),
      y0: 0, y1: 1, fillcolor: 'rgba(184,148,74,0.16)', line: { width: 1, color: 'rgba(184,148,74,0.45)' } }));
  },
  legendTrace(ctx) {
    return { x: [null], y: [null], mode: 'markers',
      marker: { size: 10, symbol: 'square', color: 'rgba(184,148,74,0.5)' }, name: "Brad on watch", showlegend: true, hoverinfo: 'skip' };
  },
  mapTraces(ctx) {
    const { D, S, h } = ctx, hero = ctx.cfg.hero.name;
    if (!S.boats.has(hero)) return [];
    const rb = D.boats[hero], tr = [];
    D.watches.forEach(([a, b], wi) => {
      const idx = rb.t.map((t, i) => i).filter(i => rb.t[i] >= a && rb.t[i] <= b); if (idx.length < 2) return;
      tr.push({ x: idx.map(i => rb.lon[i]), y: idx.map(i => rb.lat[i]), mode: 'lines', line: { color: '#B8944A', width: 6 }, opacity: .55,
        name: `${hero} on watch`, legendgroup: 'w', showlegend: wi === 0, hoverinfo: 'text', text: idx.map(i => `On watch · ${h.fmt(rb.t[i])} ${ctx.cfg.time.tzLabel}`) });
    });
    return tr;
  },
});
