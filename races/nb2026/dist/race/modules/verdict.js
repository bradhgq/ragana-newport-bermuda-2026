/* Verdict panel (round 3 — the tier-1 opinion layer, owner-directed
   2026-07-15): the analysis conclusions, stated as conclusions. Every card is
   an existing synthesized claim — the same claims pinned as insight markers on
   the charts — surfaced from COPY.verdict; this module is pure presentation
   and carries NO narrative of its own (copy discipline: claims live in
   copy.js/copy.md, sourced from events.yaml's insight rows). Each card links
   to the chart that shows its evidence. */
"use strict";

registerModule({
  id: 'verdict',
  deps: [],   // static — authored copy, renders once at boot
  section: {
    kind: 'html',
    title: '',   // set from COPY.verdict.title at build (copy owns the words)
    note: '',
  },
  build(ctx) {
    const v = ctx.copy && ctx.copy.verdict;
    if (!ctx.el || !v) return;
    const card = typeof ctx.el.closest === 'function' ? ctx.el.closest('.card') : null;
    if (card) {
      const h2 = card.querySelector('h2'); if (h2) h2.innerHTML = v.title;
      const note = card.querySelector('.note'); if (note) note.innerHTML = v.note;
    }
    ctx.el.innerHTML =
      `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(300px,1fr));gap:10px;margin-top:10px">` +
      v.items.map(it =>
        `<div style="border:1px solid var(--grid);border-left:3px solid ${it.c || 'var(--magenta)'};border-radius:6px;padding:12px 14px;background:#FDFEFD">
           <div style="font-family:var(--mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--ink2)">${it.k}</div>
           <div style="font-weight:700;font-size:14.5px;margin:5px 0 6px;color:var(--ink)">${it.t}</div>
           <div style="font-size:12.5px;line-height:1.5;color:var(--ink)">${it.body}</div>
           <a href="${it.link.href}" style="display:inline-block;margin-top:8px;font-family:var(--mono);font-size:10.5px;color:var(--magenta);text-decoration:none">${it.link.label} ↓</a>
         </div>`).join('') +
      `</div>`;
  },
});
