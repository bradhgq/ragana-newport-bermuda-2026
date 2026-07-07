"""Great-circle geometry shared by the pipeline. Pure functions, numpy-vectorized.

All distances in nautical miles (earth radius 3440.065 nm), angles in radians
internally. These are byte-for-byte the worked example's formulas — do not
"improve" them without regenerating goldens (prime rule 3).
"""
import numpy as np

R_NM = 3440.065


def hav(lat1, lon1, lat2, lon2):
    """Haversine distance in nm. Accepts scalars or arrays."""
    p1, p2, l1, l2 = map(np.radians, [lat1, lat2, lon1, lon2])
    a = np.sin((p2 - p1) / 2) ** 2 + np.cos(p1) * np.cos(p2) * np.sin((l2 - l1) / 2) ** 2
    return 2 * R_NM * np.arcsin(np.sqrt(a))


def bearing(lat1, lon1, lat2, lon2):
    """Initial great-circle bearing (radians) from point 1 to point 2."""
    p1, p2, l1, l2 = map(np.radians, [lat1, lat2, lon1, lon2])
    y = np.sin(l2 - l1) * np.cos(p2)
    x = np.cos(p1) * np.sin(p2) - np.sin(p1) * np.cos(p2) * np.cos(l2 - l1)
    return np.arctan2(y, x)


def destination(lat, lon, bearing_rad, dist_nm):
    """Great-circle destination point from (lat, lon) on a bearing for dist_nm."""
    d = dist_nm / R_NM
    p1, l1 = np.radians(lat), np.radians(lon)
    p2 = np.arcsin(np.sin(p1) * np.cos(d) + np.cos(p1) * np.sin(d) * np.cos(bearing_rad))
    l2 = l1 + np.arctan2(np.sin(bearing_rad) * np.sin(d) * np.cos(p1),
                         np.cos(d) - np.sin(p1) * np.sin(p2))
    return np.degrees(p2), np.degrees(l2)


def gc_interpolate(p1, p2, n):
    """n points (inclusive of both ends) along the great circle p1->p2 (slerp)."""
    la1, lo1, la2, lo2 = map(np.radians, [p1[0], p1[1], p2[0], p2[1]])
    v1 = np.array([np.cos(la1) * np.cos(lo1), np.cos(la1) * np.sin(lo1), np.sin(la1)])
    v2 = np.array([np.cos(la2) * np.cos(lo2), np.cos(la2) * np.sin(lo2), np.sin(la2)])
    omega = np.arccos(np.clip(v1 @ v2, -1, 1))
    ts = np.linspace(0, 1, n)
    pts = []
    for t in ts:
        v = (np.sin((1 - t) * omega) * v1 + np.sin(t * omega) * v2) / np.sin(omega)
        pts.append((float(np.degrees(np.arcsin(v[2]))),
                    float(np.degrees(np.arctan2(v[1], v[0])))))
    return pts


def xte_signed(start, finish):
    """Cross-track-distance function for the course line start→finish.

    Returns f(lat, lon) -> nm off the line. Sign convention (inherited from the
    worked example): POSITIVE = port side of the course direction. For a course
    heading roughly south (e.g. Newport→Bermuda) that reads as "east of the
    rhumb line". The standard XTD formula gives positive-starboard; the leading
    minus flips it.
    """
    t12 = bearing(start[0], start[1], finish[0], finish[1])

    def f(lat, lon):
        d13 = hav(start[0], start[1], lat, lon) / R_NM
        t13 = bearing(start[0], start[1], lat, lon)
        return -np.arcsin(np.sin(d13) * np.sin(t13 - t12)) * R_NM

    return f
