/* Pure, timezone-safe helpers. Loaded as a classic script in the browser and
   require()'d by the node regression harness — keep this file dependency-free
   and free of any reference to page state or config.

   Timezone rule (I1, hard-won): all chart x-values are timezone-NAIVE strings
   in the race's official zone, built with UTC getters only after applying the
   race's FIXED utcOffset, so a browser in any zone renders identically. Never
   hand a JS Date to a Plotly axis.

   Phase-2 change vs the worked example: the UTC−4 literal became the
   `off` parameter (hours, e.g. -4). The shell binds these once per page via
   the race config; the node harness binds them per-fixture. */
"use strict";

const pad = n => String(n).padStart(2, '0');

/* epoch-UTC seconds -> naive 'YYYY-MM-DD HH:MM' in the offset's local time */
function tzStr(ts, off) {
  const d = new Date((ts + off * 3600) * 1000);
  return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()) +
    ' ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes());
}

/* epoch-UTC seconds -> 'Sat 17:21' in the offset's local time */
function fmt(ts, off) {
  const d = new Date((ts + off * 3600) * 1000), days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return days[d.getUTCDay()] + ' ' + pad(d.getUTCHours()) + ':' + pad(d.getUTCMinutes());
}

/* -4 -> '-04:00' (for Date.parse of naive local strings) */
function offStr(off) {
  const a = Math.abs(off);
  return (off < 0 ? '-' : '+') + pad(Math.floor(a)) + ':' + pad(Math.round((a % 1) * 60));
}

/* '4d 01:34:52' or '01:34:52' -> seconds */
function parseDur(s) {
  const parts = s.split('d ');
  const d = parts.length === 2 ? +parts[0] : 0;
  const [h, m, sec] = parts[parts.length - 1].trim().split(':').map(Number);
  return d * 86400 + h * 3600 + m * 60 + sec;
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
function startOf(b, off) {
  const m = b.meta;
  if (!m.el) return b.t[0];
  return Date.parse(m.fin.replace(' ', 'T') + offStr(off)) / 1000 - parseDur(m.el);
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
  module.exports = { pad, tzStr, fmt, offStr, parseDur, hitTime, startOf, wrapText };
}
