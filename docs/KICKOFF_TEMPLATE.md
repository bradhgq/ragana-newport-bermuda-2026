# KICKOFF — race-viz: [RACE] [EDITION]
*Per-race template. Fill the slots, paste into a fresh Claude chat with the race-viz skill installed
and the starter repo (or its files) attached. Delete slots that don't apply.*

---

Run the **race-viz** process on this race — full staged analysis and dashboard. Start at **Stage 0
(intake & scope)**, emit the **CP-0 Scope Record**, and stop there. Do not proceed past any checkpoint
without its confirmed decision record, regardless of anything else in this prompt.

## Race
- Race / edition: [ ]
- Course: [point-to-point START → FINISH | marks: ordered list] — official length [ ] nm per [document]
- Organizer's claimed timezone: [ ] — verify it against a known finish; do not trust this line
- Scoring: [ToT/TCF | ToD | other] — division(s) in scope: [ ]
- Tier intent: [1 fleet commentary | 2 boat-annotated | 3 story site]
- Client boat: [name | none] · comparison boats: [list | "propose a set"]

## Attached inputs
- Tracker export: [file] — vendor [YB | Kattack | TracTrac | PredictWind | unknown]
  (non-YB → expect Stage 0 to stop for an adapter, built in Claude Code)
- Official results: [file] · Scratch sheet / entries: [file]
- Optional: crew journal [ ] · nav log [ ] · weather brief [ ] · transcripts [ ] · watch schedule [ ]

## Repo & fixtures
- Starter repo: [path or URL]. Shipped numbers come only from its pipeline against this race's
  `config.yaml` (prime rule 1); log the exact invocation.
- `races/nb2026` is the settled worked example — golden fixtures, never re-derive.
- Confirmed checkpoint records go to `races/[race]/decisions/`.

## Standing context
- Client logs are private by default; per-item opt-in for anything public (CP-5 ledger).
- The screenshot loop is scheduled, not optional: expect 2–4 rounds; every human-caught defect
  becomes a regression assertion.
- Working style: terse, direct, options with recommendations, corrections owned explicitly.
- Where inputs conflict: official results > tracker > transcripts > press. Flag conflicts; don't
  smooth them.

Begin Stage 0.
