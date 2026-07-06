# PROMPT — paste this into Claude Code as the opening instruction

You are taking over a working, single-file race-analysis dashboard to productionize it for public hosting on my personal website. The subject: RAGANA (Cape Fear 38, sail USA 52238), 2026 Newport Bermuda Race, 46/86 St. David's Lighthouse Overall. The audience is public — primarily RAGANA's crew, but open to other sailors. The current build is v5, fully working, in this package.

## What you're inheriting

- `ragana_nb2026_dashboard.html` — the assembled, working reference build (open it in a browser first; everything below should keep behaving exactly like this).
- `dashboard_template.html` — the source template. All JS/CSS lives here. Data is injected at the `__DATA__` placeholder.
- `dashboard_data.json` — the full data payload (~1.8 MB): 88 boats at 15-min resolution (`t` epoch-UTC seconds, `lat`, `lon`, `dtf` nm-to-finish, `xte` nm-east-of-rhumb, `sog` kts), a 144-boat hourly `fleet` ghost layer, 48 `events` (with an `insight` category carrying analysis findings), `watches` spans, `parkFair` per-boat light-air traversal stats, `recon` (nav-log reconciliation), `mil` milestone series, and `stats`.
- `export_json.py` — the Python pipeline that produced the JSON from the raw YB tracker CSV (`nb2026_tracks.csv`, not included — ask me if you need it regenerated). Treat the JSON as authoritative; do not recompute race numbers.
- `assemble.py` — injects the JSON into the template.

## Architecture facts you must preserve (hard-won correctness)

1. **Timezone safety.** All chart x-values are timezone-NAIVE strings built by `edtStr()` (EDT = UTC−4). Never pass JS `Date` objects to Plotly axes — a previous version double-shifted in US-Eastern browsers. Node test: `TZ=America/New_York` and assert `edtStr(1782094500) === '2026-06-21 22:15'`.
2. **Exact endpoints.** The "Where the race was won and lost" chart terminates every line at the OFFICIAL corrected/elapsed result (parsed from `meta.corr`/`meta.el`), not at the last tracker milestone. A previous version truncated at DTF 20 and flipped finish signs for three boats. Regression checks: vs Christopher Dragon, RAGANA's endpoint = +94.0 min corrected / +155.3 min elapsed.
3. **The park metric.** The park table uses each boat's own traversal of the DTF 180→80 zone, NOT a wall-clock window (a prior version made that mistake; there's a retraction embedded in the copy). Gemini II = 31% under 4 kts — if you ever see 0% for her, something regressed.
4. **Names.** Two boats named Phoenix, disambiguated as `Phoenix USA25329` (J/120, quick-select) and `Phoenix USA93063` (First 40.7, under "+ More"). "Hissy Fit II" is whitespace-normalized (the CSV has a double space).
5. **State model.** One `S` object; pure `build*()` functions that regenerate via `Plotly.react`; boat traces keyed by display name; the central axis toggle (`S.axis` = `'t'`|`'d'`) drives the DTF/rhumb/speed charts through `sharedXaxis()`, `axVal()`, `evX()`. Keep this pattern.

## Your jobs, in priority order

1. **Mobile.** Make the whole thing genuinely work on a phone (390 px), not just not-break: chart heights and margins per breakpoint; the boat-chip rows should collapse into something thumb-friendly (an expandable sheet or horizontal scroll with fade hints); tables become horizontally scrollable cards with a sticky first column; hover-only information needs a tap equivalent (Plotly click events or a detail drawer); the sticky controls bar should compress to a slim toolbar on scroll. Test at 390/768/1024/1280.
2. **Split and lazy-load.** Stop embedding 1.8 MB. Serve `dashboard_data.json` split: core (RAGANA + quick-select boats + events + parkFair + recon) loaded eagerly; the 144-boat fleet layer and the ~60 "+ More" boats fetched on demand. Keep a no-server fallback note (file:// won't fetch — either keep an embedded fallback build target in `assemble.py` or document `python -m http.server`).
3. **Performance.** Consider `scattergl` for the map's fleet layer; debounce re-renders on rapid chip toggling; only re-render charts whose inputs changed (the current code re-renders everything on any toggle — fine locally, wasteful hosted).
4. **Design polish, within the existing identity.** The visual identity is a NOAA-chart-inspired "title block" aesthetic: chart-paper palette, nautical-chart magenta (#C2187E) as RAGANA's color and accent, monospace coordinates/timestamps, the perforated title block. Keep it — it's the signature. Improve refinement, spacing rhythm, and focus states; add visible keyboard focus; respect `prefers-reduced-motion` (a media query exists, extend it). Do not restyle into a generic SaaS dashboard.
5. **Hosting hygiene.** Meta tags (OG/Twitter card with a static preview image you generate from the map), favicon, `<noscript>` message, error state if data fetch fails, and a build script that outputs a `dist/` folder ready to drop into a static site. Pin the Plotly version; consider self-hosting the Plotly bundle.
6. **Accessibility pass.** Landmarks, table semantics, aria-pressed on toggle chips, contrast check on the muted ink (#51677A on white is ~4.6:1 — verify all small text passes AA).

## What NOT to do

- Don't recompute or "fix" any race numbers — the JSON is the authority and every number in it has been reconciled against official results and the boat's nav log.
- Don't change the copy's substance. It's been deliberately edited for a public audience (personal candor removed, corrections owned in the methodology notes). Light copyediting is fine; new claims are not.
- Don't add features beyond this brief without asking — there's a wishlist (NOAA Gulf Stream overlay, GFS wind underlay, animated time scrubber, synced hover) that is explicitly OUT of scope for this pass; it's listed in the dashboard footer for a future round.

## Definition of done

A `dist/` build that: loads core content in <1s on fast 3G simulation, works fully by touch at 390 px, passes the three regression checks above (write them as a small node test you run), and looks like the same boat's dashboard — just tighter.
