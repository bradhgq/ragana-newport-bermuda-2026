# Stage 5 — Handoff & publication (Claude Code)

Requires the confirmed CP-4 record and a green regression suite. The Claude Code session inherits this same skill; per-race state arrives as files plus a thin `PROMPT.md`.

## Handoff package

- Repo state: pipeline code, `config.yaml`, `events.yaml`, the shell + race presentation (`presentation.js`, `copy.js`/`copy.md`, `modules/`, `overlays/`), and `decisions/CP-*.yaml`.
- `dashboard_data.json` plus the assembled reference build — the known-good HTML the chat session iterated to.
- The test harness with the race's frozen goldens.
- `PROMPT.md` (skeleton in `schemas.md`) containing:
  - a context paragraph — race, tier, client, where the project stands;
  - **invariants**: timezone-naive rendering; exact-official-endpoints; the state-model conventions; this race's golden values; anything added during CP-4 rounds;
  - **the job list**: mobile breakpoints, lazy-loading, performance budget, hosting, accessibility;
  - **the do-not-touch list**: golden values, `dashboard_data.json` semantics, module math;
  - the requirement to run the suite under a non-UTC `TZ` **before and after** the work — all green both times — and that any newly human-caught defect becomes a new assertion (prime rule 5 doesn't stop at handoff).

## Publication — CP-5 Ledger

- The per-item opt-in list for anything log-derived going public, plus explicit confirmation that everything else stays private (prime rule 4).
- A final suite run against the shipped artifact; record the build hash and URL in the ledger.
- Tier 1 may fold CP-5 into the CP-4 sign-off (nothing private to strip), but the final suite run still happens.

## Build/publish checklist (since R2)

- **One command, always the full chain**: `.venv/bin/python starter/build_race.py races/<race>` — build_data → race postprocess (if any) → shell/build (harness-gated, `TZ=America/New_York`) → harness under `TZ=UTC` → compare vs the frozen oracle. Green throughout, before handing off.
- **Stale-standalone trap** (why the wrapper exists): dist embeds `out/`, and the harness tests the *built* `dist/standalone.html` — run steps piecemeal or out of order and the gate validates the previous artifact. It bit twice before the wrapper; don't hand-sequence the steps.
- **Committed dist is production** (the nix flake input serves the git tree). After a verification rebuild, `git checkout -- races/*/dist` unless deploying is the point. When deploying NEW dist paths, `git add -f` them — the global `dist/` ignore silently drops them from `git add -A` (BIR's first shell deploy served a page whose every script 404'd this way; `build_race.py` now detects and warns).
- **Hosting:** on silverbox, `races/<race>` maps to a nginx location aliased to `${inputs.race-viz-site}/races/<race>/dist/` under the hgq.fyi vhost; deploy = push monorepo main, then `nix flake update race-viz-site && sudo nixos-rebuild switch --flake .#silverbox`.
- **Kickoff prompts:** fill `docs/KICKOFF_TEMPLATE.md` (per-race slots) when starting the next race's fresh chat session — it encodes the checkpoint discipline (start at Stage 0, stop at CP-0).
