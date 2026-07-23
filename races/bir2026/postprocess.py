#!/usr/bin/env python3
"""BIR2026 payload postprocess — reproducible, logged (prime rule 1).

Run AFTER build_data.py, BEFORE the shell build:
    ../../.venv/bin/python postprocess.py

Only the genuinely race-specific analysis channels remain here; the original
steps 1/2/5 (display-name groups, Daffodil removal, Windfall meta-only) are
pipeline-native since the shell migration (config keys `groups.by_name/by_cls`,
`exclude_boats`, `official_results.untracked` — see docs/REPO_NOTES.md).

  1. meta.up1bi — authoritative raw-track distance sailed to the 1BI rounding,
     computed on the CLEANED track, trimmed to [race_start, official finish],
     argmin restricted to the boat's FIRST contiguous window within 8 nm of the
     island centroid (robust to any residual noise). Finishers only.
  2. stats reframe: race-window sailed distances, vs-CD extras; no vs-rhumb.
"""
import json
import re
import sys
import unicodedata

import pandas as pd
import yaml

sys.path.insert(0, '../../starter')   # pipeline modules expect starter/ as the root
from adapters import yb                # noqa: E402
from adapters.canonical import validate  # noqa: E402
from pipeline.geo import hav           # noqa: E402


def nk(s):
    s = unicodedata.normalize('NFC', str(s))
    return re.sub(r'\s+', ' ', s).strip().casefold()


MARK_1BI = (41.262, -71.587)
BI_CENTROID = (41.168, -71.578)

cfg = yaml.safe_load(open('config.yaml'))
d = json.load(open('out/dashboard_data.json'))
b = d['boats']

# ── 1. up1bi on cleaned, race-window-trimmed raw ──
df, _ = validate(yb.load(cfg['tracker']['path']))
race_start = pd.Timestamp(cfg['time']['race_start_utc'])
disp_of = {nk(nm): nm for nm in b}
# tracker-name -> display-name bridges
bridge = {nk('Zelee'): 'Zélée', nk('Midnight Rider - PMP Strategy'): 'Midnight Rider'}

hits = 0
for tnm, sub in df.groupby('name'):
    key = bridge.get(nk(tnm), None) or disp_of.get(nk(tnm))
    if key is None or key not in b:
        continue
    m = b[key]['meta']
    if not m.get('el'):            # finishers only
        m.pop('up1bi', None)
        continue
    # trim to [race_start, official finish]
    fin_utc = pd.Timestamp(m['fin']).tz_localize('UTC') + pd.Timedelta(hours=4)
    sub = sub[(sub.t_utc >= race_start) & (sub.t_utc <= fin_utc)]
    if len(sub) < 10:
        m.pop('up1bi', None)
        continue
    la, lo = sub.lat.values, sub.lon.values
    dc = hav(la, lo, *BI_CENTROID)
    inside = dc < 8
    if not inside.any():
        m.pop('up1bi', None)
        continue
    i0 = int(inside.argmax())                       # first ring entry (approach)
    i1 = i0
    while i1 < len(inside) and inside[i1]:          # end of first contiguous window
        i1 += 1
    dm = hav(la[i0:i1], lo[i0:i1], *MARK_1BI)
    im = i0 + int(dm.argmin())
    sd = float(hav(la[:im], lo[:im], la[1:im + 1], lo[1:im + 1]).sum()) if im > 0 else 0.0
    m['up1bi'] = round(sd, 1)
    hits += 1

# ── 2. stats: race-window sailed, vs-CD ──
def sailed_window(disp):
    for tnm, sub in df.groupby('name'):
        key = bridge.get(nk(tnm), None) or disp_of.get(nk(tnm))
        if key != disp:
            continue
        m = b[disp]['meta']
        fin_utc = pd.Timestamp(m['fin']).tz_localize('UTC') + pd.Timedelta(hours=4)
        sub = sub[(sub.t_utc >= race_start) & (sub.t_utc <= fin_utc)]
        la, lo = sub.lat.values, sub.lon.values
        return float(hav(la[:-1], lo[:-1], la[1:], lo[1:]).sum())
    return None


sR = sailed_window('Ragana')
sC = sailed_window('Christopher Dragon XII')
d['stats']['sailed_ragana'] = round(sR, 1)
d['stats']['sailed_cd'] = round(sC, 1)
d['stats']['extra_vs_cd'] = round(sR - sC, 1)
d['stats']['upwind_extra_vs_cd'] = round(
    b['Ragana']['meta']['up1bi'] - b['Christopher Dragon XII']['meta']['up1bi'], 1)
d['stats'].pop('extra', None)
d['stats'].pop('rhumb', None)

json.dump(d, open('out/dashboard_data.json', 'w'))
print(f"postprocess: up1bi on {hits} finishers")
print(f"  Ragana up1bi {b['Ragana']['meta']['up1bi']}  CD {b['Christopher Dragon XII']['meta']['up1bi']}  "
      f"delta {d['stats']['upwind_extra_vs_cd']}  (golden 4.7)")
print(f"  race-window sailed: Ragana {d['stats']['sailed_ragana']}  CD {d['stats']['sailed_cd']}  "
      f"extra {d['stats']['extra_vs_cd']}")
