/* ==================================================================
   Gyakorlat- es nap-feloldas (exDef/dayDef), sulyjavaslat,
   progresszios programok (progNext) es stagnalas-felismeres.
   ================================================================== */
// Gyógytorna-gyakorlat feloldása gyakorlat-defként (a mobilitás rutinhoz).
// 1 szett, a REHAB célból származtatott ismétlés/tartás, testsúly, rövid
// váltás-pihenő. Nem naplózandó „edzés" – csak a lejátszóhoz.
function physioExDef(id){
  for(const reg of REHAB){ const e=reg.ex.find(x=>x.id===id); if(!e) continue;
    const parts=String(e.r).split('×'); const reps=(parts[1]||parts[0]||'10').trim();
    return {id:e.id, n:e.n, mg:REGION_MG[reg.id]||'törzs', s:1, r:reps, w:0, rest:20, inc:2.5, bw:1, ...(e.time?{time:1}:{})}; }
  return null;
}
function exDef(id){ for(const d of PLAN) for(const e of d.ex) if(e.id===id) return e;
  if(S.customEx && S.customEx[id]) return S.customEx[id];
  if(LIB[id]) return LIB[id];
  if(id && id.indexOf('rh_')===0){ const p=physioExDef(id); if(p) return p; }
  return ARCHIVE[id] || {id:id,n:id,s:3,r:'10',w:0,rest:90,inc:2.5}; }

/* ---- Gyakorlatnév megjelenítése ------------------------------------ *
 * A `n` mező MAGYARUL él az adatban (PLAN/LIB/ARCHIVE/REHAB) – ez a
 * párosítás (`aiMatchEx`), a saját gyakorlat neve és a mentett adat
 * nyelve, ezért SOHA nem írjuk át. A FELÜLET viszont az `exN()`-en át
 * kéri a nevet, ami angol nyelvnél a szótárból fordít; ami nincs benne
 * (saját `cx_…` gyakorlat), az magára esik vissza.
 * Aki nyers nevet ír adatba (customEx másolás, `dayNoteJoin` legacy
 * `note` mezője, felhő-export), az NE ezt használja. */
function exN(e){ return e && e.n ? tr(e.n) : ''; }
function trn(n){ return n ? tr(n) : ''; }
// Izomcsoport / testtáj megjelenítése. Az `mg` DATA-kulcs (sérülés-mód,
// szűrés) – csak a kiírás fordul.
function trmg(mg){ return mg ? tr(mg) : ''; }
// Nap (edzés) feloldása: beépített PLAN VAGY saját routine VAGY gyógytorna-
// rutin (physio_<testtáj>). A visszaadott alak {id,name,sub,ex:[def,…]}.
function dayDef(id){
  const p=PLAN.find(d=>d.id===id); if(p) return p;
  const r=(S.routines||[]).find(x=>x.id===id);
  if(r) return {id:r.id, name:r.name, sub:r.sub||'', custom:true, at:r.at||0,
    // `exOv`: a routine-hoz kötött ELŐÍRÁS (szett/ism./pihenő/súly), pl. amit
    // az AI edző adott. A gyakorlat-ID és a súlytörténet érintetlen marad –
    // csak ennek a napnak a paraméterei jönnek az előírásból.
    ex:r.ex.map(x=>{ const base=exDef(x), o=(r.exOv||{})[x];
      if(!o) return base;
      const m=Object.assign({}, base, o);
      if(o.w!=null) m.ovW=1;                       // előírt SÚLY jelölése
      return m; }),
    ssLinks:(r.ssLinks||[]).slice()};
  if(id && id.indexOf('physio_')===0){ const reg=REHAB.find(x=>x.id===id.slice(7));
    if(reg) return {id, name:tr('Mobilitás')+' – '+trn(reg.name), sub:'5 perces rutin', custom:true, physio:1, ex:reg.ex.map(e=>physioExDef(e.id))}; }
  return null;
}
// Superset-csoportok származtatása: az `ssLinks`-ben szereplő gyakorlat-ID
// a fölötte lévőhöz kapcsolódik. Egymást követő kapcsolt elemekből egy kör
// (superset) lesz. Csak a 2+ elemű csoportokat adjuk vissza.
function deriveGroups(exIds, links){
  const ls=new Set(links||[]), groups=[]; let cur=null;
  exIds.forEach((id,i)=>{ if(i>0 && ls.has(id) && cur) cur.push(id); else { cur=[id]; groups.push(cur); } });
  return groups.filter(g=>g.length>1);
}
function dayName(s){ const d=dayDef(s.day); return trn((d&&d.name) || s.dayName) || tr('Edzés'); }
// Edzéstervek egységes listája: a beépített Alapterv (ha nincs elrejtve) +
// a saját programok. Ebből választható az aktív terv.
function progById(id){
  if(id==='plan') return {id:'plan', name:'Alapterv · Push / Pull', days:['pa','la','pb','lb'], builtin:true};
  const p=(S.programs||[]).find(x=>x.id===id); return p ? {...p, builtin:false} : null;
}
function programsList(){
  const arr=[]; if(!S.hidePlan) arr.push(progById('plan'));
  (S.programs||[]).forEach(p=>arr.push({...p, builtin:false}));
  return arr;
}
function activeProg(){
  const list=programsList(); if(!list.length) return null;
  let a=list.find(p=>p.id===S.activeProgram); if(!a){ a=list[0]; S.activeProgram=a.id; }
  return a;
}
function setActiveProgram(id){ S.activeProgram=id; save(); render(); window.scrollTo(0,0); }
// Minden választható gyakorlat: beépítettek (PLAN, dedup) + archív + saját.
function exLibrary(){
  const seen=new Set(), out=[];
  PLAN.forEach(d=>d.ex.forEach(e=>{ if(!seen.has(e.id)){ seen.add(e.id); out.push({...e, src:'beépített'}); } }));
  LIB_ARR.forEach(e=>{ if(!seen.has(e.id)){ seen.add(e.id); out.push({...e, src:'könyvtár'}); } });
  Object.values(ARCHIVE).forEach(e=>{ if(!seen.has(e.id)){ seen.add(e.id); out.push({...e, src:'archív'}); } });
  Object.values(S.customEx||{}).forEach(e=>{ if(!seen.has(e.id)){ seen.add(e.id); out.push({...e, src:'saját'}); } });
  return out;
}
function uid(p){ return p+Date.now().toString(36).slice(-4)+Math.random().toString(36).slice(2,6); }
function lastFor(id){ for(let i=S.sessions.length-1;i>=0;i--){ const s=S.sessions[i]; if(s.log[id]) return s.log[id]; } return null; }
// Mikor edzetted utoljára ezt a gyakorlatot (rögzített szettel)? 0 = soha.
// Ebből dől el, hogy az edző előírt súlya még érvényes-e, vagy már a saját
// haladásod viszi tovább.
function lastForT(id){ for(let i=S.sessions.length-1;i>=0;i--){ const s=S.sessions[i];
  const L=s.log[id]; if(L && (L.sets||[]).some(x=>x!=null)) return s.t||0; } return 0; }
// Okos súlyugrás: ha minden szett megvolt, a cél feletti túlteljesítés
// arányában nagyobbat lép (nem fix +inc). Pl. 5-ös célnál 11 ismétlés
// → ~4× lépés.
function smartInc(e,l){
  const t=parseInt(e.r);
  if(!l||!l.sets.length) return e.inc;
  const done = l.sets.length>=e.s && l.sets.every(x=>x!=null && x>=t);
  if(!done) return 0;
  const over = Math.min(...l.sets.filter(x=>x!=null)) - t;
  let mult=1; if(over>=6) mult=4; else if(over>=4) mult=3; else if(over>=2) mult=2;
  return e.inc*mult;
}
// -- Progressziós programok (választható, auditálható szabályok) ------
// Saját implementáció. A következő súlyt MINDIG a naplóból származtatjuk,
// nincs elmentett számláló, ami elcsúszhatna. Policy gyakorlatonként
// állítható (S.prog[id]); alapértelmezés a 'smart' (a régi viselkedés).
const POLICIES=['smart','linear','greyskull','double','off'];
const POLICY_NAME={ smart:'Okos (túlteljesítés-arányos)', linear:'Lineáris', greyskull:'Greyskull LP', double:'Dupla progresszió', off:'Fix (nincs auto)' };
const POLICY_DESC={
  smart:'Ha minden ismétlés megvolt, a cél feletti túlteljesítés arányában lép nagyobbat. Ez az alapértelmezés.',
  linear:'Minden ismétlés megvan minden szettben → +inc. 3 sikertelen edzés után −10% visszaépítés.',
  greyskull:'A záró szett maximumig megy. A célt túllépve +inc (duplázva, ha dupla ismétlés). Egy bukás −10%.',
  double:'Egy ismétlés-tartományban dolgozol azonos súllyal; ha minden szett eléri a tetejét → +inc, ismétlések vissza az aljára.',
  off:'A súly ott marad, ahová állítod – nincs automatikus javaslat.'
};
function progPolicy(id){ const p=S.prog&&S.prog[id]; return POLICIES.indexOf(p)>=0 ? p : 'smart'; }
// Hány egymást követő, LEGUTÓBBI naplózott edzés maradt a cél alatt (deloadhoz).
function failStreak(id){ const e=exDef(id), t=parseInt(e.r)||8; let n=0;
  for(let i=S.sessions.length-1;i>=0;i--){ const L=S.sessions[i].log[id]; if(!L) continue;
    const done=L.sets.length>=e.s && L.sets.every(x=>x!=null&&x>=t); if(done) break; n++; }
  return n; }
/* ---- Stagnálás-felismerés ------------------------------------------
 * A naplóból SZÁRMAZTATOTT állapot – nincs hozzá tárolt mező, ugyanúgy, mint
 * a készenlétnél. Két külön dolgot mond ki, és a szóhasználat is elválasztja:
 *   - „nem jön össze" (fail): az utolsó edzések a cél ALATT maradtak;
 *   - „megakadt" (stall): a munkasúly egy ideje NEM emelkedett.
 * Csak elég adatnál szólal meg (`STALL_MIN` alkalom) – tippelni nem tippel. */
const STALL_MIN=4;        // ennyi naplózott alkalom kell az ítélethez
const STALL_DAYS=21;      // ennyi nap óta változatlan csúcssúly = megakadt

// Egy gyakorlat naplózott alkalmai időrendben.
function exHistory(id){
  const out=[];
  (S.sessions||[]).forEach(s=>{ const L=s.log&&s.log[id];
    if(L && (L.sets||[]).some(x=>x!=null)) out.push({ t:s.t||0, w:L.w||0, L }); });
  return out.sort((a,b)=>(a.t||0)-(b.t||0));
}
// null = nincs mit mondani (kevés adat, vagy megy a dolog).
function stallOf(id){
  const h=exHistory(id); if(h.length<STALL_MIN) return null;
  const fail=failStreak(id);
  if(fail>=3) return { id, state:'fail', fail, days:0, since:fail,
    txt:`${fail} egymás utáni edzésen nem jött össze a cél` };
  // Mikor érted el ELŐSZÖR a mostani csúcssúlyt? Az óta nem emelkedtél.
  let best=-1, bestT=h[0].t;
  h.forEach(x=>{ if(x.w>best){ best=x.w; bestT=x.t; } });
  if(!(best>0)) return null;          // tiszta testsúlyosnál a súly nem mérce
  const days=Math.floor((Date.now()-bestT)/864e5);
  const since=h.filter(x=>x.t>bestT).length;
  if(days>=STALL_DAYS && since>=2) return { id, state:'stall', fail, days, since,
    txt:`${days} napja nem emelkedett a súly (${since} alkalom azóta)` };
  return null;
}
// Minden naplózott gyakorlat átnézve; a ténylegesen bukó esetek elöl.
function stalledList(){
  const ids=new Set();
  (S.sessions||[]).forEach(s=>Object.keys(s.log||{}).forEach(id=>ids.add(id)));
  return [...ids].map(stallOf).filter(Boolean)
    .sort((a,b)=> a.state!==b.state ? (a.state==='fail'?-1:1) : (b.days-a.days||b.since-a.since));
}

// A következő súly + indoklás egy befejezett edzés (L={w,sets}) alapján.
function progNext(id,L){
  const e=exDef(id), inc=e.inc||2.5, t=parseInt(e.r)||8, pol=progPolicy(id);
  if(!L||!L.sets||!L.sets.length){
    const w=(S.weights[id]!=null?S.weights[id]:e.w);
    return {w, delta:0, reason:'Első alkalom – a technika a cél.'};
  }
  const cur=L.w, filled=L.sets.filter(x=>x!=null);
  const allDone=L.sets.length>=e.s && filled.length===L.sets.length && filled.every(x=>x>=t);
  const R=w=>roundTo(w,inc);
  const up=(m,why)=>({w:R(cur+inc*m), delta:inc*m, reason:why});
  const same=why=>({w:cur, delta:0, reason:why});
  const down=why=>{ const w=Math.max(inc,R(cur*0.9)); return {w, delta:w-cur, reason:why}; };
  switch(pol){
    case 'off': return same('Fix súly – nincs automatikus progresszió.');
    case 'linear':
      if(allDone) return up(1, `Lineáris: minden ismétlés megvolt (${t}+) → +${kgNum(inc)} kg.`);
      if(failStreak(id)>=3) return down('Lineáris: 3 sikertelen edzés → −10% visszaépítés.');
      return same('Lineáris: nem lett meg minden – maradj a súlyon, próbáld újra.');
    case 'greyskull': { const lastSet=filled.length?filled[filled.length-1]:0;
      if(lastSet>=2*t) return up(2, `Greyskull: záró szett ${lastSet} ism (≥2×${t}) → +${kgNum(inc*2)} kg.`);
      if(lastSet>=t)   return up(1, `Greyskull: záró szett ${lastSet} ism (≥${t}) → +${kgNum(inc)} kg.`);
      return down(`Greyskull: záró szett ${lastSet} < ${t} → −10%.`); }
    case 'double': { const hi=t, lo=Math.max(1,hi-3);
      if(allDone) return up(1, `Dupla: minden szett elérte a ${hi}-t → +${kgNum(inc)} kg (ismétlések vissza ${lo}-re).`);
      return same(`Dupla: dolgozz ${lo}–${hi} ism között azonos súllyal, amíg mind ${hi} nem lesz.`); }
    default: {
      // Ha VAN RPE az utolsó rögzített szetten, az felülírja a
      // túlteljesítésből való következtetést: az RPE közvetlen jelentés,
      // a `smartInc` csak becslés. RPE nélkül minden marad a régiben.
      const rp=lastRpe(L);
      if(allDone && rp!=null){
        if(rp<=7)   return up(2, `RPE ${rpeNum(rp)} – bőven maradt benned → +${kgNum(inc*2)} kg.`);
        if(rp<=9)   return up(1, `RPE ${rpeNum(rp)} – megvolt, van még tér → +${kgNum(inc)} kg.`);
        return same(`RPE ${rpeNum(rp)} – a cél megvolt, de alig. Maradj a súlyon.`);
      }
      const d=smartInc(e,L);
      if(d>0){ const over=Math.min(...filled)-t; return {w:R(cur+d), delta:d, reason:`Okos: +${over} a célon → +${kgNum(d)} kg.`}; }
      // Egyszer nem jött össze → maradj. HÁROMSZOR egymás után viszont nem
      // „próbáld újra" kérdés: onnan már csak lefelé van hely, ahonnan
      // építkezni lehet. Ugyanaz a −10%, amit a lineáris is ad.
      if(failStreak(id)>=3) return down('Okos: 3 edzés óta nem jön össze a cél → −10% visszaépítés.');
      return same('Okos: nem lett meg minden ismétlés → marad a súly.'); }
  }
}
function startW(id){
  const l=lastFor(id);
  if(l) return Math.max(0, progNext(id,l).w);
  if(S.weights[id]!=null) return S.weights[id];
  return exDef(id).w;
}
// Progressziós szabály választó gyakorlatonként.
function openProgPolicy(id){
  const e=exDef(id), cur=progPolicy(id);
  let h=`<div class="grabber"></div>
    <div class="row"><div class="grow"><span class="eyebrow">Progresszió</span>
      <h2 style="font-size:22px">${esc(exN(e))}</h2>
      <span class="small dim">Hogyan lépjen a súly a következő edzésre</span></div>
      <button onclick="closeSheet()" style="font-size:26px;color:var(--dim);padding:0 8px">×</button></div>`;
  POLICIES.forEach(p=>{
    h+=`<button class="btn" style="text-align:left;margin-top:8px;${p===cur?'border-color:var(--brass)':''}" onclick="setProgPolicy('${id}','${p}')">
      <b>${POLICY_NAME[p]}</b>${p===cur?' <span class="small" style="color:var(--brass)">✓ aktív</span>':''}
      <div class="small dim" style="margin-top:2px;font-weight:400">${POLICY_DESC[p]}</div></button>`;
  });
  document.getElementById('sheetIn').innerHTML=h;
  openSheet();
}
function setProgPolicy(id,p){ if(!S.prog) S.prog={};
  if(p==='smart') delete S.prog[id]; else S.prog[id]=p;   // 'smart' = alapértelmezés, nem tároljuk
  save(); closeSheet(); render(); }
// Egy edzés összterhelése: súly × ismétlés összegezve (testsúlyos szettek
// 0 súllyal szerepelnek, ezért ez a terhelt súlyra fókuszáló, relatív szám).
function sessionLoad(s){ let sum=0; for(const id in s.log){ const l=s.log[id]; const w=l.w>0?l.w:0;
  l.sets.forEach(r=>{ if(r!=null) sum+=w*r; }); } return Math.round(sum); }
function injuryOn(){ return S.injury && S.injury.parts && S.injury.parts.length>0; }
function exAffected(e){ return injuryOn() && S.injury.parts.indexOf(e.mg)>=0; }

