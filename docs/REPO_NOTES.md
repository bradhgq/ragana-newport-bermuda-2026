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

## GATE A adjudication (2026-07-07, coordinating chat session)

15. **Verdict PASS; tie-exemption encoded** — `pipeline/rounding.py` TieTracker
    records every .5-tie rounding site at build time (`out/rounding_ties.json`,
    3090 sites on NB2026); `compare_data.py --ties` exempts a diff iff |Δ| ==
    exactly one quantum AND the path is a recorded tie. 39/39 GATE A diffs
    exempt, 0 real, exit 0. Negative test: a one-quantum shift at a non-tie
    site and a ±1 golden change both fail loudly. No global tolerance change,
    no allowlist.
16. **GATE B builds from the pipeline's emitted payload** (not the frozen
    copy) — adjudication #2; platform/env recorded in run_log.json.
17. **finstrip count: 82, not 81.** The adjudication's harness-porting list
    says "finstrip = 81"; the frozen payload has 82 boats with official
    corrected times (the shipped strip renders 81 dots + the hero diamond —
    likely the source of "81"). Goldens assert 82 scored boats, verified
    against the oracle; flagged for GATE B.
18. **REPO_SPEC v1.1 and the 9/9 harness file were not delivered** with the
    adjudication message (only the three acquisition files arrived). Proceeded
    per the adjudication's own fallback: implementation stands, deltas logged;
    the six harness assertions are ported from the adjudication text itself.
    See DOC_GAPS #14.
19. **Name-hygiene assertions extended to every selection surface** (defaults,
    group buttons, module boat lists) — Phase 3 scope, per adjudication #4.

## Phase 2/3 — shell migration + tests

20. **Packaging: classic scripts + registration, not ESM.** RETROSPECTIVE §2
    sketches `export default` for race config and modules; the shell instead
    uses `window.__RACE_CONFIG__` / `registerModule()` / `registerOverlay()`
    with the ABI **object shapes unchanged**. Why: the standalone single-file
    build stays a trivial script concat (ESM inline imports break on file://),
    and the node harness stays dependency-free. The ctx ABI is frozen as
    implemented in `shell/app/core.js` (`makeCtx`).
21. **copy.js is copy.md's machine form.** The retro's "copy.md (structured
    slots)" is implemented as a hand-derived `copy.js` (`window.__COPY__`);
    copy.md stays the human-readable frozen record. Keeping them in sync is a
    per-race authoring step — candidate for a generator later.
22. **Overlay ABI addition: `mapLayer: under|over|top`** — the shipped map's
    draw order (Gulf Stream under boats, watch segments over boats, nav-log
    fixes over event markers) needs three insertion slots; the retro ABI had
    no ordering hint. Additive, optional (default `over`).
23. **Park SOG shading via config, not module shapes.** Retro §1 says the park
    rects "belong to the park module", but the section-module ABI has no
    chart-shape hook; the shading ships as `charts.parkShading` config read by
    the sog chart (renders only when present + distance axis). Revisit if the
    ABI ever grows a bands hook for section modules.
24. **navlog registers twice** (section: recon table; overlay: map pill +
    fixes) — one feature, two ABI surfaces; the ABI supports it naturally.
25. **presentation.js config additions** discovered during the port:
    `groups.{dnfKey,outsideKey,fallbackKey}`, `eventCategories.*.big` (12/14px
    markers), `charts.{dtf,xte,sog}.eventTopY`, `race.ratingLabel`,
    `controls.pills` (pill row order incl. shell pills '@ghosts'/'@rhumb'),
    `layout` (section order incl. module mounts + 'two:' column pairing),
    `course.dtfStartFallback`, `meta.twitterDescription`.
26. **Two stylesheets** (tokens.css + styles.css) replace the single
    styles.css; build.py stamps and inlines both.
27. **Harness invocation**: `node tests/test_dashboard.js <race_dir>
    [regression.json]` against `dist/standalone.html` (embedded data → no
    fetch mocks), not REPO_SPEC's `<built.html> <goldens.json>` positional
    pair. Fixtures live at `races/<race>/tests/regression.json` (prompt wins
    over REPO_SPEC's `tests/goldens/<race>.json`). 11 fixed-count assertions
    across the four I10 categories; the count itself is asserted so a skipped
    block fails loudly. Verified green under both TZ=America/New_York and
    TZ=UTC; the tampered-golden path refuses the build.

## Phase 5 — acquisition tooling

28. **decyb has NO declared license** (verified 2026-07-07 via the GitHub API
    and README — no LICENSE file, no terms, author attribution only). The YB
    binary decoder is a port of decyb's; all-rights-reserved by default. Flag
    lives in acquisition/README.md; before anything public/client-facing,
    obtain terms from the author or cleanroom-reimplement from the byte-layout
    notes. Also DOC_GAPS #16.
29. **fetch_race.py verified live against ildr2025** (YS 50065): satTrackingUrl
    parsed (with its trailing '#'), 3-of-35 coverage warning fired, 5190 ping
    rows byte-consistent with the prior session's download, name-join proposed
    Max/Concise 8 by name and honestly left Boudicca UNMATCHED-YB for review.
    YS vs YB start times disagreed (placeholders vs actual) — recorded in the
    manifest with a cross-check note, vindicating the start_method doc.
30. **Pipeline addition: `official_results.finish_statuses`** (default [FIN])
    so YS's AOK/DNF vocabulary maps without editing pipeline code. NB2026
    behavior unchanged (re-verified: GATE A 39 exempt/0 real, harness 11/11).
31. **Offline decoder fixture**: real 41 KB ildr2025 AllPositions3 blob
    (sha256-pinned) + 5 unittest assertions in CI; discovered and documented
    that the binary stores moments newest-first.

## GATE B adjudication (2026-07-07) — approvals, report-backs, v1.1 reconciliation

28. **GATE B APPROVED**; all three intentional deltas accepted (Zelee toggle
    fix, dual stylesheets, template+copy-slot assembly). The shipped site's
    Zélée failure stays documented as the deliberate red case for the
    name-hygiene fixture. ABI amendment rule adopted from v1.1: additive
    optional fields need only a REPO_NOTES entry (mapLayer accepted under it);
    breaking changes need gate adjudication.

29. **Report-back 4a — the KPI's "fastest in set 22.9 h" matches NO set in the
    frozen payload.** No boat has hrs == 22.9. Candidate sets: full parkFair
    fleet min = Black Jack 100 6.0 h (maxi) / monohull min Boudicca 17.1 h;
    default 12-boat selection min = Carina 24.2 h; quick-select monohull min =
    Palantir 5 24.3 h; closest value anywhere = Cybele 22.8 h (sdl_other, in no
    featured set). The string is shipped verbatim (parity confirmed — same
    literal in legacy app.js buildKPIs), so this is a SHIPPED-COPY artifact,
    not a build regression. Two sibling claims share the pattern: the park
    note's "RAGANA's 27.9 h was second-slowest" (she is THIRD-slowest in the
    default set — Hissy Fit II 29.7, Touch of Grey 28.4 are slower; same text
    also lives in the "Everyone parked" insight event) and "16–38% under 4 kts"
    (default set's actual u4 range: 19–39%). Two sibling claims check out
    exactly: the 5.5 h spread (29.7 − 24.2) and the Carina footnote (27.9 −
    24.2 = 3.7 h quicker). Hypothesis: 22.9 / second-slowest / 16–38% were
    authored against an earlier analysis pass and survived the v5 copy edit.
    PROPOSED (not applied — frozen copy, CP-3 territory): "fastest in set
    22.9 h" → "24.2 h"; "second-slowest" → "third-slowest"; "16–38%" →
    "19–39%". Owner decision.

30. **Report-back 4b — REPO_NOTES #17 closed with arithmetic.** The extracted
    official_results.csv holds 82 FIN rows (ranks 1..82) + 4 DNF rows
    (Temptation Oakcliff JV66, Hydromec, Dancing Bear, Cougar) = 86 SDL
    entries. "46 / 86" ranks RAGANA among the 86 entries; the finish strip's
    "every scored St. David's Lighthouse boat" = the 82 finishers with
    corrected times — all 82 are in the payload and the strip (81 dots + hero
    diamond; the legacy harness's finstripDots comment "scored SDL boats minus
    RAGANA" confirms the 81 reading). No boats are missing and the caption
    does NOT overclaim — "scored" and "entered" simply differ by the 4 DNFs.
    No fix needed.

31. **v0→v1.1 REPO_SPEC diff, reconciled** (v1.1 at docs/REPO_SPEC_v1.1.md;
    DOC_GAPS #14/#1/#2 closed):
    - *Adopted*: legacy retirement set (export_json.py + dashboard_template
      .html + test_dashboard.js → examples/nb2026/legacy/; template/ dir
      removed, SEAMS resolved); races/_template gains presentation.js,
      copy.md, tests/regression.json; ctx ABI text matches makeCtx verbatim;
      zone-detection language matches implementation; ABI amendment rule.
    - *Adopted with adaptation*: "two-config drift, resolved" — v1.1 says
      build.py DERIVES overlapping keys from config.yaml; implemented instead
      as a build-time CONSISTENCY CHECK (client_boat/hero, time, course
      coords/length, goldens ↔ tests/regression.json) that refuses the build
      on divergence. Same guarantee (one source, no silent drift), less
      machinery; presentation.js stays self-contained for the node harness.
    - *Kept, delta logged*: fixtures are hand-frozen in races/<race>/tests/
      regression.json and cross-checked against config goldens, not "emitted
      by build_data.py" (v1.1 Tests §) — emission would let a pipeline bug
      rewrite its own fixtures; prime rule 3 wants them authored-frozen.
      build_data's out/goldens.json remains the emitted view.
    - *Kept, delta logged*: examples/nb2026 keeps frozen/ + gitignored out/
      (v1.1 shows out/dashboard_data.json committed) — REPO_NOTES #2 stands.
    - *Kept*: harness invocation `node tests/test_dashboard.js <race_dir>`
      (REPO_NOTES #27); v1.1's own "three commands" block still shows the
      monolith-era invocation its Tests section retires (DOC_GAPS #18).
    - Legacy harness insights absorbed: its pace tolerance was 0.15 (mine
      0.05, tighter); its park canary was conditional on the boat being
      selected (mine force-selects — strictly stronger); its "initial render
      produced core charts" check is implicit in my endpoint reads.

32. **pipeline/assemble.py** template default now resolves race-relative
    (`legacy/dashboard_template.html`) then repo-relative, since template/ is
    gone; documented as the monolith-era path kept for archaeology and
    single-file injection builds.

33. **decyb license: owner-adjudicated as not blocking** (updated 2026-07-08):
    the repo is now public and the concern is **dropped** — this project is
    personal/non-commercial, so the port ships as-is with author attribution
    (Bernhard R. Fischer). Cross the licensing bridge only if it ever goes
    commercial (terms from the author, or cleanroom-reimplement from
    acquisition/README.md's byte-layout notes, which document the format, not
    decyb's code).

## Phase 4 — routed distance-remaining (course.type: marks)

34. **New geometry, conventions documented in pipeline/route.py** (and
    exercised by tests/test_route.py — the prompt's four tests plus the
    out-and-back collapse regression): (1) stateful monotone leg assignment —
    the active leg never regresses, which is what keeps out-and-back courses
    (ALIR/Block Island shapes) from collapsing onto the reciprocal return leg;
    (2) an APPROACH BLEND inside mark_radius_nm (dtf = distance-to-mark +
    remaining-after-mark); (3) advance on abeam-crossing (along >= leg length)
    or on receding-from-closest-approach with positive next-leg along-track,
    keyed to the minimum distance seen so sparse pings still advance; (4)
    along-track clamped to the leg — lateral excursion shows in XTE, never in
    DTF; (5) XTE re-references the active leg at each rounding (a visible,
    correct step). Config: course.marks (ordered turning marks) +
    course.mark_radius_nm (default 1.0); build_data logs polyline-vs-official
    length delta in the run log.

35. **Found by test, kept as a war story**: the first implementation advanced
    legs on radius-ENTRY; near a corner the next leg's projection wobbles
    around its origin, so an on-line boat's DTF *rose* while closing the mark
    (+0.0008 nm/ping on a 90° dogleg, +0.37 nm/ping on a hairpin — the exact
    course shape of the next two races). The approach blend + past-closest
    advance is the fix; the monotonicity test now pins it. Point-to-point
    races are untouched (GATE A re-verified 0 real diffs after integration).

## CP-3 amendment — park copy (2026-07-07, owner-adjudicated; closes #29)

36. **The three park-copy fixes are APPLIED** per
    `examples/nb2026/decisions/CP-3-amendment-park-copy.yaml` (the repo's first
    real checkpoint record): KPI sub → "fastest shown 24.2 h (Carina)"; park
    note → "19–39%" and "third-slowest". Root cause was MIS-SCOPING: the
    dashboard quoted the published debrief's 18-boat comparison set (no Hissy
    Fit II, no Divide By Zero; includes Cybele 22.9) above the displayed
    default-12 table. The debrief/blog stand untouched — internally consistent
    over their own set, "second-slowest" included. The "Everyone parked"
    insight EVENT keeps the 18-set numbers by design: it cites "the comparison
    set" (correctly scoped) and lives in the payload, which stays frozen
    (GATE A: 0 real / 39 exempt after the change, as required). A copy↔payload
    lint now runs in shell/build.py (`park_copy_lint`): fastest-shown, u4
    range, rank word, and spread must match the payload for the displayed
    selection or the build refuses. The "3.3 kt dead core" claim is pooled
    raw-sample math not derivable from the payload — covered by the CP-3
    record, not the lint.

37. **Historical drift, logged not fixed** (debrief table vs frozen payload,
    both predating this repo; the payload is the oracle for all NEW copy, the
    published debrief stands as its own pass): hours match everywhere except
    Cybele 22.9→22.8; %-under-4 drifted UPWARD 1–2 pts on ten of eighteen
    boats — Cybele 22→24, In Theory 22→23, Banter 25→26, Legacy 29→30, Flying
    Lady 30→32, Speck 33→34, Phoenix USA25329 34→35, Gesture 37→39, RAGANA
    38→39, Touch of Grey 35→36. Systematic (threshold-boundary or grid
    handling between the two historical passes); cause not investigable from
    this repo; no action. Golden Gemini II 31% stable in both.

38. **The deployed live site now trails the repo by four known, fixed
    defects**: the Zélée phantom group-button entry (#11) plus these three
    copy claims (#36). Redeploying is an owner decision, out of scope for this
    build.

## Round 2 (2026-07-08) — Sebastian's upgrades
- #30 Features: VMC channel+toggle, class input + F-TCF band filters, dist-vs-speed
  module; crew-record corrections (electrolyte, Kevin memorial); full SDL class
  splits acquired + reconciled. Harness 11→18 checks. See RETROSPECTIVE_ROUND2.md
  and decisions/R2-sebastian-upgrades.yaml (I14–I18).
- #31 frozen/ re-frozen (404 ledgered diffs); GATE A now guards reproducibility,
  not the round-1 port. Round-1 oracle: git history at 2b6a085.
- #32 OPEN: migrate #finstrip height to section.height (I15); one-command build
  chain wrapper (stale-standalone trap); promote distspeed + schema slots to
  skill docs (RETROSPECTIVE_ROUND2 §6 amendment list).

## Relocation & archives (2026-07-10)

- **Round-1 provenance rescued before decommissioning `~/Downloads/ragana-dashboard`**
  (the last copy): the round-1 retrospective is now `docs/RETROSPECTIVE_ROUND1.md`
  (verbatim; its line refs pin to the archived repo's commit `5df5a19`), and the
  original repo's full git history is `docs/archives/ragana-dashboard.bundle`
  (3.9 MB, `git bundle verify` clean). `~/Downloads/race-viz-starter` needed no
  rescue — its 12 commits are this repo's base history verbatim.
- **`races/nb2026/legacy/` restored** (export_json.py, the pre-shell monolith
  template, the 9-assertion harness) from this repo's own history at `2b6a085`;
  the monorepo restructure (`785536d`) had dropped it. REPO_SPEC v1.1's layout
  and the GATE B adjudication both place these files there; byte-verified
  against the originals.

## No-legacy policy + riders (2026-07-10, owner-directed)

- **Policy: nothing `legacy/` stays on active main** — tag + GitHub release
  zip, then remove; git history retains everything. Executed:
  `nb2026-legacy-final` (tag + release; `races/nb2026/legacy/` removed — note
  it was restored to main only yesterday at 12caf77, and remains available in
  the tag, the release zip, and docs/archives/ragana-dashboard.bundle) and
  `bir2026-monolith-final` (tag + release now; the monolith files leave main
  when the shell build replaces them in place).
- `CLAUDE.md` v0 added (one page, rules in force). `docs/KICKOFF_TEMPLATE.md`
  committed — closes RETROSPECTIVE_ROUND2 §6's "no KICKOFF_TEMPLATE in the
  repo" note. Source: the step-1 handoff copy (~/Downloads/files/), since the
  parity prompt's "attached file" was not re-delivered with the message.

## BIR shell migration — M1 data phase (2026-07-10)

- **pipeline_changes/ folded into the starter pipeline, config-gated and
  default-off** (NB2026 GATE A re-verified IDENTICAL after every edit):
  `course.arrival_search_after_nm` (out-and-back arrival guard, BIR: 20),
  `privacy.build: private|public` (Tier-2 event cut), `groups.by_name`/`by_cls`
  (BIR's class-6 list + PHRF division grouping), `exclude_boats` (Daffodil),
  `official_results.untracked_meta_only: [names]`. The last is an EXPLICIT
  list, not a rule — the generic "inject every untracked finisher" draft
  wrongly swept in MXM, which raced the Plum Island Course; Windfall (same
  course, needed for the PHRF band of 23) is the only listed boat.
  postprocess.py reduced to the genuinely race-specific steps (up1bi, stats
  reframe); pipeline_changes/ removed (preserved at bir2026-monolith-final).
- **Oracle re-frozen under I16**: 171 diffs in five enumerated classes
  (57 vmc / 56 sailedNm / 56 avgKt / Inisharon cls ''→'ORC' / build date),
  zero unexplained; ledger at
  races/bir2026/docs/decisions/M1-shell-migration-data-refreeze.yaml. The
  monolith's 34-test suite passes unchanged against the re-frozen oracle.
- **I14 on a routed course, first exercise**: the integral basis is
  **DTF-at-the-gun (routed polyline, Ragana 187.8 nm)**, NOT the official
  course length (186.0) — Ragana official-window mean VMC 5.024 vs 5.008 kt,
  Δ0.016. I14's "course-length ÷ official elapsed" wording needs this
  clarification when the skill loop next opens (skills/ untouched this run).

## BIR shell migration — M2 chart phase (2026-07-10)

- **BIR2026 now builds through the shell**; the monolith (src/, build.py,
  dashboard_template.html, jsdom test/) left main per the no-legacy policy
  (tag + release bir2026-monolith-final). Full mapping table + fixture
  dispositions: races/bir2026/docs/M2-monolith-mapping.md.
- **Shell gains, all config-gated and default-off** (NB chain re-verified
  green after every change): race.divisionScoped + crossCourse + startAnchor;
  charts.sog.clipPreStart; charts.map.{ghostStyles,hoverCls,fitRange};
  mapAnnotations passthrough; charts.xte.yTitle; dtf yRange optional;
  groups.{chipExtras,chipRank}; division-labelled ref select; empty-category
  event pills skipped (visible NB no-op: all six categories populated).
  react() now no-ops for charts absent from a race's layout.
- **ABI amendment (additive, per the v1.1 rule): overlay `bandAnnotations
  (ctx, mode)`** — act bands carry titles on every band chart. BIR's acts and
  arrows register as pill-less always-on overlays (pill.default true, not in
  controls.pills).
- **distspeed promotion exercised**: BIR lists the shared shell module and
  configures its iso rays/toggle — zero module-code changes across races.
- **Runner is now multi-race**: per-race `expected_checks`, fixture-presence
  guards on the round-2 blocks, `vmc_caption` fixture (kept out of the
  consistency-checked goldens), band-aware finstrip counting, and per-race
  `tests/extra.cjs` extensions (BIR: 15 ported checks). DOM mock: innerHTML
  assignment now clears children (real-DOM semantics; caught by the R9c port).
- **Endpoint goldens restored to monolith-suite precision** (276.07/288.55
  from G1/G2; config had a coarser transcription sitting exactly on the ±0.05
  tolerance edge) — I16 note in the mapping doc.
- Copy: monolith index.html blocks verbatim into copy.js/copy.md; new
  microcopy slots (shell xte caption, VMC caption with the rounding-noise
  note, filter row, more-panel) flagged for the STOP-2 review — no analysis
  claims authored.

- **Production defect (2026-07-10, caught at first BIR shell deploy): new dist
  paths are gitignored.** `git add -A` at M2 committed the modified tracked
  dist files but silently skipped the NEW app/ and race/ directories (the
  global `dist/` ignore; historical dist files were force-added). The live
  page served the new index.html with every script 404ing. Fix: force-added
  the 17 missing files; `build_race.py` now detects ignored-untracked dist
  files and prints the `git add -f` fix; CLAUDE.md carries the rule.

- **Owner (2026-07-15): default states are corrected + VMC.** Both races boot
  `speedMetric: 'vmc'`, `distMode: 'h'` (race chart was already corrected).
  Fixture values stay elapsed-mode — the shared runner now pins explicit state
  before the distspeed check. BIR map: config-gated `charts.map.heightScale`
  (0.75 = the requested ~25% less vertical space; NB untouched at scale 1,
  declared at `:root` in shell styles.css).

- **2026-07-15 multi-agent review round** (owner-directed; 55 raw findings, 49
  adversarially confirmed, all applied). Production bugs: the shared distspeed
  module carried NB2026 narrative verbatim onto the BIR page → captions moved
  to per-race `COPY.distspeed` slots via the additive `ctx.copy` ABI field
  (INVARIANTS.md); BIR More-panel listed all 23 PHRF boats twice (rank/group
  buckets weren't disjoint); the reference dropdown offered PHRF boats whose
  `meta.tcf` is raw sec/mi — corrected milestone math against such a reference
  rendered garbage at 10³–10⁶ min — and cross-course Lucky (refsel now
  excludes crossCourse boats and, in division-scoped races, other divisions;
  CP-0's "PHRF reference, elapsed-only" capability is superseded by this
  guard). Robustness: filter inputs survive async re-renders; ref-revert falls
  back to a tracked boat; tap affordance re-evaluates on breakpoint cross;
  distspeed guards a hero without scored meta; park_copy_lint surfaces node
  failures; cache-bust hash now covers more/fleet payloads; the ignored-dist
  warning catches a fully-untracked dist. Consistency: kts everywhere; KPI
  units in <span class="u"> both races; AXFONT token replaces 14 hand-rolled
  font/color literals; watch-legend gate unified; `STARTER` names the starter
  dir (REPO was two meanings); NB config timestamps use the T…Z idiom; BIR
  fallbackKey matches the pipeline's actual default group; BIR 'acts' naming
  unified; controls hint names the race chart. Tests: NB 18→19, BIR 27→29
  (react layout guard; meta-only names fixture now consumed; finstrip
  never-pooled asserted on RENDERED strips; Crew-pill positive control; every
  band width asserted — ±0.01 golden added from the frozen oracle, same
  derivation as the R-round values). Oracles untouched and IDENTICAL.

## Skill-consolidation round (2026-07-16, branch skill-consolidation)

- **RETROSPECTIVE_ROUND2 §6 amendment table: fully landed.** The R2 loop had
  already applied the SKILL.md rows (doctrine gates 7/8, prime rule 3 + I16)
  and the schemas/stage-2/stage-4 standard-field + VMC material; this round
  closed the remainder: the stage-5 row (one-command chain, stale-standalone
  trap, KICKOFF_TEMPLATE pointer — plus the later-learned new-dist-paths
  `git add -f` rule) and the queued I14 basis correction (integral basis is
  DTF-AT-THE-GUN on the routed DTF, not official length — DOC_GAPS #19,
  first exercised at BIR M1).
- **DOC_GAPS closed in place: #3, #4, #5, #6, #9, #19** (closure notes
  appended; audit trail intact). #4/#6 were the two places a future session
  would have "corrected" shipped artifacts to match wrong documentation.
- **`starter/shell/INVARIANTS.md` now carries I14–I18** (previously only in
  RETROSPECTIVE_ROUND2 §3); the PROMPT.md handoff skeleton cites I1–I18.
- **READMEs made actually authoritative** (#18 follow-through): root and
  starter READMEs now show the one-command chain (`starter/build_race.py`)
  and the shell-based BIR; the pre-shell BIR description and the retired
  three-command flow are gone.
- **stage-4 build protocol rewritten for the shell reality** — the v0
  "no neutral shell exists yet / duplicate-and-edit" note is retired; module
  ABI + I15 geometry + ctx.copy caption slots documented in its place.
- **REPO_NOTES #32: closed** — its three legs all landed across R2→now
  (finstrip height migrated, no `#finstrip` rule remains in shell CSS;
  build_race.py; distspeed/schema promotion into the skill docs).
- Scope discipline: skills/, docs/, READMEs, INVARIANTS.md, and the
  races/_template header only — no pipeline/shell/test code, no oracles, no
  goldens, no analysis numbers. Both chains green before and after the round
  (NB 19/19, BIR 29/29, both oracles IDENTICAL); dist churn reset per the
  committed-dist rule.


- **Skill-consolidation review round (2026-07-16):** 10 confirmed findings
  applied — schemas.md's config block dropped the fixture-only
  `pace_min_per_100` key (and now says where the pace golden actually lives);
  stage-2/INVARIANTS I14 corrected to the real BIR fixture tolerance (±0.06 kt,
  5.02 vs 4.96 basis gap) and to the fixture's real home (tests/regression.json,
  not `goldens.vmc`); stage-2 recon vocabulary aligned to the payload enum
  (`match | warn`); the races/_template header edit was reverted as out of
  branch scope. QUEUED for a races/-scope follow-up: the template header's
  `skill/race-viz` path typo (should be `skills/`) and its stale "+ repo
  additions" clause.

- **Code organization (owner, 2026-07-16): `races/` holds race-specific work
  ONLY.** The race template moved `races/_template/` → `starter/template/`
  (it is engine-generic — generalizable changes belong in starter/); all live
  references updated (READMEs, schemas.md lockstep; historical docs untouched).
  While moving, the template's rot was fixed: `tests/regression.json` now
  declares the MANDATORY `expected_checks` (the runner refuses to run without
  it — copying the old template produced an instantly-failing suite) and
  documents the optional round-2 fixture blocks; `presentation.js` drops the
  shipped-defect `paceMinDone: 50` (the value NB's own comment records as
  blanking the opening milestones), gains the corrected+VMC defaults, and
  cites both worked examples. Also: `starter/pipeline/assemble.py` deleted —
  dead since the no-legacy policy (its default template path pointed at a
  `legacy/` dir that no longer exists; nothing invokes it; git history keeps
  it) — and NB's results file moved to the `raw/results.csv` convention
  (`races/nb2026/official_results.csv` → `raw/`, same bytes, config path
  updated; closes the DOC_GAPS #13 drift).
