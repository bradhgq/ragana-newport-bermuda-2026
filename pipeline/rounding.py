"""Tie-aware rounding — the GATE A adjudication, encoded.

Cross-platform builds can disagree by exactly one serialization quantum when
the unrounded value lies on a .5 rounding tie (1-ulp differences upstream
decide which side round() lands on). The rule: such a diff is EXEMPT iff
|Δ| equals exactly one quantum AND the recomputed unrounded value was within
epsilon of a tie. This module records the tie side of that predicate at build
time; compare_data.py enforces both halves. No loosened global tolerance, no
hardcoded allowlist — the tie set is regenerated from data on every build, so
a real regression still fails loudly.
"""
import math


class TieTracker:
    """Collects {compare-path: quantum} for every rounded value that sits on
    (or within eps of) a .5 rounding tie."""
    EPS = 1e-6   # in quantum units; observed platform noise is ~1e-9, real
                 # value changes are >= 1 full quantum

    def __init__(self):
        self.ties = {}

    def r(self, v, ndigits, path):
        """round(v, ndigits), recording path if v is a tie."""
        v = float(v)
        scaled = v * 10 ** ndigits
        if abs(scaled - math.floor(scaled) - 0.5) < self.EPS:
            self.ties[path] = 10 ** -ndigits
        return round(v, ndigits)

    def rint(self, v, path):
        """round(v) to int, recording path if v is a tie."""
        v = float(v)
        if abs(v - math.floor(v) - 0.5) < self.EPS:
            self.ties[path] = 1
        return round(v)


class NullTracker(TieTracker):
    """Same interface, records nothing (for callers that don't need ties)."""

    def r(self, v, ndigits, path=None):
        return round(float(v), ndigits)

    def rint(self, v, path=None):
        return round(float(v))
