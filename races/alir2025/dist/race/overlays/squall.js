/* Squall overlay — a TIME object, deliberately (stage-2 stop, owner question).

   The squall belongs to the clock, not the course: each boat met it at a
   different distance-to-go, so painting a fixed band onto a distance axis
   would be a wall-clock window dressed as geography (doctrine 1's artifact
   class). This overlay therefore renders ONLY on clock axes: the DTF chart
   (always time-based) and the speed/offset charts when the time axis is
   selected. Its band is the verified station sequence — Kings Point 24.5 kt
   15:36 → NY Harbor 31.9 kt 16:40 → offshore Islip 23.5 kt 17:30 EDT — and
   the two eyewitness accounts ride the ordinary event lane. The door module
   carries the squall's consequence; this overlay carries its occurrence. */
"use strict";

registerOverlay({
  id: 'squall',
  pill: { default: true },   // always on; no chip — it is context, not a view
  bands(ctx, mode) {
    const timeAxis = mode === 'time' || (mode === undefined && ctx.S.axis === 't');
    if (!timeAxis) return [];   // never on a distance axis (doctrine 1)
    return [{ type: 'rect', xref: 'x', yref: 'paper',
      x0: '2025-07-25 15:36', x1: '2025-07-25 18:15', y0: 0, y1: 1,
      fillcolor: 'rgba(194,84,17,0.09)', line: { width: 0 } }];
  },
  bandAnnotations(ctx, mode) {
    const timeAxis = mode === 'time' || (mode === undefined && ctx.S.axis === 't');
    if (!timeAxis || ctx.h.narrow()) return [];
    return [{ x: '2025-07-25 16:55', y: 1.045, xref: 'x', yref: 'paper', showarrow: false,
      text: 'SQUALL LINE · 24–32 kt gusts, west→east', xanchor: 'center',
      font: { size: 9, color: '#A34E14', family: 'SF Mono, Menlo, monospace' } }];
  },
});
