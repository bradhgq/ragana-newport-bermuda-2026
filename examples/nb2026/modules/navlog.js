/* Nav-log module — two registrations from one feature:
   - a section (the reconciliation table; static, renders once)
   - an overlay (the 'Nav log' map pill: hand-written fixes + water temps)
   The recon rows' matched_edt key and "True EDT" column label are this race's
   (the log ran an hour slow on UTC−5; see the row notes). */
"use strict";

registerModule({
  id: 'navlog',
  deps: [],   // static — recon rows never change with state
  section: {
    kind: 'table',
    title: 'Nav log vs. tracker — a reconciliation',
    note: 'Each hand-written fix from the nav log matched to the tracker position at that moment, with the log’s own columns restored. Ten usable fixes, nine within 2 nm. Two were exactly an hour off — the nav watch and some instruments were set to UTC−5 instead of the race’s UTC−4 — and one couldn’t be reconciled and was dropped. A small, honest audit of how well the paper record held up.',
  },
  build(ctx) {
    const badge = v => v === 'error' ? '<span class="badge err">dropped</span>' : v === 'warn' ? '<span class="badge warn">+1h corrected</span>' : '<span class="badge ok">match</span>';
    const rows = ctx.D.recon.map(r => `<tr class="${r.verdict === 'error' ? 'bad' : ''}"><td>${r.t}</td><td style="text-align:right">${r.matched_edt}</td>
       <td>${r.log[0].toFixed(3)}, ${r.log[1].toFixed(3)}</td><td>${r.trk[0].toFixed(3)}, ${r.trk[1].toFixed(3)}</td>
       <td style="text-align:right">${r.d}</td><td>${r.speed}</td><td>${r.course}</td><td>${r.wind}</td>
       <td>${r.temp != null ? r.temp + '°F' : '—'}</td><td>${badge(r.verdict)}</td><td style="white-space:normal;min-width:280px">${r.note || ''}</td></tr>`).join('');
    ctx.el.innerHTML =
      `<table><thead><tr><th scope="col">Log time</th><th scope="col">True EDT</th><th scope="col">Log position</th><th scope="col">Tracker position</th><th scope="col">Δ nm</th><th scope="col">Speed</th><th scope="col">Course</th><th scope="col">Wind</th><th scope="col">Water</th><th scope="col">Verdict</th><th scope="col">Note</th></tr></thead><tbody>${rows}</tbody></table>`
      + `<div class="note swipehint">Swipe the table sideways for the rest of the columns.</div>`;
  },
});

registerOverlay({
  id: 'navlog',
  mapLayer: 'top',   // fixes render above boat tracks and event markers
  pill: { label: 'Nav log', color: '#C0392B', default: true },
  mapTraces(ctx) {
    const { D, h } = ctx;
    return [{ x: D.recon.map(r => r.log[1]), y: D.recon.map(r => r.log[0]), mode: 'markers+text',
      marker: { symbol: 'cross-thin', size: 10, color: '#C0392B', line: { width: 1.4, color: '#C0392B' } },
      text: D.recon.map(r => r.temp ? r.temp + '°' : ''), textposition: 'middle right', textfont: { size: 10, color: '#C0392B', family: 'SF Mono, Menlo, monospace' },
      name: 'Nav log + water temp', hovertext: D.recon.map(r => h.wrapText(`Log ${r.t} (true ${r.matched_edt}) · ${r.log[0]}, ${r.log[1]}${r.temp ? ' · ' + r.temp + '°F' : ''} — ${r.d} nm from tracker`)), hoverinfo: 'text' }];
  },
});
