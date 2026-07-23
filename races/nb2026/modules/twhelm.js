/* Takeaway 1 — "One person in charge, others provide input" (Sebastian,
   2026-07-16). Zoom: Monday afternoon's three-way helm split, told through
   VMC toward the finish for RAGANA and the boats around her, with the log's
   tactics calls pinned. Fixed comparison set (the story's cast, stated in the
   caption); title/caption live in COPY.takeaways.twhelm (copy discipline). */
"use strict";

registerModule({
  id: 'twhelm',
  deps: ['ev'],   // pins re-render with the log; content is otherwise static
  section: { kind: 'plot', height: 'min(320px, 82vw)', title: '', note: '' },
  build(ctx) {
    const { D, S, h, cfg } = ctx;
    const tw = (ctx.copy && ctx.copy.takeaways && ctx.copy.takeaways.twhelm) || {};
    const card = ctx.el && typeof ctx.el.closest === 'function' ? ctx.el.closest('.card') : null;
    if (card) {
      const h2 = card.querySelector('h2'); if (h2 && tw.title) h2.innerHTML = tw.title;
      const nt = card.querySelector('.note'); if (nt && tw.note) nt.innerHTML = tw.note;
    }
    const off = cfg.time.utcOffset;
    const E = s => Date.parse(s.replace(' ', 'T') + ((off <= 0 ? '-' : '+') + String(Math.abs(off)).padStart(2, '0') + ':00')) / 1000;
    const W0 = E('2026-06-22 12:00'), W1 = E('2026-06-22 22:00');
    const BOATS = ['RAGANA', 'Christopher Dragon', 'Hissy Fit II', 'Carina'];

    const traces = [];
    let yMax = 2;
    for (const nm of BOATS) {
      const b = D.boats[nm]; if (!b || !b.t || !b.vmc) continue;
      const xs = [], ys = [];
      for (let i = 0; i < b.t.length; i++) {
        if (b.t[i] < W0 || b.t[i] > W1 || b.vmc[i] == null) continue;
        xs.push(h.tzStr(b.t[i])); ys.push(b.vmc[i]);
        if (b.vmc[i] > yMax) yMax = b.vmc[i];
      }
      traces.push({ x: xs, y: ys, mode: 'lines', name: nm,
        line: { color: h.boatColor[nm], width: nm === cfg.hero.name ? 2.6 : 1.3 },
        opacity: nm === cfg.hero.name ? 1 : .8,
        hovertemplate: `${nm} · %{x} · %{y} kts VMC<extra></extra>` });
    }

    const EVCAT = cfg.eventCategories;
    const evs = D.events.filter(e => e.cat === 'tactics' && e.t >= W0 && e.t <= W1);
    const shapes = evs.map(e => ({ type: 'line', xref: 'x', yref: 'paper', x0: h.tzStr(e.t), x1: h.tzStr(e.t),
      y0: 0, y1: 1, line: { color: EVCAT.tactics.c, width: 1, dash: 'dot' }, opacity: .55 }));
    shapes.push({ type: 'line', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: 0, y1: 0,
      line: { color: '#B9CBD4', width: 1, dash: 'dash' } });
    if (evs.length) traces.push({ x: evs.map(e => h.tzStr(e.t)), y: evs.map(() => yMax + 0.6),
      mode: 'markers', marker: { symbol: EVCAT.tactics.sym, size: 11, color: EVCAT.tactics.c, line: { width: 1, color: '#fff' } },
      text: evs.map(e => h.wrapText(`${e.label} · ${h.fmt(e.t)} ${cfg.time.tzLabel} — ${e.txt}`)),
      hoverinfo: 'text', showlegend: false });

    return { traces, layout: { ...h.BASE(), shapes,
      margin: { ...h.BASE().margin, t: 18, b: 40 },
      xaxis: { ...h.GAX, tickformat: '%a %H:%M', type: 'date' },
      yaxis: { ...h.GAX, range: [-2.2, yMax + 1.4],
        title: { text: 'VMC toward the finish (kts)', font: h.AXFONT } } } };
  },
});
