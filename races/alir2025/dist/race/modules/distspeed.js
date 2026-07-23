/* Distance-sailed vs speed module (round 2 — Sebastian's request, reframed):
   the Honey-rule chart. x = total distance sailed from the raw pings
   (meta.sailedNm, same basis as the published 687.6 nm); y = sailed distance ÷
   a time base, so the iso rays v = d/t are exact by construction. A y-metric
   toggle (cfg.distspeed.toggle → S.distMode; default from config — both races
   boot corrected, owner 2026-07-15) switches the time base:
     elapsed   — y = meta.avgKt; rays = equal elapsed time (position on the water)
     corrected — y = sailedNm ÷ official corrected time; rays = equal corrected result
   One dot per scored boat; grey rays = equal finish time; vertical line = the
   race's reference length (cfg.course.rhumbNm). kind:plot, so the layout rides
   the shell's react() wrapper (I6 for free).

   This is a SHARED shell module: every caption and reference-line label is
   authored per race in COPY.distspeed (ctx.copy) — narrative never lives here
   (2026-07-15 review: the module was shipping NB2026 claims on the BIR page).
   Slots: noteElapsed / noteCorrected (the card caption per mode),
   refLine (the vertical-line annotation), vsRef (hover suffix for the
   sailed-beyond-reference delta), xNote (wide-screen x-axis title tail). */
"use strict";

registerModule({
  id: 'distspeed',
  deps: ['boats', 'race'],   // dot colors follow selection; ring follows the reference
  section: {
    kind: 'plot',
    height: 'min(470px, 92vw)',
    title: 'Distance sailed vs speed — minimum distance at maximum speed',
    // placeholder — build() swaps the per-mode caption in on every render
    note: '',
  },
  build(ctx) {
    const { D, S, h, cfg } = ctx, hero = cfg.hero.name;
    const dsCopy = (ctx.copy && ctx.copy.distspeed) || {};
    const corrected = S.distMode === 'h';   // elapsed | corrected
    const rows = [];
    for (const nm of Object.keys(D.boats)) {
      const m = D.boats[nm].meta;
      if (!m.corr || m.sailedNm == null || m.avgKt == null) continue;
      // y = distance sailed ÷ the chosen time base; corrected divides by the
      // official corrected time (compressed by the boat's handicap).
      const y = corrected ? m.sailedNm / (h.parseDur(m.corr) / 3600) : m.avgKt;
      rows.push({ nm, x: m.sailedNm, y: +y.toFixed(2), sdl: m.sdl, el: m.el, corr: m.corr });
    }
    if (!rows.length) return null;
    const rhumb = cfg.course.rhumbNm;
    const xs = rows.map(r => r.x);
    const x0 = Math.min(rhumb, ...xs) - 10, x1 = Math.max(...xs) + 10;

    // Mode-aware outlier clamp: a much-faster boat sits far above the pack on
    // the ELAPSED axis and squashes everyone else; peel such points off the
    // y-range and label them at the edge rather than let one dot flatten the
    // comparison. Under CORRECTED time the fleet pulls together (handicap),
    // so nothing peels.
    const sortedY = rows.map(r => r.y).sort((a, b) => a - b);
    let hiCut = sortedY[sortedY.length - 1];
    for (let i = sortedY.length - 1; i > 2; i--) {
      const packSpread = sortedY[i - 1] - sortedY[0];
      if (sortedY[i] - sortedY[i - 1] > 0.8 * packSpread) hiCut = sortedY[i - 1]; else break;
    }
    const outliers = rows.filter(r => r.y > hiCut);
    const inRange = rows.filter(r => r.y <= hiCut);
    const y0 = Math.min(...inRange.map(r => r.y)) - 0.35, y1 = hiCut + 0.35;

    // a hero without scored meta (e.g. a DNF hero has no corr) simply has no
    // dot — never dereference a missing row
    const rag = rows.find(r => r.nm === hero);
    const others = rows.filter(r => r.nm !== hero);
    const tbase = corrected ? 'corrected' : 'elapsed';
    const vsRef = dsCopy.vsRef || 'vs minimum';
    const hover = r => `#${r.sdl} ${r.nm} · ${r.x} nm sailed (+${(r.x - rhumb).toFixed(1)} ${vsRef}) · ` +
      `${r.y} kts (${tbase})${r.nm === S.ref ? ' · reference' : ''}`;
    // all boats stay in the trace data (dots may clip above the clamped range);
    // Plotly clips display only, so the scored-boat count is unchanged (harness)
    const traces = [
      { x: others.map(r => r.x), y: others.map(r => r.y), mode: 'markers',
        marker: { size: 7, color: others.map(r => S.boats.has(r.nm) ? h.boatColor[r.nm] : 'rgba(110,139,152,0.45)'),
          line: { width: others.map(r => r.nm === S.ref ? 2 : 1), color: others.map(r => r.nm === S.ref ? '#17293A' : '#fff') } },
        text: others.map(hover), hoverinfo: 'text', showlegend: false }];
    if (rag) traces.push(
      { x: [rag.x], y: [rag.y], mode: 'markers',
        marker: { symbol: 'diamond', size: 13, color: cfg.hero.color, line: { width: 1.5, color: '#fff' } },
        hovertext: [hover(rag)], hoverinfo: 'text', showlegend: false });

    // iso rays through the origin: v = d / t. Boats on a ray finished in the
    // same (elapsed | corrected) time; the label sits where the ray leaves the view.
    const shapes = [], ann = [];
    const isoDays = corrected ? cfg.distspeed.isoDaysCorr : cfg.distspeed.isoDays;
    for (const days of isoDays) {
      const v = x => x / (days * 24);
      let lx = x1, ly = v(x1);          // exit through the right edge…
      if (ly > y1) { ly = y1; lx = y1 * days * 24; }   // …or through the top
      shapes.push({ type: 'line', xref: 'x', yref: 'y', x0: x0, y0: v(x0), x1: x1, y1: v(x1),
        line: { color: 'rgba(110,139,152,0.35)', width: 1, dash: 'dot' } });
      if (ly >= y0 && ly <= y1)
        ann.push({ x: lx, y: ly, xref: 'x', yref: 'y', text: `${days} d ${tbase}`, showarrow: false,
          xanchor: 'right', yanchor: 'bottom', xshift: -3,
          font: { ...h.AXFONT, size: 9, color: '#7A93A3' } });
    }
    shapes.push({ type: 'line', xref: 'x', yref: 'paper', x0: rhumb, x1: rhumb, y0: 0, y1: 1,
      line: { color: cfg.hero.color, width: 1, dash: 'dash' }, opacity: .6 });
    ann.push({ x: rhumb, y: .98, xref: 'x', yref: 'paper',
      text: dsCopy.refLine || `${rhumb} nm — minimum distance`,
      showarrow: false, xanchor: 'left', xshift: 5,
      font: { ...h.AXFONT, size: 9, color: cfg.hero.color } });
    if (rag) ann.push({ x: rag.x, y: rag.y, xref: 'x', yref: 'y', ax: 0, ay: -42, text: `${hero}`, showarrow: true,
      arrowhead: 0, arrowwidth: .7, arrowcolor: 'rgba(194,24,126,0.55)', standoff: 8,
      font: { ...h.AXFONT, size: 10, color: cfg.hero.color } });
    // peeled outliers: labelled at the top edge so the pack keeps the full axis
    for (const o of outliers)
      ann.push({ x: o.x, y: y1, xref: 'x', yref: 'y', text: `↑ ${o.nm} ${o.y} kts (off scale)`, showarrow: false,
        xanchor: 'right', yanchor: 'top', yshift: -2,
        font: { ...h.AXFONT, size: 9, color: '#7A93A3' } });

    // per-mode caption from the race's authored copy (swapped into the card's
    // .note); guarded so the headless test harness (stub ctx.el) is a no-op
    const card = ctx.el && typeof ctx.el.closest === 'function' ? ctx.el.closest('.card') : null;
    const noteEl = card && card.querySelector('.note');
    const note = corrected ? dsCopy.noteCorrected : dsCopy.noteElapsed;
    if (noteEl && note != null) noteEl.innerHTML = note;

    const layout = { ...h.BASE(), shapes, annotations: ann,
      margin: { ...h.BASE().margin, t: 16, b: 44 }, showlegend: false,
      xaxis: { ...h.GAX, range: [x0, x1],
        title: { text: h.narrow() || !dsCopy.xNote ? 'Distance sailed (nm)' : `Distance sailed (nm) — ${dsCopy.xNote}`, font: h.AXFONT } },
      yaxis: { ...h.GAX, range: [y0, y1],
        title: { text: `Average speed (kts) — sailed ÷ official ${tbase}`, font: h.AXFONT } } };
    return { traces, layout };
  },
});
