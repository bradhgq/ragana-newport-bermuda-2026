# CLAUDE.md — rules in force

Monorepo for race dashboards: `starter/` engine (incl. `starter/template/`,
the copy-me race skeleton) · `skills/race-viz/` process · `docs/` living logs
only · `races/<race>/` per-race config, data, modules, dist. **Race-specific
docs and decisions live in `races/<race>/docs|decisions/`** (as bir2026 does),
never in top-level `docs/`; generalizable work lands in `starter/`.

## Build & verify — one command, always the full chain

```
.venv/bin/python starter/build_race.py races/<race>
```

Runs in order: build_data → race postprocess (if any) → shell/build
(harness-gated, TZ=America/New_York) → harness under TZ=UTC → compare vs the
frozen oracle. Skipping or reordering steps invites the stale-standalone trap
(dist embeds `out/`; tests read dist). Use the pinned `.venv` (pandas 2.2.3 /
numpy 1.26.4).

## Hard rules — each one was paid for

- **Frozen oracles and goldens move only with a `decisions/` ledger entry** (I16)
  enumerating every diff class and citing the recorded instruction. Goldens are
  never re-derived from the pipeline you are testing; fixtures are
  authored-frozen in `races/<race>/tests/regression.json` and cross-checked
  against config goldens by `shell/build.py` — never emitted by the pipeline
  under test.
- **Committed `dist/` is production** (nix flake input serves the git tree).
  After a verification rebuild, `git checkout -- races/*/dist` unless deploying
  is the point. When deploying NEW dist paths, `git add -f` them — the global
  `dist/` ignore silently drops them from `git add -A` (BIR's first shell
  deploy shipped without its script dirs this way).
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
- **Log, then compact**: everything open/undecided/todo lives in ONE file,
  `docs/OPEN_THREADS.md` — nothing else does. When a thread closes, delete it;
  when a decision becomes a rule, encode it where it belongs (CLAUDE.md, the
  skill, INVARIANTS.md, a code comment) and delete the entry. **Never append
  closure notes — git history is the archive.** `docs/` holds living documents
  only: review screenshots are PR material and leave the tree once their round
  merges; retrospective insights get consolidated into the skill and the retro
  file deleted; big binaries go to a GitHub release (`archives-2026-07` is the
  precedent). Suites green before and after each phase.

## Git & publication

Pushes to `origin main` are normal workflow; self-contained features the owner
should review go on a branch with a PR. Tags and GitHub releases only per
explicit instruction. Repo visibility, hosting, and deploy-pin bumps are
owner-only actions.
