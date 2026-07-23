# OPEN_THREADS — the repo's only living log

Everything open, undecided, or to-do lives here; nothing else does (owner
doctrine, 2026-07-16/23: compact, don't append — when a thread closes, delete
it; when a decision becomes a rule, encode it in CLAUDE.md, the skill,
INVARIANTS.md, or a code comment and delete it here. Git history is the
archive; the pre-merge REPO_NOTES/DOC_GAPS ledgers end at this file's
introduction).

- **decyb license** (YB binary decoder port): no declared license upstream;
  owner-adjudicated fine for this personal/non-commercial use with author
  attribution. Revisit before any commercial use — terms from the author, or
  cleanroom-reimplement from `starter/acquisition/README.md`'s byte-layout
  notes. (2026-07-08)
- **`docs/OPINIONS_NB/` deletion**: executes when main is next merged into
  the `nb2026-opinions` branch (PR #1); `verdict_mobile.png` can go
  immediately (nothing references it).
- **Finish-line coordinate provenance (NB2026)**: footer copy says
  "triangulated from six boats' official finish times" but no document
  records which six or the method; coordinates were taken from legacy code as
  given. Needs owner input (or a re-derivation exercise) to close.
- **consistency_check covers only the NB-shaped pinned keys** (review,
  2026-07-23): `starter/shell/build.py` cross-checks tz_probe, the three
  endpoint keys, and `module_canaries.park` — BIR's `names_meta_only` and
  `module_canaries.upwind_excess` can drift between config and
  tests/regression.json unchecked. Fix: iterate whatever keys both sides
  carry instead of a hardcoded list.
- **Tier-1 (fleet-only) builds need a hero today** (review, 2026-07-23):
  `build_data.py` pivots stats/groups/series on `client_boat` unconditionally
  — a null client_boat crashes at the stats step, so true fleet-commentary
  builds aren't possible yet. Docs now state the requirement (pick an
  analysis pivot); a guarded hero-less path is the real fix.
