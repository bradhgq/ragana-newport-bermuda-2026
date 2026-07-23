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
- **CI is NB-only and hand-sequenced** (noticed 2026-07-23 while fixing the
  rename miss): `.github/workflows/ci.yml` predates the one-command chain —
  it runs the steps piecemeal (the exact stale-standalone shape the wrapper
  exists to prevent), covers nb2026 only, and skips the bir2026 suite.
  Candidate fix: one job per race running `starter/build_race.py` after the
  unit suites, with dist left uncommitted.
