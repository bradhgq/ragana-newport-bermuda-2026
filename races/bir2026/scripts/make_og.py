#!/usr/bin/env python3
"""Generate og.png (1200x630 social preview) for the BIR 2026 dashboard.

Draws the Block Island course — ghost fleet, quick-select boats, Ragana in chart
magenta, the start–finish line — as inline SVG in the title-block aesthetic, then
rasterizes with headless Chrome. Pure stdlib; run whenever identity/data changes:
    python3 scripts/make_og.py
Reads the FROZEN oracle payload (never recomputes race numbers).
"""
import json, subprocess, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
W, H = 1200, 630
# the course is wide (~2.1° lon) and shallow (~0.27° lat); give the map the right
# half and let it fill — same "aspect isn't to scale" licence as the dashboard map.
MAP_X0, MAP_Y0, MAP_W, MAP_H = 430, 150, 730, 360
LON0, LON1, LAT0, LAT1 = -73.75, -71.45, 40.97, 41.30

def px(lon, lat):
    x = MAP_X0 + (lon - LON0) / (LON1 - LON0) * MAP_W
    y = MAP_Y0 + (LAT1 - lat) / (LAT1 - LAT0) * MAP_H
    return f'{x:.1f},{y:.1f}'

def path(lons, lats):
    return 'M' + ' L'.join(px(lo, la) for lo, la in zip(lons, lats) if lo is not None)

def main():
    D = json.loads((ROOT / 'out' / 'dashboard_data.FROZEN.json').read_text())
    ghosts = ''.join(
        f'<path d="{path(f["lon"], f["lat"])}" fill="none" stroke="rgba(120,140,155,0.20)" stroke-width="1"/>'
        for f in D['fleet'])
    quick = {'hero', 'class6'}
    boats = ''.join(
        f'<path d="{path(b["lon"], b["lat"])}" fill="none" stroke="#5C7D8C" stroke-width="1.1" opacity=".7"/>'
        for b in D['boats'].values() if b['meta'].get('grp') in quick and b.get('lat'))
    rag = D['boats']['Ragana']
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
  <text x="60" y="120" font-family="Menlo,monospace" font-size="17" letter-spacing="5" fill="#4C6274">CHART OF THE RACE</text>
  <text x="58" y="185" font-family="Helvetica Neue,Arial" font-size="58" font-weight="700" letter-spacing="6" fill="#C2187E">RAGANA</text>
  <text x="58" y="245" font-family="Helvetica Neue,Arial" font-size="40" font-weight="700" letter-spacing="4" fill="#17293A">BLOCK ISLAND</text>
  <text x="58" y="295" font-family="Helvetica Neue,Arial" font-size="40" font-weight="700" letter-spacing="4" fill="#17293A">RACE 2026</text>
  <text x="60" y="350" font-family="Menlo,monospace" font-size="18" fill="#4C6274">Cape Fear 38R · USA 52238</text>
  <text x="60" y="380" font-family="Menlo,monospace" font-size="18" fill="#4C6274">186 NM · 22–24 May</text>
  <text x="60" y="440" font-family="Menlo,monospace" font-size="20" fill="#17293A">9 / 9 Class 6 ORC</text>
  <text x="60" y="470" font-family="Menlo,monospace" font-size="18" fill="#4C6274">elapsed 37:29:49</text>
  <text x="{float(sx.split(',')[0])-10}" y="{float(sx.split(',')[1])+20}" text-anchor="middle" font-family="Menlo,monospace" font-size="14" fill="#4C6274">STAMFORD</text>
  <text x="{W-360}" y="{H-52}" font-family="Menlo,monospace" font-size="15" fill="#4C6274">■ around Block Island to starboard</text>
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
