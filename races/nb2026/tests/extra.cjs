/* NB2026 race-specific checks — the round-3 opinion layer (verdict cards,
   phase decomposition, lessons). The decomposition checks are DERIVATION
   checks, not new goldens: expected values are computed from the shipped
   payload's official times at test time (doctrine gate 5 — a decomposition
   must reconcile to the official delta), so no frozen number was added. */
'use strict';

module.exports = async ({ check, approx, assert, plots, evalIn, getEl, render, S, D, CFG, H, off }) => {
  const hero = CFG.hero.name;
  const officialGap = (ref, key) =>
    (H.parseDur(D.boats[hero].meta[key]) - H.parseDur(D.boats[ref].meta[key])) / 60;
  const barsTotal = () => plots.phasegap.traces[0].y.reduce((s, v) => s + (v ?? 0), 0);

  /* n1 · phasegap reconciles to the official margin in BOTH modes (gate 5) */
  check('nb', 'phase decomposition: bars sum to the official corrected AND elapsed margins', () => {
    const ref0 = S.ref;
    S.raceMode = 'h'; render('race');
    approx(barsTotal(), officialGap(ref0, 'corr'), 0.05, 'corrected bars must sum to the official corrected margin');
    S.raceMode = 'e'; render('race');
    approx(barsTotal(), officialGap(ref0, 'el'), 0.05, 'elapsed bars must sum to the official elapsed margin');
    S.raceMode = 'h'; render('race');
  });

  /* n2 · gate 5 is benchmark-dependent: the bars follow the reference select */
  check('nb', 'phase decomposition follows the reference (Gesture) and still reconciles', () => {
    const ref0 = S.ref;
    S.ref = 'Gesture'; render('race');
    approx(barsTotal(), officialGap('Gesture', 'corr'), 0.05, 'bars must reconcile vs the new reference');
    S.ref = ref0; render('race');
    approx(barsTotal(), officialGap(ref0, 'corr'), 0.05, 'bars must reconcile again after restoring');
  });

  /* n3 · verdict cards: every card cites an insight event that exists (copy
     discipline — the panel restates synthesized claims, it authors none) */
  check('nb', 'verdict: 5 cards rendered, each sourced to a real insight event', () => {
    const items = evalIn('window.__COPY__.verdict.items');
    assert.equal(items.length, 5, `${items.length} verdict items, want 5`);
    const rendered = (getEl('verdict').innerHTML.match(/border-left:3px solid/g) || []).length;
    assert.equal(rendered, 5, `rendered ${rendered} verdict cards, want 5`);
    const insightLabels = D.events.filter(e => e.cat === 'insight').map(e => e.label);
    for (const it of items)
      assert.ok(insightLabels.some(l => l.includes(it.src.replace('INSIGHT · ', ''))),
        `verdict card '${it.t}' cites '${it.src}' — no matching insight event`);
  });

  /* n4 · lessons: every cited timestamp exists in the race log */
  check('nb', 'lessons: every item cites a log timestamp that exists in D.events', () => {
    const groups = evalIn('window.__COPY__.lessons.groups');
    const html = getEl('lessons').innerHTML;
    // payload event times are epochs; cites are naive local strings (I1)
    const times = new Set(D.events.map(e => H.tzStr(e.t, off)));
    let n = 0;
    for (const g of groups) {
      assert.ok(html.includes(g.head), `lessons group '${g.head}' not rendered`);
      for (const it of g.items) {
        assert.ok(times.has(it.t), `lesson cites ${it.t} ('${it.cite}'), not in the race log`);
        n++;
      }
    }
    assert.ok(n >= 10, `only ${n} lessons — the logged set holds them all`);
  });

  /* n5 · takeaway 1: helm-split zoom — Monday-window VMC lines + tactics pins */
  check('nb', 'twhelm: VMC lines confined to the Mon 12:00–22:00 window, tactics calls pinned', () => {
    const lines = plots.twhelm.traces.filter(t => t.mode === 'lines');
    assert.ok(lines.length >= 3, `${lines.length} VMC lines, want the comparison set`);
    for (const tr of lines) for (const x of tr.x)
      assert.ok(x >= '2026-06-22 12:00' && x <= '2026-06-22 22:00', `${tr.name} point ${x} outside the zoom window`);
    const pins = plots.twhelm.traces.find(t => t.mode === 'markers' && t.hoverinfo === 'text');
    assert.ok(pins && pins.x.length >= 2, 'tactics pins missing (three-way split + layline)');
    assert.ok(pins.text.some(t => /Three-way helm split/.test(t)), 'the split event itself must be pinned');
  });

  /* n6 · takeaway 2: reef zoom — heavy-running SOG + every sail call pinned */
  check('nb', 'twreef: SOG lines in the Fri 19:00–Sat 20:00 window, all five sail calls pinned', () => {
    const lines = plots.twreef.traces.filter(t => t.mode === 'lines');
    assert.ok(lines.length >= 2, 'want hero + rating twin');
    for (const tr of lines) for (const x of tr.x)
      assert.ok(x >= '2026-06-19 19:00' && x <= '2026-06-20 20:00', `${tr.name} point ${x} outside the window`);
    const pins = plots.twreef.traces.find(t => t.mode === 'markers' && t.hoverinfo === 'text');
    assert.ok(pins && pins.x.length >= 5, `${pins ? pins.x.length : 0} sail pins, log has 5 in window`);
    assert.ok(pins.text.some(t => /2nd reef/.test(t)), 'the late reactive reef must be pinned');
  });

  /* n7 · takeaway 3: chaos-window gap reconciles with the race chart's math */
  check('nb', 'twnight: elapsed gap vs Christopher Dragon matches the milestone math at DTF 400', () => {
    const tr = plots.twnight.traces.find(t => t.mode === 'lines+markers');
    assert.ok(tr, 'gap trace missing');
    assert.equal(tr.x[0], 620); assert.equal(tr.x[tr.x.length - 1], 400);
    const hitTime = evalIn('hitTime'), startOf = evalIn('startOf');
    const hb = D.boats[hero], rb = D.boats['Christopher Dragon'];
    const want = ((hitTime(hb, 400) - startOf(hb, off)) - (hitTime(rb, 400) - startOf(rb, off))) / 60;
    approx(tr.y[tr.y.length - 1], want, 0.01, 'zoomed gap must equal the shared milestone math');
    const pins = plots.twnight.traces.find(t => t.mode === 'markers' && t.hoverinfo === 'text');
    assert.ok(pins && pins.x.length >= 5, 'the night\'s sail/crew/systems calls must be pinned');
  });

  /* n8 · takeaway 4: both sides of the east bet on one axis */
  check('nb', 'tweast: xte zoom carries the park shading and both verdict labels', () => {
    const lines = plots.tweast.traces.filter(t => t.mode === 'lines');
    assert.ok(lines.length === 3, `${lines.length} xte lines, want RAGANA + twin + Carina`);
    for (const tr of lines) for (const x of tr.x)
      assert.ok(x <= 320 && x >= 60, `xte point at DTF ${x} outside the zoom`);
    const rects = plots.tweast.layout.shapes.filter(s => s.type === 'rect');
    assert.ok(rects.some(r => r.x0 === 180 && r.x1 === 80), 'park zone shading missing');
    const ann = plots.tweast.layout.annotations.map(a => a.text).join(' | ');
    assert.match(ann, /SUNDAY BEAT/); assert.match(ann, /PARK/);
  });

  /* n9 · takeaway 5: the curve IS the arithmetic; dots are the payload */
  check('nb', 'twpark: every curve point satisfies t·v = 100 exactly; dots equal parkFair', () => {
    const curve = plots.twpark.traces.find(t => t.mode === 'lines');
    for (let i = 0; i < curve.x.length; i++)
      assert.ok(Math.abs(curve.x[i] * curve.y[i] - 100) < 0.5, `curve point ${i} off t=100/v`);
    const dotTraces = plots.twpark.traces.filter(t => t.mode === 'markers');
    const n = dotTraces.reduce((s, t) => s + t.x.length, 0);
    const want = Object.keys(D.parkFair).filter(nm => S.boats.has(nm) && D.parkFair[nm].hrs).length;
    assert.equal(n, want, 'dots must be exactly the selected parkFair boats');
    for (const t of dotTraces) for (let i = 0; i < t.x.length; i++) {
      const nm = (t.hovertext || t.text)[i].split(' · ')[0];
      assert.equal(t.y[i], D.parkFair[nm].hrs, `${nm} dot y != payload hrs`);
    }
  });
};
