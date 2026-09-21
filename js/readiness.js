/* ==================================================================
   Keszenlet (0..100): a naplobol SZARMAZTATOTT napi szam.
   Tenyezok, gyuru, reszletek-lap, elorejelzes, trend.
   ================================================================== */
/* ---- Készenlét (readiness) ------------------------------------------
 * Egyetlen napi szám (0..100), ami a NAPLÓBÓL SZÁRMAZTATOTT – nincs
 * elmentve, nincs új adatmező (a beállítás-kapcsolókon kívül). Bármely
 * múltbeli napra kiszámolható, csak az addigi adatokból: így a napló és a
 * haladás-grafikon visszamenőleg is helyes.
 *
 * A pontszám a felhasználó SAJÁT alapvonalához mér, nem általános normához:
 * az alvás a saját előző napjaihoz, a heti terhelés a saját 4 hetes
 * átlagához, a testsúly az előző hetéhez. Ezért ha egy tényezőhöz kevés az
 * adat, az NEM nulláz és nem is tippel – kimarad („nincs elég adat"), és a
 * szám a maradékból számol. Ha egyik tényezőhöz sincs adat, NINCS pontszám
 * (a `readiness()` null-t ad, a felület pedig el sem kezdi mutatni) – egy
 * kitalált szám hiteltelenné tenné az egész kezdőlapot.
 */
const RDY_BASE=80;                       // semleges kiindulás; a tényezők ehhez adnak/vesznek
const RDY_DEF=[
  {id:'sleep', n:'Alvás',           s:'Alvás',    on:1},
  {id:'load',  n:'Heti terhelés',   s:'Terhelés', on:1},
  {id:'bw',    n:'Testsúly-trend',  s:'Testsúly', on:1},
  {id:'rest',  n:'Pihenőnapok',     s:'Pihenő',   on:0}
];
function rdyShort(id){ const d=RDY_DEF.find(f=>f.id===id); return (d&&d.s)||id; }
function rdyEnabled(id){ const r=S.rdy||{}, d=RDY_DEF.find(f=>f.id===id);
  return (r && Object.prototype.hasOwnProperty.call(r,id)) ? !!r[id] : !!(d&&d.on); }
function rdyToggle(id){ if(!S.rdy) S.rdy={};
  S.rdy[id]=!rdyEnabled(id); save(); openRdySheet(); render(); }
const rdyClamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
function rdyDayStart(t){ const d=new Date(t); d.setHours(0,0,0,0); return d.getTime(); }

// -- Tényezők. Mind ugyanazt az alakot adja:
//    {id, n, ok, delta, val, why, pct, tone}
//    ok=false → nincs elég adat, delta=0, és a felület „nincs elég adat"-ot ír.
function rdySleep(t){
  const out={id:'sleep',n:'Alvás',ok:false,delta:0,val:'–',why:'Rögzíts néhány éjszakát, és ez is beleszámít.',pct:0,tone:'dim'};
  const all=slpEntries(); if(!all.length) return out;
  const today=bwKey(t), yest=bwKey(t-864e5);
  const cur=all.filter(e=>e.d<=today).slice(-1)[0];
  if(!cur) return out;
  // A rögzített értéket AKKOR IS megmutatjuk, ha még nem tud pontozni – a
  // „nincs adat" hazugság volna, ha ma épp bevitted. Azt írjuk meg, mi hiányzik.
  out.val=slpFmt(cur.min); out.pct=rdyClamp(cur.min/540,0,1);
  if(cur.d!==today && cur.d!==yest){                            // csak friss éjszaka számít
    out.why=`A legutóbbi rögzített éjszakád ${bwDaysAgo(cur.d)} volt – a készenléthez a tegnapi kell.`;
    return out; }
  const prev=all.filter(e=>e.d<cur.d).slice(-14);
  if(prev.length<3){                                            // saját alapvonal nélkül nem mérünk
    const kell=3-prev.length;
    out.why=`Megvan a mai ${slpFmt(cur.min)}. A saját alapvonaladhoz még ${kell} éjszaka kell – addig ez nem mozdítja a pontszámot.`;
    return out; }
  const sorted=prev.map(e=>e.min).sort((a,b)=>a-b);
  const base=sorted.length%2 ? sorted[(sorted.length-1)/2] : (sorted[sorted.length/2-1]+sorted[sorted.length/2])/2;
  let d=(cur.min-base)/60*10;                                   // 1 órányi eltérés ≈ 10 pont
  if(cur.q) d+=(cur.q-3)*2;                                     // a bevallott minőség finomít
  d=rdyClamp(d,-20,12);
  const diff=Math.round(cur.min-base);
  out.ok=true; out.delta=Math.round(d); out.val=slpFmt(cur.min);
  out.pct=rdyClamp(cur.min/540,0,1);
  out.tone = d>=3?'sage' : d<=-3?'red' : 'mut';
  out.why = diff>=10 ? `A szokásos ${slpFmt(base)} helyett ${slpFmt(cur.min)} – ez pluszban van.`
          : diff<=-10 ? `A szokásos ${slpFmt(base)} helyett ${slpFmt(cur.min)} – ennyivel kevesebb.`
          : `A saját ${slpFmt(base)}-os szintedhez képest ez szokásos éjszaka.`;
  return out;
}
function rdyLoad(t){
  const out={id:'load',n:'Heti terhelés',ok:false,delta:0,val:'–',why:'Pár hét edzés után lesz mihez mérni.',pct:0,tone:'dim'};
  const day=rdyDayStart(t)+864e5;                    // az adott nap VÉGÉIG
  const setsIn=(from,to)=>S.sessions.reduce((a,s)=>
    (s.t>=from && s.t<to) ? a+Object.values(s.log||{}).reduce((b,L)=>b+(L.sets||[]).filter(x=>x!=null).length,0) : a, 0);
  const week=setsIn(day-7*864e5, day);
  const back=setsIn(day-35*864e5, day-7*864e5);      // 4 hét a megelőző időszakból
  const hist=S.sessions.filter(s=>s.t<day-7*864e5).length;
  // A heti szettszám akkor is látszik, ha még nincs mihez mérni.
  if(week>0){ out.val=week+' szett'; out.pct=0.5; }
  if(hist<2 || back<=0){
    out.why = week>0 ? `Ezen a héten ${week} szett. Az összehasonlításhoz pár hét előzmény kell – addig ez nem mozdítja a pontszámot.`
                     : 'Pár hét edzés után lesz mihez mérni.';
    return out; }
  const avg=back/4;
  const ratio=week/avg;
  const d=rdyClamp(-(ratio-1)*40, -20, 6);
  out.ok=true; out.delta=Math.round(d); out.val=week+' szett';
  out.pct=rdyClamp(ratio/1.6,0,1);
  out.tone = d>=3?'sage' : d<=-3?'brass' : 'mut';
  out.why = ratio>=1.5  ? `Az átlagod ${Math.round(avg)} szett – ez jóval a szokásos fölött van.`
          : ratio>=1.15 ? `Az átlagod ${Math.round(avg)} szett. A többlet még belefér, de már fog.`
          : ratio<=0.6  ? `Az átlagod ${Math.round(avg)} szett – most jóval alatta vagy, bőven van hely.`
          : ratio<=0.85 ? `Az átlagod ${Math.round(avg)} szett – most alatta vagy, van hely.`
          : `Az átlagod ${Math.round(avg)} szett – a héten pont a szokásos tempóban vagy.`;
  return out;
}
function rdyBw(t){
  const out={id:'bw',n:'Testsúly-trend',ok:false,delta:0,val:'–',why:'Néhány napi méréssel indul a trend.',pct:0,tone:'dim'};
  const all=bwEntries(); if(!all.length) return out;
  const end=rdyDayStart(t)+864e5;
  const mean=(from,to)=>{ const v=all.filter(e=>{ const x=new Date(e.d+'T00:00:00').getTime(); return x>=from&&x<to; }).map(e=>e.kg);
    return v.length ? {m:v.reduce((a,b)=>a+b,0)/v.length, n:v.length} : null; };
  const cur=mean(end-7*864e5,end), prev=mean(end-14*864e5,end-7*864e5);
  // A legutóbbi mért súlyt akkor is kiírjuk, ha a TRENDHEZ még kevés a mérés.
  const lastE=all.filter(e=>new Date(e.d+'T00:00:00').getTime()<end).slice(-1)[0];
  if(lastE){ out.val=bwNum(lastE.kg)+' kg'; out.pct=0.5; }
  if(!cur || !prev || cur.n<2 || prev.n<2){
    out.why = !cur ? 'Ezen a héten még nincs mérés – a trendhez hetente legalább kettő kell.'
      : (cur.n<2 ? `Megvan ${lastE?bwNum(lastE.kg)+' kg':'a mérés'}. A trendhez ezen a héten még legalább egy mérés kell.`
                 : 'A trendhez az előző hétről is legalább két mérés kell – pár nap, és összeáll.');
    return out; }
  const pct=(cur.m-prev.m)/prev.m*100;
  // Csak a GYORS fogyást büntetjük (alultápláltság jele); a stabil és a lassú
  // változás nem húz le – a hízás sem, mert az önmagában nem készenlét-kérdés.
  let d=0;
  if(pct<=-1.5) d=-8; else if(pct<-0.6) d=-8*((-pct)-0.6)/0.9;
  out.ok=true; out.delta=Math.round(d); out.val=bwNum(cur.m)+' kg';
  out.pct=rdyClamp(0.5+pct/6,0,1);
  out.tone = d<=-3?'red':'mut';
  const dk=Math.abs(cur.m-prev.m);
  out.why = d<=-3 ? `Egy hét alatt ${bwNum(dk)} kg-ot fogytál – ez a regenerációt is viszi.`
          : dk<=0.4 ? `Két hete stabil ${bwNum(dk)} kg-on belül – ez nem húz le.`
          : `Heti ${bwNum(dk)} kg elmozdulás – normál ingadozás.`;
  return out;
}
function rdyRest(t){
  const out={id:'rest',n:'Pihenőnapok',ok:false,delta:0,val:'–',why:'Az első edzés után számolható.',pct:0,tone:'dim'};
  const day=rdyDayStart(t);
  const prev=S.sessions.filter(s=>s.t<day+864e5).map(s=>s.t);
  if(!prev.length) return out;
  const days=Math.floor((day-rdyDayStart(Math.max(...prev)))/864e5);
  let d;
  if(days<=0) d=-5; else if(days===1) d=0; else if(days<=2) d=4; else if(days<=5) d=6; else if(days<=9) d=2; else d=-6;
  out.ok=true; out.delta=d; out.val=days<=0?'ma is':days+' nap';
  out.pct=rdyClamp(days/5,0,1);
  out.tone = d>=3?'sage' : d<=-3?'red' : 'mut';
  out.why = days<=0 ? 'Ma már volt edzés – két kemény nap egymás után ritkán jön be.'
          : days>=10 ? `${days} napja nem edzettél – a visszaépítés is terhelés.`
          : days>=3 ? `${days} napja pihensz – kipihentnek számítasz.`
          : `${days} nap telt el a legutóbbi edzés óta.`;
  return out;
}
const RDY_FN={sleep:rdySleep, load:rdyLoad, bw:rdyBw, rest:rdyRest};

// A nap készenléte. `t` bármely időpont lehet (múltbeli napokra is jó).
// Visszatérés: null, ha egyetlen bekapcsolt tényezőhöz sincs adat.
let _rdyCache=new Map();
function rdyInvalidate(){ _rdyCache=new Map(); }
function readiness(t){
  t = t || Date.now();
  const ck=rdyDayStart(t)+'|'+JSON.stringify(S.rdy||null);
  if(_rdyCache.has(ck)) return _rdyCache.get(ck);
  const r=_readiness(t); _rdyCache.set(ck,r); return r;
}
function _readiness(t){
  const factors = RDY_DEF.map(f=>{ const r=RDY_FN[f.id](t); r.on=rdyEnabled(f.id); return r; });
  const live = factors.filter(f=>f.on && f.ok);
  if(!live.length) return null;
  const score = rdyClamp(Math.round(RDY_BASE + live.reduce((a,f)=>a+f.delta,0)), 0, 100);
  return { score, factors, live:live.length, ...rdyBand(score) };
}
// Sávok. A színek téma-tokenek, nem fix hexek.
function rdyBand(s){
  if(s>=78) return {band:'jo',   label:'jó',       color:'var(--sage)',
    verdict:'Ma mehet <b>nehéz nap</b>.', hint:'tartsd a tervezett súlyt' };
  if(s>=65) return {band:'kozep',label:'közepes',  color:'var(--brass)',
    verdict:'Ma <b>a tervezett</b> terhelés fér bele.', hint:'tartsd a súlyt, de ne hajszold a plusz ismétlést' };
  return       {band:'alacsony',label:'alacsony', color:'var(--red)',
    verdict:'Ma inkább <b>könnyű nap</b>.', hint:'vegyél vissza a súlyból, vagy csak technikázz' };
}
// Készenlét-gyűrű (SVG). `size` px, `v` a pontszám.
function rdyRing(v, color, size, thick){
  size=size||150; thick=thick||9;
  const R=52, C=2*Math.PI*R, off=(C*(1-rdyClamp(v,0,100)/100)).toFixed(1);
  return `<svg viewBox="0 0 120 120" class="rdyring" style="width:${size}px;height:${size}px" aria-hidden="true">
    <circle cx="60" cy="60" r="${R}" fill="none" stroke="var(--card2)" stroke-width="${thick}"/>
    <circle class="rdy-fg" cx="60" cy="60" r="${R}" fill="none" stroke="${color}" stroke-width="${thick}"
      stroke-linecap="round" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${off}"/></svg>`;
}
const RDY_TONE={sage:'var(--sage)',brass:'var(--brass)',red:'var(--red)',mut:'var(--mut)',dim:'var(--dim)'};
function rdySign(d){ return (d>0?'+':d<0?'−':'±')+Math.abs(d); }

// Főoldali kártya: a gyűrű, az ítélet és a bekapcsolt tényezők egy sorral.
function rdyHomeCard(){
  const r=readiness(); if(!r) return '';
  return `<div class="card rdycard"><div class="pad">
    <div style="text-align:center">
      <span class="eyebrow">Mai készenlét</span>
      <div class="rdyhero">${rdyRing(r.score, r.color, 168)}
        <span class="rdyval"><span class="num" data-cu="${r.score}" style="color:${r.color}">${r.score}</span>
          <span class="rdylbl">${r.label}</span></span></div>
      <div class="rdyverdict">${r.verdict}</div>
    </div>
    <div class="rdyrows">${r.factors.filter(f=>f.on).map(f=>`
      <div class="rdyrow"><span class="rdyname">${esc(rdyShort(f.id))}</span>
        <span class="rdybar"><span style="--p:${(f.ok?f.pct:0).toFixed(4)};background:${RDY_TONE[f.tone]}"></span></span>
        <span class="num rdynum"${f.ok?'':' style="color:var(--dim)"'}>${esc(f.val)}</span></div>`).join('')}</div>
    <button class="btn" style="margin-top:12px;color:var(--mut)" onclick="openRdySheet()">Miből jön ez a szám?</button>
  </div></div>`;
}

// Részletek-lap: tényezőnkénti hozzájárulás, 14 napos trend, kapcsolók.
function openRdySheet(){
  const r=readiness();
  let h=`<div class="grabber"></div>
    <div class="row"><div class="grow"><span class="eyebrow">Készenlét</span>
      <h2 style="font-size:24px">Miből jön a szám?</h2></div>
      <button onclick="closeSheet()" style="font-size:26px;color:var(--dim);padding:0 8px">×</button></div>`;
  if(!r){
    h+=`<div class="empty">Még nincs elég adat. Rögzíts pár éjszaka alvást vagy edz egy-két hetet – utána megjelenik.</div>`;
  } else {
    h+=`<div style="text-align:center;margin-top:10px">
      <div class="rdyhero" style="--rdy-size:132px">${rdyRing(r.score, r.color, 132)}
        <span class="rdyval"><span class="num" style="font-size:46px;color:${r.color}">${r.score}</span>
          <span class="rdylbl">${r.label}</span></span></div>
      <p class="small mut" style="margin:10px 4px 0">A pontszám a SAJÁT alapvonaladhoz mér – nem egy általános normához. ${RDY_BASE} a semleges kiindulás, a tényezők ehhez adnak vagy vesznek.</p></div>
      <div class="card" style="margin-top:14px"><div class="pad" style="padding:2px 16px">`;
    r.factors.filter(f=>f.on).forEach((f,i)=>{
      h+=`${i?'<div class="rdysep"></div>':''}<div style="padding:14px 0">
        <div class="row" style="align-items:baseline;gap:10px">
          <span class="eyebrow grow">${esc(tr(f.n))}</span>
          <span class="num" style="font-size:19px;font-weight:700${f.ok?'':';color:var(--dim)'}">${esc(f.val)}</span>
          <span class="num" style="font-size:15px;font-weight:700;width:36px;text-align:right;color:${f.ok?RDY_TONE[f.tone]:'var(--dim)'}">${f.ok?rdySign(f.delta):'–'}</span></div>
        <span class="rdybar" style="margin-top:9px"><span style="--p:${(f.ok?f.pct:0).toFixed(4)};background:${RDY_TONE[f.tone]}"></span></span>
        <div class="small mut" style="margin-top:7px">${f.ok?'':'<b style="color:var(--dim)">Még nem számít bele.</b> '}${esc(f.why)}</div></div>`;
    });
    h+=`</div></div>`;
    const hist=rdyHistory(14);
    if(hist.filter(x=>x.v!=null).length>=3){
      const vals=hist.filter(x=>x.v!=null).map(x=>x.v);
      const avg=Math.round(vals.reduce((a,b)=>a+b,0)/vals.length);
      h+=`<div class="top" style="padding:16px 0 6px"><div class="row">
        <span class="eyebrow grow">Utolsó 14 nap</span>
        <span class="small mut">átlag <b class="num" style="color:var(--ink)">${avg}</b></span></div></div>
        <div class="card"><div class="pad">${rdySpark(hist, 92)}
        <div class="row small dim" style="margin-top:8px"><span class="grow">2 hete</span><span>ma</span></div></div></div>`;
    }
  }
  h+=`<div class="top" style="padding:16px 0 6px"><span class="eyebrow">Mi számítson bele?</span></div>
    <div class="whyrow" style="flex-wrap:wrap">`+
    RDY_DEF.map(f=>`<button class="whyc ${rdyEnabled(f.id)?'on':''}" onclick="rdyToggle('${f.id}')">${esc(tr(f.n))}</button>`).join('')
    +`</div>
    <p class="small dim" style="margin:10px 2px 0">Kikapcsolhatod bármelyiket – a szám akkor a maradékból számol. Ez csak a pontszámot érinti, a naplóadatot soha.</p>`;
  document.getElementById('sheetIn').innerHTML=h;
  openSheet();
}

// Holnapi előrejelzés az edzés-összegzőhöz. A mai edzés már a naplóban van,
// ezért a `readiness(holnap)` automatikusan beleszámolja a heti terhelésbe.
// Az alvás holnapra ismeretlen – ezt jelezzük is, nem tesszük úgy, mintha
// tudnánk. A leginkább terhelt izomcsoportot pihenő-javaslattal kísérjük.
function rdyForecastCard(sess, mgSets){
  const r=readiness(Date.now()+864e5); if(!r) return '';
  const top=Object.keys(mgSets||{}).sort((a,b)=>mgSets[b]-mgSets[a])[0];
  const n=top?mgSets[top]:0;
  const rest = n>=12 ? '2 nap' : n>=6 ? '1 nap' : null;
  const tip = rest ? `A mai ${n} szett után a <b>${esc(top)}</b> ${rest} pihenőt kér.` : '';
  const next = r.band==='jo' ? 'Holnap is belefér egy teljes edzés.'
             : r.band==='kozep' ? 'Holnap egy másik izomcsoport a jó választás.'
             : 'Holnap inkább pihenő vagy könnyű nap.';
  return `<div class="card" style="margin-top:14px;border-color:var(--brass)"><div class="pad">
    <span class="eyebrow" style="color:var(--brass)">Holnapi készenlét — előrejelzés</span>
    <div class="row" style="align-items:center;gap:14px;margin-top:10px">
      <span class="rdyhero" style="flex:none">${rdyRing(r.score, r.color, 84, 10)}
        <span class="rdyval"><span class="num" style="font-size:30px;color:${r.color}">${r.score}</span></span></span>
      <span class="small mut grow">${tip} ${next}<br><span class="dim">${esc(r.label)} készenlét</span></span></div>
    <div class="small dim" style="margin-top:8px">A holnapi alvás még nem ismert – ez a mai terhelésből számolt becslés.</div>
  </div></div>`;
}

// Trend-felirat a készenlét-görbéhez. Egyenes illesztése (legkisebb négyzetek)
// a NAPOKRA – így a görbe közepén lévő gödör nem billenti meg a feliratot úgy,
// ahogy az átlag-felezés tenné.
function rdyTrendLabel(rows){
  const pts=rows.map((r,i)=>({x:i,y:r.v})).filter(p=>p.y!=null);
  if(pts.length<5) return '';
  const n=pts.length, mx=pts.reduce((a,p)=>a+p.x,0)/n, my=pts.reduce((a,p)=>a+p.y,0)/n;
  let num=0, den=0;
  pts.forEach(p=>{ num+=(p.x-mx)*(p.y-my); den+=(p.x-mx)*(p.x-mx); });
  if(!den) return 'nagyjából egyenletes';
  const total=(num/den)*(pts[n-1].x-pts[0].x);      // a teljes szakaszra vetített változás
  return total>=4 ? 'lassan emelkedik' : total<=-4 ? 'lassan csökken' : 'nagyjából egyenletes';
}

// Az elmúlt n nap készenléte (null ott, ahol nem számolható).
function rdyHistory(n){
  const out=[], today=rdyDayStart(Date.now());
  for(let i=n-1;i>=0;i--){ const t=today-i*864e5+12*36e5; const r=readiness(t);
    out.push({t, v:r?r.score:null}); }
  return out;
}
// Készenlét-vonal. A hézagokat (null) átugorja, nem húz rajtuk keresztül.
function rdySpark(rows, hgt){
  hgt=hgt||92;
  const pts=rows.map((x,i)=>({i, v:x.v}));
  const vals=pts.filter(p=>p.v!=null).map(p=>p.v);
  if(vals.length<2) return '';
  const mn=Math.min(...vals), mx=Math.max(...vals), rng=(mx-mn)||1;
  const X=i=>(pts.length>1 ? i/(pts.length-1)*100 : 50);
  const Y=v=>84-(v-mn)/rng*70;
  let d='', open=false;
  pts.forEach(p=>{ if(p.v==null){ open=false; return; }
    d+=(open?'L':'M')+X(p.i).toFixed(1)+' '+Y(p.v).toFixed(1)+' '; open=true; });
  const last=[...pts].reverse().find(p=>p.v!=null);
  const col=rdyBand(last.v).color;
  return `<svg viewBox="0 0 100 94" preserveAspectRatio="none" class="rdyspark" style="height:${hgt}px">
    <path d="${d.trim()}" fill="none" stroke="${col}" stroke-width="2" stroke-linecap="round"
      stroke-linejoin="round" vector-effect="non-scaling-stroke"/>
    <circle cx="${X(last.i).toFixed(1)}" cy="${Y(last.v).toFixed(1)}" r="2.4" fill="${col}" vector-effect="non-scaling-stroke"/></svg>`;
}

// Megakadt gyakorlatok. Csak akkor kerül ki, ha VAN mit mondani – üres
// „minden rendben" kártyával nem foglalunk helyet a Haladás fülön.
function stallCard(){
  const list=stalledList(); if(!list.length) return '';
  let h=`<div class="card"><div class="pad">
    <span class="eyebrow">${tr('Megakadt gyakorlatok')}</span>
    <p class="mut small" style="margin:4px 0 10px">${tr('A naplóból, súly és ismétlés alapján. Koppints a részletekért.')}</p>`;
  list.slice(0,6).forEach(x=>{ const e=exDef(x.id), fail=x.state==='fail';
    h+=`<button class="btn" style="text-align:left;margin-bottom:8px" onclick="openProgDetail('${x.id}')">
      <span style="font-weight:600">${esc(exN(e))}</span>
      <span class="small" style="display:block;margin-top:2px;color:var(--${fail?'red':'brass'})">${esc(x.txt)}</span>
      <span class="small dim" style="display:block;margin-top:2px">${fail
        ? 'A progresszió innen −10% visszaépítést ajánl – onnan újra fel.'
        : 'Érdemes lehet más progressziót választani, vagy 2–3 hétre lecserélni a mozgást.'}</span></button>`; });
  if(list.length>6) h+=`<div class="small dim">…és további ${list.length-6}.</div>`;
  return h+`</div></div>`;
}
