/* Plotly-side design tokens (RETROSPECTIVE §3). The hex values are the Plotly
   copies of tokens.css custom properties — Plotly can't read CSS vars, so keep
   the two files in sync by hand:
     AXFONT.color  = --ink2   (AA-checked 4.5:1+ on white and #F3F7F8)
     BASE font     = --ink
     GAX linecolor = --rule
   Never let a chart or module hand-roll these. */
"use strict";

const AXFONT = { family: 'SF Mono, Menlo, Consolas, monospace', size: 10.5, color: '#4C6274' };

/* 760px = THE mobile contract — single source of truth shared with the CSS
   breakpoint block; keep this matchMedia string and the media query identical. */
const narrow = () => window.matchMedia('(max-width:760px)').matches;

function BASE() {
  return {
    paper_bgcolor: 'rgba(0,0,0,0)', plot_bgcolor: '#FDFEFD',
    font: { family: '-apple-system, Helvetica Neue, Arial', size: 12, color: '#17293A' },
    margin: narrow() ? { l: 44, r: 10, t: 8, b: 40 } : { l: 56, r: 16, t: 8, b: 40 },
    hovermode: 'closest',
    hoverlabel: { align: 'left', bgcolor: '#17293A', bordercolor: '#17293A', font: { size: 11.5, color: '#fff' } },
    legend: { orientation: 'h', y: -0.14, font: { size: 11 } }
  };
}
const GAX = { gridcolor: '#E3ECEF', zerolinecolor: '#B9CBD4', tickfont: AXFONT, linecolor: '#B9CBD4' };
const PLOTCFG = { responsive: true, displaylogo: false, displayModeBar: false };
