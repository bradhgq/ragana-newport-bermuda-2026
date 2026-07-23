# NB2026 opinion layer — review set (branch nb2026-opinions)

Headless-Chrome captures of the three tier-1 panels added on this branch
(source truth: the branch build; dist/ itself is NOT committed here — the
committed dist stays production until merge + rebuild).

| file | what |
|---|---|
| `verdict_panel.png` | the five-call verdict panel (desktop, 1280) |
| `phasegap.png` | per-phase decomposition vs Christopher Dragon, corrected — bars reconcile to the official +94.0 |
| `verdict_mobile.png` | verdict cards at 390 px (single column) |

Fixture status at capture: NB 23/23 (19 shared + 4 in the new tests/extra.cjs)
under both TZs; oracle IDENTICAL; BIR untouched (29/29).

## Round 3b — Sebastian's five takeaways (2026-07-16)

| file | what |
|---|---|
| `takeaways_1_2.png` | lessons intro (five + checklist) · takeaway 1 helm-split VMC zoom · takeaway 2 reef SOG zoom |
| `takeaways_3_4.png` | takeaway 3 chaos-window gap zoom · takeaway 4 east-bet rhumb-offset zoom |
| `takeaway_5_navlog.png` | takeaway 5 t=100/v curve with park traversals · (navlog below, unchanged) |

Each takeaway is a module (`tw{helm,reef,night,east,park}.js`) pairing
Sebastian's rule with a chart zoomed into the moment that taught it; copy in
`copy.js` under `takeaways.*`, sourcing documented in `copy.md` §round-3b.
Harness: 28/28 both TZs (n5–n9 cover window bounds, pinned events, milestone
reconciliation, park-shading presence, and the exactness of the t·v=100 curve).
