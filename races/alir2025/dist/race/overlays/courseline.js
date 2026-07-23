/* Scored-course overlay — draws the ROUTED course polyline on the map.

   Stage-4 round-1 defect: the shell's @rhumb pill draws the straight
   start→finish chord, which on a marks course is neither the course nor
   sailable (here it crosses Long Island). The scored course is the routed
   polyline the pipeline's distance-remaining runs on — so that is what the
   map shows by default; the chord stays available as the "Direct line" pill.
   Waypoints ride presentation.js (cfg.course.polyline) and must match
   config.yaml course.start + marks + finish — the source of truth. */
"use strict";

registerOverlay({
  id: 'courseline',
  mapLayer: 'under',
  pill: { label: 'Scored course', color: '#C2187E', default: true },
  mapTraces(ctx) {
    const p = ctx.cfg.course.polyline;
    return [{ x: p.map(w => w[1]), y: p.map(w => w[0]), mode: 'lines',
      line: { color: '#C2187E', width: 1.6, dash: 'dash' },
      hoverinfo: 'text',
      text: ctx.h.wrapText('The scored course — 207 nm by the Sailing Instructions; routed polyline 205.8 nm. One mandatory mark: Ambrose Channel R“14”.'),
      showlegend: true, name: 'Scored course · 207 nm' }];
  },
});
