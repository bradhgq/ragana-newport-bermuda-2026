#!/usr/bin/env python3
"""BIR2026 payload postprocess — reproducible, logged (prime rule 1).

Run AFTER build_data.py, BEFORE assemble.py:
    ../../.venv2/bin/python postprocess.py

Applies, in order:
  1. Display groups (payload keys are DISPLAY names — 'Zélée', 'Sleeper', 'Full Tilt').
  2. Daffodil removal (CP-0: DNC, stationary at mooring — excluded entirely).
  3. meta.up1bi — authoritative raw-track distance sailed to the 1BI rounding,
     computed on the CLEANED track, trimmed to [race_start, official finish],
     argmin restricted to the boat's FIRST contiguous window within 8 nm of the
     island centroid (robust to any residual noise). Finishers only.
  4. stats reframe: race-window sailed distances, vs-CD extras; no vs-rhumb.
"""
import json, sys, numpy as np, pandas as pd, unicodedata, re
sys.path.insert(0, '../..')
from adapters import yb
from adapters.canonical import validate
from pipeline.geo import hav

def nk(s):
    s = unicodedata.normalize('NFC', str(s)); return re.sub(r'\s+', ' ', s).strip().casefold()

MARK_1BI = (41.262, -71.587)
BI_CENTROID = (41.168, -71.578)
RACE_START_UTC = 1779807600 - 345600 + 0  # placeholder, set below from config

import yaml
cfg = yaml.safe_load(open('config.yaml'))
d = json.load(open('out/dashboard_data.json'))
b = d['boats']

# ── 1. groups (display-name keys) ──
c6 = ['Christopher Dragon XII', 'In Theory', 'Groupe 5', 'SqueeZeplay',
      'Save the Sound', 'Zélée', 'Sleeper', 'Blue Skies']
for nm, bb in b.items():
    m = bb['meta']
    if nm == 'Ragana': g = 'hero'
    elif nm in c6: g = 'class6'
    elif m.get('cls') == 'PHRF': g = 'phrf'
    elif not m.get('el'): g = 'fleet_dnf'
    else: g = 'orc_other'
    m['grp'] = g

# ── 2. Daffodil out (CP-0) ──
b.pop('Daffodil', None)
d['fleet'] = [f for f in d.get('fleet', []) if f['name'] != 'Daffodil']

# ── 3. up1bi on cleaned, race-window-trimmed raw ──
df, _ = validate(yb.load(cfg['tracker']['path']))
race_start = pd.Timestamp(cfg['time']['race_start_utc'])
disp_of = {}
for nm, bb in b.items():
    disp_of[nk(nm)] = nm
# tracker-name -> display-name bridges
bridge = {nk('Zelee'): 'Zélée', nk('Midnight Rider - PMP Strategy'): 'Midnight Rider'}

hits = 0
for tnm, sub in df.groupby('name'):
    key = bridge.get(nk(tnm), None) or disp_of.get(nk(tnm))
    if key is None or key not in b: continue
    m = b[key]['meta']
    if not m.get('el'):            # finishers only
        m.pop('up1bi', None); continue
    # trim to [race_start, official finish]
    fin_utc = pd.Timestamp(m['fin']).tz_localize('UTC') + pd.Timedelta(hours=4)
    sub = sub[(sub.t_utc >= race_start) & (sub.t_utc <= fin_utc)]
    if len(sub) < 10: m.pop('up1bi', None); continue
    la, lo = sub.lat.values, sub.lon.values
    dc = hav(la, lo, *BI_CENTROID)
    inside = dc < 8
    if not inside.any(): m.pop('up1bi', None); continue
    i0 = int(inside.argmax())                       # first ring entry (approach)
    i1 = i0
    while i1 < len(inside) and inside[i1]: i1 += 1  # end of first contiguous window
    dm = hav(la[i0:i1], lo[i0:i1], *MARK_1BI)
    im = i0 + int(dm.argmin())
    sd = float(hav(la[:im], lo[:im], la[1:im+1], lo[1:im+1]).sum()) if im > 0 else 0.0
    m['up1bi'] = round(sd, 1); hits += 1

# ── 4. stats: race-window sailed, vs-CD ──
def sailed_window(disp):
    for tnm, sub in df.groupby('name'):
        key = bridge.get(nk(tnm), None) or disp_of.get(nk(tnm))
        if key != disp: continue
        m = b[disp]['meta']
        fin_utc = pd.Timestamp(m['fin']).tz_localize('UTC') + pd.Timedelta(hours=4)
        sub = sub[(sub.t_utc >= race_start) & (sub.t_utc <= fin_utc)]
        la, lo = sub.lat.values, sub.lon.values
        return float(hav(la[:-1], lo[:-1], la[1:], lo[1:]).sum())
    return None

sR = sailed_window('Ragana'); sC = sailed_window('Christopher Dragon XII')
d['stats']['sailed_ragana'] = round(sR, 1)
d['stats']['sailed_cd'] = round(sC, 1)
d['stats']['extra_vs_cd'] = round(sR - sC, 1)
d['stats']['upwind_extra_vs_cd'] = round(b['Ragana']['meta']['up1bi'] - b['Christopher Dragon XII']['meta']['up1bi'], 1)
d['stats'].pop('extra', None); d['stats'].pop('rhumb', None)

json.dump(d, open('out/dashboard_data.json', 'w'))
print(f"postprocess: groups set, Daffodil removed, up1bi on {hits} finishers")
print(f"  Ragana up1bi {b['Ragana']['meta']['up1bi']}  CD {b['Christopher Dragon XII']['meta']['up1bi']}  "
      f"delta {d['stats']['upwind_extra_vs_cd']}  (golden 4.7)")
print(f"  race-window sailed: Ragana {d['stats']['sailed_ragana']}  CD {d['stats']['sailed_cd']}  "
      f"extra {d['stats']['extra_vs_cd']}")

# ── 5. Windfall: untracked PHRF finisher — inject meta-only so it appears in the
#    PHRF finish-spread band (official results only, no track). ──
import pandas as _pd
_res = _pd.read_csv('raw/results.csv')
_w = _res[_res.boat_name == 'Windfall']
if len(_w):
    _w = _w.iloc[0]
    b['Windfall'] = {'t': [], 'lat': [], 'lon': [], 'dtf': [], 'xte': [], 'sog': [],
        'meta': {'disp': 'Windfall', 'typ': _w.design, 'tcf': float(_w.rating), 'cls': _w.division,
                 'clsPos': int(_w.place_class), 'sdl': int(_w.place_overall), 'corr': _w.corrected_hms,
                 'el': _w.elapsed_hms, 'fin': _w.finish_local, 'grp': 'phrf', 'sail': _w.sail_number,
                 'note': 'untracked — official results only'}}

json.dump(d, open('out/dashboard_data.json', 'w'))
print('Windfall meta-only injected into PHRF band')
