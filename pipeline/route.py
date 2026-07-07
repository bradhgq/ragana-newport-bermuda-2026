"""Routed distance-remaining for mark courses (course.type: marks).

Great-circle DTF breaks the moment a course rounds a mark: a boat on the
outbound leg of an out-and-back course is geographically CLOSE to the finish
while most of its race is still ahead. This module measures distance remaining
ALONG the course polyline instead.

## The course model

Waypoints = [start] + course.marks + [finish], an ordered polyline. Leg i runs
W_i -> W_{i+1} with great-circle length L_i; rem_after[i] = sum of leg lengths
after leg i. Official course length should approximate sum(L_i); build_data
logs the delta as a sanity check.

## Conventions (each is load-bearing; tests/test_route.py exercises them all)

1. **Stateful, monotone leg assignment.** Boats round marks in order (racing
   rules), so each track is swept in time order and the active leg index NEVER
   regresses. This is what keeps an out-and-back course sane: without it, a
   boat halfway up the outbound leg projects beautifully onto the reciprocal
   return leg a mile away and its DTF collapses. Nearest-leg selection is
   therefore NOT used.

2. **Approach blend inside the mark radius.** Within `mark_radius_nm` of the
   next turning mark, dtf = dist(P, mark) + rem_after[mark]. Rationale: leg
   projections distort near a corner — worst at hairpin turns, where the
   reciprocal next leg overlaps the approach and an early leg switch makes DTF
   *rise* as the boat closes the mark (found by test, not foresight: the first
   implementation advanced on radius-entry and crept +0.37 nm/ping on an
   out-and-back). The blend is continuous with the leg formula at the radius
   boundary for an on-line track, exact (= rem_after) at the mark itself, and
   strictly decreasing for any boat actually closing the mark.

3. **Advance rule.** The active leg steps i -> i+1 at the first ping where
   either
     (a) the boat crosses the mark's abeam plane: along-track on leg i
         >= L_i (covers wide roundings that never enter the radius), or
     (b) the boat HAS BEEN inside the radius and is now receding from its
         closest approach (current distance-to-mark exceeds the minimum seen)
         with positive along-track on the next leg — the rounding is behind
         it. Keyed to the minimum seen, not the current ping, so a sparse
         track that jumps from the mark to far down the next leg still
         advances.
   The rule loops, so sparse pings can advance across a short leg in one step.
   A boat that turns inside the mark without reaching it takes a one-off DTF
   step at closest approach equal to the distance it didn't sail — honest, and
   unavoidable for ping-sparse roundings anyway.

4. **Wide-of-line convention.** On a leg, the along-track projection is
   CLAMPED to [0, L_i]:  dtf = (L_i - clamp(along)) + rem_after[i].
   A boat maneuvering behind the leg's start has banked nothing (dtf = L_i +
   rem_after[i]); lateral excursion never inflates or deflates DTF — it shows
   up in XTE. DTF answers "how much course is left", XTE answers "how far off
   the line are you".

5. **XTE against the active leg**, signed with the same convention as the
   point-to-point case (pipeline/geo.py): positive = port side of the leg
   direction. Inside the approach blend the reference is still the incoming
   leg; rounding a mark re-references XTE to the new leg — a visible step in
   the XTE chart at each rounding is expected and correct.
"""
import numpy as np

from pipeline import geo


def _along_cross(la, lo, w0, w1):
    """Along-track (unclamped, signed) and cross-track (port-positive) nm from
    the great-circle leg w0->w1 for one position."""
    d13 = float(geo.hav(w0[0], w0[1], la, lo)) / geo.R_NM
    t13 = float(geo.bearing(w0[0], w0[1], la, lo))
    t12 = float(geo.bearing(w0[0], w0[1], w1[0], w1[1]))
    xt = np.arcsin(np.clip(np.sin(d13) * np.sin(t13 - t12), -1, 1))
    at = float(np.arccos(np.clip(np.cos(d13) / max(np.cos(xt), 1e-12), -1, 1))) * geo.R_NM
    if np.cos(t13 - t12) < 0:            # behind the leg start
        at = -at
    return at, -float(xt) * geo.R_NM      # minus: port-positive (geo.py convention)


class Course:
    """An ordered waypoint polyline: [start, *marks, finish]."""

    def __init__(self, waypoints, mark_radius_nm=1.0):
        if len(waypoints) < 2:
            raise ValueError('a course needs at least start and finish')
        self.wp = [tuple(w) for w in waypoints]
        self.mark_radius_nm = mark_radius_nm
        self.leg_len = [float(geo.hav(a[0], a[1], b[0], b[1]))
                        for a, b in zip(self.wp, self.wp[1:])]
        self.n_legs = len(self.leg_len)
        # rem_after[i] = course distance remaining once leg i is fully done
        self.rem_after = np.concatenate([np.cumsum(self.leg_len[::-1])[::-1][1:], [0.0]])
        self.length_nm = float(sum(self.leg_len))

    def dtf_xte(self, lat, lon):
        """Routed DTF + active-leg XTE for one boat's TIME-ORDERED track.

        Returns (dtf, xte, leg) arrays. Stateful per conventions 1-3; scalars
        per ping over a handful of legs — a plain loop is plenty.
        """
        lat = np.asarray(lat, dtype=float)
        lon = np.asarray(lon, dtype=float)
        n = len(lat)
        dtf = np.empty(n)
        xte = np.empty(n)
        leg_idx = np.empty(n, dtype=int)
        leg = 0
        min_d_mark = np.inf    # closest approach to the CURRENT next-mark so far
        for k in range(n):
            la, lo = lat[k], lon[k]
            # ── advance (may fire repeatedly across short legs) ──
            while leg < self.n_legs - 1:
                mark = self.wp[leg + 1]
                d_mark = float(geo.hav(la, lo, mark[0], mark[1]))
                at_i, _ = _along_cross(la, lo, self.wp[leg], self.wp[leg + 1])
                crossed_abeam = at_i >= self.leg_len[leg]                       # rule (a)
                past_closest = (min_d_mark <= self.mark_radius_nm               # rule (b)
                                and d_mark > min_d_mark
                                and _along_cross(la, lo, self.wp[leg + 1],
                                                 self.wp[leg + 2])[0] > 0)
                if crossed_abeam or past_closest:
                    leg += 1
                    min_d_mark = np.inf
                    continue
                min_d_mark = min(min_d_mark, d_mark)
                break
            # ── dtf + xte on the active leg ──
            at, xt = _along_cross(la, lo, self.wp[leg], self.wp[leg + 1])
            if leg < self.n_legs - 1:
                d_mark = float(geo.hav(la, lo, *self.wp[leg + 1]))
                if d_mark <= self.mark_radius_nm:
                    # convention 2: approach blend — projection-distortion-free
                    dtf[k] = d_mark + self.rem_after[leg]
                    xte[k] = xt
                    leg_idx[k] = leg
                    continue
            a = min(max(at, 0.0), self.leg_len[leg])   # convention 4: clamp
            dtf[k] = (self.leg_len[leg] - a) + self.rem_after[leg]
            xte[k] = xt
            leg_idx[k] = leg
        return dtf, xte, leg_idx
