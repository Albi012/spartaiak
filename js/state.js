/* ==================================================================
   Az app kozponti allapota (S), a tarolas (load/save) es a
   felho-push. Itt van az APP_VERSION es az ARCHIVE is.
   ================================================================== */
let S = {sessions:[], active:null, weights:{}, notes:{}, photos:{}, injury:null, lastBackup:0,
         customEx:{}, routines:[], programs:[], hidePlan:false, activeProgram:null,
         deleted:[], activeT:0, prog:{}, bw:{}, sleep:{}, rdy:null, sched:{}};
let tab='home', playing=false, curEx=0, tInt=null, tEnd=0, tLen=0, wl=null, nagOff=false;
let logFilter=null;   // Napló szűrő edzéstípusra (day id) – null = mind
// Napló-nézet: nap-típus szűrő (null = minden nap, 'ex' = csak edzés,
// 'rest' = csak pihenőnap). Nézet-állapot, NEM tárolódik a naplóban.
let logKind=null;
function setLogKind(k){ logKind=(logKind===k?null:k); if(logKind) logFilter=null; render(); }
// Pihenőnapok: az a nap, amin nem volt edzés, de rögzítettél testsúlyt vagy
// alvást. Csak az első edzés és a mai nap közti tartományban.
function logRestDays(){
  if(!S.sessions.length) return [];
  const busy=new Set(S.sessions.map(s=>bwKey(s.t)));
  const from=rdyDayStart(Math.min(...S.sessions.map(s=>s.t))), to=rdyDayStart(Date.now());
  const keys=new Set([...Object.keys(S.bw||{}), ...Object.keys(S.sleep||{})]);
  const out=[];
  keys.forEach(k=>{ if(busy.has(k)) return;
    const t=new Date(k+'T12:00:00').getTime(); if(isNaN(t)) return;
    const day=rdyDayStart(t); if(day<from || day>to) return;
    out.push({t:day+12*36e5, k}); });
  return out.sort((a,b)=>b.t-a.t);
}
// Egy pihenőnap sora: mi lett aznap rögzítve, plusz a napi készenlét.
function logRestRow(it){
  const bits=[];
  const kg=(S.bw||{})[it.k]; if(kg>0) bits.push('testsúly '+bwNum(kg));
  const sl=(S.sleep||{})[it.k]; if(sl&&sl.min>0) bits.push('alvás '+slpFmt(sl.min));
  return `<div class="card"><div class="pad row" style="align-items:center;gap:12px">
    <span class="grow"><span class="cond" style="font-size:19px;font-weight:600;color:var(--mut)">Pihenő</span>
      <div class="small dim">${fmtDate(it.t)}${bits.length?' · '+esc(bits.join(' · ')):''}</div></span>
    ${logRdyBadge(it.t)}</div></div>`;
}
// Edzés-soron a készenlét a meta-sorba fűzve (a fejlécben nincs rá hely a
// Törlés gomb mellett). Üres, ha az adott napra nem számolható.
function logRdyInline(t){
  const r=readiness(t); if(!r) return '';
  return ` · készenlét <b class="num" style="color:${r.color}">${r.score}</b>`;
}
// Pihenőnap-soron a készenlét kis jelvényként (üres, ha nem számolható).
function logRdyBadge(t){
  const r=readiness(t); if(!r) return '';
  return `<button style="text-align:right;padding:4px 2px" onclick="openRdySheet()" aria-label="Készenlét ${r.score}">
    <span class="num" style="display:block;font-size:19px;font-weight:700;color:${r.color}">${r.score}</span>
    <span style="font-size:9px;letter-spacing:.1em;text-transform:uppercase;color:var(--dim)">készenlét</span></button>`;
}
let physioRegion='';  // Gyógytorna oldal aktív testtáj (üres = első)
let editing=false, draft=null;   // edzés-összeállító
const APP_VERSION='v114';         // látható build-jelző (a sw.js VERSION-jével együtt emeld)

const KEY='gymlog_v1';
let storeMode='none';

async function readKey(k){
  // Felhő-szinkron (1. fázis): belépve a felhő az igazság forrása.
  if(k===KEY && window.Auth && Auth.isLoggedIn()){
    try{ const c=await Auth.cloudRead(); if(c!=null){ storeMode='local'; return c; } }catch(e){}
  }
  try{ if(window.storage&&window.storage.get){ const r=await window.storage.get(k); if(r&&r.value){storeMode='claude'; return r.value;} } }catch(e){}
  try{ localStorage.setItem('__t','1'); localStorage.removeItem('__t'); if(storeMode==='none')storeMode='local';
       return localStorage.getItem(k); }catch(e){ storeMode='none'; }
  return null;
}
// Felhő-push debounce: gyors egymás utáni mentések (szettről szettre) egyetlen
// hálózati írássá vonódnak össze, hogy teremben ne torlódjanak/versenyezzenek.
// A HELYI mentés attól még minden hívásnál azonnal megtörténik (lásd writeKey).
let _cloudTimer=null, _cloudPending=null;
function cloudPush(v){
  _cloudPending=v;
  if(_cloudTimer) return;
  _cloudTimer=setTimeout(()=>{ _cloudTimer=null; const val=_cloudPending; _cloudPending=null;
    if(val!=null && window.Auth && Auth.isLoggedIn()){ try{ Auth.cloudWrite(val); }catch(e){} } }, 1200);
}
// Függőben lévő felhő-írás AZONNALI kiküldése (a debounce megkerülése).
// Törlésnél hívjuk, hogy a tombstone azonnal a felhőbe kerüljön – így egy
// másik eszköz sem hozza vissza a törölt edzést, és nem függ attól, hogy a
// felhasználó vár-e a debounce lejártáig.
function flushCloud(){
  if(_cloudTimer){ clearTimeout(_cloudTimer); _cloudTimer=null; }
  const v=_cloudPending; _cloudPending=null;
  if(v!=null && window.Auth && Auth.isLoggedIn()){ try{ Auth.cloudWrite(v); }catch(e){} }
}
async function writeKey(k,v){
  try{ if(window.storage&&window.storage.set){ await window.storage.set(k,v); return true; } }catch(e){}
  try{ localStorage.setItem(k,v);
       if(k===KEY && window.Auth && Auth.isLoggedIn()) cloudPush(v);  // felhőbe (összevont, fire-and-forget)
       return true; }catch(e){ return false; }
}

async function load(){
  const raw=await readKey(KEY);
  if(raw){ try{ S=Object.assign(S,JSON.parse(raw)); }catch(e){} }
  render();
}
async function save(){
  rdyInvalidate();                      // a készenlét a naplóból származik
  const v=JSON.stringify({sessions:S.sessions,active:S.active,weights:S.weights,
    notes:S.notes,photos:S.photos,injury:S.injury,lastBackup:S.lastBackup,
    customEx:S.customEx,routines:S.routines,programs:S.programs,hidePlan:S.hidePlan,activeProgram:S.activeProgram,
    deleted:S.deleted,activeT:S.activeT,prog:S.prog,bw:S.bw,sleep:S.sleep,rdy:S.rdy,sched:S.sched});
  const ok=await writeKey(KEY,v);
  if(!ok&&storeMode!=='none'){ storeMode='none'; render(); }
}

const ARCHIVE = {
  rack:{id:'rack',n:'Felhúzás blokkról (rack pull)',s:4,r:'5',w:60,rest:180,inc:5},
  abs:{id:'abs',n:'Hasprés kábelen',s:3,r:'12',w:20,rest:60,inc:5},
  ohpdb:{id:'ohpdb',n:'Vállból nyomás ülve',s:3,r:'8',w:12.5,rest:120,inc:2.5},
  hyp:{id:'hyp',n:'Hyperextension',s:3,r:'12',w:0,rest:90,inc:5,bw:1,mg:'hát'}
};

