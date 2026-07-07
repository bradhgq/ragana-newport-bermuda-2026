"""Nav-log <-> tracker reconciliation (stage-2 §7).

Each hand-written fix is matched to the client boat's nearest-in-time tracker
position. Clock-base errors are EXPECTED (the worked example's paper log ran
UTC-5 against a UTC-4 race): fixes arrive with t_local already corrected to
the race's official zone, and the authored verdict/note records what was
corrected. This module does the matching math; it never invents verdicts.
"""
import pandas as pd

from . import geo


def _signed(dm):
    """{'deg': 41, 'min': 19, 'hem': 'N'} -> signed decimal degrees."""
    val = dm['deg'] + dm['min'] / 60
    return -val if dm['hem'] in ('S', 'W') else val


def reconcile(fixes, client_series, utc_offset, matched_key='matched_local', tie=None):
    """fixes: rows from navlog.yaml. client_series: the client boat's per-ping
    DataFrame (ts tz-aware UTC, lat, lon). Returns dashboard_data 'recon' rows.

    matched_key names the output field carrying the true-local clock time
    (the worked example ships it as 'matched_edt'). `tie` records .5-rounding
    ties for compare_data's exemption rule.
    """
    from pipeline.rounding import NullTracker
    tie = tie or NullTracker()
    rows = []
    for idx, fx in enumerate(fixes):
        la, lo = _signed(fx['lat']), _signed(fx['lon'])
        tt = pd.Timestamp(fx['t_local'], tz='UTC') - pd.Timedelta(hours=utc_offset)
        i = (client_series['ts'] - tt).abs().idxmin()
        r = client_series.loc[i]
        dnm = float(geo.hav(la, lo, r['lat'], r['lon']))
        rows.append({'t': fx['label'], matched_key: fx['t_local'][11:], 'temp': fx['temp'],
                     'speed': fx['speed'], 'course': fx['course'], 'wind': fx['wind'],
                     'log': [tie.r(la, 3, f'recon[{idx}].log[0]'),
                             tie.r(lo, 3, f'recon[{idx}].log[1]')],
                     'trk': [tie.r(r['lat'], 3, f'recon[{idx}].trk[0]'),
                             tie.r(r['lon'], 3, f'recon[{idx}].trk[1]')],
                     'd': tie.r(dnm, 1, f'recon[{idx}].d'),
                     'verdict': fx['verdict'], 'note': fx['note']})
    return rows
