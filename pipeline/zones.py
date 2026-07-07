"""Slow-zone detection + per-boat traversal metrics (doctrine 1: spatial
phenomena get spatial metrics — each boat measured over its OWN crossing of
the same distance-remaining band, never a wall-clock window).

Detection contract (stage-2 §6): fleet-median SOG per `band_nm`
distance-remaining band; a candidate slow zone is a maximal run of consecutive
bands whose median falls below `collapse_frac` x race-median SOG, kept only if
the median boat's traversal of the run is >= `min_traversal_hours`.

Thresholds come from config; the DETECTED band is an output, recorded in the
run log and goldens — never an input constant.
"""
import numpy as np
import pandas as pd


def _hit(s, m):
    """First timestamp at which a boat's DTF reaches milestone m (or None)."""
    sub = s[s['dtf'] <= m]
    return sub['ts'].iloc[0] if len(sub) else None


def detect_zones(series_map, zcfg):
    """series_map: ordered {key: per-boat DataFrame with ts/dtf/sog columns}.

    Returns (zones, diagnostics). zones: list of
    {'upper_nm', 'lower_nm', 'median_traversal_h', 'band_medians'} sorted
    widest-first. diagnostics carries the full band-median table for the run log.
    """
    band_nm = zcfg['band_nm']
    collapse_frac = zcfg['collapse_frac']
    min_hours = zcfg['min_traversal_hours']

    sogs, bands = [], []
    for s in series_map.values():
        v = s.dropna(subset=['sog'])
        sogs.append(v['sog'].to_numpy(dtype=float))
        bands.append((v['dtf'].to_numpy(dtype=float) // band_nm).astype(int))
    allsog = np.concatenate(sogs) if sogs else np.array([])
    allband = np.concatenate(bands) if bands else np.array([])
    if not len(allsog):
        return [], {'race_median_sog': None, 'band_medians': {}}

    race_med = float(np.median(allsog))
    threshold = collapse_frac * race_med
    band_ids = np.unique(allband)
    med_by_band = {int(b): float(np.median(allsog[allband == b])) for b in band_ids}

    # maximal runs of consecutive bands under the threshold
    slow = sorted(b for b, m in med_by_band.items() if m < threshold)
    runs, cur = [], []
    for b in slow:
        if cur and b == cur[-1] + 1:
            cur.append(b)
        else:
            if cur:
                runs.append(cur)
            cur = [b]
    if cur:
        runs.append(cur)

    zones = []
    for run in runs:
        upper = (run[-1] + 1) * band_nm   # zone entered at the HIGH-dtf edge
        lower = run[0] * band_nm
        hrs = []
        for s in series_map.values():
            t0, t1 = _hit(s, upper), _hit(s, lower)
            if t0 is not None and t1 is not None:
                hrs.append((t1 - t0).total_seconds() / 3600)
        med_trav = float(np.median(hrs)) if hrs else 0.0
        if med_trav >= min_hours:
            zones.append({'upper_nm': upper, 'lower_nm': lower,
                          'median_traversal_h': round(med_trav, 2),
                          'band_medians': {b: round(med_by_band[b], 2) for b in run}})
    zones.sort(key=lambda z: z['upper_nm'] - z['lower_nm'], reverse=True)
    diagnostics = {'race_median_sog': round(race_med, 3),
                   'threshold_kts': round(threshold, 3),
                   'band_medians': {b: round(m, 3) for b, m in sorted(med_by_band.items())}}
    return zones, diagnostics


def traversal_metrics(series_map, display_of, upper_nm, lower_nm, tie=None):
    """Per-boat metrics over each boat's own crossing of the zone.

    series_map is ordered (output key order follows it); display_of maps
    series key -> display name. Emits the dashboard_data 'parkFair' contract:
    enter (epoch s), hrs, mean (kts), u4/u2 (% of samples under 4/2 kts),
    xte (mean nm signed). `tie` (pipeline.rounding.TieTracker) records
    .5-rounding-tie sites for compare_data's exemption rule.
    """
    from pipeline.rounding import NullTracker
    tie = tie or NullTracker()
    out = {}
    for key, s in series_map.items():
        t0, t1 = _hit(s, upper_nm), _hit(s, lower_nm)
        if t0 is None or t1 is None:
            continue
        seg = s[(s['ts'] >= t0) & (s['ts'] <= t1)].dropna(subset=['sog'])
        if not len(seg):
            continue
        d = display_of[key]
        out[d] = dict(
            enter=int(t0.timestamp()),
            hrs=tie.r((t1 - t0).total_seconds() / 3600, 1, f'parkFair.{d}.hrs'),
            mean=tie.r(seg['sog'].mean(), 1, f'parkFair.{d}.mean'),
            u4=tie.rint(100 * float((seg['sog'] < 4).mean()), f'parkFair.{d}.u4'),
            u2=tie.rint(100 * float((seg['sog'] < 2).mean()), f'parkFair.{d}.u2'),
            xte=tie.r(seg['xte'].mean(), 1, f'parkFair.{d}.xte'))
    return out
