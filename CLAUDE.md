# CLAUDE.md — rules in force (v0; owner will refine in a later architecture pass)

Monorepo for race dashboards: `starter/` engine · `skills/race-viz/` process ·
`docs/` specs+logs · `races/<race>/` per-race config, data, modules, dist.

## Build & verify — always the full chain, in order

```
.venv/bin/python starter/pipeline/build_data.py races/<race>/config.yaml
python3 starter/shell/build.py races/<race>          # runs the harness FIRST; refuses dist on red
TZ=America/New_York node starter/tests/test_dashboard.js races/<race>
TZ=UTC              node starter/tests/test_dashboard.js races/<race>
.venv/bin/python starter/pipeline/compare_data.py races/<race>/out/dashboard_data.json \
    races/<race>/frozen/dashboard_data.json --ties races/<race>/out/rounding_ties.json
```

Skipping a step invites the stale-standalone trap (dist embeds `out/`; tests read
dist). Use the pinned `.venv` (pandas 2.2.3 / numpy 1.26.4).

## Hard rules — each one was paid for

- **Frozen oracles and goldens move only with a `decisions/` ledger entry** (I16)
  enumerating every diff class and citing the recorded instruction. Goldens are
  never re-derived from the pipeline you are testing.
- **Committed `dist/` is production** (nix flake input serves the git tree).
  After a verification rebuild, `git checkout -- races/*/dist` unless deploying
  is the point.
- **No `legacy/` on the active main branch** — tag + GitHub release zip, then
  remove; git history retains everything.
- **Run the harness under BOTH `TZ=America/New_York` and `TZ=UTC`.** Chart
  x-values are naive local strings, never Date objects (I1).
- **VMC, never VMG** (I18) — tracker data carries no wind; the harness rejects
  the word. **Modules own their geometry** (I15) — `section.height`, never
  shell CSS. **Filters never eat manual selections** (I17).
- **Copy discipline**: propose microcopy freely; never author analysis claims;
  scope every set-dependent number to the set the section displays (the NB2026
  park-copy lesson). Narrative lives in `events.yaml`/`copy.md`, never code.
- **Log as you go**: spec deltas → `docs/REPO_NOTES.md`; documentation gaps →
  `docs/DOC_GAPS.md`. Suites green before and after each phase.

## Git & publication

Pushes to `origin main` are normal workflow; self-contained features the owner
should review go on a branch with a PR. Tags and GitHub releases only per
explicit instruction. Repo visibility, hosting, and deploy-pin bumps are
owner-only actions.
