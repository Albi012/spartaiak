/* ==================================================================
   Kesz sablonok (STARTER_*) es az AI-terv importalasa:
   prompt-epites, parser, elonezet, alkalmazas.
   ================================================================== */
/* ================= Kész edzések és tervek (sablonok) ================ *
 * Beépített edzés- és terv-sablonok, kizárólag beépített gyakorlat-ID-kra
 * (PLAN + LIB) hivatkozva. A "Hozzáadás" a felhasználó SAJÁT edzései/tervei
 * közé MÁSOLJA őket (friss r_/p_ ID-vel), így szerkeszthetők és szinkronizálnak.
 */
const STARTER_ROUTINES = {
  fbA:{name:'Teljes test A', ex:['x_squat','bench','x_seatedrow','x_dbpress','plank']},
  fbB:{name:'Teljes test B', ex:['x_rdl','ohp','x_closepd','x_legpress','x_bbcurl']},
  fbC:{name:'Teljes test C', ex:['x_goblet','incdb','row','face','x_pushbar']},
  upA:{name:'Felső A',       ex:['bench','row','ohpdb','pull','curl','push']},
  loA:{name:'Alsó A',        ex:['x_squat','x_rdl','x_legpress','legcurl','x_calfstand']},
  upB:{name:'Felső B',       ex:['ohp','x_seatedrow','incdb','x_cablelat','hammer','french']},
  loB:{name:'Alsó B',        ex:['x_deadlift','x_frontsquat','x_legext','x_hipthrust','x_calfseated']},
  puP:{name:'Tolás nap',     ex:['bench','ohpdb','incdb','lat','push','x_skull']},
  puL:{name:'Húzás nap',     ex:['x_deadlift','pull','row','face','curl','hammer']},
  puLeg:{name:'Láb nap',     ex:['x_squat','x_rdl','x_legpress','legcurl','x_calfstand','plank']},
  s5A:{name:'5×5 A',         ex:['x_squat','bench','row']},
  s5B:{name:'5×5 B',         ex:['x_squat','ohp','x_deadlift']}
};
const STARTER_PROGRAMS = [
  {name:'Kezdő teljes test', sub:'3 nap · A / B / C', days:['fbA','fbB','fbC']},
  {name:'Felső / Alsó',      sub:'4 nap · felső+alsó', days:['upA','loA','upB','loB']},
  {name:'Push / Pull / Láb', sub:'3 nap · PPL', days:['puP','puL','puLeg']},
  {name:'5×5 erő',           sub:'2 nap · A / B', days:['s5A','s5B']}
];
// Egy sablon-routine gyakorlatneveinek listája (előnézethez).
function starterExNames(ex){ return ex.map(id=>exDef(id).n).join(' · '); }

function openStarters(){
  let h=`<div class="grabber"></div>
    <div class="row"><div class="grow"><span class="eyebrow">Sablonok</span>
      <h2 style="font-size:22px">Kész edzések és tervek</h2>
      <span class="small dim">Hozzáadva a saját edzéseid/terveid közé kerülnek – szerkeszthetők.</span></div>
      <button onclick="closeSheet()" style="font-size:26px;color:var(--dim);padding:0 8px">×</button></div>`;
  h+=`<div class="eyebrow" style="margin-top:16px">Edzéstervek</div>`;
  STARTER_PROGRAMS.forEach((p,i)=>{
    const days=p.days.map(d=>STARTER_ROUTINES[d].name).join(' · ');
    h+=`<div class="card"><div class="pad">
      <div class="row" style="align-items:baseline"><span class="cond grow" style="font-size:19px;font-weight:600">${esc(p.name)}</span>
        <span class="small dim">${esc(p.sub)}</span></div>
      <div class="small mut" style="margin:4px 0 10px">${esc(days)}</div>
      <button class="btn pri" onclick="addStarterProgram(${i})">Hozzáadás a terveimhez</button>
    </div></div>`;
  });
  h+=`<div class="eyebrow" style="margin-top:16px">Egyedi edzések</div>`;
  Object.keys(STARTER_ROUTINES).forEach(k=>{
    const r=STARTER_ROUTINES[k];
    h+=`<div class="card"><div class="pad">
      <div class="row" style="align-items:baseline"><span class="cond grow" style="font-size:18px;font-weight:600">${esc(r.name)}</span>
        <span class="small dim">${r.ex.length} gyakorlat</span></div>
      <div class="small mut" style="margin:4px 0 10px">${esc(starterExNames(r.ex))}</div>
      <button class="btn" onclick="addStarterRoutine('${k}')">Hozzáadás az edzéseimhez</button>
    </div></div>`;
  });
  document.getElementById('sheetIn').innerHTML=h;
  openSheet();
}
// Egy sablon-routine másolása a felhasználó saját edzései közé; visszaadja az új ID-t.
function addStarterRoutine(key, silent){
  const r=STARTER_ROUTINES[key]; if(!r) return null;
  const id=uid('r_'); if(!S.routines) S.routines=[];
  S.routines.push({ id, name:r.name, sub:r.ex.length+' gyakorlat', ex:r.ex.slice() });
  if(!silent){ save(); closeSheet(); tab='home'; render(); window.scrollTo(0,0); uiAlert('„'+r.name+'" hozzáadva az edzéseidhez.'); }
  return id;
}
async function addStarterProgram(i){
  const p=STARTER_PROGRAMS[i]; if(!p) return;
  const dayIds=p.days.map(k=>addStarterRoutine(k, true));   // a routine-ok másolása (némán)
  if(!S.programs) S.programs=[];
  S.programs.push({ id:uid('p_'), name:p.name, days:dayIds });
  save(); closeSheet(); tab='home'; render(); window.scrollTo(0,0);
  await uiAlert('„'+p.name+'" terv hozzáadva ('+dayIds.length+' edzéssel).');
}

/* ================= AI-terv importálása =============================== *
 * A felhasználó egy külső AI edzőtől kapott edzéstervet illeszt be; az app
 * egy toleráns parserrel ÚJ saját edzéssé/tervvé alakítja. NEM hív LLM-et
 * (offline, kulcs nélkül), és NEM írja felül a meglévő tervet – additív:
 * a meglévő gyakorlatneveket a könyvtárhoz párosítja (így a súlytörténet
 * összekapcsolódik), az ismeretlenekből saját gyakorlatot (cx_) készít. */
// A kimeneti formátum – az importőr ezt tudja parseolni. NE változtasd az
// alakját anélkül, hogy az aiParsePlan-t is igazítanád.
const AI_FORMAT_BLOCK =
`A választ PONTOSAN ebben a formátumban add, és semmi mást ne írj köré:

NAP: <nap neve>
- <gyakorlat magyar neve> | <szettek>x<ismétlés> | <súly kg vagy: testsúly> | <pihenő mp>
- ...
NAP: <következő nap neve>
- ...

Példa:
NAP: Push A
- Fekvenyomás | 4x5 | 70 | 180
- Tolódzkodás | 4x8 | testsúly | 150
- Oldalemelés | 3x15 | 8 | 60
NAP: Pull A
- Húzódzkodás | 4x6 | +10 | 180
- Hasalva kézisúlyzós evezés | 4x10 | 30 | 120

Szabályok:
- Magyar gyakorlatneveket használj, lehetőleg elterjedt alakban – így az app
  összekapcsolja a meglévő súlytörténetemmel.
- Soronként EGY gyakorlat, mind a négy mező kitöltve, "|" elválasztóval.
  Ne tegyél a sorokba magyarázatot, sorszámot, félkövért vagy zárójeles
  megjegyzést – azok a nevet is elrontják.
- SÚLY: szám kg-ban (pl. 70). Ne írj tartományt ("60-70"), "kb."-t vagy
  százalékot – egy konkrét munkasúlyt adj.
- TESTSÚLYOS gyakorlatnál (húzódzkodás, tolódzkodás, fekvőtámasz, plank...)
  a súly-mező a PLUSZ terhelést jelenti, NEM a testsúlyomat:
  - ha nincs plusz teher, ezt írd: testsúly
  - ha van plusz teher, csak a pluszt írd: +10
  Soha ne írd a súly-mezőbe a saját testsúlyomat.
- PIHENŐ: másodpercben, csak szám (pl. 180).
- Idő-alapú gyakorlatnál (pl. plank) az ismétlés helyére a másodpercet írd:
  3x45.`;

// Izomcsoport-terhelés az elmúlt 28 napban (szett/izomcsoport).
function aiMgBalance(){ const now=Date.now(), acc={};
  (S.sessions||[]).forEach(s=>{ if(now-s.t>28*864e5) return;
    Object.keys(s.log||{}).forEach(id=>{ const n=(s.log[id].sets||[]).filter(x=>x!=null).length; if(!n) return;
      const mg=exDef(id).mg||'egyéb'; acc[mg]=(acc[mg]||0)+n; }); });
  return acc; }

// A naplóból összeállított „rólam" tények – hogy az AI SZEMÉLYRE SZABOTT
// tervet írjon. Csak származtatott összefoglaló (nincs nyers napló-export).
function aiUserContext(){
  const L=[], now=Date.now();
  const act=activeProg();
  if(act){ const days=act.days.map(d=>{const dd=dayDef(d);return dd?dd.name:null;}).filter(Boolean).join(', ');
    L.push(`Jelenlegi terv: ${act.name}${days?' ('+days+')':''}.`); }
  if((S.sessions||[]).length){ const recent=S.sessions.filter(s=>now-s.t<28*864e5).length;
    L.push(`Edzések az elmúlt 4 hétben: ${recent} (összesen ${S.sessions.length}).`); }
  // A testsúlyos gyakorlatnál a tárolt szám a PLUSZ teher – ezt jelöljük is,
  // különben az edző azt hihetné, hogy ennyi a gyakorlat munkasúlya.
  // Név szerint dedupláljuk: több ID viselheti ugyanazt a nevet (pl. `row`
  // és `tbar` is „Hasalva kézisúlyzós evezés") – az edzőnek ugyanaz a
  // gyakorlat két különböző súllyal zavaró volna. A nagyobbat tartjuk meg.
  const wmap=new Map();
  Object.keys(S.weights||{}).filter(id=>S.weights[id]>0).forEach(id=>{
    const e=exDef(id), cur=wmap.get(e.n);
    if(!cur || S.weights[id]>cur.w) wmap.set(e.n, {n:e.n, w:S.weights[id], bw:!!e.bw}); });
  const ws=[...wmap.values()].sort((a,b)=>b.w-a.w).slice(0,8);
  if(ws.length) L.push('Jelenlegi munkasúlyok: '
    +ws.map(x=>`${x.n} ${x.bw?'+'+kgNum(x.w)+' kg plusz teher (testsúlyos)':kgNum(x.w)+' kg'}`).join(', ')+'.');
  const mg=aiMgBalance(), keys=Object.keys(mg);
  if(keys.length){ const sorted=keys.sort((a,b)=>mg[b]-mg[a]);
    const under=MGS.filter(m=>!mg[m]);
    L.push('Izomcsoport-terhelés (28 nap, szett): '+sorted.map(m=>`${m} ${mg[m]}`).join(', ')+'.'
      +(under.length?` Elhanyagolt: ${under.join(', ')}.`:'')); }
  const bl=bwLast(); if(bl){ const e=bwEntries(); let trend='';
    if(e.length>=3){ const d=Math.round((bl.kg-e[Math.max(0,e.length-8)].kg)*10)/10; trend=d?` (${d>0?'+':''}${bwNum(d)} kg az elmúlt hetekben)`:''; }
    L.push(`Testsúly: ${bwNum(bl.kg)} kg${trend}.`); }
  const se=slpEntries(); if(se.length){ const avg=Math.round(se.reduce((a,b)=>a+b.min,0)/se.length);
    L.push(`Átlagos alvás: ${slpFmt(avg)}.`); }
  if(typeof injuryOn==='function' && injuryOn() && S.injury && S.injury.parts && S.injury.parts.length)
    L.push(`Kímélendő testtáj (sérülés-mód): ${S.injury.parts.join(', ')} – ezt kerüld vagy csak óvatosan terheld.`);
  return L;
}

// A teljes, másolható prompt: rólam-kontextus + kitöltendő célok + formátum.
function buildAiPrompt(){
  const ctx=aiUserContext();
  const about = ctx.length ? 'Rólam (az edzésnaplóm alapján):\n- '+ctx.join('\n- ')+'\n\n' : '';
  return `Te vagy a személyi edzőm. Írj nekem SZEMÉLYRE SZABOTT edzéstervet az alábbi adataim alapján.\n\n`
    + about
    + `Kiegészítő infók (kérlek vedd figyelembe – írd át, ami rám igaz):\n`
    + `- Célom: [erő / izomtömeg / fogyás / állóképesség]\n`
    + `- Heti edzésszám: [pl. 3–4]\n`
    + `- Elérhető felszerelés: [pl. teljes terem / otthon kézisúlyzókkal]\n`
    + `- Tapasztalat: [kezdő / haladó]\n\n`
    + `Szempontok: a jelenlegi munkasúlyaimból haladj tovább; pótold az elhanyagolt izomcsoportokat; kerüld a kímélendő területet; adj reális ismétléstartományt és pihenőidőt.\n`
    + `Fontos: az app a megadott számokat SZÓ SZERINT átveszi – az első edzésen pontosan ezzel a súllyal, szett- és ismétlésszámmal indulok, utána a saját haladásom viszi tovább. Ezért olyan súlyt adj, amivel tényleg el tudom kezdeni.\n\n`
    + AI_FORMAT_BLOCK;
}

function aiNorm(s){ return (s||'').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-z0-9]+/g,' ').trim(); }

// Egy gyakorlat-sor értelmezése (pipe-formátum VAGY szabad szöveg).
function aiParseExLine(body){
  let name='', s=3, r='10', w=0, bw=0, rest=90, hasW=false;
  const sr=(str)=>{ const m=str.match(/(\d+)\s*[x×]\s*([0-9]+(?:\s*[-–]\s*[0-9]+)?|amrap|failure|max)/i);
    if(m){ s=parseInt(m[1])||3; r=m[2].replace(/\s+/g,''); return true; } return false; };
  if(body.indexOf('|')>=0){
    const p=body.split('|').map(x=>x.trim());
    name=p[0]||'';
    if(p[1]){ if(!sr(p[1])){ const rr=p[1].match(/\d+/); if(rr) r=rr[0]; } }
    if(p[2]!=null && p[2]!==''){ const wt=p[2].toLowerCase();
      if(/tests|testsuly|bodyweight|\bbw\b|sajat/.test(aiNorm(wt))){ bw=1; w=0; }
      else { const f=parseFloat(p[2].replace(',','.')); if(!isNaN(f)){ w=f; hasW=true; } } }
    if(p[3]){ const rs=p[3].match(/\d+/);
      // Percben megadott pihenő („2 perc") → másodperc. E nélkül a 2 a
      // minimumra (10 mp) csúszna, vagyis 2 perc helyett 10 másodperc lenne.
      if(rs) rest=parseInt(rs[0]) * (/perc|min\b|'/i.test(p[3]) ? 60 : 1); }
  } else {
    sr(body);
    const wm=body.match(/(\d+(?:[.,]\d+)?)\s*kg/i); if(wm){ w=parseFloat(wm[1].replace(',','.')); hasW=true; }
    if(/tests|testsuly|bodyweight|sajat suly/.test(aiNorm(body))){ bw=1; w=0; }
    name=body.replace(/(\d+)\s*[x×]\s*[0-9\-–]+.*/i,'').replace(/\d+(?:[.,]\d+)?\s*kg.*/i,'').replace(/[-–—|@]+\s*$/,'').trim();
    if(!name) name=body.trim();
  }
  name=(name||'').replace(/\s{2,}/g,' ').trim().slice(0,60);
  if(!name) return null;
  return { name, s:Math.max(1,Math.min(12,s)), r:(r||'10').toString().slice(0,12), w:Math.max(0,w), bw, rest:Math.max(10,Math.min(600,rest)), hasW };
}

// Teljes terv értelmezése napokra + gyakorlatokra. Soha nem dob.
function aiParsePlan(text){
  const lines=(text||'').split(/\r?\n/); const days=[]; let cur=null;
  const startDay=nm=>{ cur={ name:(nm||'Edzés').trim().slice(0,40)||'Edzés', ex:[] }; days.push(cur); };
  for(const raw of lines){
    const line=(raw||'').trim(); if(!line) continue;
    const m=line.match(/^(?:nap|day)\s*\d*\s*[:\-–—]\s*(.+)$/i);
    if(m){ startDay(m[1]); continue; }
    const body=line.replace(/^[-*•·•\d).\s]+/,'').trim(); if(!body) continue;
    const looksEx = /^[-*•·•]/.test(line) || line.indexOf('|')>=0 || /\d+\s*[x×]\s*\d+/i.test(body);
    if(looksEx){ if(!cur) startDay('AI edzés'); const ex=aiParseExLine(body); if(ex) cur.ex.push(ex); continue; }
    if(body.split(/\s+/).length<=5){ startDay(body); }   // rövid cím → nap-fejléc
  }
  return days.filter(d=>d.ex.length);
}

// Név → meglévő gyakorlat-ID párosítás (token-átfedés + tartalmazás).
function aiMatchEx(name){
  const q=aiNorm(name); if(!q) return null;
  const qt=q.split(' ').filter(t=>t.length>=3);
  let best=null, bestScore=0;
  for(const e of exLibrary()){ const en=aiNorm(e.n); if(!en) continue;
    if(en===q) return e;
    const et=en.split(' ');
    let ov=0; qt.forEach(t=>{ if(et.some(x=>x.indexOf(t)===0||t.indexOf(x)===0)) ov++; });
    let score=qt.length? ov/qt.length : 0;
    if(en.indexOf(q)>=0 || q.indexOf(en)>=0) score=Math.max(score,0.9);
    if(score>bestScore){ bestScore=score; best=e; }
  }
  return bestScore>=0.6 ? best : null;
}

// Izomcsoport-tipp új gyakorlathoz (a térkép színezéséhez); heurisztika.
function aiGuessMg(name){
  const q=aiNorm(name), has=(...ws)=>ws.some(w=>q.indexOf(w)>=0);
  if(has('fekvenyom','mell','pec','tarogat','fekvotamasz','tolodz')) return 'mell';
  if(has('huzodz','evez','lehuz','hat','csonak','holtemel','deadlift')) return 'hát';
  if(has('vall','oldalemel','arcvono','face')) return 'váll';
  if(has('tricepsz','francia','kotel','dip','nyakrol')) return 'tricepsz';
  if(has('bicepsz','hajlit','kalapacs','curl')) return 'bicepsz';
  if(has('guggol','kitor','comb','vadli','lab','legpress','legcurl','csipo','glute')) return 'láb';
  if(has('plank','has','crunch','torzs','knee','csavar')) return 'törzs';
  return 'törzs';
}

// Az import HÁROM LÉPÉS, egyszerre egy képernyő. Korábban minden egy lapon
// volt (bevezető + prompt + másolás + mező + feldolgozás + előnézet): telefonon
// ez egy hosszú görgetés volt, amiben nem látszott, hol tart az ember. A
// beillesztés egy koppintás (vágólap), a feldolgozás magától fut, az előnézet
// pedig SZERKESZTHETŐ – rossz párosítás miatt nem kell elölről kezdeni.
let aiResolved=null, aiPromptText='', aiStep=1, aiText='', aiCopied=false, aiEditRef=null, aiEmptied=false, _aiTimer=null;
const AI_TITLES=['','Kérd el a tervet','Illeszd be a választ','Nézd át és add hozzá'];

function openAiImport(){
  aiResolved=null; aiText=''; aiStep=1; aiCopied=false; aiEditRef=null; aiEmptied=false;
  aiPromptText=buildAiPrompt();          // a naplóból személyre szabott prompt
  aiRender();
  openSheet();
}
// Csak a lap TARTALMÁT cseréljük – így a választóból visszatérve nem csukódik
// be és nem indul újra a lap-animáció.
function aiRender(){ const el=document.getElementById('sheetIn'); if(el) el.innerHTML=aiImportHtml(); }
function aiGo(n){ if(n===3 && !(aiResolved&&aiResolved.length)) return; aiStep=n; aiRender(); }
function aiParsed(){ return !!(aiResolved && aiResolved.length); }

function aiStepBar(){
  return `<div class="whyrow" style="margin:10px 0 2px">`+['Prompt','Beillesztés','Előnézet'].map((n,i)=>{
    const st=i+1, can = st<=aiStep || st===2 || (st===3 && aiParsed());
    return `<button class="whyc ${st===aiStep?'on':''}" ${can?`onclick="aiGo(${st})"`:'disabled'}>${st}. ${n}</button>`;
  }).join('')+`</div>`;
}
function aiImportHtml(){
  return `<div class="grabber"></div>
    <div class="row"><div class="grow"><span class="eyebrow">AI-terv importálása</span>
      <h2 style="font-size:24px">${AI_TITLES[aiStep]}</h2></div>
      <button onclick="closeSheet()" style="font-size:26px;color:var(--dim);padding:0 8px">×</button></div>
    ${aiStepBar()}`
    + (aiStep===1 ? aiStep1Html() : aiStep===2 ? aiStep2Html() : aiStep3Html());
}
function aiStep1Html(){
  return `<p class="small mut" style="margin:10px 0 0">A prompt már tartalmazza a naplód összefoglalóját, így az edző a te számaidból indul. A meglévő terved NEM változik – az import új edzést hoz létre.</p>
    <button class="btn pri" style="margin-top:12px" onclick="aiCopyTpl()">Prompt másolása</button>
    ${navigator.share?`<button class="btn" style="margin-top:8px" onclick="aiSharePrompt()">Küldés az AI edzőnek…</button>`:''}
    <details class="mmfold" style="margin-top:12px;border:1px solid var(--line);border-radius:12px;overflow:hidden">
      <summary style="border-top:none">A prompt tartalma (a naplód alapján)</summary>
      <div class="exnote" style="margin:0;border:none;border-radius:0"><div class="exnote-t" style="white-space:pre-wrap;font-size:13px">${esc(aiPromptText)}</div></div>
    </details>
    <button class="btn ghost" style="margin-top:8px" onclick="aiGo(2)">Már megvan a terv – beillesztés ›</button>`;
}
function aiStep2Html(){
  const canPaste = !!(navigator.clipboard && navigator.clipboard.readText);
  return `<p class="small mut" style="margin:10px 0 0">${aiCopied?'A prompt a vágólapon van. Add oda az AI edződnek, a válaszát pedig illeszd be ide – ':'Illeszd be az edző válaszát – '}úgy, ahogy van, a magyarázó szöveggel együtt. Az edzéseket magától kiolvassa belőle.</p>
    ${canPaste?`<button class="btn pri" style="margin-top:12px" onclick="aiPasteClip()">Beillesztés a vágólapról</button>`:''}
    <textarea id="aiText" rows="8" style="width:100%;margin-top:10px" placeholder="Ide illeszd be az AI válaszát…" oninput="aiTextInput(this.value)">${esc(aiText)}</textarea>
    <div id="aiStat">${aiStatHtml()}</div>`;
}
// Csak ez a doboz frissül gépelés közben – a textarea DOM-eleme nem épül újra,
// így nem ugrik el a fókusz és a kurzor.
function aiStatHtml(){
  if(!aiText.trim()) return `<p class="small dim" style="margin-top:8px">Beillesztés után itt jelenik meg, mit ismert fel.</p>`;
  // Ha TE dobtad ki az összes sort az előnézetben, a szöveg attól még jó –
  // hazugság volna azt írni, hogy nem sikerült kiolvasni.
  if(!aiParsed() && aiEmptied) return `<div class="small dim" style="margin-top:10px">Minden sort elhagytál az előnézetben. Illessz be másik tervet, vagy olvasd be újra ezt.</div>
    <button class="btn" style="margin-top:8px" onclick="aiReparse()">Újra feldolgozás</button>`;
  if(!aiParsed()) return `<div class="banner" style="margin-top:10px">Ebből még nem sikerült edzést kiolvasni. Kérd meg az edzőt, hogy a megadott formátumban adja vissza – az emlékeztetőt egy koppintással elküldheted neki.</div>
    <button class="btn" style="margin-top:8px" onclick="aiCopyFormat()">Formátum-emlékeztető másolása</button>`;
  const n=aiResolved.reduce((a,d)=>a+d.ex.length,0);
  return `<div class="small" style="margin-top:10px;color:var(--sage)">✓ ${aiResolved.length} edzés · ${n} gyakorlat felismerve</div>
    <button class="btn pri" style="margin-top:8px" onclick="aiGo(3)">Előnézet ›</button>`;
}
function aiTextInput(v){
  aiText=v; clearTimeout(_aiTimer);
  _aiTimer=setTimeout(()=>{ aiParseNow(); const el=document.getElementById('aiStat'); if(el) el.innerHTML=aiStatHtml(); }, 350);
}
function aiReparse(){ aiEmptied=false; aiParseNow(); if(aiParsed()) aiStep=3; aiRender(); }
function aiParseNow(){
  aiEmptied=false;
  const days=aiParsePlan(aiText);
  aiResolved = days.length ? days.map(d=>({ name:d.name, ex:d.ex.map(x=>({ parsed:x, match:aiMatchEx(x.name) })) })) : null;
}
// Egy koppintás: vágólap → felismerés → előnézet. Sikeres olvasásnál rögtön a
// 3. lépésre viszünk, mert a felhasználó épp ezt kérte.
async function aiPasteClip(){
  let t='';
  try{ t=await navigator.clipboard.readText(); }
  catch(e){ uiAlert('A böngésző nem engedte a beillesztést. Illeszd be kézzel a mezőbe.');
    const ta=document.getElementById('aiText'); if(ta) ta.focus(); return; }
  if(!t || !t.trim()){ uiAlert('A vágólap üres – másold ki az AI válaszát, aztán próbáld újra.'); return; }
  aiText=t; aiParseNow(); if(aiParsed()) aiStep=3; aiRender();
}
function aiCopyTpl(){
  const t=aiPromptText||buildAiPrompt();
  const done=()=>{ aiCopied=true; aiStep=2; aiRender(); };   // a lépésváltás maga a visszajelzés
  try{ if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(t).then(done,()=>{ aiCopyFallback(t); done(); }); return; } }catch(e){}
  aiCopyFallback(t); done();
}
async function aiSharePrompt(){
  const t=aiPromptText||buildAiPrompt();
  if(!navigator.share) return aiCopyTpl();
  try{ await navigator.share({ title:'Edzésterv-kérés', text:t }); }
  catch(e){ if(e&&e.name==='AbortError') return; return aiCopyTpl(); }
  aiCopied=true; aiStep=2; aiRender();
}
function aiCopyFormat(){
  const t=AI_FORMAT_BLOCK;
  const ok=()=>uiAlert('A formátum-emlékeztető a vágólapon – küldd el az edzőnek, és kérd újra a tervet ebben az alakban.');
  try{ if(navigator.clipboard&&navigator.clipboard.writeText){ navigator.clipboard.writeText(t).then(ok,()=>aiCopyFallback(t)); return; } }catch(e){}
  aiCopyFallback(t);
}
function aiCopyFallback(t){ try{ const ta=document.createElement('textarea'); ta.value=t;
  ta.style.position='fixed'; ta.style.opacity='0'; document.body.appendChild(ta); ta.select();
  document.execCommand('copy'); document.body.removeChild(ta); }
  catch(e){ uiAlert('Másold ki kézzel a fenti szöveget.'); } }

// Az előnézet SZERKESZTHETŐ: a párosítás egy koppintással átköthető másik
// gyakorlatra (vagy vissza „újra"), a felesleges sor/nap kidobható. E nélkül
// egyetlen rossz találat miatt az egész importot újra kellene kezdeni.
// UGYANAZ a gyakorlat kétszer egy napon: a napló gyakorlatonként EGY szett-sort
// tárol, tehát a két sor összeolvadna – a második előírás felülírná az elsőt, és
// a lejátszóban közös szettlistát kapnának. Ezt nem oldjuk meg magunktól (a
// nehéz sorozat + leterhelés két külön szándék), hanem jelezzük, és a
// felhasználó dönt: kidobja az egyiket, vagy átköti másik gyakorlatra.
function aiDupIds(d){
  const seen={}, dup={};
  (d.ex||[]).forEach(it=>{ const id=it.match&&it.match.id; if(!id) return;
    if(seen[id]) dup[id]=1; else seen[id]=1; });
  return dup;
}
function aiHasDup(){ return (aiResolved||[]).some(d=>Object.keys(aiDupIds(d)).length>0); }

// A KORÁBBI AI-import megkeresése. Az `at` mezőt KIZÁRÓLAG az import teszi a
// routine-ra (a kézi összeállító és a kész sablonok nem), ezért a régi,
// `ai` jelölő nélküli importok is felismerhetők róla. Egy terv akkor
// AI-terv, ha jelölt, VAGY minden napja AI-importált edzés – így nem
// nyúlunk a kézzel összerakott vagy sablonból másolt terveidhez.
function aiPrevImport(){
  const rIds=new Set((S.routines||[]).filter(r=>r && (r.ai===1 || r.at>0)).map(r=>r.id));
  const pIds=new Set((S.programs||[]).filter(p=>p && (p.ai===1 ||
    ((p.days||[]).length>0 && p.days.every(d=>rIds.has(d))))).map(p=>p.id));
  return { rIds:[...rIds], pIds:[...pIds] };
}
// A korábbi import eltávolítása – síremlékkel, hogy a felhő-unió se hozza
// vissza. A `customEx`-eket SZÁNDÉKOSAN meghagyjuk: az új import a nevük
// alapján újra rájuk köt, így a súlytörténeted folytatódik.
function aiWipePrev(){
  const prev=aiPrevImport(); if(!prev.rIds.length && !prev.pIds.length) return 0;
  const rSet=new Set(prev.rIds), pSet=new Set(prev.pIds);
  S.routines=(S.routines||[]).filter(r=>!rSet.has(r.id));
  S.programs=(S.programs||[]).filter(p=>!pSet.has(p.id));
  (S.programs||[]).forEach(p=>{ p.days=(p.days||[]).filter(d=>!rSet.has(d)); });
  prev.rIds.concat(prev.pIds).forEach(tombstone);
  if(pSet.has(S.activeProgram)) S.activeProgram=null;
  return prev.rIds.length;
}

function aiStep3Html(){
  if(!aiParsed()) return `<div class="banner" style="margin-top:12px">Nincs feldolgozott terv – lépj vissza a beillesztéshez.</div>`;
  let matched=0, neu=0, h='';
  aiResolved.forEach((d,di)=>{
    const dup=aiDupIds(d);
    h+=`<div class="card" style="margin-top:10px"><div class="pad">
      <div class="row" style="align-items:center">
        <span class="grow cond" style="font-size:17px;font-weight:600">${esc(d.name)}</span>
        <button class="iconbtn" style="color:var(--red)" onclick="aiRemoveDay(${di})" aria-label="Nap elhagyása">×</button></div>`;
    d.ex.forEach((item,ii)=>{ const p=item.parsed;
      const meta=`${p.s}×${esc(p.r)}${p.bw?' · testsúly':(p.hasW?' · '+kgNum(p.w)+' kg':'')} · ${p.rest} mp pihenő`;
      if(item.match) matched++; else neu++;
      const utk = !!(item.match && dup[item.match.id]);
      h+=`<div class="row" style="align-items:flex-start;gap:8px;margin-top:8px">
        <button class="grow" style="text-align:left;min-width:0" onclick="aiEditItem(${di},${ii})">
          <span class="small"><span style="color:var(--${utk?'red':(item.match?'sage':'brass')})">${utk?'!':(item.match?'✓':'+')}</span>
            ${esc(item.match?trn(item.match.n):p.name)}${item.match?'':' <span class="dim">(új)</span>'}</span>
          <span class="small dim" style="display:block;margin-top:2px">${meta} <span style="color:var(--mut)">· csere ›</span></span>
          ${utk?`<span class="small" style="display:block;margin-top:2px;color:var(--red)">Ez a gyakorlat kétszer szerepel ezen a napon – dobd ki az egyiket, vagy kösd át másikra.</span>`:''}</button>
        <button onclick="aiRemoveItem(${di},${ii})" aria-label="Sor elhagyása" style="color:var(--dim);font-size:20px;padding:2px 6px">×</button>
      </div>`; });
    h+=`</div></div>`;
  });
  const dupe=aiHasDup();
  const prev=aiPrevImport();
  const csere = prev.rIds.length
    ? `<div class="small" style="margin-top:10px;color:var(--brass)">A korábbi AI-importod (${prev.rIds.length} edzés${prev.pIds.length?', '+prev.pIds.length+' terv':''}) ennek a helyére kerül – nem gyűlnek egymásra. A naplózott edzéseid és a saját, kézzel készített terveid érintetlenek.</div>`
    : '';
  return h+csere+`<div class="small mut" style="margin-top:10px">${matched} meglévő gyakorlathoz kötve (a súlytörténeteddel együtt), ${neu} új jön létre. A szettek, ismétlések, súlyok és pihenők pontosan így kerülnek be – az első alkalommal ezekkel indul az edzés, utána a saját haladásod viszi tovább. A meglévő terved érintetlen.</div>
    ${dupe?`<div class="banner" style="margin-top:10px">Egy napon belül ugyanaz a gyakorlat kétszer szerepel. A napló gyakorlatonként egy szett-sort vezet, ezért a két sor összeolvadna, és az egyik előírás elveszne. Oldd fel a pirossal jelölteket, aztán mehet a hozzáadás.</div>`:''}
    <button class="btn pri" style="margin-top:10px" onclick="aiImportApply()" ${dupe?'disabled':''}>Hozzáadás az edzéseimhez</button>`;
}
function aiRemoveItem(di,ii){ const d=aiResolved&&aiResolved[di]; if(!d) return;
  d.ex.splice(ii,1); if(!d.ex.length) aiResolved.splice(di,1);
  if(!aiResolved.length){ aiResolved=null; aiEmptied=true; aiStep=2; } aiRender(); }
function aiRemoveDay(di){ if(!aiResolved) return; aiResolved.splice(di,1);
  if(!aiResolved.length){ aiResolved=null; aiEmptied=true; aiStep=2; } aiRender(); }
// A keresőt az edző által írt névvel nyitjuk – csere közben ne kelljen gépelni.
function aiEditItem(di,ii){ aiEditRef={di,ii}; const it=aiPickTarget();
  openExPicker('ai', it ? it.parsed.name : ''); }
function aiPickTarget(){ if(!aiEditRef||!aiResolved) return null;
  const d=aiResolved[aiEditRef.di]; return d ? d.ex[aiEditRef.ii] : null; }
function aiBindPick(id){ const it=aiPickTarget(); if(it) it.match=exDef(id); aiBackToPreview(); }
function aiBindNew(){ const it=aiPickTarget(); if(it) it.match=null; aiBackToPreview(); }
function aiBackToPreview(){ aiEditRef=null; aiStep=3; aiRender(); }

async function aiImportApply(){
  if(!aiResolved||!aiResolved.length){ uiAlert('Nincs mit importálni.'); return; }
  // Védőháló: duplikált gyakorlat-ID-vel a routine hibás adatot tárolna.
  if(aiHasDup()){ uiAlert('Egy napon belül ugyanaz a gyakorlat kétszer szerepel. Dobd ki az egyiket, vagy kösd át másik gyakorlatra – így egyik előírás sem vész el.'); return; }
  if(!S.customEx)S.customEx={}; if(!S.routines)S.routines=[]; if(!S.programs)S.programs=[];
  // A korábbi AI-import HELYÉRE kerülünk, nem mellé: enélkül minden behúzás
  // újabb „AI edzésterv" + újabb azonos nevű napok sorát rakná a listába.
  // A saját (kézzel készített, sablonból másolt) terveid és a naplód nem
  // érintettek. Az előnézet ezt előre kiírja.
  const cserelt = aiWipePrev();
  let newEx=0; const dayIds=[];
  aiResolved.forEach(d=>{
    const ov={};
    const exIds=d.ex.map(item=>{
      const p=item.parsed;
      if(item.match){
        // Meglévő ID → a súlytörténet összekötve. Az edző ELŐÍRÁSÁT viszont
        // megőrizzük a routine-on, különben a gyakorlat alap-paraméterei
        // (szett/ism./pihenő) és a saját munkasúlyod írnák felül.
        const base=exDef(item.match.id), o={ s:p.s, r:p.r, rest:p.rest };
        // Testsúlyos gyakorlatnál a súly a PLUSZ terhelés, tehát ott is
        // értelmes előírás. Ha az edző „testsúly"-t írt egy testsúlyos
        // gyakorlatra, az azt jelenti: NINCS plusz súly (w=0) – e nélkül a
        // saját, korábbi plusz súlyod jönne fel, pedig az edző nem azt kérte.
        if(p.hasW) o.w=p.w;
        else if(p.bw && base.bw) o.w=0;
        ov[item.match.id]=o;
        return item.match.id;
      }
      const id=uid('cx_');
      const def={ id, n:p.name, mg:aiGuessMg(p.name), s:p.s, r:p.r, w:p.w, inc:2.5, rest:p.rest };
      if(p.bw) def.bw=1;
      S.customEx[id]=def; newEx++; return id;
    });
    const rid=uid('r_');
    const rt={ id:rid, name:d.name||'AI edzés', sub:exIds.length+' gyakorlat', ex:exIds, at:Date.now(), ai:1 };
    if(Object.keys(ov).length) rt.exOv=ov;
    S.routines.push(rt);
    dayIds.push(rid);
  });
  // Több nap → közös terv. Ezt AKTÍVVÁ is tesszük, különben a napjai sehol
  // nem látszanak a főoldalon: az aktív terv csak a sajátját mutatja, a
  // „Saját edzések" szekció pedig kihagyja azokat, amik tervhez tartoznak.
  // Így az import „eltűnne", pedig ott van. A régi terv nem vész el – egy
  // koppintás az „Aktív edzésterv" választóban.
  let progName='';
  if(dayIds.length>1){ const pid=uid('p_');
    S.programs.push({ id:pid, name:'AI edzésterv', days:dayIds, ai:1 });
    progName='AI edzésterv'; S.activeProgram=pid; }
  save(); flushCloud(); closeSheet(); tab='home'; render(); window.scrollTo(0,0);
  const cs = cserelt ? ` A korábbi AI-importod (${cserelt} edzés) helyére került.` : '';
  await uiAlert((progName
    ? `Kész: ${dayIds.length} edzés a(z) „${progName}" tervben, ${newEx} új gyakorlat. Ez lett az aktív terved – a régire egy koppintással visszaválthatsz a főoldali választóban.`
    : `Kész: ${dayIds.length} edzés, ${newEx} új gyakorlat. Megtalálod a főoldalon a „Saját edzések" alatt és a Tervek fülön.`)+cs);
}

