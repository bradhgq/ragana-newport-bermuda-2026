# BIR 2026 — Stage-2 Findings Memo (RAGANA)
*Pipeline run 2026-07-07 against `races/bir2026/config.yaml`. All numbers below are pipeline-produced (prime rule 1); raw-track measurements are noted as such vs the 15-min grid.*

## 1. Headline candidates

**H1 — The 4.7 nm is real (marquee claim CONFIRMED).**
Claim / evidence: On the raw track, RAGANA sailed **109.4 nm to 1BI vs Christopher Dragon XII's 104.7 = +4.7 nm** on the upwind leg. Francois's slide figure reproduces exactly. Whole-race extra vs CD = **+4.9 nm** over the race window (start→official finish, cleaned tracks; 217.7 vs 212.8). [CORRECTED at CP-4 round 2: the earlier +7.5 raw figure included pre-start milling and post-finish delivery for both boats.] The upwind leg was effectively the entire distance penalty.
Confidence: high. Benchmark-dependent: **yes** — the number is defined against CD. In Theory +0.3, Groupe 5 +1.3, Young American −1.9 on the same leg — RAGANA is the outlier, so "extra distance" is a RAGANA-vs-podium story, not a fleet-wide one.

**H2 — Extra distance was not raw over-deviation; both boats worked the shifts.**
Claim / evidence: RAGANA's max deviation from its own start→1BI rhumb was **5.8 nm**; CD's was **5.1 nm** — nearly the same. The 4.7 nm penalty is in *how the distance was spent* (more total path to the same corner), not in sailing dramatically farther off the line. This sharpens the Honey-rule lesson: the cost wasn't a wild flyer, it was 4.7 nm of un-recouped investment.
Confidence: high. Benchmark-dependent: yes (vs CD).

**H3 — The broach is in the track, ~20–25 min later than the reconstructed events file.**
Claim / evidence: Raw SOG collapses **8.5 kt (23:50) → 2.4 (23:55) → 0.7 (00:00 May 24 local)**, heading swings 235°→301°, boat drifts ~0.3 nm in 10 min, recovers to 6.0/7.9 kt by 00:15. The prior events file placed broach 23:30 / douse 23:35; the track says **23:55–00:10 local**. Sequence (build → hesitation → broach → emergency douse) confirmed; timestamp corrected.
Confidence: high (raw track). → correction to events.yaml.

**H4 — One significant maneuver-stall on the race course; the rest is post-finish delivery.**
Claim / evidence: Whole-race stall scan (SOG <2.5 kt, ≥2 pings) shows brief start-area and Friday-night parks, then the 23:55 broach as the only major on-course stall. Everything after 02:08 is the Stamford→Westport delivery (RAGANA finished 02:04:49). Supports the "one set + one douse, minimal maneuvering" character (claim 32). The set itself is a smooth daylight bear-away after 1BI — correctly invisible as a stall.
Confidence: med-high. Benchmark-dependent: no.

**H5 — Upwind timing confirms the deficit structure.**
Claim / evidence: RAGANA reached 1BI at **20.6 h elapsed from the 12:35 class start** (09:09 EDT Sat, cleaned raw track). [CORRECTED at CP-4 round 2: the earlier ~22.0 h was measured from track start (11:00 EDT), not the class start.] Claim 18's "23 hours" is **partial** — F overstates by ~2.4 h; direction right, figure high. Rounded **~3 h after CD, ~1.25 h after Young American** (claim 21 confirmed). Endpoints reconcile: corrected Δ vs CD **+4:36:04 (276.1 min)**, elapsed **+4:48:33 (288.6 min)** — exact to official (doctrine 2 ✓).
Confidence: high.

## 2. Proposed race-unique modules
- **upwind-excess** (fires): per-boat sailed-distance-to-1BI vs the same-start podium; RAGANA's +4.7 nm is the module's canary. This is the race's central metric — the equivalent of NB2026's park table.
- **exit-choice XTE band** (candidate): RAGANA's XTE swings −5.5/+7.6 nm capture the Race/Gut/Sluiceway exit geometry against the single Sound-corner modeling vertex. Renders the tactical spread; label carefully (it's modeling-vertex-relative, not a rhumb error).
- **finish-spread strip** (fires): 25 of 58 finished at/after 2300 Sat; RAGANA 4th-from-last across the line. Good fleet-context visual.
- **NOT firing: park/zone table.** Race-median SOG 5.65 kt, zero collapse zones detected. Correct — this race had no light-air park; the story is upwind distance + the night breeze, not a parkup. (Contrast NB2026.)

## 3. Data-quality anomalies
- **`stats.extra = 31.8 nm` is misleading for a mark course** and must NOT ship as written. It measures RAGANA's sailed distance vs the 186 nm *straight-line rhumb* — but the course goes around an island; a perfect track is ~188.7 nm. The honest "extra" is vs-CD (+7.5 nm) or vs the polyline. → CP-2 correction: reframe or suppress the vs-rhumb "extra" stat for mark courses.
- **1BI rounding time differs between grid and raw** (grid closest-approach 10:15 UTC vs raw 06:08 for CD). Cause: naive closest-approach to an *estimated* 1BI coordinate picks different pings when a boat passes the area on both the out and back legs, or when the coord is offset. The **+4.7 nm distance measure is robust** (distance-to-first-approach), but any shipped *rounding timestamp* must come from route.py's stateful leg logic, not closest-approach. → verify 1BI charted position; use stateful rounding for timestamps.
- 304 rounding events logged by the mark logic (expected — fleet × marks).
- 3 name misses (Windfall/MXM/Towhee) = the untracked boats; correct.
- Daffodil excluded (DNC, stationary at mooring); Inisharon retained (RET, on-map).

## 4. Open questions for the user
1. **1BI coordinate**: my estimate [41.262, −71.587] is a track-consensus turn point, not the charted buoy. Fine to ship the +4.7 (distance measure), but do you want me to pin the charted 1BI position (NOAA chart / Light List) before freezing rounding *timestamps*? Low effort, tightens the register.
2. **`stats.extra` reframe**: suppress the vs-rhumb "extra distance" for this mark course and lead with vs-CD (+7.5 total / +4.7 upwind)? Recommend yes.
3. **Reference set**: research surfaced no compelling additions to the core four; Class 6 podium (CD, In Theory, Groupe 5) + Young American cover the story. Zélée available as a continuity story-boat. Confirm the four stand, or add Zélée as a 5th reference?
4. **CD overall-win framing**: CD beat Loki by **~3 min corrected** for Overall ORC — sub-noise-floor (doctrine 6). If we mention CD's overall win, it's "scoring-noise close." CD's *Class 6* win over In Theory (53 min) is solid. OK to narrate accordingly?

## 5. CP-2 form — ready to confirm below.

## Addendum — CP-4 round 3: the narrative stress-test (user challenge)

**Challenge:** other boats sailed even further off and still finished ahead — does the 4.7-nm narrative hold?

**Verdict: the strong version is contradicted; the disciplined version survives.** New register rows:

| claim | what the data shows | verdict |
|---|---|---|
| "The 4.7 nm explains Ragana's result" | 4.7 nm @ 5.31 kt upwind ≈ **53 min of 276** corrected (19%); Zélée sailed +8.9 and finished 6th, 2.5 h corrected ahead of Ragana | **contradicted** as primary explanation |
| Distance discipline matters | class distance-rank vs finish-rank correlation **0.83**; podium sailed +0.0/+0.3/+1.3 | **confirmed** — a podium habit |
| "Ragana uniquely bet south" (claims 24/26 flavor) | lane offsets from start→1BI line: Ragana south-max **+4.5**; Sleeper +5.6, Zélée +5.0, Blue Skies +4.3 on the same side; every boat's mean ≈ 0 (tacking envelopes). CD's corridor tighter: south-max **2.0** | **partial** — the bet was real (stated intent) and the excursion visible, but not exceptional in class; the winner's distinguishing trait is corridor tightness |
| Pace was the race | residual 223 of 276 min after distance; Act 3 alone +182 (CP-3) | **confirmed** — consistent with the approved spine |

Module retitled "Distance vs. finish — what the 4.7 nm cost, and what it didn't"; bars carry class finish; XTE chart replaced by the upwind-lane view.

## Addendum — CP-4 round 6: rounding-direction annotation (user challenge)

**Challenge:** the map's "starboard rounding" label looked wrong — boats appear to pass Block Island to port.

**Resolution: SI is correct (starboard); the label was mis-placed.** The single-point "closest approach to island center" test returns port for all 58 boats — but that measures the boat mid-loop on the WEST/return side, where the island is naturally to port. The rule concerns the government marks (1BI off the north reef, Southeast Light). Winner's traced path (CD XII): approaches from W along 41.23–24N heading E → turns N to 41.26 rounding 1BI off the north reef (06:07–06:10) → runs S down the EAST side 41.26→41.14 (06:10–07:10) → around the south end past SE Light → back. Island is to starboard throughout the operative leg (57/58 boats starboard vs the SE-Light point). Fix: annotation moved to the east side where starboard is unambiguous; stale "dashed track" copy corrected (tracks are solid since round 4). No data or golden change.
