/* The finish door — ALIR 2025's signature race-unique module (stage-2 stop).

   One dot per finisher: x = the clock time the boat first reached 15 nm to go,
   y = how many hours it then took to cross those 15 nm. The same water cost
   2-3 hours at noon Friday, 4.5-6.7 hours from mid-afternoon to midnight, and
   ~4 again on Saturday's new breeze — a door swinging shut and reopening.
   Entry times are grid-resolution (15 min); durations end at the OFFICIAL
   finish (doctrine 2). The squall and park bands are drawn in the module's own
   time axis — this chart is exactly where wall-clock structure belongs
   (the overlay doctrine keeps them off distance axes elsewhere).

   Owner directive (stage-2 stop): the visuals explain themselves — the note
   below and the on-chart annotations carry the reading, not a companion doc. */
"use strict";

registerModule({
  id: 'door',
  deps: ['boats', 'ev'],
  section: {
    kind: 'plot',
    height: 'min(380px, 92vw)',
    title: 'The finish door — the last 15 nm',
    note: 'Each dot is one finisher: <b>when</b> it reached 15 nm to go (x) and <b>how long</b> those 15 nm then took (y). ' +
      'Read it left to right: before ~2 PM Friday the door is open — 2–3 h to the line; <span class="mag">Max</span> is the last boat through at pace. ' +
      'Then the squall line crosses, the post-frontal calm sets in behind it, and the same 15 nm cost the mid-fleet 4.5–6.7 h — ' +
      '<span class="mag">Daffodil</span> entered just 2¾ h after Max and paid 5.8 h. After midnight the new northerly reopens the door. ' +
      'No fixed slow zone exists on this course: the water off Sea Cliff was fast at noon and dead at ten — the obstacle was arrival time, not geography.',
  },
  build(ctx) {
    const { D, S, cfg, h } = ctx;
    // door metrics ride meta (postprocess.py) so every finisher renders from
    // core.json alone — the round-1 defect was reading t/dtf series here, which
    // the split build carries only for the core boats until more.json loads.
    const pts = [];
    for (const nm of Object.keys(D.boats)) {
      const m = D.boats[nm].meta;
      if (!m || m.doorHrs == null) continue;
      pts.push({ nm, enter: m.doorEnter, hrs: m.doorHrs });
    }
    pts.sort((a, b2) => a.enter - b2.enter);
    const FOCUS = new Set(['Daffodil', 'Max', 'Habiru YCC']);
    const tr = [{
      x: pts.map(p => h.tzStr(p.enter)),
      y: pts.map(p => Math.round(p.hrs * 100) / 100),
      mode: 'markers',
      marker: {
        size: pts.map(p => FOCUS.has(p.nm) ? 12 : (S.boats.has(p.nm) ? 9 : 7)),
        color: pts.map(p => h.boatColor[p.nm] || '#7C8C9A'),
        opacity: pts.map(p => FOCUS.has(p.nm) || S.boats.has(p.nm) ? 0.95 : 0.55),
        line: { width: pts.map(p => FOCUS.has(p.nm) ? 1.5 : 0.5), color: '#fff' },
      },
      text: pts.map(p => h.wrapText(`${p.nm} — entered the last 15 nm ${h.fmt(p.enter)} ${cfg.time.tzLabel}, crossed them in ${p.hrs.toFixed(2)} h`)),
      hoverinfo: 'text', showlegend: false,
    }];
    // the two time objects, in this chart's own clock axis
    const band = (a, b2, fill) => ({ type: 'rect', xref: 'x', yref: 'paper',
      x0: a, x1: b2, y0: 0, y1: 1, fillcolor: fill, line: { width: 0 } });
    const shapes = [
      band('2025-07-25 15:36', '2025-07-25 18:15', 'rgba(194,84,17,0.10)'),   // squall line crosses the Sound
      band('2025-07-25 22:00', '2025-07-26 00:45', 'rgba(23,41,58,0.08)'),    // post-frontal park
    ];
    const ann = [
      { x: '2025-07-25 16:55', y: 1.06, xref: 'x', yref: 'paper', showarrow: false,
        text: h.narrow() ? 'SQUALL' : 'SQUALL LINE 15:36–18:15 · gusts 24–32 kt, W→E',
        font: { size: 9, color: '#A34E14', family: 'SF Mono, Menlo, monospace' } },
      { x: '2025-07-25 23:20', y: 1.06, xref: 'x', yref: 'paper', showarrow: false,
        text: h.narrow() ? 'PARK' : 'THE PARK',
        font: { size: 9, color: '#51677A', family: 'SF Mono, Menlo, monospace' } },
    ];
    for (const p of pts) {
      if (!FOCUS.has(p.nm)) continue;
      ann.push({ x: h.tzStr(p.enter), y: p.hrs, xref: 'x', yref: 'y', ax: 0, ay: -22,
        text: p.nm, showarrow: true, arrowwidth: 1, arrowcolor: h.boatColor[p.nm],
        font: { size: 10, color: h.boatColor[p.nm], family: 'SF Mono, Menlo, monospace' } });
    }
    const layout = { ...h.BASE(), shapes, annotations: ann,
      margin: { ...h.BASE().margin, t: 30 },
      xaxis: { ...h.GAX, type: 'date',
        title: { text: `When the boat reached 15 nm to go (${cfg.time.tzLabel})`, font: h.AXFONT } },
      yaxis: { ...h.GAX, range: [0, 7.4],
        title: { text: 'Hours to sail the last 15 nm', font: h.AXFONT } },
      showlegend: false };
    return { traces: tr, layout };
  },
});
