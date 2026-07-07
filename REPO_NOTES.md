# REPO_NOTES — spec deltas and adaptation decisions

Running log of every place this build adapted REPO_SPEC / RETROSPECTIVE rather
than following them literally (ground rule 1: adapt and log, never silently).
Companion file: `DOC_GAPS.md` (where the docs were wrong/ambiguous); this file
records what I *did* about it.

## Phase 1 — pipeline generalization

1. **`races/nb2026` is a symlink to `examples/nb2026`.** REPO_SPEC's layout has
   race workdirs under `races/<race>/` but places the worked example under
   `examples/nb2026/`; the build prompt invokes `build_data.py races/nb2026/…`.
   One directory, two paths — no duplicated config.

2. **Frozen reference lives at `examples/nb2026/frozen/`, rebuilds at `out/`.**
   REPO_SPEC puts the example's outputs at `examples/nb2026/out/`; but `out/`
   is where the pipeline writes, and the frozen original must stay read-only.
   `frozen/dashboard_data.json` is the byte-exact copy of the shipped payload;
   `out/` is gitignored build product.

3. **Zone bounds: authored, not detected** (`zone_detection.zone` in config).
   REPO_SPEC says the NB2026 park band "becomes an output… not an input
   constant", but the stage-2 §6 threshold algorithm provably cannot emit
   180→80 on this data: fleet-median SOG in band 180–190 nm (5.93 kts) is
   *lower* than in band 80–90 nm (6.15 kts), so no `collapse_frac` includes
   both zone edges while excluding the neighbors (full band table in
   `out/run_log.json`). RETROSPECTIVE §5.3 explicitly classes park bounds as an
   authored analysis framing, and REPO_SPEC's own header says the retro wins on
   conflicts. Resolution: `zones.py` implements spec detection and always logs
   its candidates + band medians; the shipped bounds are recorded per-race
   config (a CP-2 judgment), and `goldens.json` carries `zone_source:
   authored|detected`. With schema-default thresholds, detection finds zero
   qualifying candidates on NB2026 (the only sub-threshold run, band 140–150,
   is ~3 h traversal vs `min_traversal_hours: 6`).

4. **`official_results.csv` columns extended** beyond the REPO_SPEC map with
   `class_rank`, `status`, `retire_reason`. The spec's column list had no way
   to carry DNF rows (4 in NB2026, with authored retirement reasons) or the
   official within-class order (drives `meta.clsPos`).

5. **`events.yaml` is a mapping, not a bare list**: `{events: […], watches:
   […]}`. schemas.md shows only an event list; the worked example also ships
   11 watch spans, which are narrative-layer data with the same
   naive-local-string convention.

6. **Recon output key is config-driven** (`reconcile.matched_key`). The frozen
   payload (and app.js) use `matched_edt`; schemas.md says `matched_local`.
   Parity wins for NB2026; the template default is `matched_local`.

7. **`extra_boats` config addition.** BLACK JACK 100 and OC 86 are tracked but
   outside the scored division — they exist in no results file, so they need a
   config home (track name, display, type, group).

8. **Display normalization applied uniformly.** Legacy applied
   `re.sub(r'\s+',' ')` to finisher display names but not DNF names; the
   pipeline normalizes all (identical output on NB2026 data).

9. **`output.generated` pin.** The payload's `meta.generated` date is pinned in
   the example config ('2026-07-05') so the frozen build reproduces exactly;
   omitted for new races (defaults to build date).

10. **Environment pins + platform float caveat** (`requirements.txt`: pandas
    2.2.3 / numpy 1.26.4). Three env combos (pandas 3.0.3, 2.3.3, 2.2.3) all
    reproduce the frozen payload except **39 of ~2.96 M** lat/lon grid samples,
    every one an exact half-boundary rounding flip (interpolation weight 0.5,
    true value exactly `X.XXXX5`) — 1-ulp platform differences (frozen build:
    Linux x86-64 container) decide which side `round(…, 4)` lands on. Both
    encodings are within half an encoding quantum (~5 m) of the true position.
    See `GATE_A_REPORT.md`. Related: epoch seconds are now computed
    resolution-independently and the yb adapter pins `datetime64[ns]` (pandas
    ≥ 3.0 defaults epoch-seconds to `[s]`, which visibly changes interpolation
    rounding).

11. **Shipped-site defect found during extraction**: `app.js:259` group button
    "Neighbors" lists `'Zélée'` but the data key is `'Zelee'` — the button
    toggles a phantom entry no chart can render. Corrected to `'Zelee'` in
    `presentation.js` (comment at site); becomes a Phase-3 assertion
    (selection-set names ⊆ data keys, stage-2 §9) and is flagged for review at
    GATE B, since it is a deliberate behavior *fix* relative to the shipped site.

12. **Legacy line-ref drift** (prompt/REPO_SPEC vs checkout at `611faf7`):
    events+watches live at `export_json.py:239–302` (cited 239–297); the
    results table at `:27–116` (cited 26–124); parkFair at `:351–370` (cited
    351–361). Adapted by content, not line number.

13. **`time.tz_probe.track_epoch_utc` computed** (1782244492 = 2026-06-23
    19:54:52 UTC): the schema requires it but no provided document recorded it.
    Derived from the official finish 15:54:52 EDT; consistent with the shipped
    title block ("verified against the tracker on the line at 19:55 UTC").

14. **Milestone corrected values route through `scoring.corrected()`** rather
    than a literal `× tcf` — same numbers for `tot` (probe-verified), but the
    milestone series now respects the configured scoring system.
