/* Takeaway 5 — "Practice light-wind sailing" (Sebastian, 2026-07-16). His
   arithmetic, drawn: time to cross the park's 100 nm (DTF 180→80) at a given
   made-good speed is t = 100/v — pure division, no model. Dots are the
   SELECTED boats' own traversals from the parkFair payload (the same fair
   basis as the park table, so the copy's scope discipline holds); the two
   brackets are the same division evaluated at the slow and fast ends of the
   curve, computed at render time. Title/caption in COPY.takeaways.twpark. */
"use strict";

registerModule({
  id: 'twpark',
  deps: ['boats'],   // dots follow the selection, like the park table
  section: { kind: 'plot', height: 'min(380px, 88vw)', title: '', note: '' },
  build(ctx) {
    const { D, S, h, cfg } = ctx, hero = cfg.hero.name;
    const tw = (ctx.copy && ctx.copy.takeaways && ctx.copy.takeaways.twpark) || {};
    const card = ctx.el && typeof ctx.el.closest === 'function' ? ctx.el.closest('.card') : null;
    if (card) {
      const h2 = card.querySelector('h2'); if (h2 && tw.title) h2.innerHTML = tw.title;
      const nt = card.querySelector('.note'); if (nt && tw.note) nt.innerHTML = tw.note;
    }
    const ZONE = 100;   // DTF 180→80 (cfg.charts.parkShading.zone)
    const names = Object.keys(D.parkFair).filter(nm => S.boats.has(nm) && D.parkFair[nm].hrs);
    const dot = nm => {
      const pf = D.parkFair[nm];
      return { nm, x: +(ZONE / pf.hrs).toFixed(2), y: pf.hrs, u4: pf.u4 };
    };
    const dots = names.map(dot);
    const rag = dots.find(d => d.nm === hero);
    const others = dots.filter(d => d.nm !== hero);
    const hover = d => `${d.nm} · ${d.y} h through 180→80 · ${d.u4}% of it under 4 kts`;

    // the curve: t = 100 / v, drawn across the observed speed range
    const vs = []; for (let v = 3.0; v <= 6.8; v += 0.05) vs.push(+v.toFixed(2));
    const traces = [
      { x: vs, y: vs.map(v => +(ZONE / v).toFixed(2)), mode: 'lines', name: 't = 100 nm ÷ v',
        line: { color: 'rgba(110,139,152,0.55)', width: 1.5, dash: 'dot' },
        hoverinfo: 'skip', showlegend: false },
      { x: others.map(d => d.x), y: others.map(d => d.y), mode: 'markers',
        marker: { size: 8, color: others.map(d => h.boatColor[d.nm] || '#6E8B98'), line: { width: 1, color: '#fff' } },
        text: others.map(hover), hoverinfo: 'text', showlegend: false }];
    if (rag) traces.push({ x: [rag.x], y: [rag.y], mode: 'markers',
      marker: { symbol: 'diamond', size: 14, color: cfg.hero.color, line: { width: 1.5, color: '#fff' } },
      hovertext: [hover(rag)], hoverinfo: 'text', showlegend: false });

    // Sebastian's point, evaluated on the curve itself (arithmetic, not authored):
    // +1 kt from the slow end vs +1 kt from the fast end
    const save = v => +(ZONE / v - ZONE / (v + 1)).toFixed(1);
    const bracket = (v, label) => ([
      { type: 'line', xref: 'x', yref: 'y', x0: v, y0: ZONE / v, x1: v + 1, y1: ZONE / v,
        line: { color: '#7A93A3', width: 1 } },
      { type: 'line', xref: 'x', yref: 'y', x0: v + 1, y0: ZONE / v, x1: v + 1, y1: ZONE / (v + 1),
        line: { color: '#7A93A3', width: 1.6 } }]);
    const shapes = [...bracket(3.5), ...bracket(5.5)];
    const ann = [
      { x: 4.0, y: ZONE / 3.5 + 1.2, xref: 'x', yref: 'y', showarrow: false, yanchor: 'bottom',
        text: `+1 kt here saves ${save(3.5)} h`, font: { ...h.AXFONT, size: 9.5, color: '#17293A' } },
      { x: 6.0, y: ZONE / 5.5 + 1.2, xref: 'x', yref: 'y', showarrow: false, yanchor: 'bottom',
        text: `+1 kt here saves ${save(5.5)} h`, font: { ...h.AXFONT, size: 9.5, color: '#17293A' } }];
    if (rag) ann.push({ x: rag.x, y: rag.y, xref: 'x', yref: 'y', ax: 26, ay: 20, text: hero, showarrow: true,
      arrowhead: 0, arrowwidth: .7, arrowcolor: 'rgba(194,24,126,0.55)', standoff: 6,
      font: { ...h.AXFONT, size: 10, color: cfg.hero.color } });

    return { traces, layout: { ...h.BASE(), shapes, annotations: ann, showlegend: false,
      margin: { ...h.BASE().margin, t: 18, b: 46 },
      xaxis: { ...h.GAX, range: [2.9, 6.9],
        title: { text: 'Speed made good through the zone (kts) — 100 nm ÷ own traversal hours', font: h.AXFONT } },
      yaxis: { ...h.GAX,
        title: { text: 'Hours to cross DTF 180 → 80', font: h.AXFONT } } } };
  },
});
