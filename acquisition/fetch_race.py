#!/usr/bin/env python3
"""One-command race acquisition: YachtScoring results + scratch sheet, the YB
tracker id parsed from satTrackingUrl, the full YB track history, a proposed
YB↔YS name-join table, and a manifest with every CP-0-relevant warning.

    python3 acquisition/fetch_race.py <ysEventId> [--yb <raceId>] [--prefix p] [--out-dir raw/]
    python3 acquisition/fetch_race.py --yb <raceId> [--prefix p] [--out-dir raw/]   # YB-only (e.g. Newport Bermuda)

Stdlib only. NETWORK-DEPENDENT — never runs in CI. The join table is a
PROPOSAL: review it at CP-0, never auto-merge (names are dirty, doctrine 4).
"""
import argparse
import hashlib
import json
import re
import sys
import time
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import yachtscoring_download as ys           # noqa: E402
import yb_tracker_download as yb             # noqa: E402


def norm(s):
    return re.sub(r'\s+', ' ', unicodedata.normalize('NFC', str(s or '')).strip()).lower()


def norm_sail(s):
    return re.sub(r'[^a-z0-9]', '', str(s or '').lower())


def yb_id_from_url(url):
    m = re.search(r'yb\.tl/(?:races/)?([A-Za-z0-9_-]+)', url or '')
    return m.group(1) if m else None


def download_yb(race_id, out_dir, prefix, warn):
    print(f"Fetching YB race setup for '{race_id}'…", file=sys.stderr)
    setup = yb.fetch_json(f'https://cf.yb.tl/JSON/{race_id}/RaceSetup?t=1')
    teams = setup.get('teams', [])
    names = {t['id']: t.get('name', f'boat-{t["id"]}') for t in teams}
    print(f'  {len(teams)} boats in RaceSetup', file=sys.stderr)
    raw = yb.fetch(f'https://cf.yb.tl/BIN/{race_id}/AllPositions3?t=1')
    boats = yb.parse_positions(raw)
    if len(boats) != len(teams):
        warn(f'YB decoded {len(boats)} tracked boats but RaceSetup lists {len(teams)} — '
             f'public track data is a SUBSET of the fleet (the Ida Lewis case)')
    rows = []
    for boat in boats:
        nm = names.get(boat['id'], f'boat-{boat["id"]}')
        for m in boat['moments']:
            rows.append({'boat_id': boat['id'], 'boat_name': nm,
                         'timestamp_utc': __import__('datetime').datetime.fromtimestamp(
                             m['at'], tz=__import__('datetime').timezone.utc).isoformat(),
                         'epoch': m['at'], 'lat': m['lat'], 'lon': m['lon']})
    rows.sort(key=lambda r: (r['boat_name'], r['epoch']))
    path = out_dir / f'{prefix}_tracks.csv'
    import csv
    with open(path, 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=['boat_id', 'boat_name', 'timestamp_utc', 'epoch', 'lat', 'lon'])
        w.writeheader()
        w.writerows(rows)
    print(f'Wrote {len(rows)} position rows for {len(boats)} boats to {path}')
    starts = sorted({t.get('start') for t in teams if t.get('start')})
    return dict(teams=teams, tracked=len(boats), pings=len(rows),
                team_starts=starts, tracks_file=path.name)


def propose_join(teams, entries, out_dir, prefix, warn):
    """Proposed YB↔YS join by normalized name, sail number as tiebreaker/fallback.
    Emits <prefix>_name_join.csv; every mismatch is listed, nothing is merged."""
    import csv
    ys_rows = [{'name': e.get('boat_name') or '', 'sail': e.get('sail_number') or ''} for e in entries]
    ys_by_name = {}
    for e in ys_rows:
        ys_by_name.setdefault(norm(e['name']), []).append(e)
    ys_by_sail = {norm_sail(e['sail']): e for e in ys_rows if norm_sail(e['sail'])}
    used = set()
    rows, mismatches = [], 0
    for t in teams:
        tn, tsail = t.get('name', ''), t.get('sail', '')
        cand = ys_by_name.get(norm(tn), [])
        if len(cand) == 1:
            rows.append({'yb_name': tn, 'ys_name': cand[0]['name'], 'sail': cand[0]['sail'], 'match': 'name'})
            used.add(norm(cand[0]['name']))
        elif len(cand) > 1:
            hit = next((c for c in cand if norm_sail(c['sail']) == norm_sail(tsail)), None)
            rows.append({'yb_name': tn, 'ys_name': hit['name'] if hit else '', 'sail': tsail,
                         'match': 'name+sail' if hit else 'AMBIGUOUS-NAME'})
            mismatches += 0 if hit else 1
        elif norm_sail(tsail) in ys_by_sail:
            e = ys_by_sail[norm_sail(tsail)]
            rows.append({'yb_name': tn, 'ys_name': e['name'], 'sail': e['sail'], 'match': 'sail-only'})
            used.add(norm(e['name']))
            mismatches += 1   # sail-only matches deserve human eyes
        else:
            rows.append({'yb_name': tn, 'ys_name': '', 'sail': tsail, 'match': 'UNMATCHED-YB'})
            mismatches += 1
    for e in ys_rows:
        if norm(e['name']) not in used and not any(r['ys_name'] == e['name'] for r in rows):
            rows.append({'yb_name': '', 'ys_name': e['name'], 'sail': e['sail'], 'match': 'UNMATCHED-YS'})
            mismatches += 1
    path = out_dir / f'{prefix}_name_join.csv'
    with open(path, 'w', newline='') as f:
        w = csv.DictWriter(f, fieldnames=['yb_name', 'ys_name', 'sail', 'match'])
        w.writeheader()
        w.writerows(rows)
    if mismatches:
        warn(f'{mismatches} name-join row(s) need review in {path.name} '
             f'(sail-only / ambiguous / unmatched) — the join is a PROPOSAL, confirm at CP-0')
    print(f'Wrote proposed name join ({len(rows)} rows, {mismatches} to review) to {path}')
    return path.name, mismatches


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('ys_event_id', nargs='?', type=int, help='YachtScoring event id (omit for YB-only races)')
    ap.add_argument('--yb', help='YB race id (overrides / replaces satTrackingUrl discovery)')
    ap.add_argument('--prefix', help='output filename prefix')
    ap.add_argument('--out-dir', default='.', help='output directory (default: cwd; use races/<race>/raw/)')
    args = ap.parse_args()
    if not args.ys_event_id and not args.yb:
        ap.error('need a YachtScoring event id, --yb, or both')
    out_dir = Path(args.out_dir)
    out_dir.mkdir(parents=True, exist_ok=True)

    warnings = []
    def warn(msg):
        warnings.append(msg)
        print(f'\n*** CP-0 WARNING: {msg}\n', file=sys.stderr)

    manifest = {'fetched': time.strftime('%Y-%m-%dT%H:%M:%S%z'), 'warnings': warnings}
    entries, results_count, division_starts = [], None, []

    if args.ys_event_id:
        event = ys.fetch_json(f'/public/event/{args.ys_event_id}')
        prefix = args.prefix or f'ys{args.ys_event_id}'
        print(f'Event {event["id"]}: {event["name"]}', file=sys.stderr)
        manifest['race'] = {'name': event.get('name'), 'dates': event.get('eventDates'),
                            'venue': event.get('venue'), 'ys_event_id': event['id']}
        sat = event.get('satTrackingUrl')
        yb_race = args.yb or yb_id_from_url(sat)
        if sat:
            print(f'  satTrackingUrl: {sat} -> yb id {yb_id_from_url(sat)}', file=sys.stderr)
        elif not args.yb:
            warn('YachtScoring event has no satTrackingUrl and no --yb given — tracks skipped; '
                 'find the tracker link on the organizer site')
        ratings = ys.write_results(args.ys_event_id, str(out_dir / f'{prefix}_results.csv'))
        ys.write_scratch_sheet(args.ys_event_id, str(out_dir / f'{prefix}_scratch_sheet.csv'), ratings)
        import csv
        with open(out_dir / f'{prefix}_scratch_sheet.csv', newline='') as f:
            entries = list(csv.DictReader(f))
        with open(out_dir / f'{prefix}_results.csv', newline='') as f:
            results_rows = list(csv.DictReader(f))
        results_count = len(results_rows)
        try:
            races = ys.fetch_json(f'/public/event/{args.ys_event_id}/races')['rows']
            division_starts = [{'race_number': r.get('raceNumber'), 'name': r.get('name'),
                                'start_time': r.get('startTime')} for r in races]
        except Exception as e:   # start times are advisory — never fail the fetch on them
            warn(f'could not fetch per-division start times: {e}')
        manifest['files'] = {f'{prefix}_results.csv': results_count,
                             f'{prefix}_scratch_sheet.csv': len(entries)}
    else:
        yb_race = args.yb
        prefix = args.prefix or yb_race
        manifest['race'] = {'ys_event_id': None,
                            'note': 'YB-only race — results must come from the organizer '
                                    '(e.g. Newport Bermuda is not on YachtScoring)'}
        warn('no YachtScoring event: scratch sheet and official results NOT downloaded — '
             'source them from the organizer before stage 0 completes')

    yb_info = None
    if yb_race:
        yb_info = download_yb(yb_race, out_dir, prefix, warn)
        manifest['race']['yb_race_id'] = yb_race
        if entries:
            active = [e for e in entries if (e.get('status') or '').upper() != 'INACTIVE']
            if yb_info['tracked'] < len(active):
                warn(f'coverage: {yb_info["tracked"]} tracked boats vs {len(active)} active entries '
                     f'({len(entries)} incl. withdrawn) — spatial analysis is limited to the tracked subset')
            join_file, join_mismatches = propose_join(yb_info['teams'], entries, out_dir, prefix, warn)
            manifest['name_join'] = {'file': join_file, 'rows_to_review': join_mismatches}
        manifest['coverage'] = {'tracked_boats': yb_info['tracked'], 'ping_rows': yb_info['pings'],
                                'raceSetup_teams': len(yb_info['teams']),
                                'entries': len(entries) or None, 'results_rows': results_count}
        manifest['start_times'] = {'yb_team_starts_epoch': yb_info['team_starts'][:20],
                                   'ys_division_starts': division_starts,
                                   'note': 'cross-check config start_method (finish − elapsed) against these'}
        manifest['files'] = {**manifest.get('files', {}), yb_info['tracks_file']: yb_info['pings']}

    for fname in list(manifest.get('files', {})):
        p = out_dir / fname
        if p.exists():
            manifest.setdefault('sha256', {})[fname] = hashlib.sha256(p.read_bytes()).hexdigest()

    mpath = out_dir / f'{prefix}_manifest.json'
    mpath.write_text(json.dumps(manifest, indent=2))
    print(f'\nManifest: {mpath}')
    if warnings:
        print(f'{len(warnings)} CP-0 warning(s) — carry them into the Scope Record:', file=sys.stderr)
        for w in warnings:
            print(f'  - {w}', file=sys.stderr)
    else:
        print('No coverage warnings.', file=sys.stderr)


if __name__ == '__main__':
    main()
