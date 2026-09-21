/* ==================================================================
   Szamitasok a Haladas fulhoz: terfogat, szint/XP, becsult 1RM,
   edzes-heatmap es a sparkline-rajzolo.
   ================================================================== */
// Egy szett-tömb rögzített (nem null) ismétléseinek összege.
function repSum(sets){ return (sets||[]).reduce((a,x)=>a+(x!=null?x:0),0); }
// Egy edzés–gyakorlat "térfogata" kg-ban: súly × összes ismétlés. Testsúlyos
// (w<=0) gyakorlatnál kg-ban 0 volna, ezért ott az ismétlésszám a mérőszám.
function exVolume(L){ return L.w>0 ? L.w*repSum(L.sets) : 0; }
// A hét (hétfő 00:00) időbélyege – a hetes sorozat számításához.
function weekStart(t){ const d=new Date(t); d.setHours(0,0,0,0); const wd=(d.getDay()+6)%7; d.setDate(d.getDate()-wd); return d.getTime(); }

// Összegző statisztikák a Haladás fül fejlécéhez.
function progStats(){
  const now=new Date(), ym=now.getFullYear()+'-'+now.getMonth();
  let month=0, tonnage=0;
  S.sessions.forEach(s=>{
    const d=new Date(s.t); if(d.getFullYear()+'-'+d.getMonth()===ym) month++;
    Object.values(s.log).forEach(L=>{ tonnage+=exVolume(L); });
  });
  const weeks=[...new Set(S.sessions.map(s=>weekStart(s.t)))].sort((a,b)=>b-a);
  let streak=0; if(weeks.length){ streak=1; for(let i=1;i<weeks.length;i++){ if(weeks[i-1]-weeks[i]===7*864e5) streak++; else break; } }
  return { total:S.sessions.length, month, streak, tonnage };
}
// Össztömeg emberi alakja: 1 t felett tonnában, egyébként kg-ban.
function fmtTon(kg){ return kg>=1000 ? (kg/1000).toFixed(kg>=10000?0:1).replace('.',',')+' t' : Math.round(kg)+' kg'; }

// -- Szint / XP (streak-fókusz) ---------------------------------------
// Az XP-t a naplóból származtatjuk (nincs elmentett számláló). A fő hajtóerő
// a rendszeresség: hány aktív hét volt összesen, a valaha volt leghosszabb és
// a jelenlegi hetes sorozat; kis alap edzésenként. A szintgörbe egyre lassul.
function levelInfo(sessions){
  sessions = sessions || S.sessions || [];
  const weeks = [...new Set(sessions.map(s=>weekStart(s.t)))].sort((a,b)=>a-b);
  let best=0, run=0, prev=null;
  weeks.forEach(w=>{ run = (prev!=null && w-prev===7*864e5) ? run+1 : 1; prev=w; if(run>best) best=run; });
  const desc=[...weeks].sort((a,b)=>b-a); let cur=0;
  if(desc.length){ cur=1; for(let i=1;i<desc.length;i++){ if(desc[i-1]-desc[i]===7*864e5) cur++; else break; } }
  const xp = weeks.length*30 + best*60 + cur*60 + sessions.length*5;
  let level=1, need=100, into=xp;
  while(into>=need){ into-=need; level++; need=Math.round(need*1.25); }
  return { level, xp, into, need, pct:Math.round(into/need*100), cur, best, weeksActive:weeks.length };
}
// Rang-cím szint szerint (íz, streak-témában).
function levelTitle(lvl){
  const T=['Újonc','Rendszeres','Kitartó','Elszánt','Acélos','Veterán','Legenda'];
  return T[Math.min(T.length-1, Math.floor((lvl-1)/3))];
}
function levelCard(){
  const L=levelInfo();
  return `<div class="card" style="border-color:var(--brass)"><div class="pad">
    <div class="row" style="align-items:center">
      <div class="grow"><span class="eyebrow" style="color:var(--brass)">Szint · ${esc(levelTitle(L.level))}</span>
        <div class="small mut" style="margin-top:2px">Jelenlegi sorozat: ${L.cur} hét · csúcs ${L.best} · ${L.weeksActive} aktív hét</div></div>
      <span class="num" style="font-size:40px;font-weight:700;color:var(--brass);line-height:1">${L.level}</span></div>
    <div class="mgtrack" style="margin-top:12px"><span class="mgfill" style="--p:${(L.pct/100).toFixed(4)};background:var(--brass)"></span></div>
    <div class="small dim" style="margin-top:6px;text-align:right">${L.into} / ${L.need} XP a következő szintig</div>
  </div></div>`;
}

/* Becsült 1RM egy szettből (Epley: w·(1+r/30)). 1 ismétlés = maga a mérés.
 * 12 EFFEKTÍV ismétlés felett nem becslünk – ott a képletek szétnyílnak, a
 * szám fantázia lenne. (Standard, közkincs képlet – nem az openGym kódja.)
 *
 * RPE-TUDATOS: ha az adott szetthez van RPE, a tartalék (RIR = 10 − RPE)
 * hozzáadódik az ismétléshez, mintha a szett a határig ment volna. Így az
 * 5 @ RPE 8 (2 maradt) hetes maximumként becsülődik, az 5 @ RPE 10 pedig
 * ötösként – eddig a kettő UGYANAZT az 1RM-et adta, pedig az egyik jóval
 * erősebb teljesítmény.
 * RPE NÉLKÜL minden marad a régiben (a képlet eleve azt feltételezi, hogy
 * a szett a határig ment) – a régi napló becslései nem íródnak át. */
function est1RM(w,r,rpe){ w=+w; r=Math.round(+r);
  if(!(w>0)||!(r>=1)) return null;
  const rir = (rpe!=null && rpe>=1 && rpe<=10) ? (10-rpe) : 0;
  const eff = r + rir;
  if(eff>12) return null;
  if(eff===1) return Math.round(w*10)/10;   // 1 ismétlés = maga a mérés, nem becslés
  return Math.round(w*(1+eff/30)*10)/10; }
// Egy gyakorlat valaha volt legjobb becsült 1RM-je. A szetten belül a súly
// azonos, így a legtöbb ismétlésű (de max 12) szett adja a legjobb becslést.
function best1RM(id){
  let best=null;
  S.sessions.forEach(s=>{ const L=s.log[id]; if(!L||!(L.w>0)) return;
    (L.sets||[]).forEach((r,i)=>{ if(r==null) return;
      const e=est1RM(L.w, r, L.rpe?L.rpe[i]:null);
      if(e!=null&&(!best||e>best.est)) best={est:e,w:L.w,r,t:s.t}; }); });
  return best;
}
// Edzésnaptár-hőtérkép: az utolsó N hét napjai, naponta a rögzített
// szettek számával (0 = pihenőnap). Hétfővel kezdődő oszlopok.
function trainingHeatmap(weeks){
  const perDay={};
  S.sessions.forEach(s=>{ const d=new Date(s.t); d.setHours(0,0,0,0);
    let n=0; Object.values(s.log||{}).forEach(L=>{ n+=(L.sets||[]).filter(x=>x!=null).length; });
    perDay[d.getTime()]=(perDay[d.getTime()]||0)+n; });
  const start=weekStart(Date.now())-(weeks-1)*7*864e5, cols=[], today=Date.now();
  for(let w=0;w<weeks;w++){ const col=[];
    for(let dI=0;dI<7;dI++){ const t=start+w*7*864e5+dI*864e5;
      col.push({t,sets:perDay[t]||0,future:t>today}); }
    cols.push(col); }
  return cols;
}

// Az aktuális hét (hétfőtől) munkaszettjei izomcsoportonként. Egy
// "munkaszett" = egy rögzített (nem null) szett; a gyakorlat `mg` mezője
// dönti el, melyik izomcsoporthoz számít. Ez az edzésminőség jó proxyja
// (a hipertrófiához nagyjából 10+ munkaszett/izom/hét az irányadó).
function weekVolume(){
  const wk=weekStart(Date.now()), acc={};
  S.sessions.forEach(s=>{
    if(weekStart(s.t)!==wk) return;
    Object.keys(s.log||{}).forEach(id=>{
      const filled=(s.log[id].sets||[]).filter(x=>x!=null).length;
      if(!filled) return;
      const mg=exDef(id).mg||'egyéb';
      acc[mg]=(acc[mg]||0)+filled;
    });
  });
  return Object.keys(acc).map(mg=>({mg,sets:acc[mg]})).sort((a,b)=>b.sets-a.sets);
}

// Havi edzésszám az utolsó n hónapra (időrendben, a jelenlegi hónap az utolsó).
const HU_MON=['jan','feb','márc','ápr','máj','jún','júl','aug','szep','okt','nov','dec'];
function monthlyCounts(n){
  const now=new Date(), out=[], idx={};
  for(let i=n-1;i>=0;i--){ const d=new Date(now.getFullYear(), now.getMonth()-i, 1);
    idx[d.getFullYear()+'-'+d.getMonth()]=out.length;
    out.push({label:HU_MON[d.getMonth()], count:0}); }
  S.sessions.forEach(s=>{ const d=new Date(s.t), k=d.getFullYear()+'-'+d.getMonth();
    if(idx[k]!=null) out[idx[k]].count++; });
  return out;
}
/* Egy gyakorlat becsült 1RM-jének idősora, edzésenként egy pont.
 * Csak ott van pont, ahol becsülhető – nincs interpoláció, és a hézagot
 * nem töltjük ki (ugyanaz az elv, mint a testsúly-trendnél). */
function e1rmSeries(id){
  return S.sessions.slice().sort((a,b)=>a.t-b.t)
    .map(s=>({t:s.t, v:sess1RM(s.log&&s.log[id])}))
    .filter(x=>x.v!=null);
}
/* Erő-fejlődés: az első és a legutóbbi BECSÜLT 1RM különbsége.
 * Korábban a MUNKASÚLY-különbséget mutattuk, ami hibás mérce: ha 60 kg ×
 * 5-ről 60 kg × 8-ra jutsz, az nulla fejlődésként jelent meg, pedig az
 * egyértelmű erősödés. Az 1RM-becslés az ismétlést is beszámítja – és ahol
 * van RPE, ott a tartalékot is.
 * Testsúlyos gyakorlat kimarad: ott nincs értelmes 1RM (a `bw` szűrő), nem
 * pedig „nulla fejlődés". Legalább 2 becsülhető alkalom kell. */
function mostImproved(k){
  const out=[];
  const ids=new Set();
  S.sessions.forEach(s=>Object.keys(s.log||{}).forEach(id=>ids.add(id)));
  ids.forEach(id=>{
    const e=exDef(id); if(e.bw) return;
    const ser=e1rmSeries(id); if(ser.length<2) return;
    const gain=Math.round((ser[ser.length-1].v-ser[0].v)*10)/10;
    if(!(gain>0)) return;
    out.push({id, n:exN(e), gain, times:ser.length, ser:ser.map(x=>x.v)});
  });
  return out.sort((a,b)=>b.gain-a.gain).slice(0,k);
}
// Terv-kontra-valóság eltérés-okok összesítése a teljes naplóból.
function whyBreakdown(){
  const c={busy:0,heavy:0,time:0};
  S.sessions.forEach(s=>Object.values(s.log||{}).forEach(L=>{ if(L&&L.why&&c[L.why]!=null) c[L.why]++; }));
  c.total=c.busy+c.heavy+c.time; return c;
}

// A grafikonhoz: pontsor → SVG útvonal (viewBox szélesség×magasság, felső/alsó margó).
function sparkPath(pts,W,H,pad){
  const mn=Math.min(...pts), mx=Math.max(...pts), rng=(mx-mn)||1;
  return pts.map((p,i)=>{ const x=pts.length>1? i/(pts.length-1)*W : W/2;
    const y=(H-pad)-((p-mn)/rng)*(H-2*pad); return (i?'L':'M')+x.toFixed(1)+' '+y.toFixed(1); }).join(' ');
}

