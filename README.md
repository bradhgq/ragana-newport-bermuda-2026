# yacht-race-visualization

Tooling and hosted dashboards for turning yacht-race tracker data into researched,
interactive race analysis. One public home for the reusable engine, the skill that
drives it, and every race deployed from it.

## Layout

```
starter/            the reusable engine (raw code only)
  shell/            generalized dashboard shell (charts, controls, build, INVARIANTS.md)
  pipeline/         data pipeline (tracks → dashboard_data.json)
  adapters/         tracker-vendor format parsers → canonical schema
  acquisition/      race-data downloaders (fetch from YB / YachtScoring)
  tests/            parameterized regression harness
  template/         copy me to races/<race>/ to start a race
  build_race.py     the one-command build+verify chain — use this, not the steps
  requirements.txt
skills/race-viz/    the /race-viz skill — process & judgment, source of truth
docs/               one living log: OPEN_THREADS.md (open/undecided/todo)
races/
  nb2026/           Newport Bermuda 2026 (LIVE) — the shell-based worked example
                    (config, data, modules, overlays, committed dist/)
  bir2026/          Block Island Race 2026 (LIVE) — shell-based, marks course
                    (routed DTF) with a race postprocess step; docs/ holds the
                    memo, retrospective, decision ledgers and FURTHER_WORK backlog
```

`adapters/` vs `acquisition/`: **acquisition** *fetches* raw data from a tracking
service (network); **adapters** *parse* a vendor's format into the canonical track
schema the pipeline consumes. Fetch, then adapt.

## Deployed

| Race | URL | Build |
|---|---|---|
| RAGANA · Newport Bermuda 2026 | [hgq.fyi/ragana-newport-bermuda-2026](https://hgq.fyi/ragana-newport-bermuda-2026/) | `races/nb2026/dist/` |
| Ragana · Block Island Race 2026 | [hgq.fyi/ragana-block-island-2026](https://hgq.fyi/ragana-block-island-2026/) | `races/bir2026/dist/` |

Hosting is on silverbox via `nix-config` (the repo is a `flake = false` input; nginx
aliases each race's URL to its committed `dist/`). The deployed `dist/` is committed
(force-added past the global `dist/` ignore) because the flake input serves straight
from the git tree.

## Build a race

One command, always the full chain (both races; from the repo root, pinned venv):

```
python3 -m venv .venv && .venv/bin/pip install -r starter/requirements.txt   # once
.venv/bin/python starter/build_race.py races/<race>
```

The chain runs, in order: build_data → race postprocess (if any) → shell/build
(harness-gated under `TZ=America/New_York`) → harness again under `TZ=UTC` →
compare vs the frozen oracle. Running the steps piecemeal invites the
stale-standalone trap (dist embeds `out/`; tests read dist). After a
verification rebuild, `git checkout -- races/*/dist` — committed dist is
production, per above.

New race: copy [`starter/template/`](starter/template/) to `races/<race>/`, drop
raw data in `raw/`, fill `config.yaml` + `presentation.js`, and follow the
skill's checkpoint protocol (never skip CP-0 or CP-2). Kickoff prompt template:
[`docs/KICKOFF_TEMPLATE.md`](docs/KICKOFF_TEMPLATE.md).

See [`starter/README.md`](starter/README.md) for the engine doctrines. The
`/race-viz` skill in [`skills/race-viz/`](skills/race-viz/SKILL.md) is the
authoritative process layer. For current layout and invocations, this README
is authoritative — together with `starter/shell/INVARIANTS.md` it IS the living
spec (no REPO_SPEC v2 is planned); historical specs and retrospectives live in
git history and the `archives-2026-07` release, not in the tree.
