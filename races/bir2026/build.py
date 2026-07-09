#!/usr/bin/env python3
"""Build the Ragana · Block Island Race 2026 dashboard into dist/.

Steps:
  1. run the node regression tests (skip with --skip-tests) — a build gate
  2. split the FROZEN oracle payload into three files:
       core.json  — the 15 default / quick-select / chip boats' full tracks,
                    plus EVERY boat's meta, and events / stats / start / fin /
                    mil (all eager; this is what first paint needs)
       more.json  — the other 42 tracked boats' series (fetched on +More / a
                    group button that selects a non-core boat)
       fleet.json — the 57-boat ghost layer (fetched after first paint)
  3. copy src/ into dist/ with ?v=<hash> cache-busting stamped in
  4. emit dist/standalone.html — a single self-contained file (all data + Plotly
     inlined) that works from file:// with no server

The FROZEN payload is authoritative — nothing here recomputes race numbers. The
split is byte-lossless: core ∪ more ∪ fleet reconstructs the oracle exactly.
"""
import argparse, hashlib, json, os, re, shutil, subprocess, sys, time
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC, DIST = ROOT / 'src', ROOT / 'dist'
DATA = ROOT / 'frozen' / 'dashboard_data.json'   # the frozen payload (public: 14 events)

QUICK_GRPS = {'hero', 'class6'}
# names shown as chips beyond the quick groups (keep in sync with CHIP_EXTRA in app.js)
CHIP_EXTRA = {'Young American', 'Max', 'Loki', 'Banter', 'Touch of Grey', 'Full Tilt'}
# boats selected by default in app.js (S.boats) — their tracks MUST ship in core
DEFAULT_BOATS = {'Ragana', 'Christopher Dragon XII', 'In Theory', 'Groupe 5'}
# top-level payload keys the app reads (besides boats/fleet), kept whole in core
KEEP = ['events', 'stats', 'start', 'fin', 'meta', 'mil']
TRACK_KEYS = ('t', 'lat', 'lon', 'dtf', 'xte', 'sog')

def in_core(name, boat):
    return boat['meta'].get('grp') in QUICK_GRPS or name in CHIP_EXTRA or name in DEFAULT_BOATS

def has_track(boat):
    return bool(boat.get('t'))

def run_tests():
    try:
        subprocess.run(['node', '--test', 'test/regression.test.cjs'], cwd=ROOT, check=True,
                       env={'TZ': 'America/New_York', 'PATH': os.environ['PATH']})
    except FileNotFoundError:
        sys.exit('node not found — regression tests are a build gate (or pass --skip-tests)')
    except subprocess.CalledProcessError:
        sys.exit('regression tests FAILED — not building')

def compact(obj):
    return json.dumps(obj, ensure_ascii=False, separators=(',', ':'))

# ── CP-5 publication gate ──────────────────────────────────────────────────
# A public build ships ONLY the events whose label is listed in
# publish_allowlist.txt (one per line, '#' comments allowed).
#
# Some events are NEVER publishable (prime rule 4: firsthand-confirmed third-party
# incidents not in the public record). Their labels are not stored in this public
# tree — they load from an optional, gitignored private/never_public.txt (one
# label per line). Absent that file, NEVER_PUBLIC is empty; the committed
# events.yaml here already excludes them, so nothing is at risk in this repo.
def _load_never_public(root):
    f = root / 'private' / 'never_public.txt'
    if not f.exists():
        return set()
    return {ln.split('#', 1)[0].strip() for ln in f.read_text().splitlines()
            if ln.split('#', 1)[0].strip()}

def apply_publication(data, root):
    """Return (data, (kept, dropped)). For a public build, strip events per the
    allowlist. Two modes, driven by publish_allowlist.txt:
      · a line `ALL_EXCEPT_NEVER_PUBLIC` → publish every event except the
        never-public set (Brad's CP-5 choice: 'host exactly like nb2026').
      · otherwise → publish only events whose exact label is listed (opt-in).
    The never-public set (loaded privately) is hard-blocked in both modes."""
    never_public = _load_never_public(root)
    allow_file = root / 'publish_allowlist.txt'
    allow, all_except = set(), False
    if allow_file.exists():
        for line in allow_file.read_text().splitlines():
            line = line.split('#', 1)[0].strip()
            if line == 'ALL_EXCEPT_NEVER_PUBLIC':
                all_except = True
            elif line:
                allow.add(line)
    kept, dropped = [], []
    for e in data.get('events', []):
        label = e.get('label', '')
        publishable = label not in never_public and (all_except or label in allow)
        (kept if publishable else dropped).append(label)
    data = {**data, 'events': [e for e in data.get('events', []) if e.get('label', '') in kept]}
    return data, (len(kept), dropped)

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--skip-tests', action='store_true')
    ap.add_argument('--public', action='store_true',
                    help='CP-5 public build: strip every event not in publish_allowlist.txt '
                         '(never-public events withheld). Default is the full private client build.')
    args = ap.parse_args()
    if not args.skip_tests:
        run_tests()

    data = json.loads(DATA.read_text())
    if args.public:
        data, (kept, dropped) = apply_publication(data, ROOT)
        print(f'PUBLIC build — {kept} event(s) opted in, {len(dropped)} stripped (CP-5 gate).')
    else:
        print('PRIVATE client build — all events included (not for public hosting).')

    core = {k: data[k] for k in KEEP if k in data}
    core['boats'] = {}
    more = {}
    assert DEFAULT_BOATS <= set(data['boats']), DEFAULT_BOATS - set(data['boats'])
    for name, boat in data['boats'].items():   # insertion order is meaningful (palette assignment)
        if in_core(name, boat):
            core['boats'][name] = boat
        else:
            core['boats'][name] = {'meta': boat['meta']}
            series = {k: v for k, v in boat.items() if k != 'meta'}
            if series:                          # meta-only boats (e.g. Windfall) ship nothing to more
                more[name] = series

    for name in DEFAULT_BOATS:                  # default selection must render on first paint
        assert has_track(core['boats'][name]), f'{name} shipped without a track in core.json'

    payloads = {'core.json': compact(core), 'more.json': compact(more),
                'fleet.json': compact(data['fleet'])}

    # cache-bust on app code + core payload
    h = hashlib.sha1()
    for f in ['app.js', 'helpers.js', 'styles.css', 'index.html']:
        h.update((SRC / f).read_bytes())
    h.update(payloads['core.json'].encode())
    version = h.hexdigest()[:10]
    built = time.strftime('%Y-%m-%d')

    if DIST.exists():
        shutil.rmtree(DIST)
    (DIST / 'data').mkdir(parents=True)
    shutil.copytree(SRC / 'vendor', DIST / 'vendor')
    shutil.copy(SRC / 'favicon.svg', DIST / 'favicon.svg')
    og = ROOT / 'og.png'
    if og.exists():
        shutil.copy(og, DIST / 'og.png')
    else:
        print('warning: og.png missing — social preview image not shipped')

    for name, text in payloads.items():
        (DIST / 'data' / name).write_text(text)

    stamp = lambda s: s.replace('__V__', version).replace('__BUILT__', built)
    for f in ['index.html', 'app.js', 'helpers.js', 'styles.css']:
        (DIST / f).write_text(stamp((SRC / f).read_text()))

    # ── standalone single-file fallback (file:// friendly; no fetches) ──
    html = stamp((SRC / 'index.html').read_text())
    embedded = compact({**{k: data[k] for k in KEEP if k in data},
                        'boats': data['boats'], 'fleet': data['fleet']}).replace('</', '<\\/')
    html, n = re.subn(r'<!-- DATA:FETCH.*?/DATA:FETCH -->',
                      lambda _: '<script>window.__DATA_EMBEDDED__=' + embedded + '</script>',
                      html, flags=re.S)
    assert n == 1, 'DATA:FETCH markers not found in index.html'
    html = html.replace('<link rel="stylesheet" href="styles.css?v=%s">' % version,
                        '<style>\n' + stamp((SRC / 'styles.css').read_text()) + '\n</style>')
    # inline scripts don't defer — drop the head tags and re-inline at end of <body>
    tail = ''
    plotly = (SRC / 'vendor' / 'plotly-basic-2.35.2.min.js').read_text()
    tail += '<script id="plotlyjs">\n' + plotly + '\n</script>\n'
    for f in ['helpers.js', 'app.js']:
        tag = '<script src="%s?v=%s" defer></script>' % (f, version)
        assert tag in html, tag
        html = html.replace(tag, '')
        tail += '<script>\n' + stamp((SRC / f).read_text()) + '\n</script>\n'
    html = html.replace('<script src="vendor/plotly-basic-2.35.2.min.js" id="plotlyjs" defer></script>', '')
    assert '</body>' in html
    html = html.replace('</body>', tail + '</body>')
    (DIST / 'standalone.html').write_text(html)

    sizes = {p.relative_to(DIST).as_posix(): p.stat().st_size
             for p in sorted(DIST.rglob('*')) if p.is_file()}
    total = sum(sizes.values())
    print(f'built dist/ (version {version})')
    for k, v in sizes.items():
        print(f'  {v/1024:8.1f} KB  {k}')
    print(f'  {total/1024:8.1f} KB  total')
    print('serve locally:  cd dist && python3 -m http.server 8000')

if __name__ == '__main__':
    main()
