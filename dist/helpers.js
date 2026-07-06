/* Pure, timezone-safe helpers. Loaded as a classic script in the browser and
   require()'d by the node regression tests — keep this file dependency-free
   and free of any reference to page state.

   Timezone rule (hard-won): all chart x-values are timezone-NAIVE strings in
   EDT (UTC−4), built with UTC getters only, so a browser in any zone renders
   identically. Never hand a JS Date to a Plotly axis. */
"use strict";

const pad = n => String(n).padStart(2, '0');

/* epoch-UTC seconds -> naive 'YYYY-MM-DD HH:MM' in EDT */
function edtStr(ts) {
  const d = new Date((ts - 4 * 3600) * 1000);
  return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) +
    ' ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes());
}

/* epoch-UTC seconds -> 'Sat 17:21' in EDT */
function fmt(ts) {
  const d = new Date((ts - 4 * 3600) * 1000), days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[d.getUTCDay()] + ' ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes());
}

/* '4d 01:34:52' -> seconds */
function parseDur(s) {
  const [d, hms] = s.split('d ');
  const [h, m, sec] = hms.trim().split(':').map(Number);
  return (+d) * 86400 + h * 3600 + m * 60 + sec;
}

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
  if (!m.el) return b.t[0];
  return Date.parse(m.fin.replace(' ', 'T') + '-04:00') / 1000 - parseDur(m.el);
}

function wrapText(str, width = 48) {
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
  module.exports = { pad, edtStr, fmt, parseDur, hitTime, startOf, wrapText };
}
