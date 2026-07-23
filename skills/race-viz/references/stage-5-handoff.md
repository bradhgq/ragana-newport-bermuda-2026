# Stage 5 — Productionize & publish

Requires the confirmed stage-4 record and a green regression suite. Same
session, same repo — state is already here; there is nothing to hand off.

## Productionization checklist

- Repo state complete: pipeline config (`config.yaml`, `events.yaml`), the
  shell + race presentation (`presentation.js`, `copy.js`/`copy.md`,
  `modules/`, `overlays/`), and the confirmed stage records in `decisions/`.
- The known-good build the review rounds converged on, rebuilt through the
  one-command chain.
- **Invariants honored**: timezone-naive rendering; exact-official-endpoints;
  the state-model conventions; this race's pinned values; anything added
  during stage-4 rounds (`starter/shell/INVARIANTS.md` is the list of record).
- **The jobs**: mobile breakpoints, lazy-loading, performance budget, hosting,
  accessibility.
- **Do not touch**: pinned values, `dashboard_data.json` semantics, module
  math.
- Run the suite under both `TZ=America/New_York` and `TZ=UTC` **before and
  after** the work — all green both times; any newly human-caught defect
  becomes a new assertion (prime rule 5 doesn't stop at productionization).

## Pre-ship: scan `docs/OPEN_THREADS.md`

Before anything publishes, read the repo's living log end to end. Any item
this round resolved: delete the entry (compaction doctrine). Everything else:
raise to the owner with an explicit call per item — resolve now, or punt;
punts stay in the file, dated.

## Publication — stage-5 ledger

- The per-item opt-in list for anything log-derived going public, plus
  explicit confirmation that everything else was discarded (prime rule 4 —
  private material never entered the repo).
- A final suite run against the shipped artifact; record the build hash and
  URL in the ledger.
- Tier 1 may fold this ledger into the stage-4 sign-off (nothing private to
  strip), but the final suite run still happens.

## Build/publish mechanics

- **One command, always the full chain**: `.venv/bin/python
  starter/build_race.py races/<race>` — build_data → race postprocess (if
  any) → shell/build (harness-gated, `TZ=America/New_York`) → harness under
  `TZ=UTC` → snapshot compare. Green throughout before shipping.
- **Stale-standalone trap** (why the wrapper exists): dist embeds `out/`, and
  the harness tests the *built* `dist/standalone.html` — run steps piecemeal
  or out of order and the gate validates the previous artifact. It bit twice
  before the wrapper; don't hand-sequence the steps.
- **Committed dist is production** (the nix flake input serves the git tree).
  After a verification rebuild, `git checkout -- races/*/dist` unless
  deploying is the point. When deploying NEW dist paths, `git add -f` them —
  the global `dist/` ignore silently drops them from `git add -A` (BIR's
  first shell deploy served a page whose every script 404'd this way;
  `build_race.py` detects and warns).
- **Hosting:** on silverbox, `races/<race>` maps to an nginx location aliased
  to `${inputs.race-viz-site}/races/<race>/dist/` under the hgq.fyi vhost;
  deploy = push monorepo main, then `nix flake update race-viz-site && sudo
  nixos-rebuild switch --flake .#silverbox`.
- **Next race:** a fresh session in this repo, starting at stage 0
  (`references/stage-0-acquisition.md` carries the kickoff checklist).
