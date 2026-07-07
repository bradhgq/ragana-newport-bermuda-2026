# GATE B — parity screenshot set

Full-page headless-Chrome captures of the SHELL-built NB2026 dashboard
(`examples/nb2026/dist/standalone.html`, built from the pipeline's emitted
payload per the GATE A adjudication), for comparison against the shipped site
at hgq.fyi/ragana-newport-bermuda-2026/.

| file | what |
|---|---|
| `desktop_full.png` | 1280 px, whole page: title block, controls, KPIs, map, DTF, race chart (corrected · pace, the default), finish strip, XTE/SOG, park table, event log, recon table, footer |
| `desktop_race_elapsed.png` | same, with the race chart flipped to **Elapsed (boat-for-boat)** |
| `mobile_full.png` | 760 px (the mobile contract boundary), whole page |
| `mobile_sheet.png` | 760 px with the bottom-sheet controls open |

Regression state at capture: harness 11/11 (both `TZ=America/New_York` and
`TZ=UTC`), GATE A compare 0 real diffs (39 exempt half-boundary ties), build
gate green, version `98ee155ce0`.

## Intentional deltas vs the shipped site (approve or veto at this gate)

1. **"Neighbors" group button now actually toggles Zelee** — the shipped site
   listed the phantom `'Zélée'` (REPO_NOTES #11; fix approved at GATE A
   adjudication, behavior delta flagged here as promised). Everything else in
   the button does what it did before.
2. **Two stylesheets** (`tokens.css` + `styles.css`) replace the single
   `styles.css`; computed styles are identical.
3. **Page assembled from template + copy slots** — HTML structure is
   equivalent but not byte-identical to the shipped `index.html` (e.g. module
   sections mount as scaffolds filled at boot).

Known non-delta: the finish strip shows 82 scored boats (81 dots + the hero
diamond), oracle-verified — REPO_NOTES #17.
