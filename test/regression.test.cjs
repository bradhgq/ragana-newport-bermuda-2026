/* Regression tests for the three hard-won correctness facts in PROMPT.md.
   Run:  TZ=America/New_York node --test test/
   (build.py runs these before producing dist/) */
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const H = require(path.join(__dirname, '..', 'src', 'helpers.js'));
const D = require(path.join(__dirname, '..', 'dashboard_data.json'));

test('timezone safety: edtStr builds naive EDT strings under a US-Eastern TZ', () => {
  assert.equal(process.env.TZ, 'America/New_York',
    'run with TZ=America/New_York — the point is to catch double-shifting in Eastern browsers');
  assert.equal(H.edtStr(1782094500), '2026-06-21 22:15');
});

test('exact endpoints: RAGANA vs Christopher Dragon from official results', () => {
  const rag = D.boats['RAGANA'].meta, cd = D.boats['Christopher Dragon'].meta;
  const corrMin = (H.parseDur(rag.corr) - H.parseDur(cd.corr)) / 60;
  const elMin = (H.parseDur(rag.el) - H.parseDur(cd.el)) / 60;
  assert.ok(Math.abs(corrMin - 94.0) < 0.05, `corrected endpoint ${corrMin.toFixed(1)} ≠ +94.0`);
  assert.ok(Math.abs(elMin - 155.3) < 0.05, `elapsed endpoint ${elMin.toFixed(1)} ≠ +155.3`);
  assert.ok(corrMin > 0 && elMin > 0, 'endpoint signs flipped');
});

test('park metric: Gemini II = 31% under 4 kts (own-traversal, not wall-clock)', () => {
  assert.equal(D.parkFair['Gemini II'].u4, 31);
});

test('names: both Phoenixes present, Hissy Fit II whitespace-normalized', () => {
  assert.ok(D.boats['Phoenix USA25329'], 'Phoenix USA25329 (J/120) missing');
  assert.ok(D.boats['Phoenix USA93063'], 'Phoenix USA93063 (First 40.7) missing');
  assert.ok(D.boats['Hissy Fit II'], 'Hissy Fit II (single-space) missing');
  assert.ok(!D.boats['Hissy  Fit II'], 'double-space Hissy Fit II leaked through');
});

test('helpers: parseDur and startOf round-trip an official result', () => {
  assert.equal(H.parseDur('4d 01:34:52'), 4 * 86400 + 1 * 3600 + 34 * 60 + 52);
  const rag = D.boats['RAGANA'];
  const start = H.startOf(rag);
  // RAGANA's class started 14:00–14:30 EDT on Fri 19 Jun; sanity-check the window
  assert.equal(H.edtStr(start).slice(0, 10), '2026-06-19');
  const hm = H.edtStr(start).slice(11);
  assert.ok(hm >= '13:40' && hm <= '14:30', `start ${hm} outside the start sequence`);
});
