# ALIR 2025 — Stage-2 Findings Memo

Pipeline invocation for every shipped number:
`.venv/bin/python starter/build_race.py races/alir2025` (chain green, 13/13 under
both TZs; probe: Max 0.0 s, Daffodil 0.0 s error). Exploration beyond the payload is
marked as such. Dual-focus doctrine applies throughout: Daffodil and Max are narrated
in parallel, never against each other.

---

## 1. Headline candidates

**H1 — Three boats beat the weather; Max was the last of them. CONFIRMED, high.**
When the squall line entered the western Sound (15:36 EDT Friday, Kings Point onset),
exactly three boats had finished: Wahoo (12:26), Avalanche (14:11), **Max (14:15) — by
80 minutes**. The next four (Cougar, Acadia, Habiru YCC, Ohana) were 3–6 nm from the
line and took the squall, then the dying breeze, in their final miles. Evidence:
payload DTF at 15:36 EDT per boat. Benchmark-dependence: none — this is a clock fact.
*Caption discipline: Max's 4:05 corrected margin over Phantom is inside the 10-min
noise floor and is never narrated as sailed superiority; the honest claim is the exit
before the door closed. The counterweight is real and ships with it: the boats behind
got squall pressure Max never saw (C6: for Daffodil it was "a very needed push").*

**H3 — The door closed at ~5 pm Friday and reopened Saturday morning. CONFIRMED, high.**
Time to cover the final 15 nm, by when a boat entered them (payload DTF traversal):
entries before 14:00 Friday → 2.2–3.2 h (Max 2.5, Habiru 3.2). Entries 14:30–21:30
Friday → 4.5–6.7 h, worst 6.65 h. Entries after midnight → back to 3.7–4.7 h.
**Daffodil entered at 14:30 Friday, 2¾ h behind Max, and took 5.78 h** — the door
swung shut between them. This kills the "spatial park zone" framing: the zone detector
correctly proposes nothing (no distance band's fleet median collapses, race-median
5.97 kt), because the same water was fast at noon and dead at 22:00. The park was a
closing door in time, not a place. Doctrine 1 is satisfied by construction — each
boat's own traversal clock.

**H4 — Daffodil's reach was real: 4th of 43 through the ocean leg. CONFIRMED, high.**
Traversal of DTF 190→95 (R14 to the Montauk approach): Avalanche 7.75 h, **Max 8.00,
Wahoo 8.00, Daffodil 8.25** — then Habiru 9.00 and everyone else ≥9.25; fleet median
12.00 h. A 31-ft trimaran holding the pace of three 40–50-ft flyers, 3.75 h faster
than the fleet median, is the "built for this" claim confirmed. Benchmark: the whole
fleet's own traversals of the same band.

**H5 — the owner's watch. REVISED after the stop's look-harder round: both stories
are true, and the loss lives one leg later than remembered. Confidence: high on the
where/how-much; wind angles are ERA5-model-supported (say so in captions).**

*The night corner (Montauk → Plum Gut, DTF 95→65, ~22:45 Thu–03:45 Fri) is clean.*
Daffodil was the **3rd most direct of 48 boats** through it (sailed/straight 1.19×
vs fleet median 1.29×; Max 1.28×, Wahoo 1.38×), with zero large maneuvers at 15-min
resolution and reaching wind angles throughout. Whatever it felt like from the helm,
the corner cost nothing against any benchmark.

*The Sound beat (DTF 65→15, Friday ~04:00–14:30) is where the hours went.* The whole
morning was upwind — ERA5 has the sou'wester at TWA 20–58° on her heading, softening
11→7 kt — a trimaran's worst mode, and the raw pings show the tacks the gridded view
smoothed away. Own-window comparison, benchmark named (doctrine 5):

| | hours (DTF 65→15) | sailed | ratio | tacks/gybes | made good 04:00–14:30 |
|---|---|---|---|---|---|
| Habiru YCC | 8.50 | 56.5 nm | 1.11× | 4 | 59.2 nm |
| Max (1.5 h earlier, more breeze) | 8.75 | 60.9 | 1.24× | 8 | — |
| **Daffodil** | **10.50** | **62.9** | **1.26×** | **9** | **49.9 nm** |

Against Habiru — overlapping water, overlapping hours — Daffodil gave up **~2.0 h,
6.4 nm of extra sailing, and 9.3 nm of made-good**. That is the recollected "sailed
higher than necessary, tacked more, sailed more distance," relocated from the night
corner to the Friday-morning beat.

*The counterfactual the owner asked for (bounded, assumptions visible):* sail the
Sound at Habiru's pace → enter the final 15 nm ≈ 12:30 instead of 14:30 → the door
table puts a ~12:30 entry at ≈3 h, not 5.78 → finish ≈ 15:30–16:00 Friday, about
**4.5 h earlier**, landing ≈ 28:30 corrected — roughly 5th–8th on the unified ladder
instead of 30th. Entering **with** Max needed a door entry by ~11:45; even a perfect
Sound leg leaves her ~45 min short of that, so "in the door with Max" was out of
reach by the Sound alone — the reach and corner were already as good as the fleet's
best. Two compounding assumptions (Habiru-pace + earlier door cohort); ship it only
with both stated.

**H6 — The Sound's Great / Towhee split is real. CONFIRMED, high.**
Across the central Sound (lon −73.3..−72.6), Sound's Great held mean lat 41.048
(Long Island shore); Towhee 41.123 (Connecticut side) — ~4.5 nm apart, exactly as
Lenoble described. The *causal* half of C9 (Towhee's halyard breakage deciding the
division) stays testimony — a track cannot see a halyard.

**H2 — The squall propagated west→east across the fleet. SUPPORTED, medium-low.**
Per-boat maximum SOG step inside 14:30–18:30 EDT Friday orders loosely by longitude
(western boats 15:45–16:30, eastern 17:30–18:15; fitted drift eastward), matching the
NWS line timing. But the signal is weak: 5-min pings cannot resolve a 2-min squall,
and the strongest responders were dousing sail (Daffodil's own step is just +1.3 kt
for exactly that reason). A per-boat "the squall hit X at HH:MM" table would
overclaim. Module recommendation below reflects this.

**H7 — Where the seven retirements ended (facts only, causes unknowable).**
Scarlett: Thu 14:55, off the Rockaways (earliest, before the reach). Ricky Bobby:
Fri 11:45, eastern Sound. Kitli: Fri 15:30 entering the Sound — right at squall
onset. Vamonos: Sat 02:45, ~5 nm from the finish, then a mooring. **Nereus (Sat
03:35) and PATHFINDER (Sat 05:25) reached the finish area yet are scored RET** —
the results say RET, the track shows the harbor; we ship the scoring, note the
anomaly, and assert no cause (C7's dismasting hearsay stays unsourced).

## 2. Proposed race-unique modules (owner picks/vetoes at this stop)

1. **`door` — the closing door (RECOMMEND).** Scatter: x = when the boat entered the
   final 15 nm, y = hours to cross them; hero/focus/spotlight highlighted, squall
   band and park night shaded. This is H1+H3 in one picture and the race's
   differentiating insight. Custom module (registerModule), data via a small
   postprocess step; canary: Daffodil (enter 14:30 EDT Fri, 5.78 h).
2. **`squall` — OVERLAY, and it renders as a TIME object (owner question answered).**
   The squall is a time concept, so it lives only on time-axised surfaces:
   (a) on the clock-time views of the DTF/SOG charts, a shaded x-band 15:36–18:15
   EDT Friday with three station tick-marks (KPTN6 24.5 kt 15:36 → 44065 31.9 kt
   16:40 → 44025 23.5 kt 17:30), caption naming the NWS event page and the
   model/observation caveats; (b) two entries in the race log/events row (owner
   testimony from Daffodil's deck; Lenoble's published account), which the shell
   already renders on every chart's event lane; (c) NOTHING on distance-axis
   views — a fixed x-band there would be a wall-clock window painted onto space,
   exactly the doctrine-1 artifact class, and each boat met the squall at a
   different DTF anyway (that per-boat mapping is the deferred moving-frame work).
   The door chart carries the squall's *consequence*; the overlay carries its
   *occurrence*. Explanatory captions are part of the module spec (owner: "explain
   in the visuals").
3. **Unified-ladder rank strip (RECOMMEND as presentation, not module).** The
   owner-approved unofficial cross-circle ladder (Daffodil 30/43) likely needs only
   the existing ranked list scoped to the unified scale + an "unofficial" caption —
   cheapest sufficient view (doctrine 8). Resolves the three-boats-ranked-#1 issue.
   VETO CANDIDATE: a Daffodil-vs-Max anything — excluded by narrative_framing.

## 3. Data-quality anomalies (new at stage 2)

- **Ricky Bobby's tracker drove home down Long Island at ~60 kt** on Saturday toward
  the finish, defeating the min-DTF trim rule for retirees; fixed with two added
  cuts (sustained-stationary ≥3 h; vehicle-speed >25 kt). trim_tracks.py updated;
  re-trimmed 21,666→21,185 rows; fleet max SOG fell 56.9→14.0 kt (Avalanche,
  plausible).
- **Scarlett ships no fleet ghost** (49 racing pings < `fleet.min_points` after
  hourly resample) — she appears in per-boat views only. Recorded, not fixed.
- **Two engine generalizations were required by this race** (both landed in
  `starter/`, all three races' chains green, nb/bir snapshots identical):
  (a) the race chart's corrected view assumed time-on-time; ALIR is the first ToD
  race, so `race.correctedModel: 'tod'` now subtracts (rating − refRating) × distance
  done (`shell/app/charts/race.js`); (b) the finstrip harness check now skips when
  `finstrip_count` is 0 — ALIR's largest in-division finish cluster is 3 boats, so
  the finish-spread heuristic legitimately never fires.
- 5-min ping cadence under-resolves the ~2-min squall (limits H2 forever).

## 4. Owner decisions at the stop (2026-07-23) — and what they changed

1. **door: selected**, with the requirement that the visuals explain themselves —
   explanatory captions are part of the module spec, not garnish.
2. **squall overlay: selected**, scoped as a time object (see §2.2 for the design
   that answers "it's a time concept, not positional"). Per-boat moving-frame:
   deferred.
3. **Pins: confirmed.** Snapshot frozen from the post-correction build.
4. **H5: owner pushed back — "look harder" — and was right to.** The deeper pass
   relocated the loss from the night corner (clean, 3rd most direct of 48) to the
   Friday-morning Sound beat (~2 h and 9.3 nm made-good vs Habiru). §1 H5 carries
   the revised verdict and the bounded counterfactual. Correction recorded.
5. **Phases named** (self-explanatory per owner): HARBOR START / THE OCEAN REACH /
   THE MONTAUK CORNER / THE SOUND BEAT / THE FINISH DOOR. In `presentation.js`.
6. **Ranked list: multiple #1s ruled confusing.** Fixed via `postprocess.py`:
   `meta.sdl` is now the unified unofficial ladder (1..43, unique — Max 1,
   Phantom 2, Wahoo 3, Habiru 4, Daffodil 30) and the official per-circle standing
   is preserved verbatim in `meta.note` for the detail surface, so both renders
   exist. The postprocess asserts it can reproduce every official circle rank
   before overwriting anything.

## 5. Stage-2 record — CONFIRMED

```yaml
# stage-2 — Findings & Modules Record — ALIR 2025 — CONFIRMED at the stop
modules_selected: [door (with explanatory captions), squall_overlay (time-axis + events only),
                   unified_ladder (postprocess meta.sdl + meta.note, both ranks rendered)]
modules_vetoed: [squall_moving_frame_per_boat (deferred — 5-min pings under-resolve it),
                 hero-vs-focus duel of any kind (narrative_framing)]
reference_set_confirmed: true    # Max, Habiru YCC, Wahoo, Phantom, Dolcezza (+ SG/Towhee as story)
corrections:
  - { before: "H5: night leg partially contradicted, door is the whole story",
      after: "H5: night corner clean (3rd most direct of 48); the loss is the Friday-morning
              Sound beat, ~2 h / 9.3 nm made-good vs Habiru (ERA5-supported upwind angles);
              bounded counterfactual ~4.5 h, still short of Max's door cohort",
      source: "owner look-harder instruction at the stage-2 stop; raw-ping + ERA5 recheck",
      propagated_to: [docs/FINDINGS.md] }
  - { before: "meta.sdl = per-circle place_overall (three #1s)",
      after: "meta.sdl = unified ladder 1..43; official circle rank kept in meta.note",
      source: "owner screenshot at the stop", propagated_to: [postprocess.py, snapshot] }
values_pinned: true              # config pinned_values == tests/regression.json == snapshot build
pipeline_invocation: ".venv/bin/python starter/build_race.py races/alir2025"
confirmed_by: "Brad"
date: "2026-07-23"
```
