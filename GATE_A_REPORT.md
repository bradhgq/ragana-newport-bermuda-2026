# GATE A report — generalized pipeline vs frozen NB2026 payload

**Verdict: semantically identical in every derived, authored, and structural
value; 39 of ~2,960,000 interpolated coordinate samples differ by exactly one
rounding quantum (1e-4°, ≈ 5 m), each provably a floating-point half-boundary
coin-flip between platforms.**

## Invocation

```
.venv/bin/python pipeline/build_data.py races/nb2026/config.yaml     # 88 boats, 0 name misses
.venv/bin/python pipeline/compare_data.py \
    examples/nb2026/out/dashboard_data.json \
    examples/nb2026/frozen/dashboard_data.json --tol 1e-6
```

Environment: Python 3.13.12, pandas 2.2.3, numpy 1.26.4, macOS arm64
(input hashes in `examples/nb2026/out/run_log.json`). Identical results under
pandas 2.3.3/numpy 2.5.1 and pandas 3.0.3 (with the adapter's ns cast).

## Result by payload section

| section | values compared | diffs |
|---|---|---|
| `boats.*.meta` (ranks, ratings, official times, groups) | 88 boats × 12 fields | **0** |
| `boats.*.t/dtf/xte/sog` | ~1.48 M | **0** |
| `boats.*.lat/lon` | ~2.96 M | **39** (all ±0.0001) |
| `fleet` (144 ghost tracks) | ~100 k | **0** |
| `mil` (milestone corrected series) | 82 × 31 | **0** |
| `parkFair` (85 boats × 6 metrics) | 510 | **0** |
| `events` / `watches` / `recon` / `stats` / `start` / `fin` / `meta` | all | **0** |

Frozen goldens re-verified in the emitted payload: RAGANA vs Christopher Dragon
+94.0 min corrected / +155.3 min elapsed; Gemini II u4 = 31%; both Phoenixes
present, `Hissy Fit II` single-spaced. Scoring probe: RAGANA error +0.11 s,
Christopher Dragon −0.24 s vs official corrected (gate ≤ 1 s).

## The 39 diffs, explained

Every diff was reconstructed from the raw pings (`weight = (t_grid − t0)/(t1 −
t0)`, then linear interpolation). **All 39 have weight exactly 0.5 and a true
value ending exactly in `…5` at the 5th decimal** — e.g. Jules `lat[85]`:
pings 38.5770 and 38.5669 bracket the grid instant symmetrically → true value
38.57195. The frozen (Linux x86-64 container) build computed a representation
that rounds up (38.572); numpy's compiled interpolation on this machine yields
38.571949999999994, rounding down (38.5719). Both encodings are within **half
an encoding quantum (5e-5° ≈ 5 m)** of the true position — the two files carry
the same information to the full precision the format can express. No
non-half-boundary diff exists; no derived number (SOG, DTF, XTE, park, mil,
stats) is affected, because those either round to a coarser quantum or derive
from raw (non-interpolated) pings.

Three env combos on this machine agree with each other bit-for-bit, so the
pipeline is deterministic here; exact bit-parity with the container would
require its platform, not different code.

<details>
<summary>Full diff list (also at examples/nb2026/out/gateA_diff.txt)</summary>

```
boats.Nicole.lat[93]: 39.0539 != 39.0538        boats.Invincible.lat[73]: 39.3882 != 39.3881
boats.Nicole.lon[26]: -70.8848 != -70.8847      boats.Invincible.lat[111]: 38.2945 != 38.2944
boats.Nicole.lon[93]: -69.5498 != -69.5497      boats.Invincible.lat[148]: 37.1331 != 37.133
boats.Bella J.lat[214]: 35.0133 != 35.0134      boats.Invincible.lat[187]: 36.2208 != 36.2209
boats.Bella J.lon[16]: -70.9694 != -70.9693     boats.Escapado.lat[265]: 34.762 != 34.7621
boats.Bella J.lon[320]: -65.3178 != -65.3177    boats.Escapado.lon[173]: -67.7587 != -67.7586
boats.Bella J.lon[329]: -65.1871 != -65.1872    boats.Escapado.lon[328]: -65.8495 != -65.8494
boats.Lykke.lat[153]: 36.5419 != 36.5418        boats.Escapado.lon[387]: -65.0486 != -65.0487
boats.Lykke.lat[263]: 34.6644 != 34.6645        boats.Inverness.lat[201]: 36.1203 != 36.1204
boats.Lykke.lon[51]: -70.2016 != -70.2015       boats.Inverness.lat[339]: 33.9889 != 33.989
boats.Lykke.lon[156]: -67.2789 != -67.279       boats.Jules.lat[85]: 38.5719 != 38.572
boats.Lykke.lon[206]: -66.288 != -66.2879       boats.Jules.lat[270]: 34.4756 != 34.4755
boats.Lykke.lon[264]: -65.4372 != -65.4373      boats.Jules.lat[277]: 34.3763 != 34.3764
boats.In Theory.lat[184]: 35.7518 != 35.7519    boats.Jules.lon[89]: -69.3824 != -69.3825
boats.In Theory.lon[186]: -66.9866 != -66.9865  boats.Jules.lon[176]: -67.1785 != -67.1784
boats.In Theory.lon[280]: -65.8208 != -65.8209  boats.Blitzen.lat[109]: 37.6969 != 37.6968
boats.In Theory.lon[286]: -65.9147 != -65.9146  boats.Blitzen.lat[114]: 37.5184 != 37.5185
boats.Lupo Di Mare.lon[65]: -69.9027 != -69.9026  boats.Blitzen.lat[329]: 33.5638 != 33.5639
boats.Lupo Di Mare.lon[149]: -67.5261 != -67.5262 boats.Blitzen.lon[50]: -70.3298 != -70.3297
boats.Lupo Di Mare.lon[233]: -65.771 != -65.7711
```
</details>

## Options

1. **Accept as GATE A pass** (recommended): the payload is semantically
   identical; both encodings agree to the format's intrinsic precision, and all
   goldens/derived values are exact.
2. Regenerate the candidate on a Linux x86-64 box and re-compare — expected
   byte-identical, if bit-parity is wanted for its own sake.
3. Bless the candidate as the new frozen reference — **not recommended**
   (prime rule 3: the shipped payload is the fixture; nothing here justifies
   touching it).
