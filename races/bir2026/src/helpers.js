/* Pure, timezone-safe helpers for the BIR 2026 dashboard. Loaded as a classic
   script in the browser (globals) and require()'d by the node regression tests —
   keep this file dependency-free and free of any reference to page state.

   Timezone rule (hard-won, INVARIANT): every chart x-value is a timezone-NAIVE
   string in EDT (UTC−4), built with UTC getters only against an epoch pre-shifted
   by −4h, so a browser in any zone renders identically. Never hand a JS Date to a
   Plotly axis. G4 (edtStr(1779602689) === '2026-05-24 02:04') locks this down.

   Note vs the Newport Bermuda build: BIR elapsed/corrected times are sub-48h and
   formatted 'HH:MM:SS' (hours may exceed 24, no 'Nd ' day prefix), so this build
   uses parseHMS, not parseDur. */
"use strict";

const pad = n => String(n).padStart(2, '0');

/* epoch-UTC seconds -> naive 'YYYY-MM-DD HH:MM' in EDT */
function edtStr(ts) {
  const d = new Date((ts - 4 * 3600) * 1000);
  return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) +
    ' ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes());
}

/* epoch-UTC seconds -> 'Sat 20:35' in EDT */
function fmt(ts) {
  const d = new Date((ts - 4 * 3600) * 1000), days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[d.getUTCDay()] + ' ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes());
}

/* 'HH:MM:SS' (e.g. '37:29:49') -> seconds */
function parseHMS(s) {
  const p = s.split(':').map(Number);
  return p[0] * 3600 + p[1] * 60 + p[2];
}

/* naive-EDT 'YYYY-MM-DD HH:MM:SS' -> epoch-UTC seconds (fixed −4 offset) */
function parseLocal(s) { return Date.parse(s.replace(' ', 'T') + '-04:00') / 1000; }

/* interpolated epoch time at which a boat's DTF first reaches milestone m */
function hitTime(b, m) {
  const { t, dtf } = b;
  for (let i = 0; i < dtf.length; i++) {
    if (dtf[i] <= m) {
      if (i === 0) return t[0];
      const f = (dtf[i - 1] - m) / (dtf[i - 1] - dtf[i] + 1e-9);
      return t[i - 1] + f * (t[i] - t[i - 1]);
    }
  }
  return null;
}

/* official start epoch: finish time minus official elapsed (exact, from results) */
function startOf(b) {
  const m = b.meta;
  if (!m.el || !m.fin) return b.t[0];
  return parseLocal(m.fin) - parseHMS(m.el);
}

function wrapText(str, width = 62) {
  const words = str.split(' ');
  let line = '', out = [];
  for (const w of words) {
    if ((line + ' ' + w).trim().length > width) { out.push(line.trim()); line = w; }
    else line += ' ' + w;
  }
  if (line.trim()) out.push(line.trim());
  return out.join('<br>');
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { pad, edtStr, fmt, parseHMS, parseLocal, hitTime, startOf, wrapText };
}
