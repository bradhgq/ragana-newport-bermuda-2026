/* ALIR 2025 per-race extension checks — run by the shared harness after the
   fixture suite. Three assertions, counted in regression.json expected_checks:
   the door canary, the squall band's presence on clock axes, and its ABSENCE
   on distance axes (doctrine 1 — a time object never paints onto space). */
'use strict';

module.exports = async ({ check, approx, assert, plots, render, S, FIX }) => {
  const door = FIX.module_canaries && FIX.module_canaries.door;
  // guard: a future edit that drops the canary must skip the check (and decrement
  // expected_checks), not throw at suite load on door.boat below
  if (door)
  check('derived-metric', `door canary: ${door.boat} entered ${door.enter}, ${door.hours} h for the last 15 nm`, () => {
    assert.ok(plots.door, 'door module did not render');
    const tr = plots.door.traces[0];
    assert.equal(tr.x.length, door.finishers, `door dots ${tr.x.length} != ${door.finishers} finishers`);
    const i = tr.x.findIndex((x, k) => String(x).startsWith(door.enter.slice(0, 15)) && Math.abs(tr.y[k] - door.hours) <= 0.06);
    assert.ok(i >= 0, `${door.boat}'s dot (${door.enter}, ~${door.hours} h) not found in the door trace`);
  });

  const isSquall = s => s.type === 'rect' && /194,\s*84,\s*17/.test(String(s.fillcolor || ''));

  check('derived-metric', 'squall band renders on the clock-based DTF chart', () => {
    assert.ok((plots.dtf.layout.shapes || []).some(isSquall), 'squall band missing from the DTF chart');
  });

  check('derived-metric', 'squall band NEVER paints onto a distance axis (doctrine 1)', () => {
    S.axis = 'd'; render('axis'); render('ev');
    assert.ok(!(plots.sog.layout.shapes || []).some(isSquall), 'squall band leaked onto the distance-axis speed chart');
    S.axis = 't'; render('axis'); render('ev');
    assert.ok((plots.sog.layout.shapes || []).some(isSquall), 'squall band missing from the time-axis speed chart');
    S.axis = 'd'; render('axis'); render('ev');   // restore the boot default
  });
};
