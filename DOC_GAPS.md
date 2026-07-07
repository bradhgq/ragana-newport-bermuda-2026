# DOC_GAPS — cold-start documentation audit

This session is the cold-start test of REPO_SPEC + RETROSPECTIVE + the skill.
Every place the documentation was wrong, ambiguous, or insufficient to proceed
without guessing. (What I *did* about each is in `REPO_NOTES.md`.)

## Wrong

1. **REPO_SPEC "v1" doesn't exist.** The kickoff prompt says REPO_SPEC (v1)
   and cites "the frozen ctx ABI in REPO_SPEC"; the provided file is titled
   **v0**, states it was "drafted ahead of the Claude Code retrospective", and
   explicitly reserves the module ABI ("do not invent the interface ahead of
   the retro"). The ctx ABI actually lives in RETROSPECTIVE §2. Buildable, but
   only because the retro fills the hole the prompt claims the spec fills.

2. **The definition-of-done cites a harness that isn't in the checkout.**
   REPO_SPEC: "`TZ=America/New_York node tests/test_dashboard.js` returns 9/9
   green", and classifies its "script extraction, DOM/Plotly mocks" as reusable
   mechanics. The repo has `test/regression.test.cjs` (5 assertions, no DOM/
   Plotly mocks, no script extraction). The 9/9 harness the prior session ran
   was never delivered. Phase 3 must *write* `tests/test_dashboard.js` from its
   one-line description rather than port it; "9/9" is unverifiable as a target.

3. **stage-2 §6's detection algorithm cannot reproduce the worked example's
   shipped zone** (180→80). Evidence in REPO_NOTES #3 / `run_log.json`. The
   skill presents the algorithm as the source of the band; on the only worked
   example, the band was an authored judgment (RETROSPECTIVE §5.3 says so).
   The skill/spec should say: detection *proposes*, CP-2 *decides*, config
   records the decision.

4. **schemas.md's `dashboard_data.json` contract disagrees with the frozen
   payload it documents**: says recon rows carry `matched_local` and verdicts
   `ok|warn|error`; the shipped payload (and app.js, which renders it) use
   `matched_edt` and `match|warn`. Also `parkFair` u4/u2 are numbers in the
   payload, shown as `"31%"` strings in the schemas.md goldens example.

5. **schemas.md `zone_detection` defaults don't fire on the only worked
   example** (`min_traversal_hours: 6` filters out the sole candidate run,
   which has ~3 h median traversal). Defaults that zero out on the reference
   race deserve a note.

## Missing (had to invent or derive)

6. **Config keys the pipeline demonstrably needs but no schema documents**:
   `time.utc_offset` / `time.tz_label` (schemas.md has only `official_tz`;
   helpers and `ep()` need the fixed offset), `time.race_start_utc` (data trim),
   `grid.end_utc` / `grid.interpolate_limit`, `course.finish_radius_nm`,
   `finish_pad_min`, `sog.half_window_s`/`min_span_s`, `fleet.resample`/
   `min_points`, `milestones.start_nm`/`step_nm`, `groups.*` (rank→group
   semantics), `extra_boats`, `name_overrides.{by_id,by_name,display}`
   structure (schema shows a flat `{}`), `event_categories` draw order,
   `race.slug`, `output.generated`. All now in `races/_template/config.yaml`;
   should be folded back into skill schemas.md.

7. **No `decisions/CP-*.yaml` were provided** for the worked example, though
   the skill's resume protocol and REPO_SPEC's layout both expect them. The
   confirmed decisions exist only implicitly (in shipped copy and RETROSPECTIVE
   §5). `examples/nb2026/decisions/README.md` records the absence.

8. **The finish-line coordinates' provenance is only narrative.** Footer copy
   says "triangulated from six boats' official finish times"; no document
   records which six or the method. Coordinates taken from legacy code as
   given.

9. **tz_probe golden epoch unrecorded.** schemas.md requires
   `tz_probe.track_epoch_utc`; nothing provided carries it (derived:
   1782244492).

10. **Nothing documents the raw tracker CSV's provenance/hash.** GATE A hinges
    on "the raw CSV" being the same bytes the frozen build consumed; the
    race-data RETROSPECTIVE describes the download ritual but records no
    checksum. (This build's input hashes now land in `out/run_log.json`.)

## Ambiguous (resolvable, but only by reading legacy code)

11. **Zone-detection population** — "fleet-median SOG" doesn't say which fleet:
    all 144 tracked boats, or the 88 scored+extra entries? (Legacy parkFair
    implies the entries set; implemented that way.)
12. **`groups` duplication** — RETROSPECTIVE notes quick-select groups exist in
    both pipeline grouping and app buttons "unify in the refactor"; neither doc
    says which side owns the list post-refactor. Phase 2 decision.
13. **REPO_SPEC's `races/_template/raw/` vs example's results file location** —
    the worked example's results are an extracted artifact (`official_results
    .csv` at race root), not a raw download; template keeps `raw/results.csv`.
    Harmless, but the spec reads as if results are always raw inputs.

## From the GATE A adjudication round

14. **Referenced attachments missing.** The adjudication says REPO_SPEC v1.1
    ("accompanies this message") and the 9/9 harness ("accompanies this
    message too") were provided; neither was — only the acquisition
    retrospective + two download scripts arrived. Cannot diff v0→v1.1 or
    retire the harness file to examples/nb2026/legacy/ until delivered.
15. **Adjudication's "finstrip = 81" conflicts with the frozen payload** (82
    boats carry official corrected times). Kept 82 per the oracle; "81" is
    consistent with counting only non-hero dots.
16. **decyb license unknown/absent** (acquisition retrospective calls it "the
    open-source decyb project" — it is public but carries NO license, which is
    not the same thing). Must be resolved before public/client-facing use of
    the ported decoder. Details in acquisition/README.md.
17. **Acquisition retrospective's YS results schema omits `retire_reason`** —
    the YS results CSV has no such column (finish_status only); the template
    maps it anyway for organizer-sourced files. Retirement narratives remain
    hand-authored data.
