#!/usr/bin/env python3
"""Generate og.png (1200x630 social preview) from dashboard_data.json.

Draws the course — ghost fleet, quick-select boats, RAGANA in chart magenta,
the rhumb line — as inline SVG in the title-block aesthetic, then rasterizes
with headless Chrome. Pure stdlib; run whenever the identity or data changes:
    python3 scripts/make_og.py
"""
import json, subprocess, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
W, H = 1200, 630
MAP_X0, MAP_Y0, MAP_W, MAP_H = 430, 40, 730, 550
LON0, LON1, LAT0, LAT1 = -72.0, -63.6, 31.9, 41.9

def px(lon, lat):
    x = MAP_X0 + (lon - LON0) / (LON1 - LON0) * MAP_W
    y = MAP_Y0 + (LAT1 - lat) / (LAT1 - LAT0) * MAP_H
    return f'{x:.1f},{y:.1f}'

def path(lons, lats):
    return 'M' + ' L'.join(px(lo, la) for lo, la in zip(lons, lats) if lo is not None)

def main():
    D = json.loads((ROOT / 'dashboard_data.json').read_text())
    ghosts = ''.join(
        f'<path d="{path(f["lon"], f["lat"])}" fill="none" stroke="rgba(120,140,155,0.20)" stroke-width="1"/>'
        for f in D['fleet'])
    quick = {'class', 'nbr', 'podium', 'club', 'maxi'}
    boats = ''.join(
        f'<path d="{path(b["lon"], b["lat"])}" fill="none" stroke="#8DA5AF" stroke-width="1.1" opacity=".7"/>'
        for b in D['boats'].values() if b['meta']['grp'] in quick)
    rag = D['boats']['RAGANA']
    sx, fx = px(D['start'][1], D['start'][0]), px(D['fin'][1], D['fin'][0])
    svg = f'''<svg width="{W}" height="{H}" viewBox="0 0 {W} {H}" xmlns="http://www.w3.org/2000/svg">
  <rect width="{W}" height="{H}" fill="#FBFCFB"/>
  <rect x="14" y="14" width="{W-28}" height="{H-28}" fill="none" stroke="#17293A" stroke-width="3"/>
  <line x1="14" y1="30" x2="{W-14}" y2="30" stroke="#17293A" stroke-width="1" stroke-dasharray="1 39"/>
  <line x1="14" y1="{H-30}" x2="{W-14}" y2="{H-30}" stroke="#17293A" stroke-width="1" stroke-dasharray="1 39"/>
  <g>{ghosts}</g>
  <g>{boats}</g>
  <path d="M{sx} L{fx}" stroke="#C2187E" stroke-width="1.6" stroke-dasharray="7 5" fill="none" opacity=".8"/>
  <path d="{path(rag['lon'], rag['lat'])}" fill="none" stroke="#C2187E" stroke-width="3.4"/>
  <circle cx="{sx.split(',')[0]}" cy="{sx.split(',')[1]}" r="6" fill="#17293A"/>
  <rect x="{float(fx.split(',')[0])-5}" y="{float(fx.split(',')[1])-5}" width="10" height="10" fill="#17293A"/>
  <text x="60" y="120" font-family="Menlo,monospace" font-size="17" letter-spacing="5" fill="#4C6274">CHART OF THE RACE</text>
  <text x="58" y="185" font-family="Helvetica Neue,Arial" font-size="58" font-weight="700" letter-spacing="6" fill="#C2187E">RAGANA</text>
  <text x="58" y="245" font-family="Helvetica Neue,Arial" font-size="40" font-weight="700" letter-spacing="4" fill="#17293A">NEWPORT</text>
  <text x="58" y="295" font-family="Helvetica Neue,Arial" font-size="40" font-weight="700" letter-spacing="4" fill="#17293A">BERMUDA 2026</text>
  <text x="60" y="350" font-family="Menlo,monospace" font-size="18" fill="#4C6274">Cape Fear 38 · USA 52238</text>
  <text x="60" y="380" font-family="Menlo,monospace" font-size="18" fill="#4C6274">636 NM · 19–23 June</text>
  <text x="60" y="440" font-family="Menlo,monospace" font-size="20" fill="#17293A">46 / 86 St. David's Lighthouse</text>
  <text x="60" y="470" font-family="Menlo,monospace" font-size="18" fill="#4C6274">elapsed 4d 01:34:52</text>
  <text x="{float(sx.split(',')[0])-14}" y="{float(sx.split(',')[1])+5}" text-anchor="end" font-family="Menlo,monospace" font-size="15" fill="#4C6274">NEWPORT</text>
  <text x="{W-330}" y="{H-52}" font-family="Menlo,monospace" font-size="15" fill="#4C6274">■ ST. DAVID'S</text>
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
