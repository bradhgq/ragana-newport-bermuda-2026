/* Finish-spread strip module — every scored boat by corrected time. Works for
   any fleet scored on corrected time; the −1h/−2h what-if markers and the copy
   are this race's (whatIfHours in presentation.js finstrip config). kind:plot,
   so the layout goes through the shell's react() wrapper (I6 for free). */
"use strict";

registerModule({
  id: 'finstrip',
  deps: ['boats'],
  section: {
    kind: 'plot',
    title: 'The finish — how tight the mid-pack really was',
    note: 'Every scored St. David’s Lighthouse boat by corrected time. Each dot is a boat; RAGANA is the magenta diamond. Thirteen boats finished within half an hour of her on corrected time — the densest stretch of the whole fleet. The dashed markers show what one and two hours of corrected time were worth: <b>one hour ≈ 16 places, two hours ≈ 29</b>. In a race this compressed, every one of the small losses in the story above carried real scoreboard weight.',
  },
  build(ctx) {
    const { D, S, h, cfg } = ctx, hero = cfg.hero.name;
    const rows = [];
    for (const nm of Object.keys(D.boats)) {
      const m = D.boats[nm].meta; if (!m.corr) continue;
      rows.push({ nm, sec: h.parseDur(m.corr), sdl: m.sdl, grp: m.grp });
    }
    rows.sort((a, b) => a.sec - b.sec);
    const rag = rows.find(r => r.nm === hero);
    const hrs = r => r.sec / 3600;
    // gentle vertical jitter so dense clusters read as density
    const jit = rows.map((r, i) => ((i % 7) - 3) * 0.09);
    const others = rows.filter(r => r.nm !== hero);
    const traces = [{ x: others.map(hrs), y: others.map((r, i) => jit[rows.indexOf(r)]), mode: 'markers',
      marker: { size: 7, color: others.map(r => S.boats.has(r.nm) ? h.boatColor[r.nm] : 'rgba(110,139,152,0.45)'),
        line: { width: 1, color: '#fff' } },
      text: others.map(r => `#${r.sdl} ${r.nm} · corrected ${D.boats[r.nm].meta.corr}`), hoverinfo: 'text', showlegend: false },
    { x: [hrs(rag)], y: [0], mode: 'markers', marker: { symbol: 'diamond', size: 13, color: cfg.hero.color, line: { width: 1.5, color: '#fff' } },
      hovertext: [`#${rag.sdl} ${hero} · corrected ${D.boats[hero].meta.corr}`], hoverinfo: 'text', showlegend: false }];
    // hypothetical markers: −1h and −2h corrected. Labels anchor away from each
    // other and the hero's label floats above the dot band on a thin leader —
    // all three used to collide in the dense mid-pack.
    const anchors = ['left', 'right'];
    const hyp = cfg.finstrip.whatIfHours.map((hh, i) => {
      const cut = rag.sec - hh * 3600, rank = 1 + rows.filter(r => r.sec < cut).length;
      return { x: hrs(rag) - hh, anchor: anchors[i % 2], lbl: `−${hh} h → ~${rank}th` };
    });
    const shapes = hyp.map(o => ({ type: 'line', xref: 'x', yref: 'paper', x0: o.x, x1: o.x, y0: .10, y1: .86,
      line: { color: cfg.hero.color, width: 1, dash: 'dash' }, opacity: .6 }));
    const ann = [
      ...hyp.map(o => ({ x: o.x, y: .97, xref: 'x', yref: 'paper', text: o.lbl, showarrow: false,
        xanchor: o.anchor, xshift: o.anchor === 'left' ? 4 : -4,
        font: { size: 9, color: cfg.hero.color, family: 'SF Mono, Menlo, monospace' } })),
      { x: hrs(rag), y: 0, xref: 'x', yref: 'y', ax: 0, ay: -46, text: `${hero} · #${rag.sdl}`, showarrow: true,
        arrowhead: 0, arrowwidth: .7, arrowcolor: 'rgba(194,24,126,0.55)', standoff: 9,
        font: { size: 10, color: cfg.hero.color, family: 'SF Mono, Menlo, monospace' } }];
    const layout = { ...h.BASE(), shapes, annotations: ann, margin: { ...h.BASE().margin, t: 14, b: 44 }, showlegend: false,
      xaxis: { ...h.GAX, title: { text: h.narrow() ? 'Corrected time (h) — left is better' : 'Corrected time (hours) — St. David’s Lighthouse fleet, left is better', font: h.AXFONT } },
      yaxis: { ...h.GAX, visible: false, range: [-0.8, 0.8] } };
    return { traces, layout };
  },
});
