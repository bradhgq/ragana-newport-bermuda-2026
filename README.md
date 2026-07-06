# RAGANA · Newport Bermuda 2026 — dashboard handoff package

Contents:
- PROMPT.md ............ paste into Claude Code to start the productionization pass
- ragana_nb2026_dashboard.html ... assembled v5 reference build (open in a browser; needs internet once, for the Plotly CDN)
- dashboard_template.html ........ source template; data injects at __DATA__
- dashboard_data.json ............ authoritative data payload (do not recompute)
- export_json.py ................. pipeline that produced the JSON from the raw YB tracker CSV
- assemble.py .................... one-liner injector: template + JSON -> built HTML

Regenerating from raw data requires nb2026_tracks.csv (YB tracker export, 252,046 rows) — not shipped here; Brad has it.

v5 state: public-audience copy, central time/DTF axis toggle, insight annotations as first-class events,
exact official endpoints on the race chart, timezone-naive rendering, fair park metric (DTF 180→80 traversal).
Test expectations are written into PROMPT.md.
