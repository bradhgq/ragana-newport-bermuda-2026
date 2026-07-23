#!/usr/bin/env python3
"""Trim each boat's track to its own racing window — the de-noise step.

A tracker is switched on before the boat leaves the dock and often stays on for
the delivery home, so a raw export carries two kinds of non-race motion that
corrupt fleet-frame views: pre-start milling about, and post-finish (or
post-retirement) travel. On ALIR 2025 the worst case is Scarlett, who retired
off Fire Island and whose tracker then travelled up the Hudson to Kingston NY —
468 pings north of 41.3N, stretching the fleet bounding box by ~38 nm. Dolcezza
kept transmitting for 9 hours after finishing.

Excluding such boats would be wrong: they raced. Trimming is the honest fix.

Per boat, keep pings in [start_cut, end_cut]:

  start_cut = that boat's division start (official finish - elapsed, read on the
              EDT-mislabelled results clock and converted to true UTC) minus
              PRE_PAD. Boats with no results row keep the global race start.

  end_cut   = for a FINISHER, her official finish time plus POST_PAD — the exact
              instant is published, so use it rather than inferring one.
              For a boat with no finish (RET/DNC), the moment she reached her
              MINIMUM routed distance-to-finish, plus POST_PAD: the furthest she
              ever got. Everything after that is motion away from the finish —
              delivery, tow, or trailer.
              (Minimum-DTF is deliberately NOT used for finishers: the routed
              model clamps distance to zero once a boat is abeam of the finish
              waypoint, which can precede the actual line crossing by minutes.)

Distance-to-finish is computed with the same `pipeline.route.Course` the
pipeline uses, from the same config polyline, so the trim and the analysis agree
on what "toward the finish" means.

Run from the repo root:  python3 races/alir2025/trim_tracks.py
"""
import csv
import pathlib
import sys
from collections import defaultdict
from datetime import datetime, timezone

import yaml

RACE = pathlib.Path(__file__).parent
sys.path.insert(0, str(RACE.parent.parent / "starter"))
from pipeline.route import Course  # noqa: E402

PRE_PAD_S = 15 * 60      # keep a quarter hour of pre-start manoeuvring
POST_PAD_S = 5 * 60      # keep a few pings past the line for a clean finish frame


def load_cfg():
    return yaml.safe_load((RACE / "config.yaml").open())


def norm(name):
    """Join key: case- and spacing-insensitive, YCC suffix dropped.

    Tracker and results spellings differ (ACADIA/Acadia, Habiru/Habiru YCC), and
    the config's name_overrides deliberately no longer carry the case-only pairs,
    so this script does its own normalization rather than depending on them.
    """
    return " ".join(name.upper().replace(" YCC", "").split())


def race_windows(results_path, utc_offset_h):
    """Tracker-normalized name -> (division start epoch, finish epoch or None), true UTC.

    The results finish column is EDT wall clock carrying a spurious Z, so the
    parsed value is short of true UTC by exactly utc_offset (see the stage-0
    record). Division start comes from finish - elapsed, one value per division;
    boats that did not finish inherit their division's start and get no finish.
    """
    rows = list(csv.DictReader(results_path.open(newline="", encoding="utf-8")))
    finish = {}
    starts = {}
    for r in rows:
        if r["finish_status"] != "AOK" or not r["finish_time_utc"]:
            continue
        fin = datetime.fromisoformat(r["finish_time_utc"].replace("Z", "+00:00")).timestamp()
        fin -= utc_offset_h * 3600          # utc_offset is negative; this ADDS the 4 h
        finish[norm(r["boat_name"])] = fin
        starts.setdefault(r["class_name"], set()).add(fin - int(r["elapsed_sec"]))
    starts = {k: min(v) for k, v in starts.items()}
    out = {}
    for r in rows:
        k = norm(r["boat_name"])
        out[k] = (starts.get(r["class_name"]), finish.get(k))
    return out


def main():
    cfg = load_cfg()
    c = cfg["course"]
    course = Course([c["start"]] + c["marks"] + [c["finish"]], c.get("mark_radius_nm", 1.0))
    src = RACE / "raw" / "alir2025_tracks.csv"
    dst = RACE / "raw" / "alir2025_tracks_clean.csv"

    windows = race_windows(RACE / "raw" / "alir2025_results.csv", cfg["time"]["utc_offset"])
    race_start = datetime.fromisoformat(cfg["time"]["race_start_utc"]).timestamp()
    excluded = {n.strip().lower() for n in cfg.get("exclude_boats") or []}

    rows = list(csv.DictReader(src.open(newline="", encoding="utf-8")))
    by_boat = defaultdict(list)
    for r in rows:
        by_boat[r["boat_name"]].append(r)

    kept, report = [], []
    for boat, pings in by_boat.items():
        pings.sort(key=lambda r: int(r["epoch"]))
        # drop duplicate (boat, epoch) rows, keeping the first
        seen, uniq = set(), []
        for r in pings:
            if r["epoch"] in seen:
                continue
            seen.add(r["epoch"])
            uniq.append(r)
        dups = len(pings) - len(uniq)

        if boat.strip().lower() in excluded:
            report.append((boat, len(pings), 0, dups, "excluded by config"))
            continue

        div_start, fin = windows.get(norm(boat), (None, None))
        start_cut = (div_start if div_start is not None else race_start) - PRE_PAD_S

        if fin is not None:
            end_cut = fin + POST_PAD_S
            why = f"finished {datetime.fromtimestamp(fin, tz=timezone.utc):%m-%d %H:%MZ}"
        else:
            lat = [float(r["lat"]) for r in uniq]
            lon = [float(r["lon"]) for r in uniq]
            dtf, _xte, _leg = course.dtf_xte(lat, lon)
            i_min = min(range(len(uniq)), key=lambda i: dtf[i])
            end_cut = int(uniq[i_min]["epoch"]) + POST_PAD_S
            why = (f"no finish; furthest point {dtf[i_min]:.1f} nm to go @ "
                   f"{datetime.fromtimestamp(int(uniq[i_min]['epoch']), tz=timezone.utc):%m-%d %H:%MZ}")

        out = [r for r in uniq if start_cut <= int(r["epoch"]) <= end_cut]
        kept.extend(out)
        report.append((boat, len(pings), len(out), dups, why))

    kept.sort(key=lambda r: (r["boat_name"], int(r["epoch"])))
    with dst.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(kept)

    print(f"{src.name}: {len(rows)} rows -> {dst.name}: {len(kept)} rows")
    print(f"{'boat':22s} {'raw':>6s} {'kept':>6s} {'dup':>4s}  note")
    for boat, n, k, d, note in sorted(report, key=lambda x: x[1] - x[2], reverse=True):
        flag = "  <-- large trim" if n - k > 150 else ""
        print(f"  {boat:20s} {n:6d} {k:6d} {d:4d}  {note}{flag}")


if __name__ == "__main__":
    main()
