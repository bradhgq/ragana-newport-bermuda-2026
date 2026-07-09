#!/usr/bin/env python3
"""BIR2026 raw-track despike: remove isolated teleport pings.

Rule (documented, CP-4 round 2): drop ping i when the path detours through it —
dist(prev,i) > 5 nm AND dist(i,next) > 5 nm AND dist(prev,next) < half the
detour legs — i.e. an out-and-back single-point excursion the boat cannot have
sailed. Iterates until stable (multi-ping bursts like Midnight Rider's double).
Sustained fast segments (post-finish tracker car rides) are NOT touched: they
are real movement, trimmed downstream at the official finish.

Origin: ~15 boats received one simultaneous bogus fix at Fri 2026-05-22 20:00
EDT placing them near Block Island; the phantom round-trip added ~80-90 nm of
fake path length and wedged the route model's monotone leg assignment.
"""
import sys, pandas as pd, numpy as np
sys.path.insert(0, '../..')
from adapters import yb
from adapters.canonical import validate
from pipeline.geo import hav

raw = pd.read_csv('raw/tracks.csv')
df, _ = validate(yb.load('raw/tracks.csv'))
removed = []
keep_mask = pd.Series(True, index=raw.index)

# work per boat on the validated (sorted, deduped) view, map back by (boat_id, epoch)
for bid, sub in df.groupby('boat_id'):
    la = sub.lat.values.copy(); lo = sub.lon.values.copy()
    ep = (sub.t_utc.astype('int64') // 10**9).values
    alive = np.ones(len(sub), bool)
    changed = True; iters = 0
    while changed and iters < 6:
        changed = False; iters += 1
        idx = np.where(alive)[0]
        for k in range(1, len(idx) - 1):
            a, b, c = idx[k-1], idx[k], idx[k+1]
            d_ab = float(hav(la[a], lo[a], la[b], lo[b]))
            d_bc = float(hav(la[b], lo[b], la[c], lo[c]))
            d_ac = float(hav(la[a], lo[a], la[c], lo[c]))
            if d_ab > 5 and d_bc > 5 and d_ac < min(d_ab, d_bc) / 2:
                alive[b] = False; changed = True
                removed.append((sub.name.iloc[0] if hasattr(sub,'name') else '', bid, int(ep[b]), la[b], lo[b], round(d_ab,1), round(d_bc,1)))
    dead_eps = set(int(e) for e, ok in zip(ep, alive) if not ok)
    if dead_eps:
        m = (raw.boat_id == bid) & (raw.epoch.isin(dead_eps))
        keep_mask &= ~m

clean = raw[keep_mask]
clean.to_csv('raw/tracks_clean.csv', index=False)
print(f"removed {len(raw)-len(clean)} rows ({len(removed)} teleport pings) -> raw/tracks_clean.csv")
names = df.set_index('boat_id')['name'].groupby(level=0).first()
for _, bid, e, la_, lo_, d1, d2 in removed:
    import datetime as dt
    print(f"  {names.get(bid,'?'):26s} {dt.datetime.utcfromtimestamp(e-14400):%m-%d %H:%M}EDT ({la_:.4f},{lo_:.4f}) out {d1} back {d2} nm")
