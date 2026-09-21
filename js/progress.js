/* ==================================================================
   Haladas ful nezete es a gyakorlat-reszletlap (sulygorbe,
   1RM-gorbe, rekordok).
   ================================================================== */
function progView(){
  const ids=[]; const seen=new Set();
  PLAN.forEach(d=>d.ex.forEach(e=>{ seen.add(e.id);
    if(S.sessions.some(s=>s.log[e.id]&&s.log[e.id].sets.some(x=>x!=null))) ids.push(e.id); }));
  S.sessions.forEach(s=>Object.keys(s.log).forEach(id=>{
    if(seen.has(id)||ids.includes(id))return;
    if(s.log[id].sets.some(x=>x!=null)) ids.push(id); }));
  if(!ids.length) return `<div class="wrap"><div class="top"><h1 style="font-size:34px">Haladás</h1></div>
    <div class="empty">Két-három edzés után lesz mit mutatni.</div></div>`;
  const st=progStats();
  // Készenlét-trend: 30 nap. Csak akkor kerül ki, ha legalább néhány napra
  // számolható – a hézagokat a `rdySpark` átugorja, nem hamisítja ki.
  const rHist=rdyHistory(30), rVals=rHist.filter(x=>x.v!=null).map(x=>x.v);
  const rAvg=rVals.length?Math.round(rVals.reduce((a,b)=>a+b,0)/rVals.length):null;
  const rNow=readiness();
  let h=`<div class="wrap"><div class="top"><h1 style="font-size:34px">Haladás</h1></div>
    <div class="card"><div class="pad"><div class="statgrid">
      ${rAvg!=null?`<div class="stat"><span class="num" data-cu="${rAvg}">${rAvg}</span><span class="statlbl">átlag készenlét</span></div>`:''}
      <div class="stat"><span class="num" data-cu="${st.total}">${st.total}</span><span class="statlbl">edzés</span></div>
      <div class="stat"><span class="num" data-cu="${st.streak}">${st.streak}</span><span class="statlbl">hetes sorozat</span></div>
      <div class="stat"><span class="num">${fmtTon(st.tonnage)}</span><span class="statlbl">össztömeg</span></div>
      ${rAvg==null?`<div class="stat"><span class="num" data-cu="${st.month}">${st.month}</span><span class="statlbl">e hónap</span></div>`:''}
    </div></div></div>`;
  if(rVals.length>=5){
    const trend = rVals.length>=10 ? rdyTrendLabel(rHist) : '';
    h+=`<div class="card"><div class="pad">
      <div class="row" style="align-items:baseline"><span class="eyebrow grow">Készenlét · 30 nap</span>
        ${rNow?`<span class="num" style="font-size:17px;font-weight:700;color:${rNow.color}">${rNow.score} ma</span>`:''}</div>
      ${rdySpark(rHist,88)}
      <div class="row small dim" style="justify-content:space-between;margin-top:8px"><span>30 napja</span>${trend?`<span>${trend}</span>`:''}<span>ma</span></div>
      </div></div>`;
  }
  h+=bwProgCard();
  h+=stallCard();
  const WEEKS=16, cols=trainingHeatmap(WEEKS);
  h+=`<div class="card"><div class="pad">
    <span class="eyebrow">Edzésnaptár · utolsó ${WEEKS} hét</span>
    <div class="hmwrap"><div class="hm">`;
  cols.forEach(col=>{ h+=`<div class="hmcol">`;
    col.forEach(c=>{ const lvl=c.sets===0?0:c.sets<5?1:c.sets<10?2:3, op=[0,.4,.7,1][lvl];
      h+=`<span class="hmcell" style="${lvl?`background:var(--brass);opacity:${op}`:''}${c.future?';visibility:hidden':''}"></span>`; });
    h+=`</div>`; });
  h+=`</div></div></div></div>`;
  const wv=weekVolume();
  if(wv.length){
    const mx=Math.max(...wv.map(v=>v.sets));
    const wmap=weeklyMgSets(), missing=MGS.filter(mg=>!wmap[mg]);
    h+=`<div class="card"><div class="pad">
      <span class="eyebrow">Heti terhelés · izomtérkép</span>
      <p class="mut small" style="margin:4px 0 6px">Ezen a héten (hétfőtől) · a színek erőssége a szettszámot mutatja</p>
      ${muscleMap(wmap)}${mmLegend()}
      <div class="small" style="margin:8px 0 12px;text-align:center;color:${missing.length?'var(--mut)':'var(--sage)'}">${missing.length?('Ezen a héten kimaradt: <b>'+missing.map(m=>esc(trmg(m))).join(', ')+'</b>'):'Minden fő izomcsoport kapott terhelést ezen a héten'}</div>`;
    wv.forEach(v=>{ const pct=Math.max(8,Math.round(v.sets/mx*100)), good=v.sets>=10;
      h+=`<div class="mgrow"><span class="mglbl">${esc(trmg(v.mg))}</span>
        <span class="mgtrack"><span class="mgfill" style="--p:${(pct/100).toFixed(4)};background:${good?'var(--sage)':'var(--brass)'}"></span></span>
        <span class="mgval num">${v.sets}</span></div>`; });
    h+=`</div></div>`;
  }
  // Havi aktivitás – utolsó 6 hónap edzésszáma
  const mc=monthlyCounts(6), mcMax=Math.max(1,...mc.map(m=>m.count));
  h+=`<div class="card"><div class="pad">
    <span class="eyebrow">Havi aktivitás · utolsó 6 hónap</span>
    <div style="margin-top:8px">`;
  mc.forEach(m=>{ const pct=m.count?Math.max(6,Math.round(m.count/mcMax*100)):0;
    h+=`<div class="mgrow"><span class="mglbl">${m.label}</span>
      <span class="mgtrack"><span class="mgfill" style="--p:${(pct/100).toFixed(4)};background:var(--brass)"></span></span>
      <span class="mgval num">${m.count}</span></div>`; });
  h+=`</div></div></div>`;
  // Legtöbbet fejlődő gyakorlatok
  const imp=mostImproved(3);
  if(imp.length){
    h+=`<div class="card"><div class="pad">
      <span class="eyebrow">${tr('Erő-fejlődés')}</span>
      <p class="mut small" style="margin:4px 0 10px">${tr('Becsült 1RM – az ismétlés is beleszámít, RPE-vel a tartalék is')}</p>`;
    imp.forEach(x=>{
      // A vonal a gyakorlat SAJÁT tartományán belül skálázódik: a kérdés az
      // alak, nem az, hogy a fekvenyomás nagyobb szám-e, mint az oldalemelés.
      const sp = x.ser.length>1
        ? `<svg width="72" height="26" viewBox="0 0 72 26" style="flex:none;color:var(--sage)" aria-hidden="true">
             <path d="${sparkPath(x.ser,72,26,4)}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
        : '';
      h+=`<button class="row" style="width:100%;padding:8px 0;border-bottom:1px solid var(--line);gap:10px;text-align:left" onclick="openProgDetail('${x.id}','1rm')">
        <span class="grow cond" style="font-weight:600;min-width:0">${esc(trn(x.n))}
          <span class="small dim" style="display:block;font-weight:400">${tr('{n} alkalom', {n:x.times})}</span></span>
        ${sp}
        <span class="small num" style="color:var(--sage);font-weight:700;flex:none">+${kgNum(x.gain)} kg</span></button>`; });
    h+=`</div></div>`;
  }
  // Terv-kontra-valóság: miért tért el
  const wb=whyBreakdown();
  if(wb.total){
    const seg=(nn,lbl)=> nn? `<span class="grow"><div class="num" style="font-size:24px;font-weight:700">${nn}</div><div class="small dim">${lbl}</div></span>`:'';
    h+=`<div class="card"><div class="pad">
      <span class="eyebrow">Miért tért el a tervtől</span>
      <p class="mut small" style="margin:4px 0 10px">A naplózott eltérés-okok összesítve</p>
      <div class="row" style="text-align:center;gap:8px">
        ${seg(wb.time,'kevés idő')}${seg(wb.busy,'gép foglalt')}${seg(wb.heavy,'túl nehéz')}
      </div></div></div>`;
  }
  h+=`<p class="mut small" style="margin:0 2px 8px">Munkasúly gyakorlatonként · koppints a részletekért ›</p>`;
  ids.forEach(id=>{
    const e=exDef(id);
    const pts=S.sessions.filter(s=>s.log[id]&&s.log[id].sets.some(x=>x!=null)).map(s=>s.log[id].w);
    const last=pts[pts.length-1], mn=Math.min(...pts), rng=(Math.max(...pts)-mn)||1;
    const d=sparkPath(pts,100,44,6);
    const ex=pts.length>1? 100 : 50, ey=(44-6)-((last-mn)/rng)*(44-12);
    const delta=last-pts[0];
    h+=`<div class="card pcard" onclick="openProgDetail('${id}')"><div class="pad">
      <div class="row" style="align-items:baseline"><span class="cond grow" style="font-size:19px;font-weight:600">${esc(exN(e))}</span>
      <span class="num" style="font-size:24px;font-weight:700">${wLabel(e,last)}<span class="small dim" style="font-weight:400">${e.bw&&last<=0?'':' kg'}</span></span></div>
      <div class="small ${delta>0?'':'dim'}" style="${delta>0?'color:var(--sage)':''}">${delta>0?'+'+kgNum(delta)+' kg az indulás óta':delta<0?kgNum(delta)+' kg':'változatlan'} · ${pts.length} alkalom</div>
      ${pts.length>1?`<svg class="spark" viewBox="0 0 100 44" preserveAspectRatio="none"><path d="${d}" fill="none" stroke="var(--brass)" stroke-width="1.6" vector-effect="non-scaling-stroke" stroke-linejoin="round"/><circle cx="${ex.toFixed(1)}" cy="${ey.toFixed(1)}" r="2.4" fill="var(--brass)" vector-effect="non-scaling-stroke"/></svg>`:''}
      </div></div>`;
  });
  return h+'</div>';
}

// Egy edzés–gyakorlat metrikája a részletlap görbéjéhez. 'w' = munkasúly;
// 'vol' = térfogat (súly×ismétlés; testsúlyosnál az összes ismétlés).
// Egy edzés legjobb becsült 1RM-je. A szetteket EGYENKÉNT nézzük: RPE-vel
// a legtöbb ismétlésű szett már nem feltétlenül a legjobb (egy 6 @ RPE 7
// többet ér, mint egy 5 @ RPE 10). null, ha egyik szett sem becsülhető.
function sess1RM(L){ if(!L||!(L.w>0)) return null;
  let best=null;
  (L.sets||[]).forEach((r,i)=>{ if(r==null) return;
    const e=est1RM(L.w, r, L.rpe?L.rpe[i]:null);
    if(e!=null && (best==null || e>best)) best=e; });
  return best; }
function progMetric(L, metric){
  if(metric==='vol') return L.w>0 ? L.w*repSum(L.sets) : repSum(L.sets);
  if(metric==='1rm') return sess1RM(L);
  return L.w;
}
// Részletes lap egy gyakorlathoz: nagy grafikon (súly/térfogat) + előzmény.
function openProgDetail(id, metric){
  metric = (metric==='vol'||metric==='1rm') ? metric : 'w';
  const e=exDef(id);
  if(metric==='1rm' && e.bw) metric='w';                  // testsúlyosnál nincs 1RM
  const rows=S.sessions.filter(s=>s.log[id]&&s.log[id].sets.some(x=>x!=null))
    .map(s=>({ t:s.t, L:s.log[id] })).sort((a,b)=>a.t-b.t);
  // A grafikonhoz csak azok az edzések, amelyekhez van érték az adott
  // metrikában (1RM: nem minden edzés becsülhető).
  const chartRows=rows.filter(r=>progMetric(r.L,metric)!=null);
  const pts=chartRows.map(r=>progMetric(r.L,metric));
  const volUnit = e.bw ? ' ism' : ' kg';
  const pr=Math.max(...rows.map(r=>r.L.w));               // a súly-csúcs
  const mn=pts.length?Math.min(...pts):0, rng=(pts.length?Math.max(...pts):0)-mn||1;
  const yOf=p=>(120-10)-((p-mn)/rng)*(120-20);
  const d=chartRows.map((r,i)=>{ const x=chartRows.length>1?i/(chartRows.length-1)*100:50; return (i?'L':'M')+x.toFixed(1)+' '+yOf(pts[i]).toFixed(1); }).join(' ');
  const area=pts.length>1 ? `M0 120 `+chartRows.map((r,i)=>'L'+(i/(chartRows.length-1)*100).toFixed(1)+' '+yOf(pts[i]).toFixed(1)).join(' ')+` L100 120 Z` : '';
  const seg=(k,lbl)=>`<button class="${metric===k?'on':''}" onclick="openProgDetail('${id}','${k}')">${lbl}</button>`;
  let h=`<div class="grabber"></div>
    <div class="row"><div class="grow"><span class="eyebrow">Haladás</span>
      <h2 style="font-size:22px">${esc(exN(e))}</h2>
      <span class="small dim">Csúcs ${wLabel(e,pr)}${e.bw&&pr<=0?'':' kg'} · ${rows.length} alkalom</span>${(()=>{const b=best1RM(id);return b?`<br><span class="small" style="color:var(--brass)">Becsült 1RM ~${b.est} kg <span class="dim">(${b.w}×${b.r})</span></span>`:'';})()}</div>
      <button onclick="closeSheet()" style="font-size:26px;color:var(--dim);padding:0 8px">×</button></div>
    <div class="seg">${seg('w','Súly')}${seg('vol','Térfogat')}${e.bw?'':seg('1rm','1RM')}</div>
    <a class="small" href="${videoUrl(e)}" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;color:var(--brass);text-decoration:none;margin:8px 2px 0">${ICON.video} Technika videó ›</a>
    ${gifBox(e,{w:160})}`;
  if(pts.length>1){
    h+=`<svg class="chartbig" viewBox="0 0 100 120" preserveAspectRatio="none">
      <path d="${area}" fill="var(--brass-d)" opacity=".55"/>
      <path d="${d}" fill="none" stroke="var(--brass)" stroke-width="1.8" vector-effect="non-scaling-stroke" stroke-linejoin="round"/>
      ${chartRows.map((r,i)=>`<circle cx="${(chartRows.length>1?i/(chartRows.length-1)*100:50).toFixed(1)}" cy="${yOf(pts[i]).toFixed(1)}" r="1.9" fill="var(--brass)" vector-effect="non-scaling-stroke"/>`).join('')}
    </svg>`;
  } else if(metric==='1rm'){
    h+=`<div class="empty" style="padding:20px 0">Nincs elég becsülhető edzés (12 ismétlésig).</div>`;
  }
  const volMax=Math.max(...rows.map(r=>progMetric(r.L,'vol')));
  const rmMax=Math.max(...rows.map(r=>sess1RM(r.L)||0));
  h+=`<div style="margin-top:6px">`;
  rows.slice().reverse().forEach(r=>{
    const reps=(r.L.sets||[]).filter(x=>x!=null);
    let main, isPr=false;
    if(metric==='vol'){ const v=progMetric(r.L,'vol'); main=v+volUnit; isPr=v===volMax && v>0; }
    else if(metric==='1rm'){ const v=sess1RM(r.L); main=v!=null?('~'+kgNum(v)+' kg'):'<span class="dim">—</span>'; isPr=v!=null && v===rmMax && v>0; }
    else { main=wLabel(e,r.L.w)+(e.bw&&r.L.w<=0?'':' kg'); isPr=r.L.w===pr && pr>0; }
    h+=`<div class="histrow">
      <span class="d">${fmtDate(r.t)}</span>
      <span class="w">${main}${isPr?' <span class="small" style="color:var(--brass);font-weight:600">CSÚCS</span>':''}</span>
      <span class="r">${reps.length?reps.join(' · '):'—'}</span>
    </div>`;
  });
  h+=`</div>`;
  document.getElementById('sheetIn').innerHTML=h;
  openSheet();
}

