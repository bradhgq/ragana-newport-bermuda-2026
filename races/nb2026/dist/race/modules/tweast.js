/* Takeaway 4 — "Minimize distance sailed unless it pays dividends"
   (Sebastian, 2026-07-16). Zoom: both sides of the east bet on one axis —
   rhumb offset through the Sunday beat (where the east lane paid: INSIGHT ·
   The Sunday beat paid) into the park (where boats nearer the rhumb got
   through faster: INSIGHT · Position × timing). Fixed cast: RAGANA, the
   rating twin, and Carina (the caption's cleanest cohort match). Title and
   caption in COPY.takeaways.tweast. */
"use strict";

registerModule({
  id: 'tweast',
  deps: ['ev'],
  section: { kind: 'plot', height: 'min(340px, 84vw)', title: '', note: '' },
  build(ctx) {
    const { D, S, h, cfg } = ctx;
    const tw = (ctx.copy && ctx.copy.takeaways && ctx.copy.takeaways.tweast) || {};
    const card = ctx.el && typeof ctx.el.closest === 'function' ? ctx.el.closest('.card') : null;
    if (card) {
      const h2 = card.querySelector('h2'); if (h2 && tw.title) h2.innerHTML = tw.title;
      const nt = card.querySelector('.note'); if (nt && tw.note) nt.innerHTML = tw.note;
    }
    const D0 = 320, D1 = 60;   // the beat (insight window 265→180) into the park (180→80)
    const BOATS = ['RAGANA', 'Christopher Dragon', 'Carina'];

    const traces = [];
    let yMax = 8, yMin = -8;
    for (const nm of BOATS) {
      const b = D.boats[nm]; if (!b || !b.t || !b.xte) continue;
      const xs = [], ys = [];
      for (let i = 0; i < b.t.length; i++) {
        if (b.dtf[i] == null || b.dtf[i] > D0 || b.dtf[i] < D1 || b.xte[i] == null) continue;
        xs.push(b.dtf[i]); ys.push(b.xte[i]);
        if (b.xte[i] > yMax) yMax = b.xte[i];
        if (b.xte[i] < yMin) yMin = b.xte[i];
      }
      traces.push({ x: xs, y: ys, mode: 'lines', name: nm,
        line: { color: h.boatColor[nm], width: nm === cfg.hero.name ? 2.6 : 1.3 },
        opacity: nm === cfg.hero.name ? 1 : .8,
        hovertemplate: `${nm} · %{x} nm to go · %{y} nm off the rhumb<extra></extra>` });
    }

    const park = cfg.charts.parkShading;
    const shapes = [
      { type: 'line', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: 0, y1: 0,
        line: { color: '#B9CBD4', width: 1 } },   // the rhumb itself
      { type: 'rect', xref: 'x', yref: 'paper', x0: park.zone[0], x1: park.zone[1], y0: 0, y1: 1,
        fillcolor: 'rgba(23,41,58,0.05)', line: { width: 0 } },
      { type: 'rect', xref: 'x', yref: 'paper', x0: park.core[0], x1: park.core[1], y0: 0, y1: 1,
        fillcolor: 'rgba(192,57,43,0.07)', line: { width: 0 } }];
    // the two halves of the bet, labelled with the record's own conclusions
    const ann = [
      { x: 232, y: 1.06, xref: 'x', yref: 'paper', showarrow: false,
        text: 'THE SUNDAY BEAT — the east lane pays', font: { ...h.AXFONT, size: 9, color: '#0E7C7B' } },
      { x: 130, y: 1.06, xref: 'x', yref: 'paper', showarrow: false,
        text: 'THE PARK — the bill', font: { ...h.AXFONT, size: 9, color: '#B23A2E' } }];

    return { traces, layout: { ...h.BASE(), shapes, annotations: ann,
      margin: { ...h.BASE().margin, t: 26, b: 42 },
      xaxis: { ...h.GAX, autorange: 'reversed',
        title: { text: 'Distance to finish (nm) — race runs right to left ⟵', font: h.AXFONT } },
      yaxis: { ...h.GAX, range: [yMin - 2, yMax + 3],
        title: { text: 'nm east (+) / west (−) of the rhumb', font: h.AXFONT } } } };
  },
});
