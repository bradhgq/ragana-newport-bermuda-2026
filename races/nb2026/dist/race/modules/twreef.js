/* Takeaway 2 — "Reef early, shake late" (Sebastian, 2026-07-16). Zoom:
   Saturday's heavy running — GPS speed for RAGANA and the rating twin with
   every sail call pinned, from the 01:45 all-hands to shaking the reef out at
   18:30. Title/caption in COPY.takeaways.twreef (copy discipline). */
"use strict";

registerModule({
  id: 'twreef',
  deps: ['ev'],
  section: { kind: 'plot', height: 'min(320px, 82vw)', title: '', note: '' },
  build(ctx) {
    const { D, S, h, cfg } = ctx;
    const tw = (ctx.copy && ctx.copy.takeaways && ctx.copy.takeaways.twreef) || {};
    const card = ctx.el && typeof ctx.el.closest === 'function' ? ctx.el.closest('.card') : null;
    if (card) {
      const h2 = card.querySelector('h2'); if (h2 && tw.title) h2.innerHTML = tw.title;
      const nt = card.querySelector('.note'); if (nt && tw.note) nt.innerHTML = tw.note;
    }
    const off = cfg.time.utcOffset;
    const E = s => Date.parse(s.replace(' ', 'T') + ((off <= 0 ? '-' : '+') + String(Math.abs(off)).padStart(2, '0') + ':00')) / 1000;
    const W0 = E('2026-06-19 19:00'), W1 = E('2026-06-20 20:00');
    const BOATS = ['RAGANA', 'Christopher Dragon'];

    const traces = [];
    let yMax = 6;
    for (const nm of BOATS) {
      const b = D.boats[nm]; if (!b || !b.t || !b.sog) continue;
      const xs = [], ys = [];
      for (let i = 0; i < b.t.length; i++) {
        if (b.t[i] < W0 || b.t[i] > W1 || b.sog[i] == null) continue;
        xs.push(h.tzStr(b.t[i])); ys.push(b.sog[i]);
        if (b.sog[i] > yMax) yMax = b.sog[i];
      }
      traces.push({ x: xs, y: ys, mode: 'lines', name: nm,
        line: { color: h.boatColor[nm], width: nm === cfg.hero.name ? 2.6 : 1.3 },
        opacity: nm === cfg.hero.name ? 1 : .8,
        hovertemplate: `${nm} · %{x} · %{y} kts<extra></extra>` });
    }

    const EVCAT = cfg.eventCategories;
    const evs = D.events.filter(e => e.cat === 'sail' && e.t >= W0 && e.t <= W1);
    const shapes = evs.map(e => ({ type: 'line', xref: 'x', yref: 'paper', x0: h.tzStr(e.t), x1: h.tzStr(e.t),
      y0: 0, y1: 1, line: { color: EVCAT.sail.c, width: 1, dash: 'dot' }, opacity: .55 }));
    if (evs.length) traces.push({ x: evs.map(e => h.tzStr(e.t)), y: evs.map(() => yMax + 0.7),
      mode: 'markers', marker: { symbol: EVCAT.sail.sym, size: 11, color: EVCAT.sail.c, line: { width: 1, color: '#fff' } },
      text: evs.map(e => h.wrapText(`${e.label} · ${h.fmt(e.t)} ${cfg.time.tzLabel} — ${e.txt}`)),
      hoverinfo: 'text', showlegend: false });

    return { traces, layout: { ...h.BASE(), shapes,
      margin: { ...h.BASE().margin, t: 18, b: 40 },
      xaxis: { ...h.GAX, tickformat: '%a %H:%M', type: 'date' },
      yaxis: { ...h.GAX, range: [0, yMax + 1.6],
        title: { text: 'Speed over ground (kts)', font: h.AXFONT } } } };
  },
});
