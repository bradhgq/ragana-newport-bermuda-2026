# RETROSPECTIVE — Round 2 (Sebastian's upgrades + record corrections)

Audience: the /race-viz skill-maintenance session. This round was the first
*feature* round on top of the round-1 shell refactor — the first real test of
whether the module ABI, the config split, and invariants I1–I13 actually make
change cheap. Verdict up front: **they mostly do.** Three features, two record
corrections, one class-splits acquisition, seven new harness checks, one shell
seam repaired — one working day, all gates green (18/18 under
`TZ=America/New_York` and `TZ=UTC`; GATE A identical after a ledgered
re-freeze). Commits `6aafd58..6af306e` in race-viz-starter.

---

## 1. What shipped, classified

| Item | Landed in | Classification | Surgery? |
|---|---|---|---|
| `vmc` channel (centered diff of gridded DTF, ~30-min window, negatives real) | `pipeline/build_data.py` boats loop | **pipeline, standard-schema candidate** | None — 12 lines inside the existing per-boat loop; payload split/embed carried the new array everywhere with zero build changes |
| `meta.sailedNm` / `meta.avgKt` per scored boat | same loop | **pipeline, standard-schema candidate** | None — the hero-only `stats.dist_sailed` math already existed; it moved into the loop and now runs per boat on the same raw-ping basis (RAGANA cross-checks 687.6 exactly) |
| Full SDL class splits (`cls`/`clsPos` for all 86) | `official_results.csv` + web acquisition | **per-race data work** | None in code — `read_results`/`entries` already carried the columns; the work was acquisition + reconciliation (see §5a) |
| SOG \| VMC toggle | `shell/app/charts/sog.js` + `charts.sog.metrics` config + `sections.sog.noteVmc` copy slot | **shell chart, config-gated** | Minor: `bindMode` grew an optional scope arg; `SCOPES.speed` added; build.py's sog-card emitter now renders the two buttons when configured |
| Class input + F-TCF band filters | `shell/app/core.js` controls + `classFilter`/`ratingBands` config | **shell controls, config-gated** | The one genuinely new shell subsystem (~90 lines): filter state (`S.clsSel`, `S.band`, `S.filterSel`), intersection composition, More-panel highlight. Races without the config keys render nothing new |
| Distance-vs-speed scatter | `examples/nb2026/modules/distspeed.js` | **module — promotion candidate** | **Zero ABI changes.** The frozen ctx (D, S, cfg, h, render) was sufficient: selection colors, reference highlight, hero accent, BASE/GAX tokens, I6 touch behavior all came free |
| Seasickness + Kevin corrections | `events.yaml` / `navlog.yaml` | **authored data** | None — exactly what the narrative-as-data design was for; pipeline re-run propagated them everywhere including the standalone |
| Sailed-distance x-axis | — | **DEFERRED** | Recorded in `decisions/R2-sebastian-upgrades.yaml`: sailed ≈ DTF for this race (ratio ~1.01 on the beat, ~1.08 whole-race); VMC + the scatter answer the underlying question at a fraction of the cost. Revisit only if Sebastian still wants it after using these |

## 2. Effort map — what the refactor bought, what fought back

**Made easy (round-1 investments that paid):**
- *Payload plumbing is free.* New per-boat fields (`vmc`, `sailedNm`, `avgKt`,
  `cls`) flowed pipeline → split payloads → lazy `more.json` → standalone embed
  → harness with **zero** changes to `shell/build.py`'s data path, because the
  split copies boat dicts wholesale (I8's insertion-order rule incidentally
  guarantees this).
- *The module ABI held at zero changes for a brand-new chart.* `distspeed.js`
  is 80 lines, none of them plumbing. `registerModule` + `deps:['boats','race']`
  bought scoped re-rendering, tap-to-inspect, and mobile fixed-range behavior
  without the module knowing those systems exist.
- *The harness absorbed seven new checks in one sitting* because `evalIn`
  reaches top-level functions (`toggleClassFilter`, `setBand`, `filterTargets`)
  directly — no DOM simulation needed for logic tests. The fixed-count rule
  (`EXPECTED`) caught my own miscount immediately, exactly as designed.
- *Authored-data corrections are one-file edits.* Both crew corrections were
  YAML text changes; `verdict` being authored (never computed) meant the Kevin
  row's badge needed nothing.
- *`consistency_check` extended in one line* to freeze the new goldens in both
  config.yaml and regression.json.

**Fought back (calibrate REPO_SPEC v2):**
- **Module plot heights lived in shell CSS by id** (`#finstrip{height:…}`) —
  the new module rendered as a zero-height strip until found by screenshot.
  Fixed properly: modules now declare `section.height`; the shell applies it
  at scaffold time. `#finstrip`'s CSS rule still exists (migrate in v2). → I15.
- **Stale-artifact ordering bit twice.** The harness reads
  `dist/standalone.html`, which embeds `out/dashboard_data.json` — edit
  events.yaml, forget `build_data.py`, and the corrections test fails
  mysteriously; build dist *before* running tests on new features and the gate
  tests the previous build. The build chain (`build_data → shell/build
  [tests-first] → tests`) needs a one-command wrapper that runs the whole chain
  in order. → REPO_SPEC v2 open item.
- **Cross-realm `assert.deepEqual`** fails on vm-context arrays (different
  Array prototypes). Compare primitives element-wise in the harness. Cost: one
  confusing failure where the printed values were identical.
- **GATE A's dual role surfaced.** As a port-parity oracle it must fail on
  intentional evolution; as a CI reproducibility gate it must pass. Resolution
  shipped: intentional payload changes re-freeze `frozen/` **with a
  `decisions/` ledger entry accounting for every diff class** (this round: 404
  diffs, all enumerated, zero unexplained). The round-1 oracle stays
  retrievable in git history. → I16.
- **The compose-fixture trap:** my first intersection test composed class 3
  with the ±0.02 band still active (got 8, fixture said 6-for-±0.01). Filter
  tests must assert *which* filters are active at each step — encoded in the
  final test's sequence.

## 3. New invariants (I14+)

- **I14 — VMC integrates back to the course.** The `vmc` channel is the
  derivative of distance-remaining; its time-mean over the OFFICIAL race window
  must equal course-length ÷ official elapsed (RAGANA: 6.51 kt ± 0.05).
  Guarded in the harness. Negatives are real and must not be clamped (35 boats
  have them). Corollary: VMC is only as correct as the DTF function — for
  marks courses (ALIR, Block Island) routed DTF (`pipeline/route.py`) is a
  **prerequisite**, or VMC will read "negative progress" on every hairpin leg.
- **I15 — Modules own their geometry.** A `kind:plot` module declares
  `section.height`; nothing about a module may require editing shell CSS.
  (Found by a zero-height chart; the shell now applies the declared height at
  scaffold fill.)
- **I16 — The frozen oracle only moves with a ledger.** Any re-freeze of
  `frozen/dashboard_data.json` requires a `decisions/` entry enumerating every
  diff class against the previous oracle and citing the recorded instruction.
  GATE A thereafter guards reproducibility, not history.
- **I17 — Filters never eat manual selections.** Set-selection filters track
  their own additions (`S.filterSel`) and may remove only those; default- and
  hand-selected boats survive any filter toggle. Guarded by the
  `default_overlap` fixture (5 SDL-3 boats are in the default set and must
  survive class-off).
- **I18 — Course-referenced speed is VMC, never VMG.** Tracker data carries no
  wind; any label or copy claiming VMG is wrong and the harness rejects it.
  (Terminology is load-bearing with a sailing audience.)

## 4. Generalization notes (for the standard schema / chart set)

- **Promote to standard schema** (`skill/race-viz/references/schemas.md`):
  per-boat `vmc` array; `meta.sailedNm`, `meta.avgKt`, `meta.cls`,
  `meta.clsPos`. All five are cheap at build time and two rounds of
  stakeholder questions have now wanted them.
- **Promote the dist-vs-speed scatter to the standard chart set.** It is the
  doctrine chart (minimum distance at maximum speed), needs only the new meta
  fields, and its module is race-agnostic except the caption — ship it in the
  shell's chart library with the caption as a copy slot, the way sog/xte work.
- **Config schema needs a divisions slot.** Class/division structure varies by
  race and scoring system (SDL 1–8 here; PHRF A/B/C elsewhere; one-design has
  none). Proposed: `divisions: { prefix: 'SDL', source: results|scratch,
  filter_ui: true }` — presence of the block drives the class-input control;
  `ratingBands` similarly (`{ widths: [...] }`, hero-centered; absent for
  one-design). Both already read from config; this is schema documentation.
- **VMC's routed-DTF dependency** (see I14): sequence the ALIR/Block Island
  work so route.py lands before any VMC promise there.

## 5. Two process observations to encode in the skill

**(a) Test the stakeholder's hypothesis before building their view.**
Sebastian asked for views to show the Sunday gain came from sailing shorter.
Ten minutes against the tracker showed sailed/DTF-progress at 1.00–1.01 for
the whole cohort — a lifted fetch; the gain was boatspeed (7.6 vs 6.2 kt on
the rating twin over the same 11 hours). The result *reversed* the expected
story, and the shipped captions carry the verdict.
Proposed SKILL.md language (Doctrine gates): *"When a stakeholder requests a
view to demonstrate X, test X against the data before speccing the view. Ship
the view with the verdict in its caption, whichever way it lands — a view
built to confirm a wrong hypothesis is a printed error."*

**(b) Translate the feature request into the analytical question, then buy
the cheapest sufficient view.** The literal ask (sailed-distance x-axis) was
near-degenerate with the existing DTF axis for this race; the underlying
question — "separate speed from geometry" — was fully served by a y-metric
toggle plus one scatter, at a fraction of the cost. The literal feature was
deferred *with recorded rationale* so the decision survives the session.
Proposed SKILL.md language (stage-4): *"Restate every visualization request as
the question it answers. If a cheaper existing surface answers it, ship that
and record the deferral + rationale in decisions/ — deferred-with-reason keeps
stakeholder trust; silently dropped requests don't."*

## 6. Concrete amendment list

| Doc | Section | Amendment |
|---|---|---|
| `skill/race-viz/SKILL.md` | Doctrine gates | Add the two rules from §5 (hypothesis-first; cheapest-sufficient-view) |
| `skill/race-viz/SKILL.md` | Prime rules | Extend prime rule 3 with I16: goldens *and the frozen oracle* move only with a decisions/ ledger entry |
| `skill/race-viz/references/schemas.md` | boat schema | Add `vmc`, `meta.sailedNm/avgKt/cls/clsPos` as standard fields; add the `divisions` + `ratingBands` config blocks (§4) |
| `skill/race-viz/references/stage-2-analysis.md` | metrics | VMC definition (centered diff on the grid, official-window mean check, negatives real) + the routed-DTF prerequisite for marks courses |
| `skill/race-viz/references/stage-4-visualization.md` | chart set | Promote dist-vs-speed scatter to the standard set; note VMC-not-VMG terminology rule (I18) |
| `skill/race-viz/references/stage-5-handoff.md` | handoff checklist | Add: run the full chain in order (`build_data → shell/build → harness both TZs → compare_data`) before handing off; note the stale-standalone trap (§2). **There is no KICKOFF_TEMPLATE.md in the repo** — if the skill loop expects one, it should be extracted from this stage file rather than invented fresh |
| `docs/REPO_SPEC_v1.1.md` → v2 | Shell seams | Record I15 (module-declared heights; migrate `#finstrip`); the `bindMode` scope arg; the `speed`/`controls` scopes |
| `docs/REPO_SPEC_v1.1.md` → v2 | Tests & CI | One-command chain wrapper (stale-artifact trap); cross-realm deepEqual note; fixed-count discipline worked — keep |
| `docs/REPO_SPEC_v1.1.md` → v2 | Open items | Close "routed DTF" as landed; add "migrate finstrip height", "promote distspeed", "divisions/ratingBands schema" |

## Decisions this round's prompt didn't cover (made, and recorded)

1. **Class-splits acquisition path**: Brad pointed at racing.bermudarace.com
   interactively; the 8 class pages were fetched with a browser UA, parsed,
   and reconciled row-by-row (names via HTML-entity/accent/parenthetical
   normalization — ZÉLÉE and the MADCAP syndicate needed it; the two PHOENIXes
   matched by sail number). Class ranks were derived from CSV corrected order
   and cross-checked against page order: zero mismatches.
2. **Class selection includes a class's DNF boats** (they have tracks and are
   comparable on the map); the rating band is scored-boats-only per the prompt.
   Intersection therefore only ever returns scored boats.
3. **Filter semantics**: filters are additive set-selections with their own
   bookkeeping (I17), not a replacement of the selection — matching how the
   existing group buttons behave.
4. **VMC mean fixture is defined over the official race window** (start =
   finish − elapsed), not the raw track span: the grid starts 40 min before
   the first warning, which dilutes a naive mean to 6.47.
5. **`vmc` ships at 2-decimal rounding** (SOG ships 1) — a derivative needs
   the extra digit or the integral check drifts.
6. **The frozen oracle was re-frozen** rather than teaching compare_data an
   amendments mechanism — smaller diff, same auditability via decisions/ +
   git history (I16). Reverse this in v2 if oracle churn becomes frequent.
