/* Lessons panel (round 3 — the tier-1 opinion layer): the race's logged
   lessons, grouped as a next-race checklist. Every item was logged in the
   moment and lives in the race log (events.yaml) — each cites its log
   timestamp. This module is pure presentation over COPY.lessons; it authors
   nothing (copy discipline). */
"use strict";

registerModule({
  id: 'lessons',
  deps: [],   // static — authored copy, renders once at boot
  section: {
    kind: 'html',
    title: '',   // set from COPY.lessons.title at build
    note: '',
  },
  build(ctx) {
    const L = ctx.copy && ctx.copy.lessons;
    if (!ctx.el || !L) return;
    const card = typeof ctx.el.closest === 'function' ? ctx.el.closest('.card') : null;
    if (card) {
      const h2 = card.querySelector('h2'); if (h2) h2.innerHTML = L.title;
      const note = card.querySelector('.note'); if (note) note.innerHTML = L.note;
    }
    // Sebastian's five, as jump links to their paired charts (below this card)
    const five = !L.fiveUp ? '' :
      `<ol style="margin:12px 0 2px;padding-left:22px;display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:4px 24px">` +
      L.fiveUp.map(f =>
        `<li style="font-size:13px;line-height:1.55"><a href="${f.href}" style="color:var(--ink);text-decoration:none;font-weight:600">${f.txt}</a>
           <a href="${f.href}" style="font-family:var(--mono);font-size:10px;color:var(--magenta);text-decoration:none;white-space:nowrap"> chart ↓</a></li>`).join('') +
      `</ol><div style="border-bottom:1px solid var(--grid);margin:12px 0 2px"></div>`;
    ctx.el.innerHTML = five +
      `<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px;margin-top:10px">` +
      L.groups.map(g =>
        `<div>
           <div style="font-family:var(--mono);font-size:10.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--ink);border-bottom:1px solid var(--grid);padding-bottom:5px;margin-bottom:8px">${g.head}</div>
           ${g.items.map(it =>
             `<div style="font-size:12.5px;line-height:1.5;margin-bottom:8px;color:var(--ink)">${it.txt}
                <span style="font-family:var(--mono);font-size:9.5px;color:var(--ink2);white-space:nowrap"> · log ${it.cite}</span>
              </div>`).join('')}
         </div>`).join('') +
      `</div>`;
  },
});
