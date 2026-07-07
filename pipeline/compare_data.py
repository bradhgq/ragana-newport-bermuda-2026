#!/usr/bin/env python3
"""Semantic JSON comparison for GATE A: key-order-insensitive, float-tolerant,
reports EVERY diff with its path.

    python3 pipeline/compare_data.py <candidate.json> <reference.json> \
        [--tol 1e-6] [--max-print 100] [--report out.txt] [--ties rounding_ties.json]

Exit 0 iff no NON-EXEMPT diffs.

Tie exemption (GATE A adjudication): with --ties (emitted by build_data.py), a
diff is exempt iff |Δ| equals exactly one serialization quantum AND the path
was recorded as a .5 rounding tie when the candidate was built (i.e. the
recomputed unrounded value sat within epsilon of the tie). Exempt diffs are
counted separately, never silently dropped. No loosened global tolerance, no
hardcoded allowlist — other machines tie at other points, and a real
regression (wrong value, or a shift at a non-tie site) still fails loudly.
"""
import argparse
import json
import sys
from collections import Counter


def walk(a, b, path, diffs, tol):
    if isinstance(a, dict) and isinstance(b, dict):
        for k in a.keys() | b.keys():
            p = f'{path}.{k}' if path else str(k)
            if k not in a:
                diffs.append((p, f'missing in candidate (reference has {trunc(b[k])})'))
            elif k not in b:
                diffs.append((p, f'extra in candidate (candidate has {trunc(a[k])})'))
            else:
                walk(a[k], b[k], p, diffs, tol)
        return
    if isinstance(a, list) and isinstance(b, list):
        if len(a) != len(b):
            diffs.append((path, f'list length {len(a)} != {len(b)}'))
        for i, (x, y) in enumerate(zip(a, b)):
            walk(x, y, f'{path}[{i}]', diffs, tol)
        return
    if isinstance(a, bool) or isinstance(b, bool):   # bool is int in Python — exact match only
        if a is not b:
            diffs.append((path, f'{a!r} != {b!r}'))
        return
    if isinstance(a, (int, float)) and isinstance(b, (int, float)):
        if abs(a - b) > tol:
            diffs.append((path, f'{a!r} != {b!r} (|Δ|={abs(a-b):.3g})'))
        return
    if a != b:
        diffs.append((path, f'{trunc(a)} != {trunc(b)}'))


def trunc(v, n=80):
    s = repr(v)
    return s[:n] + '…' if len(s) > n else s


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('candidate')
    ap.add_argument('reference')
    ap.add_argument('--tol', type=float, default=1e-6)
    ap.add_argument('--max-print', type=int, default=100)
    ap.add_argument('--report', help='write the full diff list to this file')
    ap.add_argument('--ties', help="candidate build's rounding_ties.json — enables the "
                                   'half-boundary tie exemption')
    args = ap.parse_args()

    a = json.load(open(args.candidate))
    b = json.load(open(args.reference))
    ties = json.load(open(args.ties)) if args.ties else {}
    diffs = []
    walk(a, b, '', diffs, args.tol)

    def is_exempt(path, msg):
        q = ties.get(path)
        if q is None or '!=' not in msg:
            return False
        try:
            x, y = (float(s.strip().split(' ')[0]) for s in msg.split('!='))
        except ValueError:
            return False
        return abs(abs(x - y) - q) <= q * 1e-6

    exempt = [(p, m) for p, m in diffs if is_exempt(p, m)]
    real = [(p, m) for p, m in diffs if not is_exempt(p, m)]

    if not diffs:
        print(f'IDENTICAL (semantic, tol={args.tol}): {args.candidate} == {args.reference}')
        return
    by_top = Counter(p.split('.')[0].split('[')[0] for p, _ in real)
    print(f'{len(diffs)} diff(s) [tol={args.tol}]: {len(exempt)} exempt half-boundary '
          f'tie(s), {len(real)} real — real by top-level key: {dict(by_top)}')
    for p, msg in real[:args.max_print]:
        print(f'  {p}: {msg}')
    if len(real) > args.max_print:
        print(f'  … {len(real) - args.max_print} more (use --report for the full list)')
    if args.report:
        with open(args.report, 'w') as f:
            for p, msg in real:
                f.write(f'{p}: {msg}\n')
            for p, msg in exempt:
                f.write(f'[exempt tie] {p}: {msg}\n')
        print(f'full report: {args.report}')
    sys.exit(1 if real else 0)


if __name__ == '__main__':
    main()
