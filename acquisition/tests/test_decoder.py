"""Offline regression for the YB AllPositions3 decoder — runs in CI, no network.

Fixture: a real (small) blob, ildr2025 — Ida Lewis Distance Race 2025, whose
public tracker carried only 3 boats (ids 2, 4, 12: Boudicca, Concise 8, Max).
Downloaded 2026-07-07 from https://cf.yb.tl/BIN/ildr2025/AllPositions3
(sha256 f6dbd5d136f3b126320196fc5c158dd55d029815f84dcca5d052521f13ce87f4);
expected values cross-checked against the independently downloaded
ildr2025_tracks.csv from the acquisition session (5190 rows, byte-equal fields).

Note: the binary stores each boat's moments NEWEST-FIRST (delta records walk
backwards in time); the download scripts sort ascending afterwards.
"""
import hashlib
import sys
import unittest
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from yb_tracker_download import parse_positions  # noqa: E402

FIXTURE = Path(__file__).parent / 'fixtures' / 'ildr2025_AllPositions3.bin'

# per boat id: (moment count, newest (at, lat, lon), oldest (at, lat, lon))
EXPECTED = {
    2:  (1714, (1755383793, 41.4776, -71.32599), (1755266700, 41.4852, -71.355)),
    4:  (1724, (1755386576, 41.47758, -71.32599), (1755266700, 41.4824, -71.3175)),
    12: (1752, (1755386442, 41.47758, -71.32601), (1755266700, 41.4756, -71.3317)),
}


class TestDecoder(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.buf = FIXTURE.read_bytes()

    def test_fixture_integrity(self):
        self.assertEqual(hashlib.sha256(self.buf).hexdigest(),
                         'f6dbd5d136f3b126320196fc5c158dd55d029815f84dcca5d052521f13ce87f4')

    def test_flags(self):
        # ildr2025's blob carries the dtf channel (bit 1), nothing else
        self.assertEqual(self.buf[0], 2)

    def test_boats_and_endpoints(self):
        boats = parse_positions(self.buf)
        self.assertEqual(sorted(b['id'] for b in boats), sorted(EXPECTED))
        total = 0
        for b in boats:
            count, newest, oldest = EXPECTED[b['id']]
            ms = b['moments']
            total += len(ms)
            self.assertEqual(len(ms), count, f'boat {b["id"]} moment count')
            for got, want, which in ((ms[0], newest, 'newest'), (ms[-1], oldest, 'oldest')):
                self.assertEqual(got['at'], want[0], f'boat {b["id"]} {which} epoch')
                self.assertAlmostEqual(got['lat'], want[1], places=5, msg=f'boat {b["id"]} {which} lat')
                self.assertAlmostEqual(got['lon'], want[2], places=5, msg=f'boat {b["id"]} {which} lon')
        self.assertEqual(total, 5190)

    def test_monotone_time_within_boat(self):
        # newest-first: strictly non-increasing timestamps within each boat
        for b in parse_positions(self.buf):
            ats = [m['at'] for m in b['moments']]
            self.assertTrue(all(a >= b2 for a, b2 in zip(ats, ats[1:])),
                            f'boat {b["id"]} timestamps not newest-first')

    def test_lat_lon_plausible(self):
        # Ida Lewis: Newport round trip — everything near 41°N 71°W
        for b in parse_positions(self.buf):
            for m in b['moments'][::100]:
                self.assertTrue(40.0 < m['lat'] < 42.0, m)
                self.assertTrue(-72.5 < m['lon'] < -70.5, m)


if __name__ == '__main__':
    unittest.main()
