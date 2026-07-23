/* Phase decomposition (round 3 — the tier-1 opinion layer): where the minutes
   went, phase by phase, vs the selected reference. A waterfall over the same
   milestone math as the won/lost chart (race.js), cut at the authored phase
   boundaries (CFG.phases): each bar = the corrected|elapsed minutes gained or
   lost inside that phase; the running total ends EXACTLY on the official
   finish margin (I2 endpoints), so the decomposition reconciles to the
   scoreboard by construction — doctrine gate 5 ("loss decomposition is
   benchmark-dependent... arithmetic reconciles to the official delta") as a
   chart, for ANY reference the reader picks. Every number is derived at
   runtime from the shipped payload; nothing here is authored. */
"use strict";

registerModule({
  id: 'phasegap',
  deps: ['race'],   // follows the reference select and the corrected|elapsed mode
  section: {
    kind: 'plot',
    height: 'min(380px, 88vw)',
    title: 'Where the minutes went — phase by phase',
    note: '',   // per-mode caption from COPY.phasegap (slots {ref}/{mode}/{margin})
  },
  build(ctx) {
    const { D, S, h, cfg } = ctx, hero = cfg.hero.name;
    const pgCopy = (ctx.copy && ctx.copy.phasegap) || {};
    const heroB = D.boats[hero], refB = D.boats[S.ref];
    const corrected = S.raceMode === 'h';
    const key = corrected ? 'corr' : 'el';
    if (!refB || !refB.meta[key] || !heroB.meta[key] || !h.hasTrack(S.ref)) return null;
    const heroTcf = heroB.meta.tcf || 1, refTcf = refB.meta.tcf || 1;
    const h0 = h.startOf(heroB), r0 = h.startOf(refB);

    // gap vs ref at a DTF milestone — identical math to race.js's trace loop
    const gapAt = m => {
      const tH = h.hitTime(heroB, m), tR = h.hitTime(refB, m);
      if (tH == null || tR == null) return null;
      return corrected ? ((tH - h0) * heroTcf - (tR - r0) * refTcf) / 60
                       : ((tH - h0) - (tR - r0)) / 60;
    };
    // official finish margin — exact endpoints, never the last tracker point (I2)
    const margin = (h.parseDur(heroB.meta[key]) - h.parseDur(refB.meta[key])) / 60;

    // boundary values: 0 at the gun (start-sequence offsets are removed, so the
    // gap is zero by construction), gapAt() at interior phase edges, the
    // official margin at the finish
    const phases = cfg.phases;
    const bounds = phases.map(([a]) => a).concat([0]);
    const vals = bounds.map((m, i) =>
      i === 0 ? 0 : i === bounds.length - 1 ? margin : gapAt(m));

    const labels = phases.map(p => p[2]);
    // full precision in the geometry — rounding per bar would accumulate and
    // break the exact reconciliation; labels round for display only
    const bars = phases.map((p, i) =>
      (vals[i] == null || vals[i + 1] == null) ? null : vals[i + 1] - vals[i]);
    const bases = phases.map((p, i) => vals[i]);
    const GAIN = '#0E7C7B', LOSS = '#B23A2E';

    const traces = [{
      type: 'bar', x: labels, y: bars, base: bases,
      marker: { color: bars.map(b => (b == null || b > 0) ? LOSS : GAIN), opacity: .85,
                line: { width: 1, color: '#fff' } },
      text: bars.map(b => b == null ? '' : (b > 0 ? '+' : '') + b.toFixed(1)),
      textposition: 'outside', textfont: { ...h.AXFONT, size: 10 },
      hovertext: phases.map((p, i) => bars[i] == null ? '' :
        `${p[2]} (DTF ${p[0]}→${p[1]}) · ${bars[i] > 0 ? 'lost ' + bars[i].toFixed(1) : 'gained ' + (-bars[i]).toFixed(1)} min vs ${S.ref}` +
        ` · running total ${vals[i + 1] >= 0 ? '+' : ''}${vals[i + 1].toFixed(1)}`),
      hoverinfo: 'text', showlegend: false,
    }];

    const shapes = [
      { type: 'line', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: 0, y1: 0,
        line: { color: '#B9CBD4', width: 1 } },
      // the reconciliation line: the official margin the bars must land on
      { type: 'line', xref: 'paper', yref: 'y', x0: 0, x1: 1, y0: margin, y1: margin,
        line: { color: cfg.hero.color, width: 1, dash: 'dash' }, opacity: .65 }];
    // label sits at the LEFT end of the dashed margin line — the running total
    // only reaches it at the right edge, so the left side is always clear
    const ann = [{ x: 0, y: margin, xref: 'paper', yref: 'y', xanchor: 'left',
      yanchor: margin >= 0 ? 'bottom' : 'top',
      text: `official margin ${margin >= 0 ? '+' : ''}${margin.toFixed(1)} min — the bars sum to this`,
      showarrow: false, font: { ...h.AXFONT, size: 9, color: cfg.hero.color } }];

    // caption: authored copy with runtime slots (the numbers are derived here,
    // never written into the copy)
    const card = ctx.el && typeof ctx.el.closest === 'function' ? ctx.el.closest('.card') : null;
    const noteEl = card && card.querySelector('.note');
    if (noteEl && pgCopy.note) noteEl.innerHTML = pgCopy.note
      .replace(/\{ref\}/g, S.ref)
      .replace('{mode}', corrected ? 'corrected' : 'elapsed')
      .replace('{margin}', `${margin >= 0 ? '+' : ''}${margin.toFixed(1)}`);

    const layout = { ...h.BASE(), shapes, annotations: ann, showlegend: false,
      margin: { ...h.BASE().margin, t: 24, b: h.narrow() ? 90 : 56 },
      xaxis: { ...h.GAX, tickfont: { ...h.AXFONT, size: h.narrow() ? 7.5 : 9 },
               tickangle: h.narrow() ? 35 : 0 },
      yaxis: { ...h.GAX,
        title: { text: `Minutes vs ${S.ref} — running total (+ = behind)`, font: h.AXFONT } } };
    return { traces, layout };
  },
});
