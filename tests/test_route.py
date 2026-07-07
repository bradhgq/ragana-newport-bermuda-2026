"""Routed distance-remaining tests (Phase 4, the four from the build prompt +
the out-and-back collapse regression). Run:

    .venv/bin/python -m unittest tests.test_route -v

Synthetic courses only — real mark lists are per-race CP-0 inputs. The
conventions under test are documented in pipeline/route.py."""
import sys
import unittest
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from pipeline import geo                 # noqa: E402
from pipeline.route import Course       # noqa: E402

# A dogleg course off New England: start -> E -> N -> E finish. Legs ~22-27 nm.
DOGLEG = [(41.0, -71.5), (41.0, -71.0), (41.4, -71.0), (41.4, -70.5)]


def sail_the_line(course, pts_per_leg=80):
    """Positions exactly along the course polyline (great-circle points),
    marks included once."""
    pts = []
    for a, b in zip(course.wp, course.wp[1:]):
        seg = geo.gc_interpolate(a, b, pts_per_leg)
        pts.extend(seg if not pts else seg[1:])
    lat = np.array([p[0] for p in pts])
    lon = np.array([p[1] for p in pts])
    return lat, lon


class TestRoutedDTF(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.course = Course(DOGLEG, mark_radius_nm=1.0)

    # 1 — DTF at the start ≈ official course length
    def test_start_dtf_is_course_length(self):
        dtf, _, leg = self.course.dtf_xte([DOGLEG[0][0]], [DOGLEG[0][1]])
        self.assertAlmostEqual(dtf[0], self.course.length_nm, places=6)
        self.assertEqual(leg[0], 0)
        # sanity: the polyline is the length its legs sum to
        self.assertAlmostEqual(self.course.length_nm, sum(self.course.leg_len), places=9)

    # 2 — monotone non-increasing for a boat sailing the line exactly
    def test_monotone_on_line(self):
        lat, lon = sail_the_line(self.course)
        dtf, xte, _ = self.course.dtf_xte(lat, lon)
        diffs = np.diff(dtf)
        self.assertLessEqual(diffs.max(), 1e-9,
                             f'DTF increased on-line by {diffs.max()} nm')
        self.assertAlmostEqual(dtf[-1], 0.0, places=9)   # arccos dust at the finish
        # on the line, XTE stays essentially zero on every leg
        self.assertLess(np.abs(xte).max(), 1e-6)

    # 3 — continuity at leg boundaries (along a swept track: the leg state is
    # stateful by design, so continuity is a property of tracks, not points)
    def test_continuity_at_marks(self):
        pts_per_leg = 80
        lat, lon = sail_the_line(self.course, pts_per_leg)
        dtf, _, _ = self.course.dtf_xte(lat, lon)
        for i in range(len(self.course.wp) - 2):          # each turning mark
            k = (i + 1) * (pts_per_leg - 1)               # the mark's index on the swept line
            self.assertAlmostEqual(dtf[k], self.course.rem_after[i], places=6,
                                   msg=f'DTF at mark {i + 1} != remaining-after-mark')
        # and no step anywhere exceeds ~2x the sample spacing
        spacing = self.course.length_nm / len(lat)
        self.assertLess(np.abs(np.diff(dtf)).max(), 2.5 * spacing,
                        'jump at a leg boundary exceeds sample spacing')

    # 4 — XTE measured against the ACTIVE leg, port-positive
    def test_xte_against_active_leg(self):
        # take mid-leg points of leg 1 (the northbound leg) and push them
        # 2 nm to port / starboard of the leg direction
        a, b = self.course.wp[1], self.course.wp[2]
        mids = geo.gc_interpolate(a, b, 30)[8:22]
        brg = geo.bearing(a[0], a[1], b[0], b[1])
        for side, sign in (('port', +1), ('starboard', -1)):
            off = [geo.destination(p[0], p[1], brg - sign * np.pi / 2, 2.0) for p in mids]
            lat = np.array([o[0] for o in off]); lon = np.array([o[1] for o in off])
            # approach on leg 0 first so the sweep is on the right leg
            lead = geo.gc_interpolate(self.course.wp[0], self.course.wp[1], 10)
            full_lat = np.concatenate([[p[0] for p in lead], lat])
            full_lon = np.concatenate([[p[1] for p in lead], lon])
            dtf, xte, leg = self.course.dtf_xte(full_lat, full_lon)
            on_leg1 = leg[10:] == 1
            self.assertTrue(on_leg1.all(), f'{side}: active leg drifted: {leg[10:]}')
            got = xte[10:]
            self.assertTrue(np.all(np.abs(got - sign * 2.0) < 0.02),
                            f'{side}: XTE {got.round(3)} != {sign * 2.0}')

    # 4b — after a wide rounding, XTE re-references the NEW leg
    def test_xte_rereferences_after_rounding(self):
        a, b, c = self.course.wp[0], self.course.wp[1], self.course.wp[2]
        approach = geo.gc_interpolate(a, b, 40)[:-1]
        # round mark 1 wide: 1.5 nm past the leg end (outside the 1.0 nm radius)
        wide = geo.destination(b[0], b[1], geo.bearing(a[0], a[1], b[0], b[1]), 1.5)
        after = geo.gc_interpolate((wide[0], wide[1]), c, 30)
        lat = np.array([p[0] for p in approach] + [wide[0]] + [p[0] for p in after[1:]])
        lon = np.array([p[1] for p in approach] + [wide[1]] + [p[1] for p in after[1:]])
        dtf, xte, leg = self.course.dtf_xte(lat, lon)
        k = len(approach)
        # wide of the mark: outside the radius but past the abeam plane ->
        # advance rule (a); DTF ~ full remaining after leg 0
        self.assertEqual(leg[k], 1, 'wide rounding did not advance the leg')
        self.assertAlmostEqual(dtf[k], self.course.rem_after[0], delta=0.35)
        # XTE now references leg 1: starts at the wide offset, converges to 0 at its end
        self.assertGreater(abs(xte[k]), 1.0, 'XTE not re-referenced at the rounding')
        self.assertLess(abs(xte[-1]), 0.02, 'XTE did not converge onto leg 1')

    # 5 — the out-and-back regression: outbound DTF must NOT collapse onto the
    # reciprocal return leg (the ALIR / Block Island shape)
    def test_out_and_back_no_collapse(self):
        out_back = Course([(41.0, -71.5), (41.0, -70.7), (41.02, -71.5)], mark_radius_nm=1.0)
        lat, lon = sail_the_line(out_back, pts_per_leg=100)
        dtf, _, leg = out_back.dtf_xte(lat, lon)
        half_out = 50  # halfway up the outbound leg
        self.assertEqual(leg[half_out], 0)
        # a nearest-leg chooser would read ~the lateral separation (~1 nm);
        # the correct answer is half the outbound leg + the whole return leg
        expect = out_back.leg_len[0] / 2 + out_back.leg_len[1]
        self.assertAlmostEqual(dtf[half_out], expect, delta=1.0)
        self.assertLessEqual(np.diff(dtf).max(), 1e-9, 'out-and-back DTF not monotone')


if __name__ == '__main__':
    unittest.main()
