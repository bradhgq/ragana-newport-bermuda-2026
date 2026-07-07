#!/usr/bin/env python3
"""
Download timestamped lat/lon tracks for every boat in a YB Tracking race
(e.g. https://pro.yb.tl/<race>/) and save them to CSV/JSON.

YB Tracking has no public documented API, but the race viewer webapp itself
pulls data from a small set of undocumented endpoints:

    {server}/JSON/{race}/RaceSetup           -- boat list/metadata (JSON)
    {server}/JSON/{race}/leaderboard         -- standings (JSON)
    {server}/BIN/{race}/AllPositions3        -- full position history (binary)

The binary format is a compact delta-encoded track format. The parser below
is a direct Python port of the decoder in the open-source `decyb` project
(https://github.com/rahra/decyb), which itself was reverse engineered from
YB's own JS client (html/decyb.js: function parse(e)).

Usage:
    python3 yb_tracker_download.py nb2026
    python3 yb_tracker_download.py nb2026 --server https://cf.yb.tl --out nb2026_tracks.csv
"""
import argparse
import csv
import json
import struct
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timezone


def fetch(url: str, retries: int = 4) -> bytes:
    # cf.yb.tl (CloudFront) intermittently 503s on cache misses; a short
    # retry clears it up almost every time.
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return resp.read()
        except urllib.error.HTTPError as e:
            if e.code in (500, 502, 503, 504) and attempt < retries - 1:
                time.sleep(2 * (attempt + 1))
                continue
            raise
    raise AssertionError("unreachable")


def fetch_json(url: str):
    # YB serves JSON as text/plain;charset=ISO-8859-1 despite containing
    # UTF-8-unsafe bytes from names like "Stäuber" -- decode as latin-1.
    return json.loads(fetch(url).decode("latin-1"))


def parse_positions(buf: bytes):
    """Port of decyb.js parse(e): decode the AllPositions3 binary blob."""
    flags = buf[0]
    has_alt = bool(flags & 1)
    has_dtf = bool(flags & 2)
    has_lap = bool(flags & 4)
    has_pc = bool(flags & 8)

    (base_time,) = struct.unpack_from(">I", buf, 1)

    pos = 5
    n = len(buf)
    boats = []

    while pos < n:
        (boat_id,) = struct.unpack_from(">H", buf, pos); pos += 2
        (count,) = struct.unpack_from(">H", buf, pos); pos += 2

        moments = []
        prev = None
        for _ in range(count):
            header = buf[pos]
            m = {}
            if header & 128:
                # delta-encoded moment (relative to the previous one)
                assert prev is not None, "first moment for a boat must be absolute"
                (w,) = struct.unpack_from(">H", buf, pos); pos += 2
                (dlat,) = struct.unpack_from(">h", buf, pos); pos += 2
                (dlon,) = struct.unpack_from(">h", buf, pos); pos += 2
                if has_alt:
                    (m["alt"],) = struct.unpack_from(">h", buf, pos); pos += 2
                if has_dtf:
                    (f,) = struct.unpack_from(">h", buf, pos); pos += 2
                    m["dtf"] = prev["dtf"] + f
                    if has_lap:
                        m["lap"] = buf[pos]; pos += 1
                if has_pc:
                    (pc,) = struct.unpack_from(">h", buf, pos); pos += 2
                    m["pc"] = pc / 32000.0
                w &= 32767
                m["lat"] = prev["lat"] + dlat
                m["lon"] = prev["lon"] + dlon
                m["at"] = prev["at"] - w
            else:
                # absolute moment
                (t,) = struct.unpack_from(">I", buf, pos); pos += 4
                (lat,) = struct.unpack_from(">i", buf, pos); pos += 4
                (lon,) = struct.unpack_from(">i", buf, pos); pos += 4
                if has_alt:
                    (m["alt"],) = struct.unpack_from(">h", buf, pos); pos += 2
                if has_dtf:
                    (dtf,) = struct.unpack_from(">i", buf, pos); pos += 4
                    m["dtf"] = dtf
                    if has_lap:
                        m["lap"] = buf[pos]; pos += 1
                if has_pc:
                    (pc,) = struct.unpack_from(">i", buf, pos); pos += 4
                    m["pc"] = pc / 21000000.0
                m["lat"] = lat
                m["lon"] = lon
                m["at"] = base_time + t

            moments.append(m)
            prev = m

        for m in moments:
            m["lat"] /= 1e5
            m["lon"] /= 1e5

        boats.append({"id": boat_id, "moments": moments})

    return boats


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("race", help="race id, e.g. nb2026 (from the pro.yb.tl/<race>/ URL)")
    ap.add_argument("--server", default="https://cf.yb.tl", help="YB API host (default: %(default)s)")
    ap.add_argument("--out", default=None, help="output CSV path (default: <race>_tracks.csv)")
    ap.add_argument("--json-out", default=None, help="optional output JSON path")
    ap.add_argument("--include-dtf", action="store_true",
                    help="emit YB's embedded dtf column when the binary carries it "
                         "(raw YB units, CORROBORATION ONLY — the pipeline's own "
                         "distance-remaining is the spine)")
    args = ap.parse_args()

    out_csv = args.out or f"{args.race}_tracks.csv"

    print(f"Fetching race setup for '{args.race}'...", file=sys.stderr)
    setup = fetch_json(f"{args.server}/JSON/{args.race}/RaceSetup?t=1")
    names = {team["id"]: team.get("name", f"boat-{team['id']}") for team in setup.get("teams", [])}
    print(f"  {len(names)} boats found", file=sys.stderr)

    print("Fetching position history (binary)...", file=sys.stderr)
    raw = fetch(f"{args.server}/BIN/{args.race}/AllPositions3?t=1")
    print(f"  {len(raw)} bytes", file=sys.stderr)

    boats = parse_positions(raw)

    has_dtf = bool(raw[0] & 2)
    if args.include_dtf and not has_dtf:
        print("note: --include-dtf requested but this race's binary carries no dtf channel", file=sys.stderr)
    emit_dtf = args.include_dtf and has_dtf

    rows = []
    for boat in boats:
        boat_id = boat["id"]
        name = names.get(boat_id, f"boat-{boat_id}")
        for m in boat["moments"]:
            row = {
                "boat_id": boat_id,
                "boat_name": name,
                "timestamp_utc": datetime.fromtimestamp(m["at"], tz=timezone.utc).isoformat(),
                "epoch": m["at"],
                "lat": m["lat"],
                "lon": m["lon"],
            }
            if emit_dtf:
                row["dtf_yb"] = m.get("dtf")
            rows.append(row)

    rows.sort(key=lambda r: (r["boat_name"], r["epoch"]))

    fieldnames = ["boat_id", "boat_name", "timestamp_utc", "epoch", "lat", "lon"] + (["dtf_yb"] if emit_dtf else [])
    with open(out_csv, "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=fieldnames)
        writer.writeheader()
        writer.writerows(rows)
    print(f"Wrote {len(rows)} position rows for {len(boats)} boats to {out_csv}")

    if args.json_out:
        with open(args.json_out, "w") as f:
            json.dump(rows, f)
        print(f"Wrote JSON to {args.json_out}")


if __name__ == "__main__":
    main()
