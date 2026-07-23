#!/usr/bin/env python3
"""ALIR 2025 payload postprocess — reproducible, logged (prime rule 1).

Run by build_race.py AFTER build_data.py, BEFORE the shell build (cwd = race dir).

One job: the UNIFIED OVERALL LADDER. The organizer scores three circles
separately, so meta.sdl (place_overall from the results CSV) carries three
different rank scales and three boats hold "#1" — the ranked list rendered
#1 Daffodil / #1 Dolcezza / #1 Max, which the owner ruled confusing
(stage-2 stop, 2026-07-23; decisions/stage-0-scope.yaml cross_circle_comparison
records the unified ladder itself as an approved UNOFFICIAL view).

All 43 in-scope finishers race the identical 207.0 nm ToD formula (stage-0
verified exact, including Daffodil's NEMA rating), so one corrected-seconds
sort is arithmetically well-defined:

  meta.sdl  <- unified corrected rank 1..43 (the ranked list + chips read this)
  meta.note <- the official per-circle standing, so the detail surface renders
               BOTH ("Official: 1st of 1, Multihull circle · unified 30/43"...)

cls / clsPos (division + in-division rank) are untouched — official scoring
stays visible everywhere it already was.
"""
import json
import pathlib

OUT = pathlib.Path("out/dashboard_data.json")
CIRCLE_SHORT = {
    "Multihull": "Multihull circle",
    "Non-Spinnaker": "Non-Spinnaker circle",
    "Spinnaker": "Spinnaker circle",
}


def circle_of(cls: str) -> str:
    if "Multihull" in cls:
        return "Multihull"
    if "Non-Spinnaker" in cls:
        return "Non-Spinnaker"
    return "Spinnaker"


def dur_s(hms: str) -> int:
    h, m, s = hms.split(":")
    return int(h) * 3600 + int(m) * 60 + int(s)


def main() -> None:
    d = json.loads(OUT.read_text())
    finishers = [(dur_s(b["meta"]["corr"]), nm) for nm, b in d["boats"].items()
                 if b["meta"].get("corr")]
    finishers.sort()

    # official per-circle overall rank, recomputed from the same corrected sort
    # (equals the results CSV's place_overall; asserted below, never assumed)
    by_circle = {}
    for _, nm in finishers:
        c = circle_of(d["boats"][nm]["meta"]["cls"])
        by_circle.setdefault(c, []).append(nm)

    for uni, (_, nm) in enumerate(finishers, 1):
        meta = d["boats"][nm]["meta"]
        c = circle_of(meta["cls"])
        circ_rank = by_circle[c].index(nm) + 1
        official_sdl = meta["sdl"]
        assert official_sdl == circ_rank, (
            f"{nm}: recomputed circle rank {circ_rank} != official place_overall "
            f"{official_sdl} — refusing to overwrite a rank I cannot reproduce")
        meta["sdl"] = uni
        n_circ = len(by_circle[c])
        suffix = 'st' if official_sdl == 1 else 'nd' if official_sdl == 2 else 'rd' if official_sdl == 3 else 'th'
        meta["note"] = (f"Unofficial unified ladder: {uni}/{len(finishers)} · "
                        f"official {official_sdl}{suffix} overall, {CIRCLE_SHORT[c]} "
                        f"({n_circ} boat{'s' if n_circ != 1 else ''})")

    OUT.write_text(json.dumps(d, separators=(",", ":")))
    print(f"postprocess: unified ladder applied to {len(finishers)} finishers "
          f"(circles: { {c: len(v) for c, v in by_circle.items()} }); "
          f"official circle ranks preserved in meta.note")


if __name__ == "__main__":
    main()
