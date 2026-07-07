#!/usr/bin/env python3
"""Shell build: assemble a race's dashboard into races/<race>/dist/.

    python3 shell/build.py races/<race> [--skip-tests]

Steps:
  1. run the JS regression harness (I10: red tests refuse to build)
  2. read the race's presentation.js + copy.js (via node — they are the
     source of truth for quick groups, defaults, layout, and static copy)
  3. split <race>/out/dashboard_data.json into three payloads:
       core.json  — hero + quick-select tracks, every boat's meta, events /
                    watches / recon / parkFair / stats (eager)
       more.json  — tracks for the "+ More" boats (fetched on demand)
       fleet.json — the full-fleet hourly ghost layer (fetched after paint)
  4. render index.html from shell/index.template.html (copy slots + section
     scaffolds from cfg.layout) with ?v=<hash> cache-busting stamped in
  5. copy shell app + race presentation/copy/modules/overlays + assets
  6. emit dist/standalone.html — a single self-contained file (data + Plotly
     inlined) that works from file:// with no server

The JSON payload is authoritative — nothing here recomputes race numbers.
"""
import argparse
import hashlib
import json
import re
import shutil
import subprocess
import sys
import time
from pathlib import Path

REPO = Path(__file__).resolve().parents[1]
SHELL = REPO / 'shell'

APP_FILES = ['app/helpers.js', 'app/tokens.js', 'app/core.js',
             'app/charts/map.js', 'app/charts/dtf.js', 'app/charts/race.js',
             'app/charts/xte.js', 'app/charts/sog.js']
KEEP = ['events', 'watches', 'recon', 'parkFair', 'stats', 'start', 'fin', 'meta']


def run_tests(race_dir):
    harness = REPO / 'tests' / 'test_dashboard.js'
    goldens = race_dir / 'tests' / 'regression.json'
    if not harness.exists():
        sys.exit(f'{harness} missing — the regression harness is a build gate (or pass --skip-tests)')
    try:
        subprocess.run(['node', str(harness), str(race_dir), str(goldens)], cwd=REPO, check=True,
                       env={'TZ': 'America/New_York', 'PATH': __import__('os').environ['PATH']})
    except FileNotFoundError:
        sys.exit('node not found — regression tests are a build gate (or pass --skip-tests)')
    except subprocess.CalledProcessError:
        sys.exit('regression tests FAILED — not building')


def read_js_global(path, global_name):
    """Evaluate a classic-script config file under node and return the global."""
    out = subprocess.run(
        ['node', '-e',
         f'const window={{}};eval(require("fs").readFileSync({str(path)!r},"utf8"));'
         f'process.stdout.write(JSON.stringify(window.{global_name}))'],
        capture_output=True, text=True)
    if out.returncode != 0:
        sys.exit(f'failed to read {global_name} from {path}:\n{out.stderr}')
    return json.loads(out.stdout)


def compact(obj):
    return json.dumps(obj, ensure_ascii=False, separators=(',', ':'))


def section_html(cfg, copy):
    """{{SECTIONS}} from cfg.layout: shell sections carry copy; module sections
    are hidden scaffolds the shell fills at boot (title/note live in module code)."""
    sec = copy['sections']

    def card_plot(cid, hd=None):
        title = hd if hd is not None else f'<h2>{sec[cid]["title"]}</h2>'
        note = f'<div class="note">{sec[cid]["note"]}</div>' if sec[cid].get('note') else ''
        return (f'<section class="card">\n  {title}\n  {note}\n'
                f'  <div id="{cid}" class="plot"></div>\n  <div class="tapnote" id="tap_{cid}"></div>\n</section>')

    def module_card(mid):
        return (f'<section class="card" id="sec_{mid}" hidden>\n  <h2></h2>\n  <div class="note"></div>\n'
                f'  <div id="{mid}" data-mount></div>\n  <div class="tapnote" id="tap_{mid}"></div>\n</section>')

    def one(tok):
        if tok.startswith('@'):
            return module_card(tok[1:])
        if tok.startswith('two:'):
            return '<div class="two">\n' + '\n'.join(one(t) for t in tok[4:].split(',')) + '\n</div>'
        if tok == 'map':
            return card_plot('map')
        if tok == 'dtf':
            return card_plot('dtf', f'<div class="hd"><h2>{sec["dtf"]["title"]}</h2>'
                                    '<span class="tools" style="color:var(--ink2)">x-axis: clock time</span></div>')
        if tok == 'race':
            hd = (f'<div class="hd">\n    <h2>{sec["race"]["title"]}</h2>\n    <span class="tools">\n'
                  '      <button class="modebtn" id="mode_h">Corrected (handicap)</button>\n'
                  '      <button class="modebtn" id="mode_e">Elapsed (boat-for-boat)</button>\n'
                  '      &nbsp;·&nbsp;\n'
                  '      <button class="modebtn" id="view_p">Pace (min/100nm)</button>\n'
                  '      <button class="modebtn" id="view_t">Total (min)</button>\n'
                  '      &nbsp;·&nbsp; <label for="refsel">Reference</label> <select id="refsel"></select>\n'
                  '    </span>\n  </div>')
            return (f'<section class="card">\n  {hd}\n  <div class="note" id="racenote"></div>\n'
                    '  <div id="race" class="plot"></div>\n  <div class="tapnote" id="tap_race"></div>\n</section>')
        if tok in ('xte', 'sog'):
            return card_plot(tok, f'<div class="hd"><h2>{sec[tok]["title"]}</h2>'
                                  f'<span class="tools" id="{tok}_axnote"></span></div>')
        if tok == 'events':
            return (f'<section class="card">\n  <h2>{sec["events"]["title"]}</h2>\n'
                    f'  <div class="note">{sec["events"]["note"]}</div>\n'
                    '  <div id="eventtable" style="max-height:520px;overflow-y:auto"></div>\n</section>')
        sys.exit(f'unknown layout token: {tok}')

    return '\n\n'.join(one(t) for t in cfg['layout'])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('race_dir', help='races/<race>')
    ap.add_argument('--skip-tests', action='store_true')
    args = ap.parse_args()
    race_dir = Path(args.race_dir).resolve()
    dist = race_dir / 'dist'

    if not args.skip_tests:
        run_tests(race_dir)

    cfg = read_js_global(race_dir / 'presentation.js', '__RACE_CONFIG__')
    copy = read_js_global(race_dir / 'copy.js', '__COPY__')
    data = json.loads((race_dir / 'out' / 'dashboard_data.json').read_text())

    # ── payload split (I7: defaults ⊆ core; I8: insertion order preserved) ──
    quick = set(cfg['groups']['quick'])
    default_boats = set(cfg['defaults']['boats']) | {cfg['defaults']['ref']}
    core = {k: data[k] for k in KEEP}
    core['boats'] = {}
    more = {}
    missing = default_boats - set(data['boats'])
    assert not missing, f'defaults.boats not in payload: {missing}'
    for name, boat in data['boats'].items():   # insertion order is meaningful (palette assignment)
        if boat['meta']['grp'] in quick or name in default_boats:
            core['boats'][name] = boat
        else:
            core['boats'][name] = {'meta': boat['meta']}
            more[name] = {k: v for k, v in boat.items() if k != 'meta'}
    for name in default_boats:   # default selection must render on first paint
        assert 't' in core['boats'][name], f'{name} shipped without a track in core.json'
    payloads = {'core.json': compact(core), 'more.json': compact(more),
                'fleet.json': compact(data['fleet'])}

    # ── script list (order matters: helpers → tokens → core → charts → race) ──
    race_scripts = (['race/presentation.js', 'race/copy.js']
                    + [f'race/modules/{m}.js' for m in cfg['modules']]
                    + [f'race/overlays/{o}.js' for o in cfg['overlays']])
    scripts = [f'app/{p.split("app/")[-1]}' for p in APP_FILES] + race_scripts

    # ── cache-bust on app code + race code + core payload ──
    h = hashlib.sha1()
    for f in APP_FILES:
        h.update((SHELL / f).read_bytes())
    for f in race_scripts:
        h.update((race_dir / f.replace('race/', '')).read_bytes())
    for f in ['tokens.css', 'styles.css', 'index.template.html']:
        h.update((SHELL / f).read_bytes())
    h.update(payloads['core.json'].encode())
    version = h.hexdigest()[:10]
    built = time.strftime('%Y-%m-%d')
    stamp = lambda s: s.replace('__V__', version).replace('__BUILT__', built)

    # ── render index.html ──
    tb = copy['titleblock']
    meta = cfg['meta']
    html = (SHELL / 'index.template.html').read_text()
    html = (html.replace('{{TITLE}}', meta['title'])
                .replace('{{DESCRIPTION}}', meta['description'])
                .replace('{{OG_DESCRIPTION}}', meta['ogDescription'])
                .replace('{{TWITTER_DESCRIPTION}}', meta.get('twitterDescription', meta['ogDescription']))
                .replace('{{URL}}', meta['url'])
                .replace('{{TB_EYEBROW}}', tb['eyebrow']).replace('{{TB_H1}}', tb['h1'])
                .replace('{{TB_SUB}}', tb['sub']).replace('{{TB_RESULT}}', tb['result'])
                .replace('{{TB_TZN}}', tb['tzn'])
                .replace('{{NOSCRIPT}}', copy['noscript'])
                .replace('{{LOADING}}', copy['loading'])
                .replace('{{CONTROLS_HINT}}', copy['controlsHint'])
                .replace('{{SECTIONS}}', section_html(cfg, copy))
                .replace('{{FOOTER}}', copy['footer']))
    script_tags = '\n'.join(f'<script src="{s}?v=__V__" defer></script>' for s in scripts)
    html = html.replace('{{SCRIPTS}}', script_tags)
    assert '{{' not in html, re.search(r'\{\{[A-Z_]+\}\}', html).group(0) + ' slot unfilled'

    # ── write dist ──
    if dist.exists():
        shutil.rmtree(dist)
    (dist / 'data').mkdir(parents=True)
    (dist / 'race').mkdir()
    shutil.copytree(SHELL / 'vendor', dist / 'vendor')
    shutil.copy(race_dir / 'favicon.svg', dist / 'favicon.svg')
    og = race_dir / 'og.png'
    if og.exists():
        shutil.copy(og, dist / 'og.png')
    else:
        print('warning: og.png missing — social preview image not shipped')
    for name, text in payloads.items():
        (dist / 'data' / name).write_text(text)
    (dist / 'index.html').write_text(stamp(html))
    for f in ['tokens.css', 'styles.css']:
        (dist / f).write_text(stamp((SHELL / f).read_text()))
    for f in APP_FILES:
        target = dist / f
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(stamp((SHELL / f).read_text()))
    for f in race_scripts:
        src = race_dir / f.replace('race/', '')
        target = dist / f
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_text(stamp(src.read_text()))

    # ── standalone single-file fallback (file:// friendly; no fetches) ──
    page = stamp(html)
    embedded = compact({**{k: data[k] for k in KEEP}, 'boats': data['boats'],
                        'fleet': data['fleet']}).replace('</', '<\\/')
    # function repl: keeps re.sub from interpreting backslashes inside the JSON
    page, n = re.subn(r'<!-- DATA:FETCH.*?/DATA:FETCH -->',
                      lambda _: '<script>window.__DATA_EMBEDDED__=' + embedded + '</script>',
                      page, flags=re.S)
    assert n == 1, 'DATA:FETCH markers not found in the template'
    for f in ['tokens.css', 'styles.css']:
        tag = '<link rel="stylesheet" href="%s?v=%s">' % (f, version)
        assert tag in page, tag
        page = page.replace(tag, '<style>\n' + stamp((SHELL / f).read_text()) + '\n</style>')
    # inline scripts don't defer — drop the head tags and re-inline them at the
    # end of <body> so the DOM (and Plotly) exist before app code runs
    tail = '<script id="plotlyjs">\n' + (SHELL / 'vendor' / 'plotly-basic-2.35.2.min.js').read_text() + '\n</script>\n'
    for s in scripts:
        tag = '<script src="%s?v=%s" defer></script>' % (s, version)
        assert tag in page, tag
        page = page.replace(tag, '')
        src = (SHELL / s) if s.startswith('app/') else (race_dir / s.replace('race/', ''))
        tail += '<script>\n' + stamp(src.read_text()) + '\n</script>\n'
    page = page.replace('<script src="vendor/plotly-basic-2.35.2.min.js" id="plotlyjs" defer></script>', '')
    assert '</body>' in page
    page = page.replace('</body>', tail + '</body>')
    (dist / 'standalone.html').write_text(page)

    sizes = {p.relative_to(dist).as_posix(): p.stat().st_size
             for p in sorted(dist.rglob('*')) if p.is_file()}
    total = sum(sizes.values())
    print(f'built {dist} (version {version})')
    for k, v in sizes.items():
        print(f'  {v/1024:8.1f} KB  {k}')
    print(f'  {total/1024:8.1f} KB  total')
    print(f'serve locally:  cd {dist} && python3 -m http.server 8000')


if __name__ == '__main__':
    main()
