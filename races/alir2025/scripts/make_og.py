#!/usr/bin/env python3
"""Generate og.png (1200x630 social preview) for the ALIR 2025 dashboard.

Draws the Around Long Island course — ghost fleet, the routed course polyline,
Daffodil (magenta) and Max (teal) in parallel per the dual-focus doctrine — as
inline SVG in the title-block aesthetic, then rasterizes with headless Chrome.
Pure stdlib; run whenever identity/data changes:
    python3 scripts/make_og.py
Reads the FROZEN snapshot payload (never recomputes race numbers).
Adapted from races/bir2026/scripts/make_og.py.
"""
import json, subprocess, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
W, H = 1200, 630
# the course loops the island: ~2.5° lon by ~0.92° lat; right two-thirds of the card
MAP_X0, MAP_Y0, MAP_W, MAP_H = 400, 90, 760, 470
LON0, LON1, LAT0, LAT1 = -74.15, -71.70, 40.46, 41.32

COURSE = [(40.7028, -74.0367), (40.6060, -74.0450), (40.5281, -74.0094),
          (40.5500, -73.4000), (40.6400, -73.0500), (40.7700, -72.6000),
          (40.8600, -72.1000), (41.0600, -71.8450), (41.1680, -72.2150),
          (41.0500, -73.3500), (40.9250, -73.6250), (40.8619, -73.6603)]


def px(lon, lat):
    x = MAP_X0 + (lon - LON0) / (LON1 - LON0) * MAP_W
    y = MAP_Y0 + (LAT1 - lat) / (LAT1 - LAT0) * MAP_H
    return f'{x:.1f},{y:.1f}'


def path(lons, lats):
    return 'M' + ' L'.join(px(lo, la) for lo, la in zip(lons, lats) if lo is not None)


def main():
    D = json.loads((ROOT / 'snapshot' / 'dashboard_data.json').read_text())
    ghosts = ''.join(
        f'<path d="{path(f["lon"], f["lat"])}" fill="none" stroke="rgba(120,140,155,0.18)" stroke-width="1"/>'
        for f in D['fleet'])
    daff, mx = D['boats']['Daffodil'], D['boats']['Max']
    course = 'M' + ' L'.join(px(lo, la) for la, lo in COURSE)
    sx = px(D['start'][1], D['start'][0])
    svg = f'''<svg width="{W}" height="{H}" viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="{W}" height="{H}" fill="#FBFCFB"/>
  <rect x="14" y="14" width="{W-28}" height="{H-28}" fill="none" stroke="#17293A" stroke-width="3"/>
  <line x1="14" y1="30" x2="{W-14}" y2="30" stroke="#17293A" stroke-width="1" stroke-dasharray="1 39"/>
  <line x1="14" y1="{H-30}" x2="{W-14}" y2="{H-30}" stroke="#17293A" stroke-width="1" stroke-dasharray="1 39"/>
  <g>{ghosts}</g>
  <path d="{course}" stroke="#C2187E" stroke-width="1.4" stroke-dasharray="7 5" fill="none" opacity=".55"/>
  <path d="{path(mx['lon'], mx['lat'])}" fill="none" stroke="#0E8A8A" stroke-width="2.6"/>
  <path d="{path(daff['lon'], daff['lat'])}" fill="none" stroke="#C2187E" stroke-width="2.6"/>
  <circle cx="{sx.split(',')[0]}" cy="{sx.split(',')[1]}" r="6" fill="#17293A"/>
  <text x="60" y="112" font-family="Menlo,monospace" font-size="17" letter-spacing="5" fill="#4C6274">CHART OF THE RACE</text>
  <text x="58" y="172" font-family="Helvetica Neue,Arial" font-size="52" font-weight="700" letter-spacing="4" fill="#C2187E">DAFFODIL</text>
  <text x="58" y="228" font-family="Helvetica Neue,Arial" font-size="52" font-weight="700" letter-spacing="4" fill="#0E8A8A">MAX</text>
  <text x="58" y="286" font-family="Helvetica Neue,Arial" font-size="34" font-weight="700" letter-spacing="3" fill="#17293A">AND THE</text>
  <text x="58" y="330" font-family="Helvetica Neue,Arial" font-size="34" font-weight="700" letter-spacing="3" fill="#17293A">FINISH DOOR</text>
  <text x="60" y="392" font-family="Menlo,monospace" font-size="18" fill="#4C6274">Around Long Island 2025</text>
  <text x="60" y="420" font-family="Menlo,monospace" font-size="18" fill="#4C6274">207 NM · 24–26 July</text>
  <text x="60" y="474" font-family="Menlo,monospace" font-size="18" fill="#17293A">43 finishers · a squall line</text>
  <text x="60" y="502" font-family="Menlo,monospace" font-size="18" fill="#17293A">and a door that shut at five</text>
  <text x="{float(sx.split(',')[0])+14}" y="{float(sx.split(',')[1])+4}" font-family="Menlo,monospace" font-size="13" fill="#4C6274">NY HARBOR</text>
</svg>'''
    html = f'<!doctype html><meta charset="utf-8"><body style="margin:0">{svg}</body>'
    with tempfile.TemporaryDirectory() as td:
        page = Path(td) / 'og.html'
        page.write_text(html)
        subprocess.run([CHROME, '--headless', '--disable-gpu',
                        f'--screenshot={ROOT / "og.png"}',
                        f'--window-size={W},{H}', '--hide-scrollbars',
                        page.as_uri()], check=True, capture_output=True)
    print('wrote og.png', (ROOT / 'og.png').stat().st_size, 'bytes')


if __name__ == '__main__':
    main()
