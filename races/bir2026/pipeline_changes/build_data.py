#!/usr/bin/env python3
"""Config-driven dashboard-data builder — the generalized export_json.py.

    python3 pipeline/build_data.py races/<race>/config.yaml

Reads config.yaml, the official-results CSV, events.yaml (+ optional
navlog.yaml), and the tracker export via its vendor adapter; emits
    <race>/out/dashboard_data.json     the canonical payload (schemas.md)
    <race>/out/goldens.json            frozen fixtures for the JS harness
    <race>/out/run_log.json            invocation + input hashes (prime rule 1)

No boat names, paths, course lengths, or narrative text live in this file —
facts about the race come from config; narrative comes from events.yaml.
"""
import argparse
import csv
import hashlib
import json
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd
import yaml

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from adapters import canonical                              # noqa: E402
from pipeline import geo, reconcile, route, scoring, zones  # noqa: E402
from pipeline.rounding import TieTracker                   # noqa: E402


def pick_adapter(cfg, tracker_path):
    import adapters.yb
    registry = [adapters.yb]
    vendor = cfg['tracker']['vendor']
    if vendor != 'auto':
        for mod in registry:
            if mod.ADAPTER['vendor'] == vendor:
                return mod
        raise SystemExit(f'no adapter for tracker.vendor={vendor!r}')
    hits = [m for m in registry if m.detect(tracker_path)]
    if len(hits) != 1:
        raise SystemExit(f'tracker.vendor=auto matched {len(hits)} adapters for '
                         f'{tracker_path} — specify the vendor explicitly')
    return hits[0]


def read_results(path, colmap):
    """Official results CSV -> ordered list of row dicts with typed fields."""
    rows = []
    with open(path, newline='') as f:
        for raw in csv.DictReader(f):
            g = lambda key: raw.get(colmap[key], '').strip() if key in colmap else ''
            row = {
                'rank': int(g('rank')) if g('rank') else None,
                'name': raw[colmap['name']],          # NOT stripped — hygiene is norm_key's job
                'sail': g('sail'),
                'rating': float(g('rating')) if g('rating') else None,
                'type': g('type'),
                'elapsed': g('elapsed') or None,
                'corrected': g('corrected') or None,
                'finish_local': g('finish_local') or None,
                'division': g('division'),
                'class_rank': int(g('class_rank')) if g('class_rank') else None,
                'status': g('status') or 'FIN',
                'retire_reason': g('retire_reason'),
            }
            rows.append(row)
    return rows


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('config', help='races/<race>/config.yaml')
    args = ap.parse_args()
    cfg_path = Path(args.config).resolve()
    race_dir = cfg_path.parent
    cfg = yaml.safe_load(cfg_path.read_text())

    utc_offset = cfg['time']['utc_offset']
    tz_label = cfg['time']['tz_label']
    course = cfg['course']
    start_pt = tuple(course['start'])
    finish_pt = tuple(course['finish'])
    course_len = course['official_length_nm']
    finish_radius = course['finish_radius_nm']
    finish_pad_min = cfg.get('finish_pad_min', 3)
    race_start = pd.Timestamp(cfg['time']['race_start_utc'])
    grid_cfg = cfg['grid']
    sog_cfg = cfg['sog']
    hero = cfg['client_boat']

    def ep(s):
        """naive official-local string -> epoch UTC seconds."""
        return int((pd.Timestamp(s).tz_localize('UTC') - pd.Timedelta(hours=utc_offset)).timestamp())

    # ── tracker -> canonical ──
    tracker_path = race_dir / cfg['tracker']['path']
    adapter = pick_adapter(cfg, tracker_path)
    df = adapter.load(tracker_path, cfg)
    df = canonical.apply_name_overrides(df, cfg.get('name_overrides') or {})
    df, vreport = canonical.validate(df)
    gap_report = canonical.ping_gap_report(df)

    lookup = {}
    for n in df['name'].unique():
        lookup.setdefault(canonical.norm_key(n), n)

    # ── official results -> entries (insertion order = output boat order, I8) ──
    res_rows = read_results(race_dir / cfg['official_results']['path'],
                            cfg['official_results']['columns'])
    disp_over = (cfg.get('name_overrides') or {}).get('display') or {}
    groups = cfg['groups']

    def grp_for(rank, disp):
        if disp == hero:
            return groups['hero_key']
        for key, ranks in (groups.get('by_rank') or {}).items():
            if rank in ranks:
                return key
        return groups['default_key']

    finish_statuses = set(cfg['official_results'].get('finish_statuses') or ['FIN'])
    entries = {}          # track name -> meta dict
    name_misses = []
    for row in res_rows:
        track_name = lookup.get(canonical.norm_key(row['name']))
        if not track_name:
            name_misses.append(row['name'])
            continue
        disp = disp_over.get(row['name']) or canonical.display_name(row['name'])
        if row['status'] in finish_statuses:
            entries[track_name] = dict(
                disp=disp, typ=row['type'], tcf=row['rating'],
                cls=row['division'], clsPos=row['class_rank'], sdl=row['rank'],
                corr=row['corrected'], el=row['elapsed'], fin=row['finish_local'],
                grp=grp_for(row['rank'], disp), sail=row['sail'])
        else:
            entries[track_name] = dict(
                disp=disp, typ=row['type'], tcf=None, cls='', clsPos=None, sdl=None,
                corr=None, el=None, fin=None, grp=groups['dnf_key'], sail=row['sail'],
                retireReason=row['retire_reason'])
    for extra in cfg.get('extra_boats') or []:
        if extra['track_name'] not in set(df['name'].unique()):
            name_misses.append(extra['track_name'])
            continue
        entries[extra['track_name']] = dict(
            disp=extra['display'], typ=extra['type'], tcf=None, cls='', clsPos=None,
            sdl=None, corr=None, el=None, fin=None, grp=extra['group'],
            sail=extra.get('sail', ''))

    # ── scoring probe — no fleet math until it passes (stage-2 §4) ──
    probe_input = {m['disp']: {'rating': m['tcf'],
                               'elapsed_s': scoring.parse_duration(m['el']),
                               'official_corrected_s': scoring.parse_duration(m['corr'])}
                   for m in entries.values() if m['el'] and m['corr'] and m['tcf']}
    probe_report = scoring.run_probe(probe_input, course_len, cfg)

    # ── per-boat series ──
    # course.type dispatch: point_to_point measures great-circle DTF/XTE against
    # the rhumb; marks measures BOTH along the waypoint polyline (route.py —
    # conventions documented there). Arrival trims and the fleet ghost layer
    # keep using plain distance-to-finish either way.
    xte_fn = geo.xte_signed(start_pt, finish_pt)
    course_model = None
    if course.get('type', 'point_to_point') == 'marks':
        if not course.get('marks'):
            raise SystemExit('course.type: marks requires a non-empty course.marks waypoint list')
        course_model = route.Course([start_pt] + [tuple(m) for m in course['marks']] + [finish_pt],
                                    course.get('mark_radius_nm', 1.0))

    def series_for(name, fin_local):
        sub = df[df['name'] == name].copy().rename(columns={'t_utc': 'ts'})
        if fin_local:
            fin_utc = pd.Timestamp(fin_local).tz_localize('UTC') - pd.Timedelta(hours=utc_offset)
            sub = sub[(sub['ts'] >= race_start) &
                      (sub['ts'] <= fin_utc + pd.Timedelta(minutes=finish_pad_min))]
        else:
            sub = sub[sub['ts'] >= race_start]
            d = geo.hav(sub['lat'], sub['lon'], *finish_pt)
            # out-and-back guard: start/finish lines can be adjacent, so only
            # search for arrival AFTER the boat has first been >20 nm out
            # (BIR2026: pre-start milling within finish_radius truncated tracks)
            prog = (d.values > 20).argmax() if (d.values > 20).any() else len(sub)
            arr = sub.iloc[prog:][d.values[prog:] < finish_radius]
            if len(arr):
                sub = sub[sub['ts'] <= arr['ts'].iloc[0]]
        sub = sub.drop_duplicates('ts').reset_index(drop=True)
        if not len(sub):
            return sub
        if course_model:
            d, x, _ = course_model.dtf_xte(sub['lat'].values, sub['lon'].values)
            sub['dtf'], sub['xte'] = d, x
        else:
            sub['dtf'] = geo.hav(sub['lat'], sub['lon'], *finish_pt)
            sub['xte'] = xte_fn(sub['lat'].values, sub['lon'].values)
        # resolution-independent epoch seconds (pandas >= 3.0 may store [s] not [ns])
        ts_s = ((sub['ts'] - pd.Timestamp(0, tz='UTC')) // pd.Timedelta(seconds=1)).values
        half, span = sog_cfg['half_window_s'], sog_cfg['min_span_s']
        sog = np.full(len(sub), np.nan)
        for k in range(len(sub)):
            j = np.searchsorted(ts_s, ts_s[k] - half)
            m = min(np.searchsorted(ts_s, ts_s[k] + half), len(sub) - 1)
            if m > j and ts_s[m] - ts_s[j] > span:
                dd = geo.hav(sub['lat'].iloc[j], sub['lon'].iloc[j],
                             sub['lat'].iloc[m], sub['lon'].iloc[m])
                sog[k] = dd / ((ts_s[m] - ts_s[j]) / 3600.0)
        sub['sog'] = sog
        return sub

    tie = TieTracker()   # records .5-tie rounding sites for compare_data's exemption rule
    grid = pd.date_range(race_start, pd.Timestamp(grid_cfg['end_utc']),
                         freq=f'{grid_cfg["minutes"]}min')
    boats_out, feat_series, skipped = {}, {}, []
    for name, meta in entries.items():
        s = series_for(name, meta['fin'])
        if not len(s):
            skipped.append(name)
            continue
        feat_series[name] = s
        g = s.set_index('ts')[['lat', 'lon', 'dtf', 'xte', 'sog']]
        g = g.reindex(g.index.union(grid)).interpolate('time', limit=grid_cfg['interpolate_limit']).reindex(grid)
        g = g[g.index <= s['ts'].max()]
        g = g.dropna(subset=['lat'])
        disp = meta['disp']
        boats_out[disp] = dict(
            meta=meta,
            t=[int(x.timestamp()) for x in g.index],
            lat=[tie.r(v, 4, f'boats.{disp}.lat[{i}]') for i, v in enumerate(g['lat'])],
            lon=[tie.r(v, 4, f'boats.{disp}.lon[{i}]') for i, v in enumerate(g['lon'])],
            dtf=[tie.r(v, 1, f'boats.{disp}.dtf[{i}]') for i, v in enumerate(g['dtf'])],
            xte=[tie.r(v, 1, f'boats.{disp}.xte[{i}]') for i, v in enumerate(g['xte'])],
            sog=[None if np.isnan(v) else tie.r(v, 1, f'boats.{disp}.sog[{i}]')
                 for i, v in enumerate(g['sog'])])

    # ── milestone corrected-time series (scoring-function corrected, I2 feeds off official) ──
    mil_cfg = cfg['milestones']
    milestones = list(range(mil_cfg['start_nm'], -1, -mil_cfg['step_nm']))
    mil = {}
    for name, meta in entries.items():
        if meta['tcf'] is None or name not in feat_series:
            continue
        fin_utc = pd.Timestamp(meta['fin']).tz_localize('UTC') - pd.Timedelta(hours=utc_offset)
        st = fin_utc - pd.Timedelta(seconds=scoring.parse_duration(meta['el']))
        s = feat_series[name]
        row = []
        for mi, m in enumerate(milestones):
            hit = s[s['dtf'] <= m]
            row.append(tie.rint(scoring.corrected((hit['ts'].iloc[0] - st).total_seconds(),
                                                  {'rating': meta['tcf']}, course_len, cfg),
                                f'mil.series.{meta["disp"]}[{mi}]')
                       if len(hit) else None)
        mil[meta['disp']] = row

    # ── fleet ghost layer: every tracked boat, hourly ──
    fleet_cfg = cfg['fleet']
    fleet = []
    for bid, sub in df.groupby('boat_id'):
        nm = sub['name'].iloc[0]
        sub = sub[sub['t_utc'] >= race_start].copy()
        if not len(sub):
            continue
        d = geo.hav(sub['lat'], sub['lon'], *finish_pt)
        # same out-and-back guard as the per-boat series (see above)
        prog = (d.values > 20).argmax() if (d.values > 20).any() else len(sub)
        arr = sub.iloc[prog:][d.values[prog:] < finish_radius]
        if len(arr):
            sub = sub[sub['t_utc'] <= arr['t_utc'].iloc[0]]
        sub = sub.set_index('t_utc').resample(fleet_cfg['resample']).first().dropna(subset=['lat'])
        if len(sub) < fleet_cfg['min_points']:
            continue
        fi = len(fleet)
        fleet.append(dict(name=nm,
                          t=[int(x.timestamp()) for x in sub.index],
                          lat=[tie.r(v, 3, f'fleet[{fi}].lat[{i}]') for i, v in enumerate(sub['lat'])],
                          lon=[tie.r(v, 3, f'fleet[{fi}].lon[{i}]') for i, v in enumerate(sub['lon'])]))

    # ── narrative layer: events + watches (authored data, post privacy cut) ──
    # privacy.build: 'private' includes private rows (the Tier-2 client artifact);
    # default 'public' keeps the original public-only cut for any public build.
    ev_doc = yaml.safe_load((race_dir / cfg['events']['path']).read_text())
    cat_z = {c: i for i, c in enumerate(cfg['event_categories'])}
    build_vis = cfg.get('privacy', {}).get('build', 'public')
    events = [dict(t=ep(e['t']), cat=e['cat'], label=e['label'], txt=e['txt'])
              for e in ev_doc['events']
              if build_vis == 'private' or e.get('visibility', 'private') == 'public']
    events.sort(key=lambda e: (e['t'], cat_z.get(e['cat'], 0)))
    watches = [[ep(a), ep(b)] for a, b in ev_doc.get('watches') or []]

    # ── slow-zone detection + per-boat traversal metrics (doctrine 1) ──
    # Detection candidates always go to the run log. The SHIPPED zone bounds may
    # instead be an authored CP-2 judgment (zone_detection.zone) — RETROSPECTIVE
    # §5.3 classes park bounds as an analysis framing, and NB2026's 180→80 is
    # empirically not reachable by the threshold rule (see run_log band medians).
    detected, zdiag = zones.detect_zones(feat_series, cfg['zone_detection'])
    authored = cfg['zone_detection'].get('zone')
    active = authored or (detected and {'upper_nm': detected[0]['upper_nm'],
                                        'lower_nm': detected[0]['lower_nm']}) or None
    park = {}
    if active:
        display_of = {k: entries[k]['disp'] for k in feat_series}
        park = zones.traversal_metrics(feat_series, display_of,
                                       active['upper_nm'], active['lower_nm'], tie=tie)

    # ── nav-log reconciliation (optional; requires a paper log) ──
    recon_rows = []
    rc = cfg.get('reconcile')
    if rc and (race_dir / rc['path']).exists():
        fixes = yaml.safe_load((race_dir / rc['path']).read_text())['fixes']
        hero_series = feat_series[lookup[canonical.norm_key(hero)]]
        recon_rows = reconcile.reconcile(fixes, hero_series, utc_offset,
                                         rc.get('matched_key', 'matched_local'), tie=tie)

    # ── client-boat stats ──
    rs = feat_series[lookup[canonical.norm_key(hero)]]
    hop = geo.hav(rs['lat'].shift(), rs['lon'].shift(), rs['lat'], rs['lon']).fillna(0)
    dist_sailed = float(hop.sum())
    sogv = rs['sog'].dropna()
    stats = dict(
        dist_sailed=tie.r(dist_sailed, 1, 'stats.dist_sailed'), rhumb=course_len,
        extra=tie.r(dist_sailed - course_len, 1, 'stats.extra'),
        avg_sog=tie.r(sogv.mean(), 2, 'stats.avg_sog'),
        max_sog=tie.r(sogv.max(), 1, 'stats.max_sog'),
        pct_under3=tie.r((sogv < 3).mean() * 100, 1, 'stats.pct_under3'),
        pct_under5=tie.r((sogv < 5).mean() * 100, 1, 'stats.pct_under5'),
        max_xte_e=tie.r(rs['xte'].max(), 1, 'stats.max_xte_e'),
        max_xte_w=tie.r(rs['xte'].min(), 1, 'stats.max_xte_w'))

    # ── assemble + write ──
    generated = str(cfg.get('output', {}).get('generated') or time.strftime('%Y-%m-%d'))
    data = dict(boats=boats_out, fleet=fleet,
                mil=dict(milestones=milestones, series=mil), parkFair=park,
                events=events, watches=watches, recon=recon_rows, stats=stats,
                start=list(start_pt), fin=list(finish_pt),
                meta=dict(generated=generated, tz=f'{tz_label} (UTC{utc_offset})'))

    out_dir = race_dir / cfg['output']['dir']
    out_dir.mkdir(parents=True, exist_ok=True)
    with open(out_dir / 'dashboard_data.json', 'w') as f:
        json.dump(data, f, separators=(',', ':'))

    goldens = dict(cfg.get('goldens') or {})
    goldens['zone'] = active
    goldens['zone_source'] = 'authored' if authored else 'detected'
    (out_dir / 'goldens.json').write_text(json.dumps(goldens, indent=2))
    (out_dir / 'rounding_ties.json').write_text(json.dumps(tie.ties, separators=(',', ':')))

    def sha(p):
        return hashlib.sha256(Path(p).read_bytes()).hexdigest()
    run_log = dict(
        invocation=' '.join(sys.argv), timestamp=time.strftime('%Y-%m-%dT%H:%M:%S%z'),
        versions=dict(python=sys.version.split()[0], pandas=pd.__version__, numpy=np.__version__),
        inputs={cfg['tracker']['path']: sha(tracker_path),
                cfg['official_results']['path']: sha(race_dir / cfg['official_results']['path']),
                cfg['events']['path']: sha(race_dir / cfg['events']['path'])},
        adapter=adapter.ADAPTER, canonical=vreport,
        course=dict(type=course.get('type', 'point_to_point'),
                    official_length_nm=course_len,
                    polyline_length_nm=(round(course_model.length_nm, 2) if course_model else None),
                    length_delta_nm=(round(course_model.length_nm - course_len, 2)
                                     if course_model else None)),
        ping_gap_anomalies=[g for g in gap_report if g['anomalous']],
        name_misses=name_misses, skipped_no_track=skipped,
        probe=probe_report,
        zone_detection=dict(candidates=detected, active_zone=active,
                            zone_source='authored' if authored else 'detected', **zdiag))
    (out_dir / 'run_log.json').write_text(json.dumps(run_log, indent=2, default=str))

    print(f'boats: {len(boats_out)} | fleet tracks: {len(fleet)} | events: {len(events)} '
          f'| park rows: {len(park)} | recon rows: {len(recon_rows)} '
          f'| rounding ties: {len(tie.ties)}')
    print(f'name misses: {name_misses} | skipped (no track): {skipped}')
    print(f'zone: {active} ({"authored" if authored else "detected"}) | detection candidates: '
          f'{[(z["upper_nm"], z["lower_nm"]) for z in detected]} '
          f'(race-median SOG {zdiag["race_median_sog"]} kts)')
    print(f'wrote {out_dir / "dashboard_data.json"} '
          f'({(out_dir / "dashboard_data.json").stat().st_size / 1e6:.2f} MB)')


if __name__ == '__main__':
    main()
