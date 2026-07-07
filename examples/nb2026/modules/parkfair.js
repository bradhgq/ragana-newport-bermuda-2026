/* Park table module — each boat's own traversal of the slow zone (doctrine 1,
   invariant I3: own-traversal, never wall-clock). Pairs with the pipeline's
   parkFair payload. Section title/note/table copy are authored (frozen, see
   copy.md); the zone bounds named in them are the recorded CP-2 judgment. */
"use strict";

registerModule({
  id: 'parkfair',
  deps: ['boats'],
  section: {
    kind: 'table',
    title: 'The park, measured fairly — each boat’s own run through DTF 180 → 80',
    note: 'Comparing "the park" by wall-clock window is misleading: faster boats clear the light air before slower boats reach it, so you end up comparing different water. This table instead measures the empirically slow zone — the 180-to-80-nm-to-go band, with a dead core around 140–160 where the fleet-median speed bottomed at 3.3 kts — as each boat actually traversed it, on its own clock. The finding: everyone parked (16–38% of each run under 4 kts), the whole set’s traversal times fall within 5.5 hours of each other, and RAGANA’s 27.9 hours was second-slowest — an honest gap of two to four hours from the most easterly lane, with an instrument failure and a sail repair both landing inside the dead core.',
  },
  build(ctx) {
    const { D, S, h } = ctx, hero = ctx.cfg.hero.name;
    const pf = D.parkFair;
    const names = Object.keys(pf).filter(nm => S.boats.has(nm));
    if (!names.length) {
      ctx.el.innerHTML = '<div class="note">No boats selected. Pick boats under “Boats &amp; overlays” to compare their light-air crossings.</div>';
      return;
    }
    const rows = names.map(nm => ({ nm, ...pf[nm], sdl: D.boats[nm].meta.sdl })).sort((a, b) => a.hrs - b.hrs).map(r =>
      `<tr class="${r.nm === hero ? 'hero' : ''}"><td>${r.nm}</td><td>${r.sdl ? '#' + r.sdl : '—'}</td><td>${h.fmt(r.enter)}</td>
       <td style="text-align:right">${r.hrs}</td><td style="text-align:right">${r.mean}</td><td style="text-align:right">${r.u4}%</td>
       <td style="text-align:right">${r.u2}%</td><td style="text-align:right">${r.xte > 0 ? '+' : ''}${r.xte}</td></tr>`).join('');
    ctx.el.innerHTML =
      `<div class="tblwrap"><table><thead><tr><th scope="col">Boat</th><th scope="col">SDL</th><th scope="col">Reached zone</th><th scope="col">Hours to cross</th><th scope="col">Avg kts</th><th scope="col">% under 4</th><th scope="col">% under 2</th><th scope="col">Avg nm E+</th></tr></thead><tbody>${rows}</tbody></table></div>
       <div class="note swipehint">Swipe the table sideways for the rest of the columns.</div>
       <div class="note">The boats you’ve selected, fastest crossing first. For context on RAGANA’s run, Carina makes the cleanest match: she reached the zone 20 min before RAGANA, ~10 nm nearer the rhumb, and got through 3.7 hours quicker.</div>`;
  },
});
