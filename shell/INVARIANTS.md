## 4. Invariants to protect (each one was earned)

- **I1 — Timezone-naive rendering.** All chart x-values are naive `'YYYY-MM-DD HH:MM'`
  strings built with UTC getters after applying the race's fixed offset
  (`helpers.js:13-24`). Never pass a JS `Date` to a Plotly axis; a previous build
  double-shifted in US-Eastern browsers. Guarded by
  `TZ=America/New_York` + `edtStr(1782094500) === '2026-06-21 22:15'`
  (`test/regression.test.cjs:11-15`).
- **I2 — Exact official endpoints.** The won/lost chart's final point per boat comes
  from official `meta.corr`/`meta.el`, not the last tracker milestone
  (`app.js:468-470`). Guard: RAGANA vs Christopher Dragon **+94.0 min corrected /
  +155.3 min elapsed**, signs positive (`test:17-24`). A previous build truncated at
  DTF 20 and flipped three boats' signs.
- **I3 — Park is own-traversal, not wall-clock** (`export_json.py:351-368`).
  Guard: **Gemini II u4 = 31%** (`test:26-28`); she reads 0% under the wall-clock bug.
- **I4 — Name hygiene.** Whitespace-normalize tracker names (`export_json.py:118`);
  disambiguate duplicates with sail numbers (two Phoenixes). Guard: `test:30-36`.
- **I5 — State model.** One `S` object; pure `build*()` functions; `Plotly.react`
  only (via the `react()` wrapper); traces keyed by display name; every renderable
  registered in `BUILDERS` and reachable from a `SCOPES` entry (`app.js:141-153`) —
  a chart not in `SCOPES` silently never updates.
- **I6 — Touch scroll contract.** On `narrow()`, every chart gets `dragmode:false` +
  `fixedrange` on all axes via `react()` (`app.js:87-94`). New charts inherit it by
  going through `react()`; a module calling `Plotly.react` directly breaks the phone.
- **I7 — Defaults ⊆ core payload.** Every boat in `defaults.boats` (and the default
  reference) must ship in `core.json` (`build.py:63-70` puts quick-group tracks in
  core). Violation found in code review: Carina was a default but lazy — charts
  silently missing a line until "+ More" was opened.
- **I8 — Palette depends on key order.** `boatColor` assignment walks
  `Object.keys(D.boats)` insertion order (`app.js:621-626`); `build.py` must keep
  the source JSON's boat order in all payloads or colors shift between builds.
- **I9 — Build markers are contracts.** `?v=__V__` stamping and the
  `<!-- DATA:FETCH … /DATA:FETCH -->` block (`index.html:20-27` ↔ `build.py:91-103`)
  are matched by exact string/regex, asserted at build. Rename in both places or not at all.
- **I10 — Tests gate the build.** `build.py:27-35` refuses to produce `dist/` on red
  tests. Per-race fixtures move to `tests/regression.json`, but the *categories* are
  fixed: one timezone check, one exact-endpoint check, one derived-metric check,
  one name-hygiene check.
- **I11 — Hidden-tab rendering.** rAF never fires in hidden tabs; the scheduler falls
  back to `setTimeout` (`app.js:155-161`). Background-tab loads render nothing without it.
- **I12 — Relative URLs only.** The site is served from a subpath
  (`hgq.fyi/ragana-newport-bermuda-2026/`); every asset/data reference is relative
  (`index.html`, `app.js:25`). One leading slash breaks hosting.
- **I13 — Ref-switch staleness.** Switching the race-chart reference to a lazy boat
  must render only after `ensureTracks` resolves *and* re-check the selection is
  still current (`app.js:284-289`, race guard at `:443-444`).

---

