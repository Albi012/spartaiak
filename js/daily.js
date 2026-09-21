/* ==================================================================
   Napi meresek, edzestol fuggetlenul: testsuly-naplo (bw) es
   alvas-naplo (sleep) - kartyak, lapok, grafikonok.
   ================================================================== */
/* ---- Napi testsúly-napló (edzés nélküli napon is) -------------------
   Additív mező: S.bw = { 'YYYY-MM-DD': kg }. Az edzésadatot/startW-t NEM
   érinti; a felhő-szinkron per-kulcs unióban viszi (auth.js 'bw'). */
const BW_SCALE='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M12 7.5v3M14.1 8.4 12 10.5"/><circle cx="12" cy="12" r="1.1" fill="currentColor" stroke="none"/></svg>';
function bwKey(t){ const d=new Date(t); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function bwNum(k){ return (Math.round(k*10)/10).toFixed(1).replace('.',','); }
function bwEntries(){ const b=S.bw||{}; return Object.keys(b).filter(k=>b[k]>0).sort().map(k=>({d:k,kg:b[k]})); }
function bwLast(){ const e=bwEntries(); return e.length?e[e.length-1]:null; }
function bwToday(){ const v=(S.bw||{})[bwKey(Date.now())]; return v>0?v:null; }
function bwFmtDate(k){ const p=k.split('-'); return p[0]+'.'+p[1]+'.'+p[2]; }
function bwDaysAgo(k){ const p=k.split('-').map(Number); const then=new Date(p[0],p[1]-1,p[2]).getTime();
  const days=Math.floor((Date.now()-then)/864e5); return days<=0?'ma':days===1?'tegnap':days+' napja'; }

// Mini trend-vonal a főoldali kártyán (utolsó ~14 nap).
function bwMiniSpark(){ const e=bwEntries(); if(e.length<2) return '';
  const pts=e.slice(-14).map(x=>x.kg), W=88, H=34;
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="flex:none;color:var(--brass)" aria-hidden="true"><path d="${sparkPath(pts,W,H,5)}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`; }

// Főoldali kártya – MINDEN nap látszik (edzés nélkül is).
function bwHomeCard(){
  const today=bwToday(), e=bwEntries(), last=bwLast();
  let mid;
  if(today!=null){
    const prev = e.length>1 ? e[e.length-2] : null;
    const delta = prev ? Math.round((today-prev.kg)*10)/10 : null;
    const dtxt = delta==null ? 'ma rögzítve'
      : (delta>0?'▲ +'+bwNum(delta):delta<0?'▼ −'+bwNum(-delta):'▬ 0')+' kg az előzőhöz';
    mid = `<span class="cond" style="font-size:21px;font-weight:600;display:block">${bwNum(today)} kg <span class="small dim" style="font-weight:400">ma</span></span>
      <span class="small dim">${dtxt}</span>`;
  } else if(last){
    mid = `<span class="cond" style="font-size:21px;font-weight:600;display:block">Testsúly</span>
      <span class="small dim">utoljára ${bwDaysAgo(last.d)}: ${bwNum(last.kg)} kg · koppints a rögzítéshez</span>`;
  } else {
    mid = `<span class="cond" style="font-size:21px;font-weight:600;display:block">Napi testsúly</span>
      <span class="small dim">Rögzítsd ma – edzés nélküli napon is</span>`;
  }
  return `<div class="card"><button class="daybtn" onclick="openBwSheet()">
    <span class="daytag" style="color:var(--brass)">${BW_SCALE}</span>
    <span class="grow">${mid}</span>
    ${bwMiniSpark()}
    <span style="color:var(--brass);font-size:22px">›</span></button></div>`;
}

// Trend-grafikon a lapon (utolsó ~30 nap) + min/max/most összegző.
function bwChart(){ const e=bwEntries(); if(e.length<2) return '';
  const arr=e.slice(-30), pts=arr.map(x=>x.kg), W=300, H=96, pad=10;
  const mn=Math.min(...pts), mx=Math.max(...pts), cur=pts[pts.length-1];
  const lastX=W, lastY=(H-pad)-((cur-mn)/((mx-mn)||1))*(H-2*pad);
  return `<div style="margin-top:14px">
    <svg class="chartbig" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
      <path d="${sparkPath(pts,W,H,pad)}" fill="none" stroke="var(--brass)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
      <circle cx="${lastX.toFixed(1)}" cy="${lastY.toFixed(1)}" r="3" fill="var(--brass)"/>
    </svg>
    <div class="small dim" style="display:flex;justify-content:space-between;margin-top:2px">
      <span>min ${bwNum(mn)}</span><span>${arr.length} nap</span><span>max ${bwNum(mx)}</span></div>
  </div>`;
}

/* ---- Haladás fül: testsúly-trend kártya ----------------------------
 * Ugyanabból az `S.bw` naplóból, mint a főoldali kártya és a készenlét
 * `bw` tényezője – NINCS új mező és nincs elmentett trend, mindent a
 * mérésekből számolunk. A főoldalon a MAI szám a lényeg, itt az IRÁNY,
 * ezért hosszabb (90 napos) ablak.
 * Becsületesség: interpoláció nincs, csak a ténylegesen mért napok
 * kerülnek a grafikonra, és a kártya ki is írja, hány mérésből van.
 * Két mérés alatt el sem készül – üres grafikont mutatni rosszabb, mint
 * semmit. A grafikon SORSZÁM szerint rajzol (mint a többi az appban), a
 * meredekség viszont VALÓDI NAPOKKAL számol, hogy a ritkább mérés ne
 * torzítsa a kg/hét értéket. */
const BW_PROG_DAYS=90;
function bwTs(k){ return new Date(k+'T00:00:00').getTime(); }
// Egyenes-illesztés a mért napokra → kg/hét. 5 mérés alatt null:
// kevés pontból nem mondunk irányt.
function bwSlopeWeek(arr){
  if(arr.length<5) return null;
  const x0=bwTs(arr[0].d);
  const pts=arr.map(e=>({x:(bwTs(e.d)-x0)/864e5, y:e.kg}));
  const n=pts.length;
  const mx=pts.reduce((a,p)=>a+p.x,0)/n, my=pts.reduce((a,p)=>a+p.y,0)/n;
  let num=0, den=0;
  pts.forEach(p=>{ num+=(p.x-mx)*(p.y-my); den+=(p.x-mx)*(p.x-mx); });
  if(!den) return 0;
  return (num/den)*7;
}
// Irány-nyíl. SZÁNDÉKOSAN semleges színnel: az app nem tudja, hogy a
// felhasználó fogyni vagy hízni akar – a nyíl az irányt mondja, nem ítél.
function bwArrow(v){ const x=Math.round(v*10)/10;
  return x>0 ? '▲ +'+bwNum(x) : x<0 ? '▼ −'+bwNum(-x) : '▬ 0'; }
// Egy sor a testsúly-kártya összegzőjében (címke balra, szám jobbra).
function bwProgRow(lbl, val){
  return `<div class="row" style="padding:9px 0;border-top:1px solid var(--line)">
    <span class="small grow">${esc(lbl)}</span>
    <span class="num" style="font-weight:700">${val}</span></div>`;
}
function bwProgCard(){
  const all=bwEntries(); if(all.length<2) return '';
  const arr=all.filter(e=>bwTs(e.d) >= Date.now()-BW_PROG_DAYS*864e5);
  if(arr.length<2) return '';
  const pts=arr.map(x=>x.kg), W=300, H=96, pad=10;
  const mn=Math.min(...pts), mx=Math.max(...pts), cur=pts[pts.length-1];
  const lastY=(H-pad)-((cur-mn)/((mx-mn)||1))*(H-2*pad);
  const spanD=Math.round((bwTs(arr[arr.length-1].d)-bwTs(arr[0].d))/864e5)+1;
  const net=Math.round((cur-pts[0])*10)/10;
  // 7 napos átlag az előző 7 naphoz – ugyanaz az elv, mint a készenlét
  // `bw` tényezőjénél, hogy a két felület ugyanazt a „trendet" értse.
  const end=rdyDayStart(Date.now())+864e5;
  const mean=(a,b)=>{ const v=all.filter(e=>{ const x=bwTs(e.d); return x>=a && x<b; }).map(e=>e.kg);
    return v.length ? v.reduce((p,q)=>p+q,0)/v.length : null; };
  const w1=mean(end-7*864e5,end), w0=mean(end-14*864e5,end-7*864e5);
  const slope=bwSlopeWeek(arr);
  const slopeTxt = slope==null ? ''
    : Math.abs(slope)<0.1 ? tr('nagyjából stabil') : bwArrow(slope)+' '+tr('kg/hét');
  return `<div class="card"><div class="pad">
    <div class="row" style="align-items:baseline"><span class="eyebrow grow">${tr('Testsúly')} · ${tr('{n} nap', {n:spanD})}</span>
      <span class="num" style="font-size:17px;font-weight:700;color:var(--brass)">${bwNum(cur)} kg</span></div>
    <p class="mut small" style="margin:4px 0 0">${tr('Csak a ténylegesen mért napok')} · ${tr('{n} mérés', {n:arr.length})}</p>
    <div style="margin-top:10px">
      <svg class="chartbig" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
        <path d="${sparkPath(pts,W,H,pad)}" fill="none" stroke="var(--brass)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
        <circle cx="${W}" cy="${lastY.toFixed(1)}" r="3" fill="var(--brass)"/>
      </svg>
      <div class="small dim" style="display:flex;justify-content:space-between;margin-top:2px">
        <span>min ${bwNum(mn)}</span>${slopeTxt?`<span>${slopeTxt}</span>`:''}<span>max ${bwNum(mx)}</span></div>
    </div>
    <div style="margin-top:12px">
      ${w1!=null?bwProgRow(tr('7 napos átlag'), bwNum(w1)+' kg'):''}
      ${(w1!=null&&w0!=null)?bwProgRow(tr('Az előző héthez'), bwArrow(w1-w0)+' kg'):''}
      ${bwProgRow(tr('{n} nap alatt', {n:spanD}), bwArrow(net)+' kg')}
    </div>
    <button class="btn" style="margin-top:12px" onclick="openBwSheet()">${tr('Testsúly rögzítése')} ›</button>
  </div></div>`;
}

let bwDraft=0, bwDate='';
function openBwSheet(dateKey){ bwDate=dateKey||bwKey(Date.now());
  const cur=(S.bw||{})[bwDate]; bwDraft = cur>0?cur : (bwLast()?bwLast().kg:75);
  renderBwSheet(); openSheet(); }
function bwStep(d){ bwDraft=Math.max(20,Math.min(300,Math.round((bwDraft+d)*10)/10)); renderBwSheet(); }
function bwSave(){ if(!S.bw)S.bw={}; if(bwDraft>0) S.bw[bwDate]=Math.round(bwDraft*10)/10;
  if(navigator.vibrate) navigator.vibrate(12); save(); closeSheet(); render(); }
function renderBwSheet(){ const el=document.getElementById('sheetIn'); if(el) el.innerHTML=bwSheetHtml(); }
function bwSheetHtml(){
  const isToday = bwDate===bwKey(Date.now());
  const prev = bwLast();
  const e=bwEntries();
  let hist='';
  if(e.length){ hist = `<div style="margin-top:6px">`+
    e.slice(-8).reverse().map(x=>`<div class="histrow" onclick="openBwSheet('${x.d}')" style="cursor:pointer">
      <span class="d">${bwFmtDate(x.d)}${x.d===bwDate?' <span style="color:var(--brass)">•</span>':''}</span>
      <span class="w">${bwNum(x.kg)} kg</span>
      <span class="r">${bwDaysAgo(x.d)}</span></div>`).join('')+`</div>`; }
  return `<div class="grabber"></div>
    <div class="row"><div class="grow"><span class="eyebrow">Napi testsúly</span>
      <h2 style="font-size:24px">${isToday?'Ma':bwFmtDate(bwDate)}</h2>
      <span class="small dim">${prev?'Előző: '+bwNum(prev.kg)+' kg · '+bwDaysAgo(prev.d):'Első bejegyzés'}</span></div>
      <button onclick="closeSheet()" style="font-size:26px;color:var(--dim);padding:0 8px">×</button></div>
    <div class="wt" style="margin-top:14px">
      <button onclick="bwStep(-0.1)" aria-label="kevesebb">−</button>
      <div class="val">${bwNum(bwDraft)}<span>kg</span></div>
      <button onclick="bwStep(0.1)" aria-label="több">+</button></div>
    <div class="toolrow">
      <button class="tool" onclick="bwStep(-1)">−1</button>
      <button class="tool" onclick="bwStep(-0.5)">−0,5</button>
      <button class="tool" onclick="bwStep(0.5)">+0,5</button>
      <button class="tool" onclick="bwStep(1)">+1</button></div>
    ${bwChart()}
    ${hist}
    <button class="btn pri" style="margin-top:14px" onclick="bwSave()">Mentés</button>`;
}

/* ---- Alvás-napló (edzés nélküli napon is) ---------------------------
   Additív mező: S.sleep = { 'YYYY-MM-DD': {min, q} } – perc + minőség(1..5).
   Az edzésadatot NEM érinti; a felhő-szinkron per-kulcs unióban viszi
   (auth.js 'sleep'). A natív Health-behúzást a js/health.js adja, ha a
   Capacitor-híd elérhető; web-en kézi bevitel a fallback. */
const BW_MOON='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>';
function slpEntries(){ const b=S.sleep||{}; return Object.keys(b).filter(k=>b[k]&&b[k].min>0).sort().map(k=>({d:k,min:b[k].min,q:b[k].q||0})); }
function slpLast(){ const e=slpEntries(); return e.length?e[e.length-1]:null; }
function slpToday(){ const v=(S.sleep||{})[bwKey(Date.now())]; return v&&v.min>0?v:null; }
function slpFmt(min){ min=Math.round(min); const h=Math.floor(min/60), m=min%60; return h+'ó'+(m?' '+m+'p':''); }
function slpQLabel(q){ return ['','gyenge','közepes','oké','jó','kiváló'][q]||''; }

function slpMiniSpark(){ const e=slpEntries(); if(e.length<2) return '';
  const pts=e.slice(-14).map(x=>x.min), W=88, H=34;
  return `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="flex:none;color:var(--brass)" aria-hidden="true"><path d="${sparkPath(pts,W,H,5)}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`; }

// Minőség-pöttyök (kitöltött/üres, monokróm – téma-követő).
function slpDots(q){ let s='<span style="display:inline-flex;gap:3px;vertical-align:middle">';
  for(let i=1;i<=5;i++) s+=`<i style="width:7px;height:7px;border-radius:50%;background:${i<=q?'var(--brass)':'var(--line)'}"></i>`;
  return s+'</span>'; }

function sleepHomeCard(){
  const today=slpToday(), e=slpEntries(), last=slpLast();
  let mid;
  if(today){
    mid = `<span class="cond" style="font-size:21px;font-weight:600;display:block">${slpFmt(today.min)} <span class="small dim" style="font-weight:400">ma éjjel</span></span>
      <span class="small dim">${today.q?slpDots(today.q)+' '+slpQLabel(today.q):'rögzítve'}</span>`;
  } else if(last){
    mid = `<span class="cond" style="font-size:21px;font-weight:600;display:block">Alvás</span>
      <span class="small dim">utoljára ${bwDaysAgo(last.d)}: ${slpFmt(last.min)} · koppints a rögzítéshez</span>`;
  } else {
    mid = `<span class="cond" style="font-size:21px;font-weight:600;display:block">Alvás</span>
      <span class="small dim">Rögzítsd az éjszakát – edzés nélküli napon is</span>`;
  }
  return `<div class="card"><button class="daybtn" onclick="openSleepSheet()">
    <span class="daytag" style="color:var(--brass)">${BW_MOON}</span>
    <span class="grow">${mid}</span>
    ${slpMiniSpark()}
    <span style="color:var(--brass);font-size:22px">›</span></button></div>`;
}

function slpChart(){ const e=slpEntries(); if(e.length<2) return '';
  const arr=e.slice(-30), pts=arr.map(x=>x.min), W=300, H=96, pad=10;
  const mn=Math.min(...pts), mx=Math.max(...pts), cur=pts[pts.length-1];
  const lastY=(H-pad)-((cur-mn)/((mx-mn)||1))*(H-2*pad);
  const avg=Math.round(pts.reduce((a,b)=>a+b,0)/pts.length);
  return `<div style="margin-top:14px">
    <svg class="chartbig" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">
      <path d="${sparkPath(pts,W,H,pad)}" fill="none" stroke="var(--brass)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
      <circle cx="${W}" cy="${lastY.toFixed(1)}" r="3" fill="var(--brass)"/>
    </svg>
    <div class="small dim" style="display:flex;justify-content:space-between;margin-top:2px">
      <span>min ${slpFmt(mn)}</span><span>átlag ${slpFmt(avg)}</span><span>max ${slpFmt(mx)}</span></div>
  </div>`;
}

let slpDraft=0, slpQ=0, slpDate='';
function openSleepSheet(dateKey){ slpDate=dateKey||bwKey(Date.now());
  const cur=(S.sleep||{})[slpDate];
  slpDraft = cur&&cur.min>0 ? cur.min : (slpLast()?slpLast().min:450);
  slpQ = cur?cur.q||0 : 0;
  renderSleepSheet(); openSheet(); }
function slpStep(d){ slpDraft=Math.max(0,Math.min(1080,slpDraft+d)); renderSleepSheet(); }
function slpSetQ(q){ slpQ = slpQ===q?0:q; renderSleepSheet(); }
async function slpSync(){
  if(!(window.Health && Health.available())) return;
  const btn=document.getElementById('slpSyncBtn'); if(btn){ btn.disabled=true; btn.textContent='Behúzás…'; }
  try{ const r=await Health.syncSleep();
    if(r && r.ok && r.min>0){ slpDate=r.day||slpDate; slpDraft=r.min; if(r.q) slpQ=r.q; renderSleepSheet(); }
    else uiAlert('Nem érkezett alvásadat az elmúlt éjszakára.');
  }catch(e){ uiAlert('Az alvás behúzása nem sikerült.'); }
}
function slpSave(){ if(!S.sleep)S.sleep={};
  if(slpDraft>0) S.sleep[slpDate]={min:slpDraft, q:slpQ||0};
  if(navigator.vibrate) navigator.vibrate(12); save(); closeSheet(); render(); }
function renderSleepSheet(){ const el=document.getElementById('sheetIn'); if(el) el.innerHTML=sleepSheetHtml(); }
function sleepSheetHtml(){
  const isToday = slpDate===bwKey(Date.now());
  const prev = slpLast();
  const e=slpEntries();
  const canSync = !!(window.Health && Health.available());
  let hist='';
  if(e.length){ hist = `<div style="margin-top:6px">`+
    e.slice(-8).reverse().map(x=>`<div class="histrow" onclick="openSleepSheet('${x.d}')" style="cursor:pointer">
      <span class="d">${bwFmtDate(x.d)}${x.d===slpDate?' <span style="color:var(--brass)">•</span>':''}</span>
      <span class="w">${slpFmt(x.min)}</span>
      <span class="r">${x.q?slpDots(x.q):bwDaysAgo(x.d)}</span></div>`).join('')+`</div>`; }
  return `<div class="grabber"></div>
    <div class="row"><div class="grow"><span class="eyebrow">Alvás</span>
      <h2 style="font-size:24px">${isToday?'Ma éjjel':bwFmtDate(slpDate)}</h2>
      <span class="small dim">${prev?'Előző: '+slpFmt(prev.min)+' · '+bwDaysAgo(prev.d):'Első bejegyzés'}</span></div>
      <button onclick="closeSheet()" style="font-size:26px;color:var(--dim);padding:0 8px">×</button></div>
    ${canSync?`<button id="slpSyncBtn" class="btn" style="margin-top:12px" onclick="slpSync()">Behúzás a Health-ből</button>`:''}
    <div class="wt" style="margin-top:14px">
      <button onclick="slpStep(-15)" aria-label="kevesebb">−</button>
      <div class="val" style="font-size:32px">${slpFmt(slpDraft)}</div>
      <button onclick="slpStep(15)" aria-label="több">+</button></div>
    <div class="toolrow">
      <button class="tool" onclick="slpStep(-60)">−1ó</button>
      <button class="tool" onclick="slpStep(-15)">−15p</button>
      <button class="tool" onclick="slpStep(15)">+15p</button>
      <button class="tool" onclick="slpStep(60)">+1ó</button></div>
    <div class="small dim" style="text-align:center;margin-top:16px">Minőség</div>
    <div class="whyrow" style="justify-content:center;margin-top:8px">
      ${[1,2,3,4,5].map(q=>`<button class="whyc ${slpQ===q?'on':''}" onclick="slpSetQ(${q})">${q}</button>`).join('')}</div>
    ${slpChart()}
    ${hist}
    <button class="btn pri" style="margin-top:14px" onclick="slpSave()">Mentés</button>`;
}

