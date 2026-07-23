/* Takeaway 3 — "Minimize sail changes when shorthanded, especially at night"
   (Sebastian, 2026-07-16). Zoom: the boat-for-boat (elapsed) gap to the rating
   twin through the chaos window — the same milestone math as the won/lost
   chart, cut to phases 1–2 (DTF 620→395), with the night's sail/crew/systems
   calls pinned at RAGANA's position when each happened. The 90–130-minute
   price is the record's existing claim (INSIGHT · The cost of chaos); this
   chart is its evidence window. Title/caption in COPY.takeaways.twnight. */
"use strict";

registerModule({
  id: 'twnight',
  deps: ['ev'],
  section: { kind: 'plot', height: 'min(320px, 82vw)', title: '', note: '' },
  build(ctx) {
    const { D, S, h, cfg } = ctx;
    const tw = (ctx.copy && ctx.copy.takeaways && ctx.copy.takeaways.twnight) || {};
    const card = ctx.el && typeof ctx.el.closest === 'function' ? ctx.el.closest('.card') : null;
    if (card) {
      const h2 = card.querySelector('h2'); if (h2 && tw.title) h2.innerHTML = tw.title;
      const nt = card.querySelector('.note'); if (nt && tw.note) nt.innerHTML = tw.note;
    }
    const hero = cfg.hero.name, REF = 'Christopher Dragon';
    const heroB = D.boats[hero], refB = D.boats[REF];
    if (!refB || !h.hasTrack(REF)) return null;
    const h0 = h.startOf(heroB), r0 = h.startOf(refB);
    const M0 = 620, M1 = 400;   // phases 1–2 (edge 395; 400 is the nearest on-grid milestone)

    const xs = [], ys = [];
    for (let m = M0; m >= M1; m -= cfg.race.milestoneStep) {
      const tH = h.hitTime(heroB, m), tR = h.hitTime(refB, m);
      xs.push(m); ys.push(tH == null || tR == null ? null : ((tH - h0) - (tR - r0)) / 60);
    }
    const yTop = Math.max(20, ...ys.filter(v => v != null)) + 14;
    const traces = [{ x: xs, y: ys, mode: 'lines+markers', name: hero, connectgaps: false,
      marker: { size: 4 }, line: { color: cfg.hero.color, width: 2.4 },
      hovertemplate: `%{x} nm to go · %{y:.0f} min behind ${REF} (elapsed)<extra></extra>` }];

    // the night's calls, pinned at the hero's DTF when each happened
    const EVCAT = cfg.eventCategories;
    const off = cfg.time.utcOffset;
    const E = s => Date.parse(s.replace(' ', 'T') + ((off <= 0 ? '-' : '+') + String(Math.abs(off)).padStart(2, '0') + ':00')) / 1000;
    const W1 = E('2026-06-21 00:00');
    const evs = D.events.filter(e => ['sail', 'crew', 'systems'].includes(e.cat) && e.t <= W1)
      .map(e => ({ ...e, m: h.heroDTFat(e.t) }))
      .filter(e => e.m <= M0 && e.m >= 395);
    const shapes = evs.map(e => ({ type: 'line', xref: 'x', yref: 'paper', x0: e.m, x1: e.m,
      y0: 0, y1: 1, line: { color: EVCAT[e.cat].c, width: 1, dash: 'dot' }, opacity: .5 }));
    shapes.push({ type: 'line', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: 0, y1: 0,
      line: { color: '#B9CBD4', width: 1 } });
    if (evs.length) traces.push({ x: evs.map(e => e.m), y: evs.map(() => yTop),
      mode: 'markers', marker: { symbol: evs.map(e => EVCAT[e.cat].sym), size: 10,
        color: evs.map(e => EVCAT[e.cat].c), line: { width: 1, color: '#fff' } },
      text: evs.map(e => h.wrapText(`${e.label} · ${h.fmt(e.t)} ${cfg.time.tzLabel} — ${e.txt}`)),
      hoverinfo: 'text', showlegend: false });

    return { traces, layout: { ...h.BASE(), shapes, showlegend: false,
      margin: { ...h.BASE().margin, t: 18, b: 42 },
      xaxis: { ...h.GAX, autorange: 'reversed',
        title: { text: 'Distance to finish (nm) — race runs right to left ⟵', font: h.AXFONT } },
      yaxis: { ...h.GAX, range: [-15, yTop + 12],
        title: { text: `Minutes behind (+) ${REF} — elapsed`, font: h.AXFONT } } } };
  },
});
