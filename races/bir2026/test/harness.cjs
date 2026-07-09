/* jsdom test harness for the BIR 2026 dashboard.

   Loads the real src/index.html into jsdom, injects helpers.js + app.js, stubs
   Plotly with a capturing shim, feeds the FROZEN oracle payload, and drives the
   app's own render functions. Tests then assert on the captured Plotly figure
   specs (traces / layout / shapes / annotations) and on the resulting DOM — the
   same figures a browser would draw, without needing a real layout engine.

   Plotly is stubbed, so pixel geometry (a computed 360px height, a 1048px note
   width) is verified by its DRIVER instead: the CSS rule or the layout field
   that produces it. Those live in css() / html() helpers below. */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { JSDOM } = require('jsdom');

const DIR = path.join(__dirname, '..');
const SRC = path.join(DIR, 'src');

const read = p => fs.readFileSync(p, 'utf8');
const FROZEN = () => JSON.parse(read(path.join(DIR, 'frozen', 'dashboard_data.json')));

function loadDashboard(opts = {}) {
  const dom = new JSDOM(read(path.join(SRC, 'index.html')),
    { runScripts: 'outside-only', pretendToBeVisual: true });
  const { window } = dom;
  window.__NO_AUTOBOOT__ = true;
  window.matchMedia = q => ({ matches: !!opts.narrow, media: q, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} });
  window.requestAnimationFrame = fn => { fn(); return 1; };   // flush synchronously
  window.cancelAnimationFrame = () => {};

  const CAP = {};
  const capture = (id, traces, layout) => { CAP[id] = { traces, layout }; };
  window.Plotly = { react: capture, newPlot: capture, purge() {} };

  const ctx = dom.getInternalVMContext();
  vm.runInContext(read(path.join(SRC, 'helpers.js')), ctx, { filename: 'helpers.js' });
  vm.runInContext(read(path.join(SRC, 'app.js')), ctx, { filename: 'app.js' });

  const APP = window.__APP__;
  APP.initData(opts.data || FROZEN());
  APP.chartsOK = true;
  if (opts.select) APP.S.boats = new Set(opts.select);
  if (opts.state) Object.assign(APP.S, opts.state);
  APP.render('all');
  return { window, document: window.document, dom, CAP, APP };
}

const css = () => read(path.join(SRC, 'styles.css'));
const indexHtml = () => read(path.join(SRC, 'index.html'));

module.exports = { loadDashboard, FROZEN, css, indexHtml, DIR };
