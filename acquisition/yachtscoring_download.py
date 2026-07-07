#!/usr/bin/env python3
"""
Download the scratch sheet (entry list) and race results for a YachtScoring
event into CSV files.

YachtScoring's site is a React SPA backed by an undocumented but open JSON
API at https://api.yachtscoring.com/v1. The endpoints used here (discovered
from the site's JS bundle):

    /public/event/{eventId}                       -- event metadata
    /public/event/{eventId}/boats?page=N          -- scratch sheet (10/page)
    /public/event/{eventId}/races                 -- list of scored races
    /public/event/{eventId}/result-detail-report?raceNumber=N
                                                  -- per-race results with
                                                     elapsed/corrected times

The eventId is the number in a https://yachtscoring.com/emenu/<eventId> URL.

Usage:
    python3 yachtscoring_download.py 50065
    python3 yachtscoring_download.py 50065 --prefix ildr2025
"""
import argparse
import csv
import json
import sys
import time
import urllib.error
import urllib.request

API = "https://api.yachtscoring.com/v1"


def fetch_json(path: str, retries: int = 4):
    url = f"{API}{path}"
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
    for attempt in range(retries):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as e:
            if e.code in (500, 502, 503, 504) and attempt < retries - 1:
                time.sleep(2 * (attempt + 1))
                continue
            raise
    raise AssertionError("unreachable")


def fetch_all_boats(event_id: int):
    boats, page = [], 1
    while True:
        d = fetch_json(f"/public/event/{event_id}/boats?page={page}")
        boats.extend(d["rows"])
        if len(boats) >= d["count"] or not d["rows"]:
            return boats
        page += 1


def owner_name(owner) -> str:
    if not owner:
        return ""
    return " ".join(x for x in [owner.get("firstName"), owner.get("lastName")] if x)


def write_scratch_sheet(event_id: int, path: str, ratings=None):
    # ratings: optional {eventBoatId: rating} pulled from the results report,
    # since the public boats endpoint doesn't carry the rating itself
    ratings = ratings or {}
    boats = fetch_all_boats(event_id)
    fields = ["boat_name", "sail_number", "design", "length", "bow_number",
              "circle", "division", "class_name", "rating", "owner", "owner_city",
              "owner_state", "owner_club", "tactician", "status", "checked_in"]
    with open(path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        for b in sorted(boats, key=lambda b: ((b.get("split") or {}).get("splitDivision") or "",
                                              (b.get("split") or {}).get("splitClass") or 0,
                                              b.get("name") or "")):
            split = b.get("split") or {}
            owner = b.get("owner") or {}
            w.writerow({
                "boat_name": b.get("name"),
                "sail_number": f"{b.get('sailPrefix') or ''}{b.get('sailNumber') or ''}",
                "design": b.get("design"),
                "length": b.get("length"),
                "bow_number": b.get("bowNumber"),
                "circle": split.get("splitCircle"),
                "division": split.get("splitDivision"),
                "class_name": split.get("splitClassName"),
                "rating": ratings.get(b.get("id")),
                "owner": owner_name(owner),
                "owner_city": owner.get("city"),
                "owner_state": owner.get("state"),
                "owner_club": owner.get("club"),
                "tactician": b.get("crewTactician"),
                "status": b.get("status"),
                "checked_in": b.get("hasCheckedIn"),
            })
    print(f"Wrote {len(boats)} entries to {path}")


def write_results(event_id: int, path: str):
    races = fetch_json(f"/public/event/{event_id}/races")["rows"]
    race_numbers = sorted(set(r["raceNumber"] for r in races))
    fields = ["race_number", "circle", "division", "class_name", "place_class",
              "place_overall", "boat_name", "sail_number", "design", "owner",
              "rating", "finish_status", "finish_time_utc", "elapsed_sec",
              "corrected_sec", "elapsed_hms", "corrected_hms"]
    rows = []
    ratings = {}
    for rn in race_numbers:
        d = fetch_json(f"/public/event/{event_id}/result-detail-report?raceNumber={rn}")
        for circle in d["data"]:
            for div in circle["divisions"]:
                for cls in div["classes"]:
                    for b in cls["boats"]:
                        ratings[b.get("eventBoatId")] = b.get("rating")
                        rows.append({
                            "race_number": rn,
                            "circle": circle.get("circleName"),
                            "division": div.get("divisionName"),
                            "class_name": cls.get("className"),
                            "place_class": b.get("placeClass"),
                            "place_overall": b.get("placeOverall"),
                            "boat_name": b.get("name"),
                            "sail_number": f"{b.get('sailPrefix') or ''}{b.get('sailNumber') or ''}",
                            "design": b.get("design"),
                            "owner": owner_name(b.get("owner")),
                            "rating": b.get("rating"),
                            "finish_status": b.get("finishStatus"),
                            "finish_time_utc": b.get("finishTime"),
                            "elapsed_sec": b.get("elapsedTime"),
                            "corrected_sec": b.get("correctedTime"),
                            "elapsed_hms": hms(b.get("elapsedTime")),
                            "corrected_hms": hms(b.get("correctedTime")),
                        })
    with open(path, "w", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields)
        w.writeheader()
        w.writerows(rows)
    print(f"Wrote {len(rows)} result rows ({len(race_numbers)} race(s)) to {path}")
    return ratings


def hms(seconds):
    if seconds is None:
        return ""
    seconds = int(seconds)
    h, rem = divmod(seconds, 3600)
    m, s = divmod(rem, 60)
    return f"{h}:{m:02d}:{s:02d}"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("event_id", type=int, help="YachtScoring event id (from yachtscoring.com/emenu/<id>)")
    ap.add_argument("--prefix", default=None, help="output filename prefix (default: ys<event_id>)")
    args = ap.parse_args()

    event = fetch_json(f"/public/event/{args.event_id}")
    print(f"Event {event['id']}: {event['name']}", file=sys.stderr)
    if event.get("satTrackingUrl"):
        print(f"  (tracker: {event['satTrackingUrl']})", file=sys.stderr)

    prefix = args.prefix or f"ys{args.event_id}"
    ratings = write_results(args.event_id, f"{prefix}_results.csv")
    write_scratch_sheet(args.event_id, f"{prefix}_scratch_sheet.csv", ratings)


if __name__ == "__main__":
    main()
