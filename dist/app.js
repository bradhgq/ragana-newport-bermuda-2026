/* RAGANA · Newport Bermuda 2026 — dashboard app.
   Data arrives in three payloads: core.json (RAGANA + quick-select tracks +
   every boat's meta + events/park/recon/stats) fetched eagerly, fleet.json
   (144-boat ghost layer) fetched after first paint, more.json (the ~60
   "+ More" boat tracks) fetched the first time one is requested.
   State lives in one S object; pure build*() functions regenerate each chart
   via Plotly.react; re-renders are scoped to the charts whose inputs changed
   and batched through requestAnimationFrame. */
"use strict";

/* ═══ data + readiness ═══ */
let D = null;            // core payload (authoritative; never recompute race numbers)
let FLEET = null;        // ghost layer, lazy
let ORDER = [], boatColor = {};
let chartsOK = false;    // Plotly loaded and core data present
let moreP = null;        // in-flight more.json fetch

const plotlyReady = new Promise(res => {
  if (window.Plotly) { res(); return; }
  const s = document.getElementById('plotlyjs');
  s.addEventListener('load', res);
  s.addEventListener('error', res);   // charts will show an error via the guard below
});

function dataURL(name) { return 'data/' + name + '?v=5778b34323'; }
async function loadJSON(name) {
  const r = await fetch(dataURL(name));
  if (!r.ok) throw new Error(name + ': HTTP ' + r.status);
  return r.json();
}

/* ═══ palette ═══ */
const GRP = {
  ragana:{label:'RAGANA', colors:['#C2187E']},
  class:{label:'SDL 3', colors:['#C1550C','#E0891B','#B23A2E','#D9A017','#8C3B1E','#C97B3D','#9C4A2E','#D96B2C','#B4651A']},
  nbr:{label:'Neighbors', colors:['#6B4FA0','#8A63C4','#5B3E8E','#7D5BA6','#9B7BC4','#4D3579','#8467B8','#6F4E9E']},
  podium:{label:'SDL podium', colors:['#0E7C7B','#159B95','#3FBDB4']},
  club:{label:'CPYC clubmates', colors:['#2E7D4F','#4C9F6E']},
  maxi:{label:'Maxi', colors:['#2B2B2B','#6B6B6B']},
  sdl_other:{label:'SDL fleet', colors:['#4A6B7A','#6E8B98','#8DA5AF','#5C7D8C','#7C99A6','#3F5C69']},
  sdl_dnf:{label:'Retired', colors:['#9AA5AC']}
};
/* event categories, drawn low→high so key markers land on top */
const EVCAT = {
  crew:{c:'#B9770E',sym:'circle',label:'Crew'},
  systems:{c:'#C0392B',sym:'x',label:'Systems'}, sail:{c:'#0E5A8A',sym:'triangle-up',label:'Sail changes'},
  tactics:{c:'#7D3C98',sym:'diamond',label:'Tactics'}, insight:{c:'#C2187E',sym:'star-diamond',label:'Analysis notes'},
  milestone:{c:'#17293A',sym:'star',label:'Milestones'}
};

/* ═══ state ═══ */
const QUICK_GRPS = ['ragana','class','nbr','podium','club','maxi'];
const S = {
  // keep in sync with DEFAULT_BOATS in build.py so every default boat's track ships in core.json
  boats: new Set(['RAGANA','Christopher Dragon','Divide By Zero','In Theory','Gesture','Nicole','Carina','Hissy Fit II','Phoenix USA25329','Banter','Touch of Grey','Gemini II']),
  ev: new Set(['milestone','systems','tactics','sail','insight','crew']),
  watches:false, log:true, fleet:true, gs:true, rhumb:true,
  ref:'Christopher Dragon', showMore:false, raceMode:'h', raceView:'p', axis:'d', panelOpen:true
};

const hasTrack = nm => !!(D.boats[nm] && D.boats[nm].t);

/* ═══ geometry over core data ═══ */
function ragDTFat(t){ const r=D.boats['RAGANA'];
  if(t<=r.t[0]) return 636; if(t>=r.t[r.t.length-1]) return 0;
  let i=r.t.findIndex(x=>x>=t); if(i<=0) return r.dtf[0];
  const f=(t-r.t[i-1])/(r.t[i]-r.t[i-1]); return r.dtf[i-1]+f*(r.dtf[i]-r.dtf[i-1]); }

/* which x value does a given ping map to, under the current shared axis */
const axVal = (b,i) => S.axis==='t' ? edtStr(b.t[i]) : b.dtf[i];
const evX = t => S.axis==='t' ? edtStr(t) : ragDTFat(t);

/* ═══ shared chart scaffolding ═══ */
const AXFONT = {family:'SF Mono, Menlo, Consolas, monospace', size:10.5, color:'#4C6274'};
const narrow = () => window.matchMedia('(max-width:760px)').matches;
function BASE(){ return {paper_bgcolor:'rgba(0,0,0,0)', plot_bgcolor:'#FDFEFD',
  font:{family:'-apple-system, Helvetica Neue, Arial', size:12, color:'#17293A'},
  margin: narrow() ? {l:44,r:10,t:8,b:40} : {l:56,r:16,t:8,b:40}, hovermode:'closest',
  hoverlabel:{align:'left', bgcolor:'#17293A', bordercolor:'#17293A', font:{size:11.5,color:'#fff'}},
  legend:{orientation:'h', y:-0.14, font:{size:11}}}; }
const GAX = {gridcolor:'#E3ECEF', zerolinecolor:'#B9CBD4', tickfont:AXFONT, linecolor:'#B9CBD4'};
const PLOTCFG = {responsive:true, displaylogo:false, displayModeBar:false};

/* every chart renders through here. On touch-width screens a finger-drag must
   scroll the PAGE, not zoom the plot — freeze the axes and kill dragmode;
   tap-to-inspect and tap-hover still work. Desktop keeps drag-zoom + hover. */
function react(id, traces, layout){
  if(narrow()){
    layout.dragmode = false;
    for(const k of Object.keys(layout))
      if(/^[xy]axis\d*$/.test(k)) layout[k] = {...layout[k], fixedrange:true};
  }
  Plotly.react(id, traces, layout, PLOTCFG);
}

/* shared x-axis config for the toggle-driven charts */
function sharedXaxis(extra){
  const base = S.axis==='t'
    ? {...GAX, tickformat:'%a %H:%M', type:'date'}
    : {...GAX, title:{text:'Distance to finish (nm) — race runs right to left ⟵',font:AXFONT}, autorange:'reversed'};
  return {...base, ...(extra||{})};
}
/* event dotted lines + top-pinned hoverable markers; axis mode 'shared' follows
   S.axis, 'time' is always clock-based (the DTF chart) */
function eventDecor(topY, mode){
  const X = mode==='time' ? (t=>edtStr(t)) : evX;
  const evs=D.events.filter(e=>S.ev.has(e.cat));
  const shapes=evs.map(e=>({type:'line',xref:'x',yref:'paper',x0:X(e.t),x1:X(e.t),y0:0,y1:1,
    line:{color:EVCAT[e.cat].c,width:1,dash:'dot'},opacity:.5}));
  const marker = evs.length ? {x:evs.map(e=>X(e.t)), y:evs.map(()=>topY), mode:'markers',
    marker:{symbol:evs.map(e=>EVCAT[e.cat].sym), size:evs.map(e=>['milestone','insight'].includes(e.cat)?12:9),
      color:evs.map(e=>EVCAT[e.cat].c), line:{width:1,color:'#fff'}},
    text:evs.map(e=>wrapText(`${e.label} · ${fmt(e.t)} EDT · ${Math.round(ragDTFat(e.t))} nm to go — ${e.txt}`)),
    hoverinfo:'text', showlegend:false} : null;
  return {shapes, marker};
}
function watchShapes(mode){ if(!S.watches) return [];
  const X = mode==='time' ? (t=>edtStr(t)) : evX;
  return D.watches.map(([a,b])=>({type:'rect',xref:'x',yref:'paper',x0:X(a),x1:X(b),
    y0:0,y1:1,fillcolor:'rgba(184,148,74,0.16)',line:{width:1,color:'rgba(184,148,74,0.45)'}})); }
const GS_ENTER = Date.parse('2026-06-20T21:21:00Z')/1000, GS_EXIT = Date.parse('2026-06-21T09:01:00Z')/1000;
function gsShape(mode){ if(!S.gs) return [];
  const X = mode==='time' ? (t=>edtStr(t)) : evX;
  return [{type:'rect',xref:'x',yref:'paper', x0:X(GS_ENTER), x1:X(GS_EXIT),
    y0:0,y1:1,fillcolor:'rgba(62,151,201,0.10)',line:{width:0}}]; }
function watchLegend(){ return S.watches ? {x:[null],y:[null],mode:'markers',
  marker:{size:10,symbol:'square',color:'rgba(184,148,74,0.5)'},name:"Brad on watch",showlegend:true,hoverinfo:'skip'} : null; }

/* generic line-series builder over selected boats; valueKey ∈ dtf|xte|sog */
function seriesTraces(valueKey, widthFn){
  const tr=[];
  for(const nm of ORDER){ if(!S.boats.has(nm)||!hasTrack(nm))continue; const b=D.boats[nm];
    const xs=[], ys=[];
    for(let i=0;i<b.t.length;i++){ xs.push(axVal(b,i)); ys.push(b[valueKey][i]); }
    tr.push({x:xs, y:ys, mode:'lines', name:nm, showlegend:valueKey==='dtf',
      line:{color:boatColor[nm], width:widthFn(nm)}, opacity:nm==='RAGANA'?1:.82,
      hovertemplate:`${nm} · %{x}${S.axis==='t'?'':' nm'} · %{y}${valueKey==='sog'?' kts':(valueKey==='xte'?' nm':' nm to go')}<extra></extra>`}); }
  return tr;
}

/* ═══ scoped re-rendering, batched through rAF ═══ */
const PLOTLY_CHARTS = new Set(['map','dtf','race','finstrip','xte','sog']);
const BUILDERS = {controls:buildControls, map:buildMap, dtf:buildDTF, race:buildRace,
  finstrip:buildFinStrip, xte:buildXTE, sog:buildSOG, park:buildParkTable, events:buildEventTable};
const SCOPES = {
  boats:['controls','map','dtf','race','finstrip','xte','sog','park'],
  ev:['controls','map','dtf','race','xte','sog','events'],
  bands:['controls','map','dtf','race','xte','sog'],   /* gs / watches */
  map:['controls','map'],                              /* log / fleet / rhumb */
  axis:['controls','race','xte','sog'],
  race:['controls','race'],
  all:Object.keys(BUILDERS)
};
const pending = new Set(); let rafId = 0;
function render(scope){
  for(const c of SCOPES[scope]) pending.add(c);
  if(rafId) return;
  rafId = 1;
  // rAF batches rapid toggles into one paint; it never fires in a hidden tab,
  // so fall back to a timeout there (page loaded in a background tab)
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

/* tap-to-inspect: click equivalent of hover, for touch */
const tapped = new Set();
function attachTap(id){
  if(tapped.has(id)) return; tapped.add(id);
  const gd = document.getElementById(id);
  if(!gd || !gd.on) return;
  // on touch widths, advertise the tap affordance until the first tap replaces it
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
    for(const [k,v] of Object.entries(more)) Object.assign(D.boats[k], v);
  }).catch(e=>{ moreP=null; throw e; });
  return moreP;
}
function loadFleet(){
  if(FLEET) return;
  loadJSON('fleet.json').then(f=>{ FLEET=f; if(S.fleet) render('map'); })
    .catch(e=>console.warn('fleet layer unavailable:', e));
}

/* ═══ controls ═══ */
function makeChip(label,color,active,onclick,locked,cls){
  const el=document.createElement('button');
  el.type='button';
  el.className=(cls||'chip')+(active?' on':'')+(locked?' locked':'');
  el.style.color=active?'#fff':color;
  if(active) el.style.background=color;
  if(cls==='pill') el.style.borderColor = active ? color : color+'66';
  el.setAttribute('aria-pressed', active?'true':'false');
  el.innerHTML=`<span class="dot" aria-hidden="true"></span>${label}`;
  if(locked) el.disabled=true; else el.onclick=onclick;
  return el;
}
/* loading/error live in state (not the DOM) — buildMorePanel re-renders them,
   so a queued re-render can't wipe them out */
const trackLoading = new Set();
let trackLoadErr = null;
function toggleBoat(nm){
  if(S.boats.has(nm)){ S.boats.delete(nm); render('boats'); return; }
  S.boats.add(nm);
  if(!hasTrack(nm)){
    trackLoading.add(nm);
    ensureTracks(nm)
      .then(()=>{ trackLoadErr=null; })
      .catch(()=>{ S.boats.delete(nm);
        trackLoadErr='Couldn’t load that boat’s track — check your connection and try again.'; })
      .finally(()=>{ trackLoading.delete(nm); render('boats'); });
  }
  render('boats');
}
function buildControls(){
  const chips=document.getElementById('chips'); chips.innerHTML='';
  const quick=ORDER.filter(nm=>QUICK_GRPS.includes(D.boats[nm].meta.grp));
  for(const nm of quick){ const b=D.boats[nm];
    const el=makeChip(`${nm}<span style="opacity:.6;font-size:10px">${b.meta.sdl?' #'+b.meta.sdl:''}</span>`,
      boatColor[nm], S.boats.has(nm),
      ()=>toggleBoat(nm), nm==='RAGANA');
    el.title=`${b.meta.typ} · F-TCF ${b.meta.tcf??'—'} · corrected ${b.meta.corr??'—'}`;
    chips.appendChild(el); }
  const moreBtn=makeChip(`+ More boats (${ORDER.length-quick.length})`, '#17293A', S.showMore,
    ()=>{ S.showMore=!S.showMore; buildControls(); });
  moreBtn.setAttribute('aria-expanded', S.showMore?'true':'false');
  moreBtn.setAttribute('aria-controls','morePanel');
  chips.appendChild(moreBtn);
  buildMorePanel();

  const gb=document.getElementById('grpbtns'); gb.innerHTML='';
  const groups={'SDL 3':['Gesture','Blue Skies','Flying Lady','Christopher Dragon','In Theory','Cercavento','Divide By Zero','Legacy','Quickdraw'],
    'Neighbors':['Palantir 5','Rumble','Escapado','Hissy Fit II','Phoenix USA25329','Banter','Zélée','Dire Wolf','Blitzen'],
    'Podium':['Nicole','Selkie','Towhee'],'Clubmates':['Touch of Grey','Gemini II'],'Maxi':['Black Jack 100','OC 86']};
  for(const [g,names] of Object.entries(groups)){
    const on=names.every(n=>S.boats.has(n));
    const btn=document.createElement('button'); btn.type='button';
    btn.className='grpbtn'+(on?' allon':''); btn.textContent=(on?'− ':'+ ')+g;
    btn.setAttribute('aria-pressed', on?'true':'false');
    btn.onclick=()=>{ const all=names.every(n=>S.boats.has(n)); names.forEach(n=> all?S.boats.delete(n):S.boats.add(n)); render('boats'); };
    gb.appendChild(btn); }
  const clr=document.createElement('button'); clr.type='button'; clr.className='grpbtn'; clr.textContent='RAGANA only';
  clr.onclick=()=>{ S.boats=new Set(['RAGANA']); render('boats'); }; gb.appendChild(clr);

  const ov=document.getElementById('overlays'); ov.innerHTML='';
  const add=(label,color,get,set)=>{ ov.appendChild(makeChip(label,color,get(),()=>{set(!get());},false,'pill')); };
  const SHORT={crew:'Crew',systems:'Systems',sail:'Sails',tactics:'Tactics',insight:'Insights',milestone:'Milestones'};
  for(const [k,v] of Object.entries(EVCAT)) add(SHORT[k]||v.label, v.c, ()=>S.ev.has(k), x=>{ x?S.ev.add(k):S.ev.delete(k); render('ev'); });
  add('Nav log', '#C0392B', ()=>S.log, x=>{S.log=x; render('map');});
  add('Ghosts', '#7A93A3', ()=>S.fleet, x=>{S.fleet=x; render('map'); if(x) loadFleet();});
  add('Gulf Stream', '#3E97C9', ()=>S.gs, x=>{S.gs=x; render('bands');});
  add('Rhumb line', '#C2187E', ()=>S.rhumb, x=>{S.rhumb=x; render('map');});
  add("Brad's watches", '#B8944A', ()=>S.watches, x=>{S.watches=x; render('bands');});

  const sel=document.getElementById('refsel'); sel.innerHTML='';
  for(const nm of ORDER){ if(!D.boats[nm].meta.tcf)continue;
    const o=document.createElement('option'); o.value=nm; o.textContent=nm; if(nm===S.ref)o.selected=true; sel.appendChild(o); }
  sel.onchange=e=>{ const prev=S.ref; S.ref=e.target.value;
    if(!hasTrack(S.ref)) ensureTracks(S.ref).then(()=>render('race'))
      .catch(()=>{ S.ref=prev; render('race'); });   // fetch failed: fall back to the old reference
    render('race'); };
  bindMode('mode_h','h','raceMode'); bindMode('mode_e','e','raceMode');
  bindMode('view_p','p','raceView'); bindMode('view_t','t','raceView');
  document.querySelectorAll('#axisToggle button').forEach(btn=>{
    const on = btn.dataset.ax===S.axis;
    btn.classList.toggle('on', on);
    btn.setAttribute('aria-pressed', on?'true':'false');
    btn.onclick=()=>{ S.axis=btn.dataset.ax; render('axis'); }; });
  const axlabel = S.axis==='t' ? 'clock time' : 'distance to finish';
  ['xte_axnote','sog_axnote'].forEach(id=>{ const el=document.getElementById(id); if(el)el.textContent='x-axis: '+axlabel; });
  const cc=document.getElementById('ctlCollapse'), body=document.getElementById('ctlBody');
  if(narrow()){
    // inside the bottom sheet the body is always shown; the header button closes the sheet
    body.style.display='';
    cc.textContent='Done';
    cc.setAttribute('aria-expanded','true');
    cc.removeAttribute('aria-controls');
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
function bindMode(id,val,key){ const el=document.getElementById(id);
  el.className='modebtn'+(S[key]===val?' on':'');
  el.setAttribute('aria-pressed', S[key]===val?'true':'false');
  el.onclick=()=>{ S[key]=val; render('race'); }; }

function buildMorePanel(){
  const panel=document.getElementById('morePanel');
  if(!S.showMore){ panel.style.display='none'; panel.innerHTML=''; return; }
  panel.style.display='block';
  const row = nm => { const b=D.boats[nm];
    return `<button type="button" class="more-row${S.boats.has(nm)?' on':''}${trackLoading.has(nm)?' loading':''}" aria-pressed="${S.boats.has(nm)}" data-nm="${nm.replace(/"/g,'&quot;')}">
      <span class="more-rank">${b.meta.sdl?'#'+b.meta.sdl:'—'}</span><span class="more-name">${nm}</span>
      <span class="more-type">${b.meta.typ||''}</span><span class="more-corr">${b.meta.corr||(b.meta.retireReason?'DNF':'—')}</span></button>`; };
  const ranked=ORDER.filter(nm=>D.boats[nm].meta.sdl!=null).sort((a,b)=>D.boats[a].meta.sdl-D.boats[b].meta.sdl);
  const dnf=ORDER.filter(nm=>D.boats[nm].meta.grp==='sdl_dnf');
  const others=ORDER.filter(nm=>D.boats[nm].meta.grp==='maxi');
  panel.innerHTML=`${trackLoadErr?`<div class="note" style="color:#A33;margin-bottom:6px">${trackLoadErr}</div>`:''}
    <div class="note" style="margin-bottom:8px">Tap any boat to add or remove it. Ranked by St. David's Lighthouse corrected time.</div>
    <div class="more-cols">
      <div><div class="more-head">SDL Overall (${ranked.length})</div><div class="more-list">${ranked.map(row).join('')}</div></div>
      <div><div class="more-head">Retired (${dnf.length})</div><div class="more-list" style="margin-bottom:12px">${dnf.map(row).join('')}</div>
        <div class="more-head">Outside SDL (${others.length})</div><div class="more-list">${others.map(row).join('')}</div></div>
    </div>`;
  panel.querySelectorAll('.more-row').forEach(r=>{ r.onclick=()=>toggleBoat(r.dataset.nm); });
}

/* ═══ KPIs (static; built once) ═══ */
function buildKPIs(){
  const st=D.stats, pf=D.parkFair['RAGANA'];
  const k=[
    ['Result','46 / 86','St. David’s Lighthouse · 8/10 in class'],
    ['Distance sailed', st.dist_sailed+'<span class="u"> nm</span>', '+'+st.extra+' over the 635 nm rhumb'],
    ['Average speed', st.avg_sog+'<span class="u"> kts</span>', 'peaked '+st.max_sog+' in the Stream'],
    ['Park run', pf.hrs+'<span class="u"> h</span>', 'through DTF 180→80 · fastest in set 22.9 h'],
    ['Easting', st.max_xte_e+'<span class="u"> nm</span>', 'most east · only '+Math.abs(st.max_xte_w)+' nm west, ever'],
    ['vs 2022','+19<span class="u"> pctl</span>','72nd → 53rd percentile of finishers'],
  ];
  document.getElementById('kpis').innerHTML = k.map(([l,v,s])=>
    `<div class="kpi"><div class="lab">${l}</div><div class="val">${v}</div><div class="sub">${s}</div></div>`).join('');
}

/* ═══ map (own axis; unaffected by the time/DTF toggle) ═══ */
function buildMap(){
  const tr=[];
  if(S.fleet && FLEET){
    /* one null-separated trace for all 144 ghosts — two orders of magnitude
       fewer SVG nodes than one trace per boat */
    const xs=[], ys=[];
    for(const f of FLEET){ xs.push(...f.lon, null); ys.push(...f.lat, null); }
    tr.push({x:xs,y:ys,mode:'lines',line:{color:'rgba(120,140,155,0.16)',width:1},hoverinfo:'skip',showlegend:false});
  }
  if(S.gs) tr.push({x:[-70.6,-66.2,-66.2,-70.6],y:[38.6,37.55,36.35,37.4],fill:'toself',mode:'none',
    fillcolor:'rgba(62,151,201,0.13)',hoverinfo:'text',
    text:wrapText('Gulf Stream band (approx — from the nav log: 74°F entry 17:21 Sat → 80°F core → 75°F exit 05:01 Sun)'),
    showlegend:true,name:'Gulf Stream (approx)'});
  if(S.rhumb) tr.push({x:[D.start[1],D.fin[1]],y:[D.start[0],D.fin[0]],mode:'lines',
    line:{color:'#C2187E',width:1.6,dash:'dash'},name:'Rhumb line 635 nm',hoverinfo:'name'});
  for(const nm of ORDER){ if(!S.boats.has(nm)||!hasTrack(nm))continue; const b=D.boats[nm];
    tr.push({x:b.lon,y:b.lat,mode:'lines',name:nm,line:{color:boatColor[nm],width:nm==='RAGANA'?3:1.6},opacity:nm==='RAGANA'?1:.85,
      text:b.t.map((t,i)=>`${nm} · ${fmt(t)} EDT · ${b.dtf[i]} nm to go · ${b.sog[i]??'—'} kts`),hoverinfo:'text'}); }
  if(S.watches && S.boats.has('RAGANA')){ const rb=D.boats['RAGANA'];
    D.watches.forEach(([a,b],wi)=>{ const idx=rb.t.map((t,i)=>i).filter(i=>rb.t[i]>=a&&rb.t[i]<=b); if(idx.length<2)return;
      tr.push({x:idx.map(i=>rb.lon[i]),y:idx.map(i=>rb.lat[i]),mode:'lines',line:{color:'#B8944A',width:6},opacity:.55,
        name:'RAGANA on watch',legendgroup:'w',showlegend:wi===0,hoverinfo:'text',text:idx.map(i=>`On watch · ${fmt(rb.t[i])} EDT`)}); }); }
  const rb=D.boats['RAGANA'], evs=D.events.filter(e=>S.ev.has(e.cat));
  if(evs.length){ const pos=evs.map(e=>{ let i=rb.t.findIndex(t=>t>=e.t); return i<0?rb.t.length-1:i; });
    for(const [cat,cfg] of Object.entries(EVCAT)){ const sub=evs.map((e,j)=>({e,j})).filter(o=>o.e.cat===cat); if(!sub.length)continue;
      tr.push({x:sub.map(o=>rb.lon[pos[o.j]]),y:sub.map(o=>rb.lat[pos[o.j]]),mode:'markers',
        marker:{symbol:cfg.sym,size:['milestone','insight'].includes(cat)?14:11,color:cfg.c,line:{width:1,color:'#fff'}},
        name:cfg.label,text:sub.map(o=>wrapText(`${o.e.label} · ${fmt(o.e.t)} EDT — ${o.e.txt}`)),hoverinfo:'text'}); } }
  if(S.log) tr.push({x:D.recon.map(r=>r.log[1]),y:D.recon.map(r=>r.log[0]),mode:'markers+text',
    marker:{symbol:'cross-thin',size:10,color:'#C0392B',line:{width:1.4,color:'#C0392B'}},
    text:D.recon.map(r=>r.temp?r.temp+'°':''),textposition:'middle right',textfont:{size:10,color:'#C0392B',family:'SF Mono, Menlo, monospace'},
    name:'Nav log + water temp',hovertext:D.recon.map(r=>wrapText(`Log ${r.t} (true ${r.matched_edt}) · ${r.log[0]}, ${r.log[1]}${r.temp?' · '+r.temp+'°F':''} — ${r.d} nm from tracker`)),hoverinfo:'text'});
  tr.push({x:[D.start[1]],y:[D.start[0]],mode:'markers+text',marker:{symbol:'circle',size:10,color:'#17293A'},
    text:['NEWPORT'],textposition:narrow()?'middle right':'top center',textfont:{size:10,family:'SF Mono, Menlo, monospace'},showlegend:false,hoverinfo:'skip'});
  tr.push({x:[D.fin[1]],y:[D.fin[0]],mode:'markers+text',marker:{symbol:'square',size:10,color:'#17293A'},
    text:["ST. DAVID'S"],textposition:narrow()?'middle left':'bottom center',textfont:{size:10,family:'SF Mono, Menlo, monospace'},showlegend:false,hoverinfo:'skip'});
  // phase labels: thin leader lines from empty corners to RAGANA's track at each phase midpoint
  const rag=D.boats['RAGANA'];
  const posAtDTF = m => { for(let i=0;i<rag.dtf.length;i++){ if(rag.dtf[i]<=m) return [rag.lon[i],rag.lat[i]]; }
    return [rag.lon[rag.lon.length-1],rag.lat[rag.lat.length-1]]; };
  /* FINISH label sits up-right of the landfall cluster, in open water — it used
     to overlap the converging tracks */
  const LBL=[ [570,'START + HEAVY RUNNING', 96,-6], [450,'GULF STREAM APPROACH', 116,-14],
    [345,'STREAM + A3 RUN', 122,-8], [238,'SUNDAY BEAT — the recovery', -128,44],
    [128,'THE PARK — Mon dead core', -118,36], [4,'FINISH · Tue 15:55 EDT', 58,-52] ];
  const nw = narrow();
  // the leader-line labels need open water around them — no room on a phone
  const mapAnn = nw ? [] : LBL.map(([m,txt,ax,ay])=>{ const [x,y]=posAtDTF(m);
    return {x,y,ax,ay,xref:'x',yref:'y',text:txt,showarrow:true,arrowhead:0,arrowwidth:.7,
      arrowcolor:'rgba(81,103,122,0.55)',standoff:3,
      font:{size:8.5,color:'#4C6274',family:'SF Mono, Menlo, monospace'},align:'left'}; });
  react('map',tr,{...BASE(), annotations:mapAnn,
    xaxis:{...GAX,title:nw?undefined:{text:'Longitude',font:AXFONT},range:[-72,-63.6]},
    yaxis:{...GAX,title:nw?undefined:{text:'Latitude',font:AXFONT},range:[31.9,42]},
    legend: nw ? {orientation:'h',y:-0.08,font:{size:10}} : {orientation:'v',x:1.001,y:1,font:{size:10.5}},
    margin: nw ? {l:36,r:10,t:8,b:30} : {l:56,r:150,t:8,b:40}});
}

/* ═══ the race chart (own DTF axis unless the shared toggle is on time) ═══ */
const RACE_NOTES = {
 h:`Corrected time at each 10-nm milestone, minus the reference boat's. <b>Pace view</b> divides by miles completed (min per 100 nm), so early and late phases read on the same scale — a flat line means matched pace, a rising line means losing in that stretch. <b>Total view</b> shows raw cumulative minutes; the finish point is exact from official results. Event markers sit at RAGANA's position (or clock) when each happened.`,
 e:`Raw elapsed time at each milestone, minus the reference boat's — position on the water, no handicap. Against her rating twin Christopher Dragon, RAGANA fell behind in the heavy running, took the lead back on the Sunday beat, then gave it up in the light air. Switch to Pace view to compare phases on an equal footing.`
};
const PHASES=[[635,505,'START + HEAVY RUNNING'],[505,395,'GS APPROACH'],[395,300,'STREAM + A3'],[300,180,'SUNDAY BEAT'],[180,80,'THE PARK'],[80,0,'REBUILD + FINISH']];
const ragT = m => hitTime(D.boats['RAGANA'], m);   // RAGANA's clock at a DTF milestone
const raceX = m => S.axis==='t' ? edtStr(m===0 ? Date.parse(D.boats['RAGANA'].meta.fin.replace(' ','T')+'-04:00')/1000 : ragT(m)) : m;
function buildRace(){
  document.getElementById('refname').textContent=S.ref;
  document.getElementById('racenote').innerHTML=RACE_NOTES[S.raceMode];
  if(!hasTrack(S.ref)){
    // reference's track still downloading — blank the chart rather than leave
    // the previous reference's traces under the new header
    react('race', [], {...BASE(), xaxis:{...GAX,visible:false}, yaxis:{...GAX,visible:false},
      annotations:[{text:'loading '+S.ref+'’s track…',xref:'paper',yref:'paper',x:.5,y:.5,showarrow:false,
        font:{size:12,color:'#4C6274',family:'SF Mono, Menlo, monospace'}}]});
    return;
  }
  const ref=D.boats[S.ref], refStart=startOf(ref), refTCF=ref.meta.tcf||1;
  const ms=[]; for(let m=620;m>=30;m-=10)ms.push(m);
  const refT=ms.map(m=>hitTime(ref,m));
  const refFin = S.raceMode==='h'? parseDur(ref.meta.corr) : parseDur(ref.meta.el);
  const pace = S.raceView==='p';
  const tr=[];
  for(const nm of ORDER){ if(!S.boats.has(nm)||!hasTrack(nm))continue; const b=D.boats[nm];
    if(S.raceMode==='h' && !b.meta.tcf) continue; if(!b.meta.el) continue;
    const st=startOf(b), tcf=b.meta.tcf||1;
    const xs=[], ys=[];
    ms.forEach((m,i)=>{ const t=hitTime(b,m); if(t===null||refT[i]===null){xs.push(raceX(m));ys.push(null);return;}
      const mine=t-st, theirs=refT[i]-refStart;
      let v = S.raceMode==='h' ? (mine*tcf-theirs*refTCF)/60 : (mine-theirs)/60;
      if(pace){ const done=635.1-m; if(done<50){xs.push(raceX(m));ys.push(null);return;} v=v/done*100; }
      xs.push(raceX(m)); ys.push(v); });
    let fin=((S.raceMode==='h'?parseDur(b.meta.corr):parseDur(b.meta.el))-refFin)/60;
    if(pace) fin=fin/635.1*100;
    xs.push(raceX(0)); ys.push(fin);
    tr.push({x:xs,y:ys,mode:'lines+markers',name:nm,connectgaps:false,marker:{size:xs.map((x,i)=>i===xs.length-1?7:0)},
      line:{color:boatColor[nm],width:nm==='RAGANA'?3:1.5},opacity:nm==='RAGANA'?1:.8,
      hovertemplate:`${nm} · %{x}${S.axis==='t'?'':' nm to go'} · %{y:.1f} ${pace?'min/100nm':'min'} vs ${S.ref}<extra></extra>`}); }
  const shapes=[], ann=[];
  PHASES.forEach(([a,b,l],i)=>{ const x0=raceX(a===635?634:a), x1=raceX(b===0?1:b);
    shapes.push({type:'rect',xref:'x',yref:'paper',x0,x1,y0:0,y1:1,fillcolor:i%2?'rgba(23,41,58,0.028)':'rgba(0,0,0,0)',line:{width:0}});
    if(!narrow()) ann.push({x:S.axis==='t'? edtStr((ragT(a===635?634:a)+ragT(b===0?20:b))/2) : (a+b)/2,
      y:1.03,xref:'x',yref:'paper',text:l,showarrow:false,font:{size:9,color:'#4C6274',family:'SF Mono, Menlo, monospace'}}); });
  shapes.push(...gsShape(), ...watchShapes());
  const evs=D.events.filter(e=>S.ev.has(e.cat));
  for(const e of evs) shapes.push({type:'line',xref:'x',yref:'paper',x0:evX(e.t),x1:evX(e.t),y0:0,y1:1,line:{color:EVCAT[e.cat].c,width:1,dash:'dot'},opacity:.45});
  if(evs.length) tr.push({x:evs.map(e=>evX(e.t)),y:evs.map(()=>19),yaxis:'y2',mode:'markers',
    marker:{symbol:evs.map(e=>EVCAT[e.cat].sym),size:evs.map(e=>['milestone','insight'].includes(e.cat)?12:9),color:evs.map(e=>EVCAT[e.cat].c),line:{width:1,color:'#fff'}},
    text:evs.map(e=>wrapText(`${e.label} · ${fmt(e.t)} EDT — ${e.txt}`)),hoverinfo:'text',showlegend:false});
  const yTitle = narrow()
    ? (pace?'min/100nm':'min')+' vs ref (+ = behind)'
    : (pace?'Min per 100 nm':'Minutes')+' behind (+) / ahead (−) of '+S.ref+(S.raceMode==='h'?' — corrected':' — elapsed');
  react('race',tr,{...BASE(),shapes,annotations:ann,margin:{...BASE().margin,t:26},
    xaxis:sharedXaxis(narrow()?{title:undefined}:undefined),
    yaxis:{...GAX,title:{text:yTitle,font:AXFONT}},
    yaxis2:{overlaying:'y',side:'right',range:[0,20],visible:false,fixedrange:true}});
}

/* ═══ toggle-driven charts: DTF, rhumb offset, speed ═══ */
function buildDTF(){
  // Inherently time-based (distance-remaining over the race); not governed by the shared axis toggle.
  const tr=[];
  for(const nm of ORDER){ if(!S.boats.has(nm)||!hasTrack(nm))continue; const b=D.boats[nm];
    tr.push({x:b.t.map(edtStr), y:b.dtf, mode:'lines', name:nm, showlegend:true,
      line:{color:boatColor[nm], width:nm==='RAGANA'?3:1.5}, opacity:nm==='RAGANA'?1:.82,
      hovertemplate:`${nm} · %{x} · %{y} nm to go<extra></extra>`}); }
  const dec=eventDecor(660,'time'); if(dec.marker)tr.push(dec.marker);
  const wl=watchLegend(); if(wl)tr.push(wl);
  // phase divides at RAGANA's boundary times, same labels as the won/lost chart
  const shapes=[...gsShape('time'),...watchShapes('time'),...dec.shapes], ann=[];
  PHASES.forEach(([a,b,l],i)=>{
    const t0=ragT(a===635?634:a), t1=(b===0? Date.parse(D.boats['RAGANA'].meta.fin.replace(' ','T')+'-04:00')/1000 : ragT(b));
    if(i>0) shapes.push({type:'line',xref:'x',yref:'paper',x0:edtStr(t0),x1:edtStr(t0),y0:0,y1:1,line:{color:'#B9CBD4',width:1}});
    if(!narrow()) ann.push({x:edtStr((t0+t1)/2),y:1.05,xref:'x',yref:'paper',text:l,showarrow:false,
      font:{size:8.5,color:'#4C6274',family:'SF Mono, Menlo, monospace'}}); });
  react('dtf',tr,{...BASE(),shapes,annotations:ann,margin:{...BASE().margin,t:22,b:36},
    xaxis:{...GAX,tickformat:'%a %H:%M',type:'date'},
    yaxis:{...GAX,title:{text:'nm to finish',font:AXFONT},range:[680,-15]}});
}
function buildXTE(){
  const tr=seriesTraces('xte', nm=>nm==='RAGANA'?2.6:1.3).map(t=>({...t,showlegend:false}));
  const dec=eventDecor(26); if(dec.marker)tr.push(dec.marker);
  const wl=watchLegend(); if(wl)tr.push(wl);
  const shapes=[...gsShape(),...watchShapes(),...dec.shapes,
    {type:'line',xref:'paper',yref:'y',x0:0,x1:1,y0:0,y1:0,line:{color:'#C2187E',width:1,dash:'dash'}}];
  react('xte',tr,{...BASE(),shapes,xaxis:sharedXaxis(),
    yaxis:{...GAX,title:{text:'nm east (+) / west (−) of rhumb',font:AXFONT}}});
}
function buildSOG(){
  const tr=seriesTraces('sog', nm=>nm==='RAGANA'?2.4:1.1).map(t=>({...t,showlegend:false,opacity:t.name==='RAGANA'?1:.7}));
  const dec=eventDecor(13.4); if(dec.marker)tr.push(dec.marker);
  const wl=watchLegend(); if(wl && S.axis==='t')tr.push(wl);
  let shapes=[...gsShape(),...watchShapes(),...dec.shapes];
  if(S.axis==='d') shapes=shapes.concat([
    {type:'rect',xref:'x',yref:'paper',x0:180,x1:80,y0:0,y1:1,fillcolor:'rgba(23,41,58,0.05)',line:{width:0}},
    {type:'rect',xref:'x',yref:'paper',x0:160,x1:140,y0:0,y1:1,fillcolor:'rgba(192,57,43,0.07)',line:{width:0}}]);
  react('sog',tr,{...BASE(),shapes,
    xaxis:sharedXaxis(S.axis==='d'?{title:{text:narrow()?'nm to finish ⟵ (grey = park, red = dead core)':'Distance to finish (nm) ⟵ (grey = park zone, red = dead core)',font:AXFONT}}:{}),
    yaxis:{...GAX,title:{text:'Speed over ground (kts)',font:AXFONT},range:[0,14]}});
}

/* ═══ tables ═══ */
function buildParkTable(){
  const pf=D.parkFair;
  const names=Object.keys(pf).filter(nm=>S.boats.has(nm));
  if(!names.length){ document.getElementById('parktable').innerHTML='<div class="note">No boats selected. Pick boats under “Boats &amp; overlays” to compare their light-air crossings.</div>'; return; }
  const rows=names.map(nm=>({nm,...pf[nm],sdl:D.boats[nm].meta.sdl})).sort((a,b)=>a.hrs-b.hrs).map(r=>
    `<tr class="${r.nm==='RAGANA'?'hero':''}"><td>${r.nm}</td><td>${r.sdl?'#'+r.sdl:'—'}</td><td>${fmt(r.enter)}</td>
     <td style="text-align:right">${r.hrs}</td><td style="text-align:right">${r.mean}</td><td style="text-align:right">${r.u4}%</td>
     <td style="text-align:right">${r.u2}%</td><td style="text-align:right">${r.xte>0?'+':''}${r.xte}</td></tr>`).join('');
  document.getElementById('parktable').innerHTML=
    `<div class="tblwrap"><table><thead><tr><th scope="col">Boat</th><th scope="col">SDL</th><th scope="col">Reached zone</th><th scope="col">Hours to cross</th><th scope="col">Avg kts</th><th scope="col">% under 4</th><th scope="col">% under 2</th><th scope="col">Avg nm E+</th></tr></thead><tbody>${rows}</tbody></table></div>
     <div class="note swipehint">Swipe the table sideways for the rest of the columns.</div>
     <div class="note">The boats you've selected, fastest crossing first. For context on RAGANA's run, Carina makes the cleanest match: she reached the zone 20 min before RAGANA, ~10 nm nearer the rhumb, and got through 3.7 hours quicker.</div>`;
}
function buildEventTable(){
  const evs=D.events.filter(e=>S.ev.has(e.cat));
  const rows=evs.map(e=>{ const c=EVCAT[e.cat];
    return `<tr><td>${fmt(e.t)} EDT</td><td><span class="badge" style="background:${c.c}22;color:${c.c}">${c.label}</span></td>
      <td>${Math.round(ragDTFat(e.t))} nm</td><td style="font-weight:600">${e.label}</td>
      <td style="white-space:normal;min-width:320px">${e.txt}</td></tr>`; }).join('');
  document.getElementById('eventtable').innerHTML = evs.length
    ? `<table><thead><tr><th scope="col">Time</th><th scope="col">Type</th><th scope="col">To go</th><th scope="col">Moment</th><th scope="col">Detail</th></tr></thead><tbody>${rows}</tbody></table>`
    : `<div class="note">Every event category is off. Turn one on under “Boats &amp; overlays” to fill this log back in.</div>`;
}
function buildRecon(){
  const badge=v=> v==='error'?'<span class="badge err">dropped</span>':v==='warn'?'<span class="badge warn">+1h corrected</span>':'<span class="badge ok">match</span>';
  const rows=D.recon.map(r=>`<tr class="${r.verdict==='error'?'bad':''}"><td>${r.t}</td><td style="text-align:right">${r.matched_edt}</td>
     <td>${r.log[0].toFixed(3)}, ${r.log[1].toFixed(3)}</td><td>${r.trk[0].toFixed(3)}, ${r.trk[1].toFixed(3)}</td>
     <td style="text-align:right">${r.d}</td><td>${r.speed}</td><td>${r.course}</td><td>${r.wind}</td>
     <td>${r.temp!=null?r.temp+'°F':'—'}</td><td>${badge(r.verdict)}</td><td style="white-space:normal;min-width:280px">${r.note||''}</td></tr>`).join('');
  document.getElementById('recon').innerHTML=
    `<table><thead><tr><th scope="col">Log time</th><th scope="col">True EDT</th><th scope="col">Log position</th><th scope="col">Tracker position</th><th scope="col">Δ nm</th><th scope="col">Speed</th><th scope="col">Course</th><th scope="col">Wind</th><th scope="col">Water</th><th scope="col">Verdict</th><th scope="col">Note</th></tr></thead><tbody>${rows}</tbody></table>`
    +`<div class="note swipehint">Swipe the table sideways for the rest of the columns.</div>`;
}

/* ═══ finish spread: every scored SDL boat by corrected time ═══ */
function buildFinStrip(){
  const rows=[];
  for(const nm of ORDER){ const m=D.boats[nm].meta; if(!m.corr) continue;
    rows.push({nm, sec:parseDur(m.corr), sdl:m.sdl, grp:m.grp}); }
  rows.sort((a,b)=>a.sec-b.sec);
  const rag=rows.find(r=>r.nm==='RAGANA');
  const hrs=r=>r.sec/3600;
  // gentle vertical jitter so dense clusters read as density
  const jit=rows.map((r,i)=>((i%7)-3)*0.09);
  const others=rows.filter(r=>r.nm!=='RAGANA');
  const tr=[{x:others.map(hrs), y:others.map((r,i)=>jit[rows.indexOf(r)]), mode:'markers',
    marker:{size:7,color:others.map(r=>S.boats.has(r.nm)?boatColor[r.nm]:'rgba(110,139,152,0.45)'),
      line:{width:1,color:'#fff'}},
    text:others.map(r=>`#${r.sdl} ${r.nm} · corrected ${D.boats[r.nm].meta.corr}`),hoverinfo:'text',showlegend:false},
   {x:[hrs(rag)], y:[0], mode:'markers', marker:{symbol:'diamond',size:13,color:'#C2187E',line:{width:1.5,color:'#fff'}},
    hovertext:[`#46 RAGANA · corrected ${D.boats['RAGANA'].meta.corr}`],hoverinfo:'text',showlegend:false}];
  // hypothetical markers: −1h and −2h corrected. Labels anchor away from each
  // other and RAGANA's label floats above the dot band on a thin leader —
  // all three used to collide in the dense mid-pack.
  const hyp=[[1,'left'],[2,'right']].map(([h,anchor])=>{
    const cut=rag.sec-h*3600, rank=1+rows.filter(r=>r.sec<cut).length;
    return {x:hrs(rag)-h, anchor, lbl:`−${h} h → ~${rank}th`}; });
  const shapes=hyp.map(o=>({type:'line',xref:'x',yref:'paper',x0:o.x,x1:o.x,y0:.10,y1:.86,
    line:{color:'#C2187E',width:1,dash:'dash'},opacity:.6}));
  const ann=[
    ...hyp.map(o=>({x:o.x,y:.97,xref:'x',yref:'paper',text:o.lbl,showarrow:false,
      xanchor:o.anchor, xshift:o.anchor==='left'?4:-4,
      font:{size:9,color:'#C2187E',family:'SF Mono, Menlo, monospace'}})),
    {x:hrs(rag),y:0,xref:'x',yref:'y',ax:0,ay:-46,text:'RAGANA · #46',showarrow:true,
      arrowhead:0,arrowwidth:.7,arrowcolor:'rgba(194,24,126,0.55)',standoff:9,
      font:{size:10,color:'#C2187E',family:'SF Mono, Menlo, monospace'}}];
  react('finstrip',tr,{...BASE(),shapes,annotations:ann,margin:{...BASE().margin,t:14,b:44},showlegend:false,
    xaxis:{...GAX,title:{text:narrow()?'Corrected time (h) — left is better':'Corrected time (hours) — St. David’s Lighthouse fleet, left is better',font:AXFONT}},
    yaxis:{...GAX,visible:false,range:[-0.8,0.8]}});
}

/* ═══ boot ═══ */
function showError(e){
  const el=document.getElementById('appstate');
  el.className='appstate err';
  el.innerHTML='The race data didn’t load ('+(e && e.message ? e.message : e)+').<br>' +
    'Check your connection and retry. Opened as a local file? Serve the folder instead: <kbd>python3 -m http.server</kbd>.<br>' +
    '<button type="button" class="retry" onclick="location.reload()">Retry</button>';
}
(async function init(){
  try {
    D = window.__DATA_EMBEDDED__
      ? window.__DATA_EMBEDDED__
      : await (window.__CORE_FETCH || loadJSON('core.json'));
  } catch(e){ console.error(e); showError(e); return; }
  if(D.fleet) FLEET = D.fleet;   // embedded build ships everything in one payload
  ORDER = Object.keys(D.boats);
  { const idx={};
    for(const nm of ORDER){ const g=D.boats[nm].meta.grp, pal=(GRP[g]||GRP.sdl_other).colors;
      idx[g]=(idx[g]??-1)+1; boatColor[nm]=pal[idx[g]%pal.length]; }
    boatColor['RAGANA']='#C2187E'; }

  document.getElementById('appstate').remove();
  document.getElementById('controls').hidden=false;
  const sheetBar=document.getElementById('sheetBar');
  sheetBar.hidden=false;                      // shown/hidden by breakpoint CSS
  sheetBar.onclick=()=>{ document.getElementById('controls').classList.contains('open') ? closeSheet() : openSheet(); };
  document.getElementById('scrim').onclick=closeSheet;
  document.addEventListener('keydown',e=>{ if(e.key==='Escape' && narrow()) closeSheet(); });
  buildKPIs(); buildRecon();
  render('all');                       // controls + tables now; charts gated on Plotly
  plotlyReady.then(()=>{
    if(!window.Plotly){ showChartError(); return; }
    chartsOK=true; render('all');
    if(!FLEET) loadFleet();            // ghost layer after first paint
    // safety net: if a default-selected boat's track isn't in core (build
    // drift from S.boats), pull the on-demand payload rather than silently
    // dropping the boat from the charts
    const missing=[...S.boats].find(nm=>!hasTrack(nm));
    if(missing) ensureTracks(missing).then(()=>render('boats')).catch(()=>{});
  });

  // compress the sticky controls bar once the page scrolls under it
  const ctl=document.getElementById('controls');
  let ticking=false;
  window.addEventListener('scroll',()=>{
    if(ticking) return; ticking=true;
    requestAnimationFrame(()=>{ ctl.classList.toggle('scrolled', window.scrollY>40); ticking=false; });
  },{passive:true});

  // re-lay charts when crossing the mobile breakpoint (legend/margin/dragmode changes)
  let wasNarrow=narrow(), rt=0;
  window.addEventListener('resize',()=>{
    clearTimeout(rt);
    rt=setTimeout(()=>{ if(narrow()!==wasNarrow){ wasNarrow=narrow(); closeSheet(); render('all'); } },200);
  });
})();
function showChartError(){
  document.querySelectorAll('.plot').forEach(el=>{
    el.innerHTML='<div class="note" style="padding:20px">The charts didn’t load (the plotting library failed to download). The tables below still work — reload to try the charts again.</div>';
  });
}
