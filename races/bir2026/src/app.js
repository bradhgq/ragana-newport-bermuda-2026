/* Ragana · Block Island Race 2026 — dashboard app.

   Productionized from the CP-4-approved monolith (dashboard_template.html).
   The chart-building math is that monolith VERBATIM — every number it draws is
   locked by the 16 regression assertions (G1–G5 + A1–A16) and by the FROZEN
   oracle payload. What is new here is only the production scaffolding, ported
   from the Newport Bermuda build: a three-payload split (core eager, fleet after
   first paint, more on demand), a Plotly-gated async boot, rAF-batched scoped
   re-render, the phone bottom sheet, keyboard/ARIA affordances, tap-to-inspect,
   and non-colour division cues. None of that touches the analysis.

   Timezone-safe helpers (edtStr, fmt, parseHMS, parseLocal, hitTime, startOf,
   wrapText) live in helpers.js and arrive as globals (also require()'d by the
   node tests). */
"use strict";

/* ═══ data + readiness ═══ */
let D = null;            // core payload (authoritative; never recompute race numbers)
let FLEET = null;        // ghost layer, lazy
let ORDER = [], boatColor = {};
let chartsOK = false;    // Plotly loaded and core data present
let moreP = null;        // in-flight more.json fetch

const RHUMB = 186.0, DTF_START = 188.7;

const plotlyReady = new Promise(res => {
  if (window.Plotly) { res(); return; }
  const s = document.getElementById('plotlyjs');
  if (!s) { res(); return; }
  s.addEventListener('load', res);
  s.addEventListener('error', res);   // charts show an error via the guard below
});

function dataURL(name) { return 'data/' + name + '?v=__V__'; }
async function loadJSON(name) {
  const r = await fetch(dataURL(name));
  if (!r.ok) throw new Error(name + ': HTTP ' + r.status);
  return r.json();
}

const narrow = () => window.matchMedia('(max-width:760px)').matches;

/* ═══ palette (monolith) ═══ */
const GRP = {
  hero:{label:'Ragana', colors:['#C2187E']},
  class6:{label:'Class 6 ORC', colors:['#0E7C7B','#159B95','#3FBDB4','#C1550C','#E0891B','#D9A017','#8C3B1E','#7D3C98']},
  orc_other:{label:'ORC', colors:['#4A6B7A','#6E8B98','#5C7D8C','#3F5C69','#547182','#6B87A0']},
  phrf:{label:'PHRF', colors:['#A9885F','#B79B77','#8F7048','#C2A67F','#9C8258']},
  fleet_dnf:{label:'Retired', colors:['#9AA5AC']},
  fleet_other:{label:'Fleet', colors:['#4A6B7A','#6E8B98','#8DA5AF','#5C7D8C']}
};
const EVCAT = {
  crew:{c:'#B9770E',sym:'circle',label:'Crew'},
  systems:{c:'#C0392B',sym:'x',label:'Systems'}, sail:{c:'#0E5A8A',sym:'triangle-up',label:'Sail'},
  tactics:{c:'#7D3C98',sym:'diamond',label:'Tactics'}, insight:{c:'#C2187E',sym:'star-diamond',label:'Insight'},
  milestone:{c:'#17293A',sym:'star',label:'Milestones'}
};

/* ═══ state (monolith) ═══ */
const QUICK_GRPS = ['hero','class6'];
const C6=['Christopher Dragon XII','In Theory','Groupe 5','SqueeZeplay','Save the Sound','Zélée','Sleeper','Blue Skies'];
// boats shown as buttons in the chip row (superset of Class 6): adds cross-division
// names of interest so users don't have to open +More for the obvious ones.
const CHIP_EXTRA=['Young American','Max','Loki','Banter','Touch of Grey','Full Tilt'];
const S = {
  boats: new Set(['Ragana','Christopher Dragon XII','In Theory','Groupe 5']),
  ev: new Set(['milestone','systems','tactics','sail','insight','crew']),
  fleet:true, rhumb:true, ref:'Christopher Dragon XII',
  showMore:false, raceMode:'h', raceView:'p', axis:'d', panelOpen:true
};

const hasTrack = nm => !!(D && D.boats[nm] && D.boats[nm].t && D.boats[nm].t.length);

/* ═══ geometry + event helpers (monolith) ═══ */
const evT = e => (typeof e.t==='number' ? e.t : parseLocal(e.t));
function ragDTFat(t){ const r=D.boats['Ragana'];
  if(t<=r.t[0]) return DTF_START; if(t>=r.t[r.t.length-1]) return 0;
  let i=r.t.findIndex(x=>x>=t); if(i<=0) return r.dtf[0];
  const f=(t-r.t[i-1])/(r.t[i]-r.t[i-1]); return r.dtf[i-1]+f*(r.dtf[i]-r.dtf[i-1]); }

const axVal = (b,i) => S.axis==='t' ? edtStr(b.t[i]) : b.dtf[i];
const evX = t => S.axis==='t' ? edtStr(t) : ragDTFat(t);

/* ═══ shared chart scaffolding (monolith) ═══ */
const AXFONT = {family:'SF Mono, Menlo, Consolas, monospace', size:10.5, color:'#51677A'};
const BASE = {paper_bgcolor:'rgba(0,0,0,0)', plot_bgcolor:'#FDFEFD',
  font:{family:'-apple-system, Helvetica Neue, Arial', size:12, color:'#17293A'},
  margin:{l:56,r:14,t:6,b:38}, hovermode:'closest',
  hoverlabel:{align:'left', bgcolor:'#17293A', bordercolor:'#17293A', font:{size:11.5,color:'#fff'}},
  legend:{orientation:'h', y:-0.16, font:{size:11}}};
const GAX = {gridcolor:'#E3ECEF', zerolinecolor:'#B9CBD4', tickfont:AXFONT, linecolor:'#B9CBD4'};
const PLOTCFG = {responsive:true, displaylogo:false, displayModeBar:false};

/* On touch widths, let a vertical drag scroll the PAGE, not zoom the plot — freeze
   the axes and kill dragmode; tap-to-inspect still works. Desktop keeps drag+hover. */
function react(id, traces, layout){
  if(narrow()){
    layout = {...layout, dragmode:false};
    for(const k of Object.keys(layout))
      if(/^[xy]axis\d*$/.test(k)) layout[k] = {...layout[k], fixedrange:true};
  }
  Plotly.react(id, traces, layout, PLOTCFG);
}

function sharedXaxis(extra){
  const base = S.axis==='t'
    ? {...GAX, tickformat:'%a %H:%M', type:'date'}
    : {...GAX, title:{text:'Distance to finish (nm) — race runs right to left ⟵',font:AXFONT}, autorange:'reversed'};
  return {...base, ...(extra||{})};
}
function eventDecor(topY, timeFixed){
  const xf = timeFixed ? (t=>edtStr(t)) : evX;
  const evs=D.events.filter(e=>S.ev.has(e.cat));
  const shapes=evs.map(e=>({type:'line',xref:'x',yref:'paper',x0:xf(evT(e)),x1:xf(evT(e)),y0:0,y1:1,
    line:{color:EVCAT[e.cat].c,width:1,dash:'dot'},opacity:.5}));
  const marker = evs.length ? {x:evs.map(e=>xf(evT(e))), y:evs.map(()=>topY), mode:'markers',
    marker:{symbol:evs.map(e=>EVCAT[e.cat].sym), size:evs.map(e=>['milestone','insight'].includes(e.cat)?12:9),
      color:evs.map(e=>EVCAT[e.cat].c), line:{width:1,color:'#fff'}},
    text:evs.map(e=>wrapText(`${e.label} · ${fmt(evT(e))} EDT · ${Math.round(ragDTFat(evT(e)))} nm to go — ${e.txt}`)),
    hoverinfo:'text', showlegend:false} : null;
  return {shapes, marker};
}
function seriesTraces(valueKey, widthFn){
  const tr=[];
  for(const nm of ORDER){ if(!S.boats.has(nm)||!hasTrack(nm))continue; const b=D.boats[nm];
    const xs=[], ys=[];
    for(let i=0;i<b.t.length;i++){ xs.push(axVal(b,i)); ys.push(b[valueKey][i]); }
    tr.push({x:xs, y:ys, mode:'lines', name:nm, showlegend:valueKey==='dtf',
      line:{color:boatColor[nm], width:widthFn(nm)}, opacity:nm==='Ragana'?1:.82,
      hovertemplate:`${nm} · %{x}${S.axis==='t'?'':' nm'} · %{y}${valueKey==='sog'?' kts':(valueKey==='xte'?' nm':' nm to go')}<extra></extra>`}); }
  return tr;
}

/* ═══ act bands (shared across DTF / race / speed charts) — monolith ═══ */
const ACTS_DEF=[
  ["2026-05-22 12:35","2026-05-22 20:35","ACT 1 · OUT","rgba(78,121,167,0.06)"],
  ["2026-05-22 20:35","2026-05-23 09:09","ACT 2 · SOUND → BLOCK ISLAND","rgba(125,60,152,0.06)"],
  ["2026-05-23 09:09","2026-05-24 02:05","ACT 3 · ROUNDING & HOME","rgba(194,24,126,0.06)"]];
const _actEp=s=>Date.parse(s.replace(' ','T')+'-04:00')/1000;
function actBandsTime(){
  const shapes=ACTS_DEF.map(([a,b,_,fill])=>({type:'rect',xref:'x',yref:'paper',x0:a,x1:b,y0:0,y1:1,fillcolor:fill,line:{width:0}}));
  const ann=ACTS_DEF.map(([a,b,lbl])=>({x:edtStr((_actEp(a)+_actEp(b))/2),y:1.05,xref:'x',yref:'paper',
    text:lbl,showarrow:false,xanchor:'center',font:{size:9,color:'#51677A',family:'SF Mono, Menlo, monospace'}}));
  return {shapes,ann};
}
function actBandsDist(){
  const b=D.boats['Ragana'];
  const dtfAt=ep=>{ if(ep<=b.t[0])return DTF_START; if(ep>=b.t[b.t.length-1])return 0;
    let i=b.t.findIndex(x=>x>=ep); const f=(ep-b.t[i-1])/(b.t[i]-b.t[i-1]); return b.dtf[i-1]+f*(b.dtf[i]-b.dtf[i-1]); };
  const shapes=ACTS_DEF.map(([a,b2,_,fill])=>({type:'rect',xref:'x',yref:'paper',
    x0:dtfAt(_actEp(a)),x1:dtfAt(_actEp(b2)),y0:0,y1:1,fillcolor:fill,line:{width:0}}));
  const ann=ACTS_DEF.map(([a,b2,lbl])=>({x:(dtfAt(_actEp(a))+dtfAt(_actEp(b2)))/2,y:1.05,xref:'x',yref:'paper',
    text:lbl,showarrow:false,xanchor:'center',font:{size:9,color:'#51677A',family:'SF Mono, Menlo, monospace'}}));
  return {shapes,ann};
}

/* ═══ scoped re-rendering, batched through rAF ═══ */
const PLOTLY_CHARTS = new Set(['map','dtf','race','upwind','finstrip','xte','sog']);
const BUILDERS = {controls:buildControls, map:renderMap, dtf:renderDTF, race:renderRace,
  upwind:renderUpwind, finstrip:renderFinstrip, xte:renderXTE, sog:renderSOG, events:renderTable};
const SCOPES = {
  boats:['controls','map','dtf','race','upwind','finstrip','xte','sog'],
  ev:['controls','dtf','race','sog','events'],
  map:['controls','map'],                 // fleet / rhumb
  axis:['controls','xte','sog'],
  race:['controls','race'],
  all:Object.keys(BUILDERS)
};
const pending = new Set(); let rafId = 0;
function render(scope){
  for(const c of SCOPES[scope]) pending.add(c);
  if(rafId) return;
  rafId = 1;
  if(document.hidden) setTimeout(flush, 0); else requestAnimationFrame(flush);
}
function flush(){
  rafId = 0;
  const todo = [...pending]; pending.clear();
  for(const c of todo){
    if(PLOTLY_CHARTS.has(c) && !chartsOK) continue;
    BUILDERS[c]();
    if(PLOTLY_CHARTS.has(c)) attachTap(c);
  }
}

/* tap-to-inspect: click equivalent of hover, for touch + keyboard-free access */
const tapped = new Set();
function attachTap(id){
  if(tapped.has(id)) return; tapped.add(id);
  const gd = document.getElementById(id);
  if(!gd || !gd.on) return;
  if(narrow()){
    const el = document.getElementById('tap_'+id);
    if(el && !el.classList.contains('show')){ el.textContent='Tap any point for details.'; el.classList.add('show'); }
  }
  gd.on('plotly_click', ev=>{
    const p = ev.points && ev.points[0]; if(!p) return;
    let txt = p.hovertext || (typeof p.text==='string' ? p.text : '');
    if(!txt){
      const nm = (p.data && p.data.name) || '';
      const y = typeof p.y==='number' ? (+p.y).toFixed(1) : p.y;
      txt = `<b>${nm}</b> · ${p.x} · ${y}`;
    }
    const el = document.getElementById('tap_'+id);
    if(el){ el.innerHTML = txt; el.classList.add('show'); }
  });
}

/* ═══ lazy layers ═══ */
function ensureTracks(nm){
  if(hasTrack(nm)) return Promise.resolve();
  if(!moreP) moreP = loadJSON('more.json').then(more=>{
    for(const [k,v] of Object.entries(more)){ if(D.boats[k]) Object.assign(D.boats[k], v); }
  }).catch(e=>{ moreP=null; throw e; });
  return moreP;
}
function loadFleet(){
  if(FLEET || (D && D.fleet)) return;
  loadJSON('fleet.json').then(f=>{ FLEET=f; D.fleet=f; if(S.fleet) render('map'); })
    .catch(e=>console.warn('fleet layer unavailable:', e));
}
const trackLoading = new Set();
let trackLoadErr = null;
// after any boat-selection change, ensure the newly-selected boats have tracks
function afterBoatChange(){
  render('boats');
  const missing=[...S.boats].find(nm=>D.boats[nm]&&!hasTrack(nm));
  if(missing){
    trackLoading.add(missing);
    ensureTracks(missing)
      .then(()=>{ trackLoadErr=null; })
      .catch(()=>{ trackLoadErr='Couldn’t load a boat’s track — check your connection and try again.'; })
      .finally(()=>{ trackLoading.delete(missing); render('boats'); });
  }
}
function toggleBoat(nm){
  if(S.boats.has(nm)) S.boats.delete(nm); else S.boats.add(nm);
  afterBoatChange();
}

/* ═══ controls ═══ */
function makeChip(label,color,active,onclick,locked){
  const el=document.createElement('button');
  el.type='button';
  el.className='chip'+(active?' on':'')+(locked?' locked':'');
  el.style.color=active?'#fff':color; if(active)el.style.background=color;
  el.setAttribute('aria-pressed', active?'true':'false');
  if(locked) el.setAttribute('aria-disabled','true');
  el.innerHTML=`<span class="dot" aria-hidden="true"></span>${label}`;
  if(!locked) el.onclick=onclick;
  return el;
}
function buildControls(){
  const chips=document.getElementById('chips'); chips.innerHTML='';
  const quick=ORDER.filter(nm=>(QUICK_GRPS.includes(D.boats[nm].meta.grp)||CHIP_EXTRA.includes(nm))&&hasTrack(nm));
  for(const nm of quick){ const b=D.boats[nm];
    const el=makeChip(`${nm}<span style="opacity:.6;font-size:10px">${b.meta.clsPos?' #'+b.meta.clsPos:''}</span>`,
      boatColor[nm], S.boats.has(nm),
      ()=>toggleBoat(nm), nm==='Ragana');
    el.title=`${b.meta.typ} · TCF ${b.meta.tcf??'—'} · corrected ${b.meta.corr??'—'}`;
    chips.appendChild(el); }
  const moreBtn=makeChip(`+ More (${ORDER.length-quick.length})`, '#17293A', S.showMore,
    ()=>{ S.showMore=!S.showMore; buildControls(); });
  moreBtn.setAttribute('aria-expanded', S.showMore?'true':'false');
  moreBtn.setAttribute('aria-controls','morePanel');
  chips.appendChild(moreBtn);
  buildMorePanel();

  const gb=document.getElementById('grpbtns'); gb.innerHTML='';
  const groups={
    'Class 6 ORC': C6.filter(hasTrack),
    'All ORC': ORDER.filter(nm=>hasTrack(nm)&&D.boats[nm].meta.cls==='ORC'&&nm!=='Ragana'),
    'All PHRF': ORDER.filter(nm=>hasTrack(nm)&&D.boats[nm].meta.cls==='PHRF'),
    'Bermuda boats': ['Banter','Touch of Grey','Zélée'].filter(hasTrack)};
  // group membership is computed over the full ORDER (meta ships for every boat);
  // some members' tracks live in more.json and load on demand when selected.
  const groupsFull={
    'Class 6 ORC': C6,
    'All ORC': ORDER.filter(nm=>D.boats[nm].meta.cls==='ORC'&&nm!=='Ragana'),
    'All PHRF': ORDER.filter(nm=>D.boats[nm].meta.cls==='PHRF'),
    'Bermuda boats': ['Banter','Touch of Grey','Zélée']};
  for(const [g,names] of Object.entries(groupsFull)){
    const on=names.length>0 && names.every(n=>S.boats.has(n));
    const btn=document.createElement('button'); btn.type='button';
    btn.className='grpbtn'+(on?' allon':''); btn.textContent=(on?'− ':'+ ')+g;
    btn.setAttribute('aria-pressed', on?'true':'false');
    btn.onclick=()=>{ const all=names.every(n=>S.boats.has(n)); names.forEach(n=> all?S.boats.delete(n):S.boats.add(n)); afterBoatChange(); };
    gb.appendChild(btn); }
  const clr=document.createElement('button'); clr.type='button'; clr.className='grpbtn'; clr.textContent='Ragana only';
  clr.onclick=()=>{ S.boats=new Set(['Ragana']); render('boats'); }; gb.appendChild(clr);
  const allb=document.createElement('button'); allb.type='button'; allb.className='grpbtn';
  const allOn=ORDER.every(n=>S.boats.has(n));
  allb.textContent=(allOn?'− ':'+ ')+'All boats ('+ORDER.length+')';
  allb.setAttribute('aria-pressed', allOn?'true':'false');
  allb.onclick=()=>{ const on=ORDER.every(n=>S.boats.has(n));
    S.boats = on ? new Set(['Ragana']) : new Set(ORDER); afterBoatChange(); };
  gb.appendChild(allb);

  const ov=document.getElementById('overlays'); ov.innerHTML='';
  const SHORT={crew:'Crew',systems:'Systems',sail:'Sails',tactics:'Tactics',insight:'Insights',milestone:'Milestones'};
  for(const [k,v] of Object.entries(EVCAT)){ const el=makeChip(SHORT[k]||v.label, v.c, S.ev.has(k),
    ()=>{ S.ev.has(k)?S.ev.delete(k):S.ev.add(k); render('ev'); }); ov.appendChild(el); }
  const addT=(label,color,get,set)=>{ const el=makeChip(label,color,get(),()=>{set(!get());render('map');}); ov.appendChild(el); };
  addT('Ghosts', '#9AACB8', ()=>S.fleet, x=>{S.fleet=x; if(x) loadFleet();});
  addT('Course line', '#C2187E', ()=>S.rhumb, x=>S.rhumb=x);

  const sel=document.getElementById('refsel'); sel.innerHTML='';
  for(const nm of ORDER){ if(nm==='Ragana')continue;
    const b=D.boats[nm]; if(!b.meta.el)continue;
    const o=document.createElement('option'); o.value=nm; o.textContent=nm+' ('+b.meta.cls+')'; if(nm===S.ref)o.selected=true; sel.appendChild(o); }
  sel.onchange=()=>{ const prev=S.ref; S.ref=sel.value;
    if(!hasTrack(S.ref)) ensureTracks(S.ref).then(()=>render('race')).catch(()=>{ S.ref=prev; render('race'); });
    render('race'); };

  bindMode('mode_h','h','raceMode'); bindMode('mode_e','e','raceMode');
  bindMode('view_p','p','raceView'); bindMode('view_t','t','raceView');
  document.querySelectorAll('#axisToggle button').forEach(btn=>{
    const on = btn.dataset.ax===S.axis;
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', on?'true':'false');
    btn.onclick=()=>{ S.axis=btn.dataset.ax; render('axis'); }; });

  const cc=document.getElementById('ctlCollapse'), body=document.getElementById('ctlBody');
  if(narrow()){
    body.style.display='';
    cc.textContent='Done'; cc.setAttribute('aria-expanded','true'); cc.removeAttribute('aria-controls');
    cc.onclick=closeSheet;
  } else {
    body.style.display = S.panelOpen ? '' : 'none';
    cc.textContent = S.panelOpen ? 'Hide controls ▲' : 'Show controls ▼';
    cc.setAttribute('aria-expanded', S.panelOpen?'true':'false');
    cc.setAttribute('aria-controls','ctlBody');
    cc.onclick=()=>{ S.panelOpen=!S.panelOpen; buildControls(); };
  }
  const lbl=document.getElementById('sheetBarLabel');
  if(lbl) lbl.textContent=`Boats & overlays · ${S.boats.size} shown`;
}
function bindMode(id,val,key){ const el=document.getElementById(id);
  el.className='modebtn'+(S[key]===val?' on':'');
  el.setAttribute('aria-pressed', S[key]===val?'true':'false');
  el.onclick=()=>{ S[key]=val; render('race'); }; }

function buildMorePanel(){
  const p=document.getElementById('morePanel');
  if(!S.showMore){ p.style.display='none'; p.innerHTML=''; return; }
  p.style.display='block'; p.innerHTML='';
  const lab=document.createElement('div'); lab.className='ctl-label'; lab.textContent='More boats'; lab.style.marginBottom='6px'; p.appendChild(lab);
  if(trackLoadErr){ const e=document.createElement('div'); e.className='note'; e.style.color='#A33'; e.textContent=trackLoadErr; p.appendChild(e); }
  const box=document.createElement('div'); box.className='chips more-list';
  for(const nm of ORDER){ if(QUICK_GRPS.includes(D.boats[nm].meta.grp)||CHIP_EXTRA.includes(nm))continue;
    const b=D.boats[nm]; if(!b.meta.el && !(b.t&&b.t.length))continue;   // skip meta-only non-finishers with no track
    const el=makeChip(nm, boatColor[nm], S.boats.has(nm), ()=>toggleBoat(nm));
    el.classList.add('more-row'); if(trackLoading.has(nm)) el.classList.add('loading');
    box.appendChild(el); }
  p.appendChild(box);
}

/* ═══ KPIs (monolith) ═══ */
function renderKPIs(){
  const s=D.stats, k=document.getElementById('kpis');
  const cards=[
    {v:'+4.7 nm', l:'Upwind vs CD XII', s:'extra distance to Block Island'},
    {v:'+4:36:04', l:'Corrected vs winner', s:'Christopher Dragon XII'},
    {v:s.sailed_ragana+' nm', l:'Ragana sailed', s:'course line 188.7 nm'},
    {v:s.avg_sog+' kt', l:'Average speed', s:'max '+s.max_sog+' kt'},
    {v:'9 / 9', l:'Class 6 ORC', s:'31 / 33 ORC division'},
  ];
  k.innerHTML=cards.map(c=>`<div class="kpi"><div class="v">${c.v}</div><div class="l">${c.l}</div><div class="s">${c.s}</div></div>`).join('');
}

/* ═══ 1. course map (monolith; +non-colour division cue: PHRF ghosts dashed) ═══ */
function renderMap(){
  const tr=[];
  if(S.fleet && D.fleet){
    const bridge={'zelee':'Zélée','midnight rider - pmp strategy':'Midnight Rider'};
    const clsOf=nm=>{ const k=nm.trim().toLowerCase();
      const disp=bridge[k]|| Object.keys(D.boats).find(x=>x.toLowerCase()===k) || nm;
      return (D.boats[disp]?.meta?.cls)||'ORC'; };
    for(const f of D.fleet){ const cls=clsOf(f.name);
      tr.push({x:f.lon,y:f.lat,mode:'lines',
        line:{color:cls==='PHRF'?'#C9BCA9':'#C0CDD6',width:1,dash:cls==='PHRF'?'dot':'solid'},opacity:.55,
        hovertemplate:`${f.name} · ${cls}<extra></extra>`,showlegend:false}); } }
  if(S.rhumb){ tr.push({x:[D.start[1],D.fin[1]],y:[D.start[0],D.fin[0]],mode:'lines',
    line:{color:'#C2187E',width:1,dash:'dot'},opacity:.5,name:'Start–finish',hoverinfo:'skip',showlegend:false}); }
  for(const nm of ORDER){ if(!S.boats.has(nm)||!hasTrack(nm))continue; const b=D.boats[nm];
    tr.push({x:b.lon,y:b.lat,mode:'lines',name:nm,
      line:{color:boatColor[nm],width:nm==='Ragana'?2.4:1.5},
      opacity:nm==='Ragana'?1:.9,hovertemplate:`${nm}<extra></extra>`});
    const nsel=[...S.boats].length;
    const K = nsel>10 ? 3 : (nsel>4 ? 4 : 6);              // arrows per track, scaled to clutter
    const axx=[],ayy=[];
    for(let j=1;j<=K;j++){ const i=Math.floor(b.lat.length*j/(K+1));
      if(i>0&&i<b.lat.length){axx.push(b.lon[i]);ayy.push(b.lat[i]);} }
    tr.push({x:axx,y:ayy,mode:'markers',
      marker:{symbol:'arrow',size:nm==='Ragana'?11:8,angleref:'previous',
        color:boatColor[nm],line:{width:0.5,color:'#fff'}},
      opacity:nm==='Ragana'?1:.9,hoverinfo:'skip',showlegend:false}); }
  tr.push({x:[D.start[1]],y:[D.start[0]],mode:'markers+text',marker:{color:'#17293A',size:8,symbol:'square'},
    text:['Start'],textposition:'bottom right',textfont:{size:10,color:'#51677A'},hoverinfo:'skip',showlegend:false});
  tr.push({x:[D.fin[1]],y:[D.fin[0]],mode:'markers+text',marker:{color:'#C2187E',size:8,symbol:'star'},
    text:['Finish'],textposition:'top left',textfont:{size:10,color:'#51677A'},hoverinfo:'skip',showlegend:false});
  const geoLabels=[
    [41.27,-72.045,'The Race'],[41.105,-72.215,'Plum Gut'],[41.30,-71.60,'Block Island'],
    [41.118,-71.505,'Southeast Light'],[41.045,-71.875,'Montauk Pt']];
  const ann=geoLabels.map(([la,lo,txt])=>({x:lo,y:la,text:txt,showarrow:false,
    font:{size:10,color:'#51677A',family:'SF Mono, Menlo, monospace'},bgcolor:'rgba(253,254,253,.75)'}));
  // annotate on the EAST side of the island, where boats run north→south with the
  // island to starboard — the leg the SI's 'leave to starboard' actually refers to.
  ann.push({x:-71.50,y:41.20,ax:-71.545,ay:41.20,xref:'x',yref:'y',axref:'x',ayref:'y',
    showarrow:true,arrowhead:2,arrowsize:1.1,arrowwidth:1.4,arrowcolor:'#7D3C98',
    text:'island to starboard<br>down the east side',xanchor:'left',
    font:{size:9.5,color:'#7D3C98',family:'SF Mono, Menlo, monospace'},bgcolor:'rgba(253,254,253,.85)'});
  const allLat=[], allLon=[];
  for(const nm of ORDER){ if(!S.boats.has(nm)||!hasTrack(nm))continue; const b=D.boats[nm];
    if(b.lat&&b.lat.length){allLat.push(...b.lat);allLon.push(...b.lon);} }
  if(D.fleet&&S.fleet) for(const f of D.fleet){allLat.push(...f.lat);allLon.push(...f.lon);}
  const pct=(arr,p)=>{const s=[...arr].sort((a,b)=>a-b);return s[Math.floor(s.length*p)];};
  const latLo=pct(allLat,0.01), latHi=pct(allLat,0.99);
  const lonLo=Math.min(...allLon), lonHi=Math.max(...allLon);
  const latPad=(latHi-latLo)*0.06, lonPad=(lonHi-lonLo)*0.02;
  react('map',tr,{...BASE,annotations:ann,
    xaxis:{...GAX,title:{text:'Longitude',font:AXFONT},range:[lonLo-lonPad,lonHi+lonPad*4]},
    yaxis:{...GAX,title:{text:'Latitude',font:AXFONT},range:[latLo-latPad,latHi+latPad]},
    showlegend:false});
}

/* ═══ 2. DTF race (always clock axis) — monolith ═══ */
function renderDTF(){
  const tr=[];
  for(const nm of ORDER){ if(!S.boats.has(nm)||!hasTrack(nm))continue; const b=D.boats[nm];
    tr.push({x:b.t.map(edtStr),y:b.dtf,mode:'lines',name:nm,line:{color:boatColor[nm],width:nm==='Ragana'?2.4:1.5},
      opacity:nm==='Ragana'?1:.82,hovertemplate:`${nm} · %{x} · %{y} nm to go<extra></extra>`}); }
  const dec=eventDecor(DTF_START*0.97,true);
  if(dec.marker) tr.push(dec.marker);
  const ab=actBandsTime();
  react('dtf',tr,{...BASE,annotations:ab.ann,margin:{...BASE.margin,t:24},shapes:[...ab.shapes,...dec.shapes],
    xaxis:{...GAX,tickformat:'%a %H:%M',type:'date'},
    yaxis:{...GAX,title:{text:'Distance to finish (nm)',font:AXFONT},rangemode:'tozero'},showlegend:false});
}

/* ═══ 3. won & lost vs reference — monolith ═══ */
function renderRace(){
  document.getElementById('refname').textContent=S.ref;
  const ref=D.boats[S.ref]; if(!ref){document.getElementById('racenote').textContent='Reference not tracked.';return;}
  const CROSS_CIRCLE=new Set(['Lucky']);   // Cows-finish variant: different course, never compared
  const refCls=ref.meta.cls;
  const refStart=startOf(ref);
  let hiddenDiv=0;
  const milestones=[]; for(let m=180;m>=10;m-=10) milestones.push(m);
  function corrFactor(b){ return b.meta.tcf||1; }
  const tr=[];
  for(const nm of ORDER){ if(!S.boats.has(nm)||nm===S.ref||!hasTrack(nm))continue; const b=D.boats[nm];
    if(CROSS_CIRCLE.has(nm)){hiddenDiv++;continue;}
    if(S.raceMode==='h' && b.meta.cls!==refCls){hiddenDiv++;continue;}   // corrected never crosses divisions
    const bStart=startOf(b);
    const xs=[],ys=[];
    for(const m of milestones){
      const tb=hitTime(b,m), tr_=hitTime(ref,m); if(tb==null||tr_==null)continue;
      let eb=tb-bStart, er=tr_-refStart;          // elapsed-to-milestone, start-offset removed
      if(S.raceMode==='h'){ eb*=corrFactor(b); er*=corrFactor(ref); }
      let d=(eb-er)/60;                            // minutes; positive = behind
      if(S.raceView==='p'){ const done=RHUMB-m; if(done>20) d=d/done*100; else continue; }
      xs.push(m); ys.push(d);
    }
    if(S.raceView==='t'){                          // exact official endpoint at finish (m=0)
      const eb=(S.raceMode==='h'?parseHMS(b.meta.corr):parseHMS(b.meta.el));
      const er=(S.raceMode==='h'?parseHMS(ref.meta.corr):parseHMS(ref.meta.el));
      xs.push(0); ys.push((eb-er)/60);
    }
    tr.push({x:xs,y:ys,mode:'lines+markers',name:nm,line:{color:boatColor[nm],width:nm==='Ragana'?2.6:1.6},
      marker:{size:nm==='Ragana'?5:3},opacity:nm==='Ragana'?1:.8,
      hovertemplate:`${nm} · %{x} nm to go · %{y:.1f} min<extra></extra>`}); }
  const allY=tr.flatMap(q=>q.y).filter(v=>isFinite(v));
  const yMin=Math.min(0,...allY), yMax=Math.max(...allY,0);
  const yPad=(yMax-yMin)*0.08;
  {const sA=S.axis; S.axis='d'; const rdec=eventDecor(0);
   if(rdec.marker){ rdec.marker.y=rdec.marker.x.map(()=>yMax+yPad*0.5); tr.push(rdec.marker);} S.axis=sA;}
  const sAx=S.axis; S.axis='d'; const dec=eventDecor(0); S.axis=sAx;
  const rab=actBandsDist();
  react('race',tr,{...BASE,margin:{...BASE.margin,t:24},annotations:rab.ann,
    shapes:[...rab.shapes,{type:'line',xref:'paper',x0:0,x1:1,yref:'y',y0:0,y1:0,line:{color:'#B9CBD4',width:1}},...dec.shapes],
    xaxis:{...GAX,title:{text:'Distance to finish (nm) — race runs right to left ⟵',font:AXFONT},autorange:'reversed'},
    yaxis:{...GAX,title:{text:S.raceView==='p'?'Min per 100 nm behind ref':'Minutes behind ref',font:AXFONT},range:[yMin-yPad,yMax+yPad*1.4]},
    showlegend:false});
  const mode=S.raceMode==='h'?'corrected':'elapsed', view=S.raceView==='p'?'pace (min/100nm)':'cumulative minutes';
  document.getElementById('racenote').innerHTML=`Each line is a boat's ${mode} time minus <b>${S.ref}</b>'s, in ${view}. Below zero is ahead. `+
    (S.raceView==='t'?`Finish endpoints are exact from official results. `:`Switch to <b>Total</b> to see exact official endpoints at the finish. `)+
    (hiddenDiv?`<b>${hiddenDiv} selected boat${hiddenDiv>1?'s':''} hidden</b> — corrected times are never compared across scoring divisions (${refCls} reference)${S.raceMode==='h'?'; switch to Elapsed for boat-for-boat.':'.'}`:'');
}

/* ═══ 4. upwind-excess module — monolith (reads stored meta.up1bi; never recomputes) ═══ */
function renderUpwind(){
  const rows=[];
  for(const nm of ORDER){ if(!S.boats.has(nm))continue; const v=D.boats[nm].meta.up1bi;
    if(v==null)continue; rows.push({nm,sd:v}); }
  rows.sort((a,b)=>a.sd-b.sd);
  const cd=rows.find(r=>r.nm==='Christopher Dragon XII');
  const base=cd?cd.sd:Math.min(...rows.map(r=>r.sd));
  const anchored=!!cd;
  const ord=n=>n+(n%10==1&&n%100!=11?'st':n%10==2&&n%100!=12?'nd':n%10==3&&n%100!=13?'rd':'th');
  const lbl=r=>{ const m=D.boats[r.nm].meta;
    const fin=(r.nm==='Ragana'||C6.includes(r.nm)) ? ' · fin '+ord(m.clsPos) : (m.cls?' · '+m.cls:'');
    if(anchored && r.nm==='Christopher Dragon XII') return 'reference · won class';
    const dv=r.sd-base; return (dv>=0?'+':'')+dv.toFixed(1)+' nm'+fin+(anchored?'':' *'); };
  react('upwind',[{type:'bar',orientation:'h',
    x:rows.map(r=>r.sd), y:rows.map(r=>r.nm),
    marker:{color:rows.map(r=>boatColor[r.nm])},
    text:rows.map(lbl),textposition:'outside',
    hovertemplate:'%{y} · %{x:.1f} nm sailed to 1BI<extra></extra>'}],
    {...BASE,margin:{l:150,r:40,t:8,b:40},
     xaxis:{...GAX,title:{text:'Distance sailed to Block Island (nm)',font:AXFONT},range:[base-3,Math.max(...rows.map(r=>r.sd))+8]},
     yaxis:{...GAX,automargin:true},showlegend:false});
}

/* ═══ 5. finish-spread strip (two division bands) — monolith
   (+non-colour cue: ORC circles, PHRF squares; Ragana stays the magenta diamond) ═══ */
function renderFinstrip(){
  const pool=cls=>ORDER.filter(nm=>nm!=='Lucky' && D.boats[nm].meta.cls===cls
      && D.boats[nm].meta.corr && D.boats[nm].meta.el)
    .map(nm=>({nm,c:parseHMS(D.boats[nm].meta.corr)/3600}))
    .filter(o=>!isNaN(o.c)).sort((a,b)=>a.c-b.c);
  function swarm(fin,xspan){
    const dx = xspan*0.012;               // collision radius in x-units
    const placed=[];
    for(const o of fin){
      let lvl=0, dir=1, tries=0;
      while(tries<40){
        const clash=placed.some(p=>p.lvl===lvl && Math.abs(p.c-o.c)<dx);
        if(!clash){o.lvl=lvl;break;}
        lvl = (dir>0? +Math.ceil(tries/2): -Math.ceil(tries/2));
        dir=-dir; tries++;
      }
      if(o.lvl===undefined)o.lvl=0;
      placed.push(o);
    }
    const maxAbs=Math.max(1,...fin.map(o=>Math.abs(o.lvl)));
    return maxAbs;
  }
  const orc=pool('ORC'), phrf=pool('PHRF');
  const allc=[...orc,...phrf].map(o=>o.c);
  const xspan=(Math.max(...allc)-Math.min(...allc))||1;
  const mAO=swarm(orc,xspan), mAP=swarm(phrf,xspan);
  const BAND=9, GAP=5;                       // equal half-height per band
  const scale=(arr,mx)=>{ for(const o of arr) o.y=o.lvl*(BAND/Math.max(mx,1)); };
  scale(orc,mAO); scale(phrf,mAP);
  const cOrc=0, cPhrf=2*BAND+GAP;            // band centers
  for(const o of orc) o.y+=cOrc;
  for(const o of phrf) o.y+=cPhrf;
  const tr=[];
  const dot=(fin,color,sym)=>{
    const others=fin.filter(o=>o.nm!=='Ragana');
    tr.push({x:others.map(o=>o.c),y:others.map(o=>o.y),mode:'markers',
      marker:{size:7,color,opacity:.7,symbol:sym},text:others.map(o=>o.nm),
      hovertemplate:'%{text} · corrected %{x:.2f} h<extra></extra>',showlegend:false});
    const R=fin.find(o=>o.nm==='Ragana');
    if(R) tr.push({x:[R.c],y:[R.y],mode:'markers',
      marker:{size:16,color:'#C2187E',symbol:'diamond',line:{width:1.5,color:'#fff'}},
      text:['Ragana'],hovertemplate:'Ragana · corrected %{x:.2f} h<extra></extra>',showlegend:false}); }
  dot(orc,'#5D7C8E','circle'); dot(phrf,'#A9885F','square');
  const ann=[{x:0,y:cOrc+BAND+2.5,xref:'paper',yref:'y',xanchor:'left',showarrow:false,
      text:`ORC · Block Island Course · ${orc.length} finishers (● circles)`,font:{size:10,color:'#51677A',family:'SF Mono, Menlo, monospace'}},
    {x:0,y:cPhrf+BAND+2.5,xref:'paper',yref:'y',xanchor:'left',showarrow:false,
      text:`PHRF · Block Island Course · ${phrf.length} finishers (■ squares — different rating, not comparable to ORC)`,
      font:{size:10,color:'#51677A',family:'SF Mono, Menlo, monospace'}}];
  react('finstrip',tr,{...BASE,margin:{l:16,r:16,t:8,b:40},annotations:ann,
    shapes:[{type:'line',xref:'paper',x0:0,x1:1,yref:'y',y0:BAND+GAP/2,y1:BAND+GAP/2,line:{color:'#D5E0E4',width:1,dash:'dot'}}],
    xaxis:{...GAX,title:{text:'Corrected time (hours) — within each division only',font:AXFONT}},
    yaxis:{...GAX,visible:false,range:[cOrc-BAND-2,cPhrf+BAND+3.5]},showlegend:false});
}

/* ═══ 6. upwind lane (XTE, always distance-sailed x) — monolith ═══ */
function renderXTE(){
  document.getElementById('xte_axnote').textContent='x-axis: distance sailed from start (nm)';
  const P0=[41.0005,-73.5238], P1=[41.262,-71.587], C=[41.168,-71.578];
  const R=3440.065, rad=Math.PI/180;
  const hv=(a,b2,c,d)=>{const dp=(c-a)*rad,dl=(d-b2)*rad;
    const x=Math.sin(dp/2)**2+Math.cos(a*rad)*Math.cos(c*rad)*Math.sin(dl/2)**2;return 2*R*Math.asin(Math.sqrt(x));};
  const tr=[]; let maxRound=0;
  for(const nm of ORDER){ if(!S.boats.has(nm)||!hasTrack(nm))continue; const b=D.boats[nm];
    let i0=-1,i1=-1;
    for(let i=0;i<b.lat.length;i++){ const dc=hv(b.lat[i],b.lon[i],C[0],C[1]);
      if(dc<8){ if(i0<0)i0=i; i1=i; } else if(i0>=0) break; }
    if(i0<0)continue;
    let im=i0,dm=1e9;
    for(let i=i0;i<=i1;i++){ const d=hv(b.lat[i],b.lon[i],P1[0],P1[1]); if(d<dm){dm=d;im=i;} }
    const kx=60*Math.cos(41.13*rad), ky=60;
    const ax=P0[1]*kx, ay=P0[0]*ky, bx=P1[1]*kx, by=P1[0]*ky, dx=bx-ax, dy=by-ay, L=Math.hypot(dx,dy);
    const xs=[],ys=[]; let cum=0;
    for(let i=0;i<=im;i++){
      if(i>0) cum+=hv(b.lat[i-1],b.lon[i-1],b.lat[i],b.lon[i]);
      xs.push(cum);
      const px=b.lon[i]*kx, py=b.lat[i]*ky;
      ys.push(((px-ax)*dy-(py-ay)*dx)/L);
    }
    maxRound=Math.max(maxRound,cum);
    tr.push({x:xs,y:ys,mode:'lines',name:nm,line:{color:boatColor[nm],width:nm==='Ragana'?2.6:1.4},
      opacity:nm==='Ragana'?1:.82,
      hovertemplate:`${nm} · %{x:.0f} nm sailed · %{y:.1f} nm (+ south / − north)<extra></extra>`});
    tr.push({x:[cum],y:[ys[ys.length-1]],mode:'markers',
      marker:{symbol:'circle-open',size:9,color:boatColor[nm],line:{width:2}},
      hovertemplate:`${nm} rounds Block Island · ${cum.toFixed(0)} nm sailed<extra></extra>`,showlegend:false}); }
  const shapes=[{type:'line',xref:'paper',x0:0,x1:1,yref:'y',y0:0,y1:0,line:{color:'#B9CBD4',width:1}}];
  const ann=[{x:maxRound,y:5.8,xref:'x',yref:'y',xanchor:'right',showarrow:false,
    text:'← boats round Block Island here',font:{size:10,color:'#7D3C98',family:'SF Mono, Menlo, monospace'}},
    {x:2,y:4.3,xref:'x',yref:'y',xanchor:'left',showarrow:false,text:'SOUTH ↑',
      font:{size:9,color:'#9AAAB8',family:'SF Mono, Menlo, monospace'}},
    {x:2,y:-4.3,xref:'x',yref:'y',xanchor:'left',showarrow:false,text:'NORTH ↓',
      font:{size:9,color:'#9AAAB8',family:'SF Mono, Menlo, monospace'}}];
  react('xte',tr,{...BASE,shapes,annotations:ann,
    xaxis:{...GAX,title:{text:'Distance sailed from start (nm) — leg out to Block Island',font:AXFONT},range:[0,maxRound*1.02]},
    yaxis:{...GAX,title:{text:'Offset from direct line (nm) — + south',font:AXFONT},range:[-6.5,6.5]},showlegend:false});
}

/* ═══ 7. speed over ground — monolith ═══ */
function renderSOG(){
  document.getElementById('sog_axnote').textContent = S.axis==='t'?'x-axis: clock time':'x-axis: distance to finish';
  const tr=seriesTraces('sog',nm=>nm==='Ragana'?2.4:1.3);
  const dec=eventDecor(13);
  if(dec.marker) tr.push(dec.marker);
  const ab = S.axis==='t' ? actBandsTime() : actBandsDist();
  react('sog',tr,{...BASE,margin:{...BASE.margin,t:24},annotations:ab.ann,shapes:[...ab.shapes,...dec.shapes],
    xaxis:sharedXaxis(),yaxis:{...GAX,title:{text:'Speed over ground (kt)',font:AXFONT},range:[0,11]},showlegend:false});
}

/* ═══ 8. event table — monolith ═══ */
function renderTable(){
  const evs=[...D.events].sort((a,b)=>evT(a)-evT(b));
  let h='<table class="logtable"><thead><tr><th style="width:78px">Time</th><th style="width:60px">Cat</th><th style="width:200px">Event</th><th style="width:44px">nm</th><th>Note</th></tr></thead><tbody>';
  for(const e of evs){ const t=evT(e);
    h+=`<tr><td style="white-space:nowrap">${fmt(t)}</td><td style="color:${EVCAT[e.cat].c}">${EVCAT[e.cat].label}</td><td style="white-space:normal">${e.label}</td><td style="text-align:right">${Math.round(ragDTFat(t))}</td><td style="white-space:normal;line-height:1.45">${e.txt}</td></tr>`; }
  h+='</tbody></table>';
  document.getElementById('eventtable').innerHTML=h;
}

/* ═══ phone bottom sheet ═══ */
function openSheet(){
  document.getElementById('controls').classList.add('open');
  document.getElementById('scrim').hidden=false;
  document.getElementById('sheetBar').setAttribute('aria-expanded','true');
  document.body.style.overflow='hidden';
  document.getElementById('ctlCollapse').focus({preventScroll:true});
}
function closeSheet(){
  document.getElementById('controls').classList.remove('open');
  document.getElementById('scrim').hidden=true;
  const bar=document.getElementById('sheetBar');
  bar.setAttribute('aria-expanded','false');
  document.body.style.overflow='';
  if(narrow()) bar.focus({preventScroll:true});
}

/* ═══ boot ═══ */
function showError(e){
  const el=document.getElementById('appstate');
  if(!el) return;
  el.className='appstate err';
  el.innerHTML='The race data didn’t load ('+(e && e.message ? e.message : e)+').<br>' +
    'Check your connection and retry. Opened as a local file? Serve the folder instead: <kbd>python3 -m http.server</kbd>.<br>' +
    '<button type="button" class="retry" onclick="location.reload()">Retry</button>';
}
function showChartError(){
  document.querySelectorAll('.plot').forEach(el=>{
    el.innerHTML='<div class="note" style="padding:20px">The charts didn’t load (the plotting library failed to download). The tables below still work — reload to try the charts again.</div>';
  });
}
function initData(payload){
  D = payload;
  if(D.fleet) FLEET = D.fleet;   // embedded/standalone build ships everything in one payload
  ORDER = Object.keys(D.boats);
  const idx={};
  for(const nm of ORDER){ const g=D.boats[nm].meta.grp, pal=(GRP[g]||GRP.fleet_other).colors;
    idx[g]=(idx[g]??-1)+1; boatColor[nm]=pal[idx[g]%pal.length]; }
  boatColor['Ragana']='#C2187E';
}

async function boot(){
  try {
    const payload = window.__DATA_EMBEDDED__
      ? window.__DATA_EMBEDDED__
      : await (window.__CORE_FETCH || loadJSON('core.json'));
    initData(payload);
  } catch(e){ console.error(e); showError(e); return; }

  const appstate=document.getElementById('appstate'); if(appstate) appstate.remove();
  document.getElementById('controls').hidden=false;
  const sheetBar=document.getElementById('sheetBar');
  sheetBar.hidden=false;
  sheetBar.onclick=()=>{ document.getElementById('controls').classList.contains('open') ? closeSheet() : openSheet(); };
  document.getElementById('scrim').onclick=closeSheet;
  document.addEventListener('keydown',e=>{ if(e.key==='Escape' && narrow()) closeSheet(); });

  renderKPIs();
  render('all');                       // controls + table now; charts gated on Plotly
  plotlyReady.then(()=>{
    if(!window.Plotly){ showChartError(); return; }
    chartsOK=true; render('all');
    if(!(D&&D.fleet)) loadFleet();     // ghost layer after first paint
    const missing=[...S.boats].find(nm=>!hasTrack(nm));
    if(missing) ensureTracks(missing).then(()=>render('boats')).catch(()=>{});
  });

  // re-lay charts when crossing the mobile breakpoint (fixedrange/dragmode change)
  let wasNarrow=narrow(), rt=0;
  window.addEventListener('resize',()=>{
    clearTimeout(rt);
    rt=setTimeout(()=>{ if(narrow()!==wasNarrow){ wasNarrow=narrow(); closeSheet(); render('all'); } },200);
  });
}

// expose for the regression harness (jsdom loads this file, drives it, and reads specs)
window.__APP__ = {
  boot, initData, render, flush, S,
  get D(){ return D; }, get ORDER(){ return ORDER; }, get boatColor(){ return boatColor; },
  set chartsOK(v){ chartsOK=v; },
  renderMap, renderDTF, renderRace, renderUpwind, renderFinstrip, renderXTE, renderSOG, renderTable,
  buildControls, renderKPIs, edtStr, ACTS_DEF, QUICK_GRPS, C6, CHIP_EXTRA, EVCAT, GRP
};

if(!window.__NO_AUTOBOOT__) boot();
