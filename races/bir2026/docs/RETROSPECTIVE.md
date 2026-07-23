# RETROSPECTIVE — BIR 2026, the second race through the pattern

Companion to the round-1 repo spec (REPO_SPEC v1.1 — retired from the tree
2026-07-16, retrievable from git history / the archives-2026-07 release; it
inherited the nb2026 round-1 retrospective's predictions), where §"marginal
cost of race #2" priced the second race assuming a shell refactor that never
actually happened. This is the empirical readout: what productionizing a *second*
race cost when the shell was still a worked example, not an extracted library.
Every claim cites a file.

The one-paragraph history: the BIR handoff arrived as a CP-4-approved monolith
(`dashboard_template.html`, 699 lines, data injected at `{{DATA}}`) plus a FROZEN
oracle payload. The job was productionization only — codify the assertions, split
the payload, mobile, a11y, host. It shipped as `src/` + `build.py` + a split `dist/`
with a 23-test gate, mobile bottom sheet, an a11y pass, a public/private build split,
and NixOS hosting wired as a flake input — the same shape NB2026 reached, reproduced
for a race whose chart set only partly overlaps.

---

## 1. The central finding: the engine diverged, so I did NOT generalize

The repo retrospective's §2 imagined one shell whose `race.config.js` parameterizes a
single chart engine across races. The prompt (JOB 2) offered shell migration as
"optional but preferred." I declined it, and that was the load-bearing decision.

The BIR monolith and the NB2026 `src/app.js` share DNA — `edtStr`, the `S` state
object, `Plotly.react`, act bands — but their **module sets are different**:

| | NB2026 (`../../src/app.js`) | BIR (`dashboard_template.html`) |
|---|---|---|
| upwind-distance bars (`meta.up1bi`) | — | `renderUpwind` |
| two-division beeswarm | one band | `renderFinstrip`, ORC+PHRF bands |
| upwind-lane (signed offset, dist-x) | — | `renderXTE` |
| Gulf-Stream / park / recon / nav-log | present | — (Tier 2, no paper log) |
| corrected handicap | F-TCF (ToT) | ORC ToT, cross-division **hard-hidden** |

Merging these into one config-driven engine — the "preferred" migration — is a large
refactor gated by an oracle that must reproduce byte-for-byte AND 16 human-caught
assertions. The expected value is negative: high risk of drifting the *approved*
artifact, for a generality no third race has yet demanded. So I kept every BIR chart
builder **verbatim** and grafted them onto NB2026's proven *scaffolding* (async boot,
lazy loaders, rAF-batched `render(scope)`, the bottom sheet, tap-to-inspect, ARIA).
The scaffolding generalized cleanly; the chart engine did not, and shouldn't be forced
to until a third race shows which modules are actually common.

**Lesson for the real shell extraction:** the shell boundary is *not* "one engine."
It's the **scaffolding** (data-split loader, render dispatch, mobile sheet, a11y,
error states, build) — race-agnostic and worth extracting now — wrapped around a
**per-race module bag** where each `renderX` is a plugin. The repo retrospective's
§2 module interface is right; its assumption that all races draw from one fixed chart
list is what BIR falsifies.

## 2. Race-#2 actuals vs. the §6 prediction

The repo retro §6 estimated race #2 at "a config file + authored content + a few
per-race modules." Actuals, since the shell was never extracted:

- **Reused with zero edits:** the mobile CSS system, the a11y button/aria pattern,
  the tap-to-inspect logic, the three-payload split *strategy*, the standalone
  inliner, the OG-card generator (retargeted to the BIR course in `scripts/make_og.py`).
- **Rewritten per-race (unavoidable this time):** the whole chart engine (grafted, not
  merged), because there is no shell to plug into yet.
- **New, general, belongs in the shell:** the CP-5 publish gate (`build.py --public`
  + `publish_allowlist.txt`) — every future race with private events needs it.

Net: without the extraction, race #2 cost ≈ a full frontend port, not the "config +
content" the estimate promised. That gap **is** the argument for doing the extraction
before race #3.

## 3. Testing: how 16 screenshot-caught defects became a runnable gate

CP-4's assertions were verified in-chat with one-off Playwright scripts. Porting them
(`test/regression.test.cjs` + `test/harness.cjs`) split cleanly in two:

- **Data/logic** (helpers + the FROZEN oracle, no DOM): G1–G5, A1–A6, the fleet/
  Daffodil/events counts. G1/G2 are checked twice — once as arithmetic on
  `meta.corr`/`meta.el`, once as the actual chart endpoint the app emits.
- **Render/DOM**: the app driven under **jsdom** with a **Plotly-capturing stub** —
  the render functions run for real and the test asserts on the captured figure specs
  (traces, `layout.shapes`, annotations). Plotly is stubbed, so a claim about *pixel
  geometry* (a 360px height, a 1048px note width) is verified by its **driver** — the
  CSS rule or layout field that produces it — rather than by a fragile screenshot.

Two jsdom gotchas worth recording for the shell's test kit:
- **Cross-realm equality**: arrays the app builds live in jsdom's realm and have a
  different `Array.prototype`; `assert.deepStrictEqual` fails on equal contents. Compare
  element-wise (`test/regression.test.cjs`, the A11 y-range check).
- **Async DOM rebuild**: `buildControls` replaces chip nodes wholesale, so a captured
  node reference goes stale after a toggle. Assert against a fresh query, not the old
  handle.

Real-browser verification (headless Chrome via the preview tools) then confirmed what
jsdom can't: plotly-**basic** does render `marker.symbol:'arrow'` with
`angleref:'previous'` (A8), the bars, and the beeswarm; the load order is
core → fleet(after paint) → more(once, on demand); note width computes to exactly
1048px; and the mobile bottom sheet slides, scrims, and hits ~44px targets.

## 4. New invariants earned this session (prime rule 5)

Each is now a named test:

- **NF1 — Windfall is a stale golden.** The FROZEN oracle injects `Windfall`
  meta-only (a PHRF finisher with `corr`/`el` but empty track arrays). `goldens.json`
  and `config.yaml` still list Windfall under `names_absent` — but **G5's PHRF band = 23
  requires it**; without Windfall it's 22. The oracle wins (prime rule 3); the golden
  file is stale. Do not "fix" the payload to match the golden — fix the golden.
- **NF2 — the display-name override is applied.** The payload uses `Zélée`
  (`name_overrides.display`); `goldens.json.names_present` still shows the raw `Zèlèe`.
  A test that asserts the golden's literal string would fail against the real artifact.
- **Trackless ≠ absent.** Windfall ships `t: []`, not a missing key — truthy in JS.
  `hasTrack` must check `.length` (it does); the build routes meta to core and the empty
  series to more without ever rendering a phantom (`build.py`, `has_track`).
- **The despiked CSV still contains fast segments.** despike removes only teleport
  pings; post-finish tracker car-rides (25–60 kt) survive in `tracks_clean.csv` and are
  trimmed later, in the payload. So the "no implied speed >25 kt" invariant belongs on
  the **payload** tracks, not the raw cleaned CSV (A1a). A test on the CSV would red-flag
  legitimate data.
- **The footer's "16 phantom pings" is narrative, not a count.** The Fri 20:00 EDT
  cluster is actually 29 rows / 14 boats removed (A1b asserts ≥16, the robust floor).

## 5. Publication (CP-5) — the one place a machine must not decide

All 16 events are `visibility: private`. Brad's instruction was "host exactly like the
nb2026 board" — public, full narrative. I honored it **except** the two groundings
(Loki, Full Tilt): prime rule 4 marks them non-publishable *regardless* — firsthand-
confirmed incidents about **other boats**, not in the public record. Asked directly,
Brad confirmed the carve-out ("the rule is sound and let's keep it out"), so
`build.py` hard-blocks the two labels (`NEVER_PUBLIC`) and the public build ships the
other 14; the event bodies exist only in the private client record. The decision and
the deploy path are in [`decisions/CP-5.yaml`](decisions/CP-5.yaml).

This is the general shape for any future public race board: the client (private) build
is the default; the public build is an opt-in *subtraction*, with a hard floor the
allowlist can't override.

## 6. Recommendations for the shell extraction (do before race #3)

1. Extract the **scaffolding** (`loader`, `render(scope)`, mobile sheet, a11y, tap,
   error states, `build.py` split + standalone + `--public` gate) into `shell/`. It is
   already race-agnostic; BIR proved it by reuse.
2. Make each `renderX` a **module** with a `{mount, scope, needs}` interface (repo
   retro §2 is close). Ship a race by declaring which modules it uses — BIR would list
   `[map, dtf, race, upwind, finstrip, lane, sog, log]`; NB2026 swaps in `[park, recon]`.
3. Fold the **publish gate** into the shell — it is not race-specific.
4. Keep the **jsdom + Plotly-capture harness** as the shell's test kit; per-race tests
   supply only the goldens + the assertion list. Record the two gotchas in §3 as kit docs.
5. Reconcile `goldens.json`/`config.yaml` with the oracle at freeze time (NF1/NF2) so the
   golden file can't drift from the payload it's supposed to guard.

## 7. R9 — what the first post-launch owner round taught (2026-07-09)

The board went live and Brad's first real-use pass produced eleven fixes
([`decisions/R9-owner-review.yaml`](decisions/R9-owner-review.yaml); every one a
named `R9_*` test — the suite is now 34). Three lessons worth carrying forward:

- **§1's divergence argument applies *within* one build.** The monolith had three
  separate decor code paths (`actBandsTime`, `actBandsDist`, `eventDecor`) and they
  had already drifted: the lane chart had no acts or events at all, and SOG's event
  markers were drawn at y=13 on a fixed [0,11] axis — present in the figure spec,
  invisible on screen. The fix (one `decor(xOf)` with a per-chart x-mapper) is the
  same medicine as the shell extraction: shared scaffolding, thin per-chart adapters.
- **Spec-level tests can't see "invisible."** The jsdom/Plotly-capture harness
  verified the SOG marker trace *existed* — it never asserted the markers sat inside
  the chart's y-range. That class of check (`marker.y within layout.yaxis.range`) is
  now part of the shared A12 test and belongs in the shell's test kit.
- **Coverage combinatorics beat screenshot rounds.** 8 human rounds never clicked
  "All boats + Total view"; the R9 code review did, and found a pre-existing crash
  (Inisharon, DNF, `parseHMS(undefined)`). Cheap adversarial passes over the state
  space (every toggle × every view) catch what curated screenshots structurally miss.

Also at R9: prime rule 4 was questioned, explained (it comes from the skill, not
from Brad), and **reconfirmed by the owner**; the `private/never_public.txt`
indirection was reverted to the simpler hardcoded `NEVER_PUBLIC`; and the NF1/NF2
stale golden name-lists were reconciled in `config.yaml` with a ledger entry.

## 8. Wishlist — further work

Moved to its own owner-facing backlog: [`FURTHER_WORK.md`](FURTHER_WORK.md)
(visual improvements §1, research integration §2 — ranked, with data
prerequisites marked). Nothing there changes a shipped analysis number without
a new checkpoint.
