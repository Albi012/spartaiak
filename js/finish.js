/* ==================================================================
   Edzes befejezese: rekordok, izomterkep (muscleMap) es az
   edzes-osszegzo lap.
   ================================================================== */
function finish(){
  // Mobilitás rutin: nem naplózódik (nem edzés), csak lezárul.
  if(isPhysioActive()){
    S.active=null; S.activeT=Date.now(); playing=false; stopTimer(); tab='home'; save();
    render(); window.scrollTo(0,0); toast('Mobilitás rutin kész – szép munka!'); return;
  }
  const any=Object.values(S.active.log).some(l=>l.sets.some(x=>x!=null));
  if(!any){ uiAlert('Egyetlen szettet sem rögzítettél.'); return; }
  const done=S.active; done.end=Date.now();   // időtartamhoz (additív; régi edzésen hiányzik)
  S.sessions.push(done); S.active=null; S.activeT=Date.now(); playing=false; stopTimer(); save(); syncStats();
  tab='log'; render(); openFinishSummary(done); window.scrollTo(0,0);
}
// A befejezett edzés új csúcsai: ha egy gyakorlat súlya meghaladja az összes
// korábbi edzését (súly-PR), vagy — ha nem — a becsült 1RM-je (1RM-PR).
function sessionPRs(sess){
  const prs=[], others=S.sessions.filter(s=>s!==sess);
  Object.keys(sess.log||{}).forEach(id=>{
    const L=sess.log[id]; if(!L||!L.sets.some(x=>x!=null)) return;
    const e=exDef(id); if(e.bw||!(L.w>0)) return;
    const prevW=Math.max(0,...others.filter(s=>s.log[id]).map(s=>s.log[id].w||0));
    if(L.w>prevW){ prs.push({name:exN(e), kind:'súly-csúcs', val:kgNum(L.w)+' kg'}); return; }
    const c=sess1RM(L); if(c==null) return;
    const prev1=Math.max(0,...others.filter(s=>s.log[id]).map(s=>sess1RM(s.log[id])||0));
    if(c>prev1) prs.push({name:exN(e), kind:'becsült 1RM', val:'~'+kgNum(c)+' kg'});
  });
  return prs;
}
// -- Edzés-összegzés: időtartam, izomcsoport-terhelés, izomtérkép ------
function sessionMgSets(sess){
  const acc={};
  Object.keys(sess.log||{}).forEach(id=>{
    const n=(sess.log[id].sets||[]).filter(x=>x!=null).length; if(!n) return;
    const mg=exDef(id).mg||'egyéb'; acc[mg]=(acc[mg]||0)+n;
  });
  return acc;
}
function sessionDur(sess){ return (sess.end && sess.end>sess.t) ? sess.end-sess.t : null; }
function fmtDur(ms){ const m=Math.round(ms/60000); return m<60 ? m+' perc' : Math.floor(m/60)+' ó '+(m%60)+' p'; }
// Izomtérkép: elöl+hátul stilizált alak, a terhelt izomcsoportok a szettszám
// szerint színezve (kevés → sárgaréz halványan, sok → telítettebb, 10+ → piros).
// A nem-célzott testrészek halvány sziluettek (currentColor). Téma-követő.
// Folytonos hőskála: kevés szett → sárgaréz halványan, sok → piros telítetten.
// A színt color-mix()-szel keverjük a téma-tokenek közt (téma-követő marad),
// a telítettséget az opacitás adja. CAP fölött már csupa piros.
const MM_CAP=12;
function mmAttr(mg, mgSets){
  const n=mgSets[mg]||0;
  if(!n) return 'style="fill:currentColor;opacity:0.13"';
  const t=Math.min(1, n/MM_CAP), mix=Math.round(t*100), op=(0.4+0.55*t).toFixed(2);
  return `style="fill:color-mix(in srgb, var(--brass), var(--red) ${mix}%);opacity:${op}"`;
}
// Részletes, anatómiai izomtérkép: elöl+hátul stilizált alak, izomcsoportonként
// külön kontúr. A jobb oldali végtagizmokat egyszer rajzoljuk és tükrözve
// (matrix -1) használjuk újra – így szimmetrikus és fele annyi útvonal. Az
// id-k hívásonként egyediek, hogy egy oldalon több térkép ne ütközzön.
let _mmSeq=0;
function muscleMap(mgSets, sm){
  const q='_'+(++_mmSeq);
  const B='style="fill:currentColor;opacity:0.13"';
  const F=mg=>mmAttr(mg,mgSets);
  return `<svg class="muscmap${sm?' sm':''}" viewBox="0 0 220 212" preserveAspectRatio="xMidYMid meet" aria-hidden="true">
    <defs>
      <g id="mmFR${q}">
        <path d="M61,39 Q74,37 80,49 Q81,57 74,58 Q69,48 62,44 Z" ${F('váll')}/>
        <path d="M56,42 Q67,41 72,49 Q73,58 66,62 Q58,62 56,56 Z" ${F('mell')}/>
        <path d="M74,58 Q81,61 81,71 Q80,78 74,77 Q71,67 70,59 Z" ${F('bicepsz')}/>
        <path d="M74,78 Q80,88 78,100 Q75,103 72,100 Q71,88 71,79 Z" ${B}/>
        <path d="M56,95 Q68,98 69,122 Q69,143 62,152 Q57,146 56,122 Z" ${F('láb')}/>
        <path d="M62,153 Q67,169 64,189 Q60,192 58,189 Q57,169 57,153 Z" ${B}/>
      </g>
      <g id="mmBR${q}">
        <path d="M171,39 Q184,37 190,49 Q191,57 184,58 Q179,48 172,44 Z" ${F('váll')}/>
        <path d="M170,44 Q181,49 181,66 Q180,78 172,86 L170,83 Z" ${F('hát')}/>
        <path d="M184,58 Q191,61 191,71 Q190,78 184,77 Q181,67 180,59 Z" ${F('tricepsz')}/>
        <path d="M184,78 Q190,88 188,100 Q185,103 182,100 Q181,88 181,79 Z" ${B}/>
        <path d="M166,89 Q177,92 178,112 Q178,140 170,152 Q165,146 165,120 L165,89 Z" ${F('láb')}/>
        <path d="M170,153 Q175,169 172,189 Q168,192 166,189 Q165,169 166,153 Z" ${B}/>
      </g>
    </defs>
    <!-- ELÖL (középvonal + tükrözött végtagok) -->
    <ellipse cx="55" cy="15" rx="8.5" ry="10.5" ${B}/>
    <path d="M50,24 Q55,27 60,24 L59,31 Q55,33 51,31 Z" ${B}/>
    <path d="M45,31 Q55,27 65,31 L61,40 Q55,37 49,40 Z" ${F('hát')}/>
    <path d="M48,59 Q55,61 62,59 Q63,74 60,92 Q55,98 50,92 Q47,74 48,59 Z" ${F('törzs')}/>
    <use href="#mmFR${q}"/>
    <use href="#mmFR${q}" transform="matrix(-1,0,0,1,110,0)"/>
    <text x="55" y="206" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.55">Elöl</text>
    <!-- HÁTUL -->
    <ellipse cx="165" cy="15" rx="8.5" ry="10.5" ${B}/>
    <path d="M160,24 Q165,27 170,24 L169,31 Q165,33 161,31 Z" ${B}/>
    <path d="M155,31 Q165,27 175,31 L172,42 Q173,64 170,84 Q165,89 160,84 Q157,64 158,42 Z" ${F('hát')}/>
    <use href="#mmBR${q}"/>
    <use href="#mmBR${q}" transform="matrix(-1,0,0,1,330,0)"/>
    <text x="165" y="206" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.55">Hátul</text>
  </svg>`;
}
// Terhelt izomcsoportok szám-chipjei (szettszám szerint csökkenő).
function mgChips(mgSets){
  const arr=Object.keys(mgSets).sort((a,b)=>mgSets[b]-mgSets[a]);
  if(!arr.length) return '';
  return `<div class="mgchips">${arr.map(mg=>`<span class="mgchip"><b>${mgSets[mg]}</b> ${esc(trmg(mg))}</span>`).join('')}</div>`;
}
// Mini hőskála-jelmagyarázat (kevés → sok).
function mmLegend(){ return `<div class="mmleg"><span>kevés</span><i></i><span>sok</span></div>`; }
// Az aktuális hét (hétfőtől) izomcsoportonkénti szettszáma – map alakban.
function weeklyMgSets(){
  const wk=weekStart(Date.now()), acc={};
  S.sessions.forEach(s=>{ if(weekStart(s.t)!==wk) return;
    Object.keys(s.log||{}).forEach(id=>{ const n=(s.log[id].sets||[]).filter(x=>x!=null).length; if(!n) return;
      const mg=exDef(id).mg||'egyéb'; acc[mg]=(acc[mg]||0)+n; }); });
  return acc;
}

function openFinishSummary(sess){
  const load=sessionLoad(sess); let setsDone=0, exCount=0;
  Object.values(sess.log).forEach(L=>{ const n=L.sets.filter(x=>x!=null).length; if(n){ exCount++; setsDone+=n; } });
  const prs=sessionPRs(sess);
  const dur=sessionDur(sess), mgSets=sessionMgSets(sess);
  // A `.finish` burok NEM elrendezés, hanem HOROG: ehhez kötjük az
  // egyszeri, ünnepi lépcsőt és az XP-sáv feltöltését (lásd CSS).
  let h=`<div class="grabber"></div><div class="finish">
    <div class="row"><div class="grow"><span class="eyebrow" style="color:var(--sage)">${ICON.check} Kész</span>
      <h2 style="font-size:24px">Edzés befejezve</h2>
      <span class="small dim">${esc(trn(sess.dayName||(dayDef(sess.day)||{}).name||''))}</span></div>
      <button onclick="closeFinish()" style="font-size:26px;color:var(--dim);padding:0 8px">×</button></div>
    <div class="statgrid" style="margin-top:14px">
      ${dur?`<div class="stat"><span class="num">${fmtDur(dur)}</span><span class="statlbl">időtartam</span></div>`:''}
      <div class="stat"><span class="num">${exCount}</span><span class="statlbl">gyakorlat</span></div>
      <div class="stat"><span class="num">${setsDone}</span><span class="statlbl">szett</span></div>
      <div class="stat"${dur?'':' style="grid-column:span 2"'}><span class="num">${load}<span class="small dim" style="font-weight:400"> kg</span></span><span class="statlbl">összterhelés</span></div>
    </div>
    <div class="card" style="margin-top:14px"><div class="pad">
      <span class="eyebrow">Terhelt izmok</span>
      ${muscleMap(mgSets)}
      ${mmLegend()}
      ${mgChips(mgSets)}
    </div></div>`;
  // A kör bezárása: a mai terhelés mit csinál a HOLNAPI készenléttel.
  // Előrejelzés – a holnapi alvást még nem tudjuk, ezért csak a terhelés
  // (és a pihenőnap) mozdul; ezt ki is írjuk, hogy ne tűnjön jóslatnak.
  h+=rdyForecastCard(sess, mgSets);
  if(prs.length){
    h+=`<div class="card" style="margin-top:14px;border-color:var(--brass)"><div class="pad">
      <span class="eyebrow" style="color:var(--brass)">Új csúcs${prs.length>1?'ok':''}</span>`;
    prs.forEach(p=>{ h+=`<div class="row" style="margin-top:8px;align-items:baseline">
      <span class="cond grow" style="font-size:18px;font-weight:600">${esc(p.name)}<br><span class="small dim" style="font-weight:400">${esc(tr(p.kind))}</span></span>
      <span class="num" style="font-size:22px;font-weight:700;color:var(--brass)">${p.val}</span></div>`; });
    h+=`</div></div>`;
  }
  // Szint + szintlépés (a mostani edzés már a naplóban van; a nélküle számolt
  // szinthez hasonlítva derül ki, léptél-e).
  const after=levelInfo(), before=levelInfo(S.sessions.filter(s=>s!==sess));
  const up=after.level>before.level;
  h+=`<div class="row" style="align-items:center;margin-top:14px;gap:12px">
    <div class="grow"><span class="small dim">Szint</span><br>
      <b style="font-size:18px${up?';color:var(--brass)':''}">${levelTitle(after.level)} · ${after.level}${up?' — Új szint!':''}</b></div>
    <span class="num" style="font-size:15px;color:var(--dim)">${after.into}/${after.need} XP</span></div>
  <div class="mgtrack" style="margin-top:8px"><span class="mgfill" style="--p:${(after.pct/100).toFixed(4)};background:var(--brass)"></span></div>`;
  h+=`<button class="btn pri" style="margin-top:14px" onclick="closeFinish()">Naplóhoz ›</button></div>`;
  document.getElementById('sheetIn').innerHTML=h;
  openSheet();
}
function closeFinish(){ closeSheet(); }

