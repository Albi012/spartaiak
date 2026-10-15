/* ==================================================================
   Naplo ful: lista, biztonsagi mentes/visszaallitas, siremlekek
   (tombstone/untomb) es a naplozott edzes utolagos javitasa.
   ================================================================== */
// A szűrő a nap NEVÉRE szűr, nem az azonosítójára: minden AI-import új
// azonosítóval hozza létre a napokat, így azonos nevű edzés (pl. „Push A")
// több azonosítóval is szerepel a naplóban – azonosító szerint ez négy
// egyforma chipet adott. Név szerint egy chip, és az összes ilyen edzés.
let _logNames=[];
function logMatch(s){ return !logFilter || dayName(s)===logFilter; }
function setLogFilter(name){ logKind=null; logFilter=(name===logFilter?null:name); render(); window.scrollTo(0,0); }
function setLogFilterIdx(i){ setLogFilter(i==null?null:_logNames[i]); }
const HU_MONTHS=['január','február','március','április','május','június','július','augusztus','szeptember','október','november','december'];
const HU_MON3=['jan.','febr.','márc.','ápr.','máj.','jún.','júl.','aug.','szept.','okt.','nov.','dec.'];
const HU_WD=['Vasárnap','Hétfő','Kedd','Szerda','Csütörtök','Péntek','Szombat'];
// Barátságos dátum a naplóhoz: Ma / Tegnap / „Hétfő, okt. 13." (egy héten
// belül) / „okt. 5." (régebbi; más évben évszámmal). A teljes dátum a
// title-ben marad.
function friendlyDate(t){
  const d=new Date(t), day=rdyDayStart(t), today=rdyDayStart(Date.now());
  const diff=Math.round((today-day)/864e5), md=HU_MON3[d.getMonth()]+' '+d.getDate()+'.';
  if(diff===0) return 'Ma'; if(diff===1) return 'Tegnap';
  if(diff>1 && diff<7) return HU_WD[d.getDay()]+', '+md;
  return (d.getFullYear()!==new Date().getFullYear()?d.getFullYear()+'. ':'')+md; }
function weekLabel(ws){
  const cur=weekStart(Date.now());
  if(ws===cur) return 'Ez a hét';
  if(ws===weekStart(dayShift(cur,-7))) return 'Múlt hét';
  const a=new Date(ws), b=new Date(dayShift(ws,6));
  return HU_MON3[a.getMonth()]+' '+a.getDate()+'–'+(a.getMonth()===b.getMonth()?'':HU_MON3[b.getMonth()]+' ')+b.getDate()+'.'; }
// A nap típusának jele (színes csík a kártya szélén): név szerint állandó
// szín, téma-tokenekből keverve – görgetés közben ránézésre megvan a nap.
const DAY_TONES=['var(--brass)','var(--sage)','var(--red)','color-mix(in srgb,var(--brass) 50%,var(--red))','color-mix(in srgb,var(--sage) 55%,var(--ink))','var(--mut)'];
function dayTone(name){ let h=0; for(const c of String(name)) h=(h*31+c.charCodeAt(0))>>>0; return DAY_TONES[h%DAY_TONES.length]; }
function monthLabel(t){ const d=new Date(t); return d.getFullYear()+'. '+HU_MONTHS[d.getMonth()]; }
// A lenyitott edzések nyilvántartása. NÉZET-állapot, NEM tárolódik – mint a
// `logKind`. `null` = még nem nyúlt hozzá a felhasználó, ilyenkor a legfrissebb
// edzés van nyitva. A toggle a DOM-ból olvassa vissza az igazságot, így nem
// kell külön könyvelni: a `toggle` esemény a váltás UTÁN sül el.
let _logOpen=null;
function logIsOpen(t, elso){ return _logOpen ? _logOpen.has(t) : elso; }
function logToggle(){
  _logOpen = new Set([...document.querySelectorAll('#app .lgfold[open]')].map(d=>+d.dataset.t));
}
function logView(){
  if(!S.sessions.length) return `<div class="wrap">
    <div class="empty">Még nincs lezárt edzés.<br>Kezdd az Edzés fülön.</div>
    <button class="btn" onclick="loadBundled()" style="margin-bottom:8px;color:var(--mut)">Tesztadat betöltése</button>
    <button class="btn" onclick="restore()" style="margin-bottom:20px;color:var(--mut)">Visszaállítás mentésből</button></div>`;
  // Elavult szűrő visszaállítása (ha a típus utolsó edzését is töröltük).
  if(logFilter && !S.sessions.some(s=>dayName(s)===logFilter)) logFilter=null;
  const shownCount = S.sessions.filter(logMatch).length;
  // A küldés/mentés MŰVELETEK a fejlécbe kerültek egy menü mögé. Korábban
  // négy gomb állt a lap ALJÁN – 3400 px-re a tetejétől, ahova senki nem
  // görget le azért, hogy elküldje a heti összefoglalót az edzőjének.
  // A nagy „Napló" cím kikerült: a fül tetején a Napló | Haladás kapcsoló
  // már megmondja, hol vagy (logSegWrap). Itt csak a szám és a menü marad.
  let h=`<div class="wrap"><div class="row" style="align-items:center;margin:-6px 0 6px">
    <span class="eyebrow grow">${logFilter?shownCount+' / '+S.sessions.length:S.sessions.length} edzés</span>
    <button class="iconbtn ghost" aria-label="Küldés és mentés" onclick="openLogTools()">${ICON.more}</button>
    </div>`;
  // Összegző sáv (a teljes naplóból, a szűrőtől függetlenül).
  const st=progStats(), wk=S.sessions.filter(s=>weekStart(s.t)===weekStart(Date.now())).length;
  h+=`<div class="card"><div class="pad"><div class="statgrid" style="grid-template-columns:1fr 1fr 1fr">
    <div class="stat"><span class="num" data-cu="${wk}">${wk}</span><span class="statlbl">e héten</span></div>
    <div class="stat"><span class="num" data-cu="${st.month}">${st.month}</span><span class="statlbl">e hónap</span></div>
    <div class="stat"><span class="num" data-cu="${st.streak}">${st.streak}</span><span class="statlbl">hetes sorozat</span></div>
  </div></div></div>`;
  // Nap-típus szűrő: minden nap / csak edzés / csak pihenő. A pihenőnap az,
  // amin nem volt edzés, de rögzítettél testsúlyt vagy alvást – az a nap is
  // számít, ezért kap sort.
  const restAll=logRestDays();
  // EGY szűrősor, EGY „Mind"-dal. Korábban két sor állt egymás alatt, mindkettő
  // saját „Mind"-dal – pedig a két szűrő eddig is kizárta egymást (a nap-típus
  // választása törli a név-szűrőt és fordítva), vagyis egyetlen választásról
  // van szó.
  _logNames=[...new Set(S.sessions.map(dayName))];
  const kinds = restAll.length ? [['ex','Edzés'],['rest','Pihenő']] : [];
  const names = _logNames.length>1 ? _logNames : [];
  if(kinds.length || names.length){
    h+=`<div class="whyrow hscroll" style="margin-bottom:10px">
      <button class="whyc ${!logKind&&!logFilter?'on':''}" onclick="logKind=null;setLogFilterIdx(null)">Mind</button>`+
      kinds.map(([k,lab])=>`<button class="whyc ${logKind===k?'on':''}" onclick="setLogKind('${k}')">${lab}</button>`).join('')+
      names.map((n,i)=>`<button class="whyc ${logFilter===n?'on':''}" onclick="setLogFilterIdx(${i})">${esc(n)}</button>`).join('')+
      `</div>`;
  }
  const loads=S.sessions.map(sessionLoad);
  const avg=loads.reduce((a,b)=>a+b,0)/(loads.length||1);
  const WHY={busy:'gép foglalt',heavy:'túl nehéz',time:'kevés idő'};
  let curWeek=null, nyitottVolt=false;
  const items=[];
  if(logKind!=='rest') [...S.sessions].filter(logMatch).forEach(s=>items.push({t:s.t,kind:'ex',s}));
  if(logKind!=='ex' && !logFilter) restAll.forEach(r=>items.push(Object.assign({kind:'rest'},r)));
  items.sort((a,b)=>b.t-a.t);
  // Hetekre bontva (hétfőtől, mint a főoldal és a heti összefoglaló), a
  // fejlécben a hét összesítője. Az egymás utáni pihenőnapok EGY vékony sorrá
  // olvadnak – korábban mindegyik teljes kártya volt, a lista fele „Pihenő".
  const wkSum={}; items.forEach(it=>{ if(it.kind!=='ex') return; const w=weekStart(it.t);
    const o=wkSum[w]||(wkSum[w]={n:0,sets:0}); o.n++;
    o.sets+=Object.values(it.s.log).reduce((a,l)=>a+l.sets.filter(x=>x!=null).length,0); });
  let run=[];
  const flush=()=>{ if(run.length){ h+=logRestRun(run); run=[]; } };
  items.forEach(it=>{
    const wk=weekStart(it.t);
    if(wk!==curWeek){ flush(); curWeek=wk; const ws=wkSum[wk];
      h+=`<div class="wkhead"><span class="eyebrow">${weekLabel(wk)}</span><span class="small dim">${ws?ws.n+' edzés · '+ws.sets+' szett':'pihenőhét'}</span></div>`; }
    if(it.kind==='rest'){ run.push(it); return; }
    flush();
    const s=it.s;
    const d=dayDef(s.day)||{ex:[]}; const dn=dayName(s); const idx=S.sessions.indexOf(s);
    const tot=Object.values(s.log).reduce((a,l)=>a+l.sets.filter(x=>x!=null).length,0);
    const load=loads[idx], hi=avg>0 && load>avg*1.3; const dur=sessionDur(s);
    // A LEGFRISSEBB (első kirajzolt) edzés van nyitva, a többi csukva –
    // amíg a felhasználó nem nyúl hozzá; onnantól az ő választása számít.
    const nyitva = logIsOpen(s.t, !nyitottVolt); nyitottVolt = true;
    h+=`<details class="card lgfold" data-t="${s.t}"${nyitva?' open':''} ontoggle="logToggle()" style="--tone:${dayTone(dn)}">
      <summary><div class="grow"><span class="cond" style="font-size:20px;font-weight:600">${esc(dn)}</span>
      <div class="small dim" title="${fmtDate(s.t)}">${friendlyDate(s.t)}${dur?' · '+fmtDur(dur):''} · ${tot} szett · <span class="num">${load.toLocaleString('hu')}</span> kg${hi?' <span style="color:var(--red);font-weight:600">· kiugró</span>':''}${logRdyInline(s.t)}</div>
      ${(()=>{ const js=dayNotes(s); if(!js.length) return '';
        return js.map(n=>{ const e=n.ex&&exDef(n.ex);
          return `<div class="small mut" style="margin-top:4px">${e?`<span style="color:var(--brass)">${esc(exN(e))}</span> <span class="dim">közben:</span> `:'<span class="dim">Jegyzet: </span>'}${esc(n.txt)}</div>`;
        }).join(''); })()}</div></summary>`;
    const seen=new Set();
    d.ex.forEach(e=>{ seen.add(e.id); const l=s.log[e.id]; if(!l||!l.sets.some(x=>x!=null))return;
      h+=`<div class="hrow"><span class="small grow">${esc(exN(e))}${l.why?` <span class="dim" style="font-size:11px">· ${WHY[l.why]}</span>`:''}</span>
        <span class="small num mut">${wLabel(e,l.w)}${e.bw&&l.w<=0?'':' kg'} × ${setsTxt(l)}</span></div>`; });
    Object.keys(s.log).forEach(id=>{ if(seen.has(id))return; const l=s.log[id];
      if(!l||!l.sets.some(x=>x!=null))return; const e=exDef(id);
      h+=`<div class="hrow"><span class="small grow">${esc(exN(e))} <span class="dim" style="font-size:11px">· kivéve</span></span>
        <span class="small num mut">${wLabel(e,l.w)}${e.bw&&l.w<=0?'':' kg'} × ${setsTxt(l)}</span></div>`; });
    const mgSets=sessionMgSets(s);
    h+=`<details class="mmfold"><summary>${tr('Terhelt izmok')}</summary>
      <div class="pad" style="padding-top:0">${muscleMap(mgSets,true)}${mmLegend()}${mgChips(mgSets)}</div></details>`;
    // Javítás/Törlés: a naplót olvasni szoktad, nem szerkeszteni – ezért
    // ezek csak a lenyitott edzésen látszanak, nem mind a hét kártyán.
    h+=`<div class="lgact">
      <button class="btn ghost" style="flex:1;margin:0" onclick="openEditSession(${idx})">${tr('Javítás')}</button>
      <button class="btn ghost" style="flex:0 0 38%;margin:0;color:var(--mut)" onclick="del(${idx})">${tr('Törlés')}</button></div>`;
    h+='</details>';
  });
  flush();
  return h+'<div style="height:12px"></div></div>';
}
// A napló küldés/mentés műveletei egy lapon, a fejléc menü-gombja mögött.
function openLogTools(){
  document.getElementById('sheetIn').innerHTML=`
    <div class="row" style="align-items:baseline"><span class="eyebrow grow">Napló</span>
      <button onclick="closeSheet()" style="font-size:26px;color:var(--dim);padding:0 8px">×</button></div>
    <h2 style="font-size:24px;margin:2px 0 14px">Küldés</h2>
    <button class="btn pri" style="margin-bottom:8px" onclick="closeSheet();openWeeklyExport()">${tr('Heti összefoglaló edzőnek')}</button>
    <button class="btn" style="margin-bottom:8px" onclick="closeSheet();copyAll()">Napló másolása szövegként</button>
    <button class="btn ghost" style="margin-bottom:6px;color:var(--mut)" onclick="openTrash()">Kuka – törölt edzések${trashPurge().length?' ('+S.trash.length+')':''}</button>
    <p class="small dim" style="text-align:center;margin:8px 0 0">Biztonsági mentés és visszaállítás: Profil → Adataim</p>`;
  openSheet();
}
// A mentés a TELJES állapotot viszi – azt, amit a `save()` is eltesz. Korábban
// hat mező kimaradt, és a visszaállítás némán elvette őket: a `prog`
// (gyakorlatonkénti progresszió-szabály) visszaállt „okos"-ra, az
// `activeProgram` a beépített tervre esett vissza (vagyis az importált napok
// eltűntek a főoldalról), a `deleted` síremlékek nélkül pedig a felhőből
// VISSZAJÖTTEK a már törölt edzések és fotók. Ha új mezőt veszel fel a
// `save()`-be, ide is vedd fel – E2E-teszt hasonlítja a kettőt (30. szekció).
// A folyamatban lévő edzés (`active`/`activeT`) SZÁNDÉKOSAN marad ki: a
// mentés a naplód pillanatképe, egy napokkal későbbi visszaállításnál egy
// félbehagyott edzés feltámasztása csak zavart okozna.
function backup(){
  const v=JSON.stringify({app:APP_VERSION, at:Date.now(),
    sessions:S.sessions,weights:S.weights,notes:S.notes,photos:S.photos,
    customEx:S.customEx,routines:S.routines,programs:S.programs,bw:S.bw,sleep:S.sleep,rdy:S.rdy,
    prog:S.prog,injury:S.injury,hidePlan:S.hidePlan,activeProgram:S.activeProgram,
    deleted:S.deleted,lastBackup:S.lastBackup,sched:S.sched,trash:S.trash});
  const b=new Blob([v],{type:'application/json'}), u=URL.createObjectURL(b);
  const a=document.createElement('a'); a.href=u;
  a.download='edzesnaplo-'+fmtDate(Date.now()).replace(/\./g,'')+'.json';
  a.click(); setTimeout(()=>URL.revokeObjectURL(u),1000);
  S.lastBackup=Date.now(); nagOff=true; save(); render();
}
function restore(){
  const i=document.createElement('input'); i.type='file'; i.accept='.json,application/json';
  i.onchange=()=>{ const f=i.files[0]; if(!f)return; const r=new FileReader();
    r.onload=async()=>{ try{ const d=JSON.parse(r.result);
      if(!Array.isArray(d.sessions)) throw 0;
      if(!(await uiConfirm('Ez felülírja a jelenlegi '+S.sessions.length+' edzést '+d.sessions.length+' mentett edzéssel. Folytatod?', {ok:'Visszaállítás', danger:true}))) return;
      S.sessions=d.sessions; S.weights=d.weights||{}; if(d.notes)S.notes=d.notes; if(d.photos)S.photos=d.photos;
      if(d.customEx)S.customEx=d.customEx; if(d.routines)S.routines=d.routines; if(d.programs)S.programs=d.programs;
      if(d.bw)S.bw=d.bw; if(d.sleep)S.sleep=d.sleep; if(d.rdy)S.rdy=d.rdy; if(d.prog)S.prog=d.prog;
      if(d.sched)S.sched=d.sched;
      if(d.trash)S.trash=d.trash;
      // Mindegyik `if`-fel: a RÉGI, szűkebb mentésfájlok is betöltődnek, csak
      // az akkor még nem mentett mezőket hagyják érintetlenül.
      if(d.injury!==undefined) S.injury=d.injury;
      if(d.hidePlan!==undefined) S.hidePlan=d.hidePlan;
      if(d.activeProgram!==undefined) S.activeProgram=d.activeProgram;
      if(Array.isArray(d.deleted)) S.deleted=d.deleted;   // a síremlékek nélkül a felhő visszahozná a törölteket
      if(d.lastBackup) S.lastBackup=d.lastBackup;
      save(); render();
    }catch(e){ uiAlert('Ez nem érvényes mentésfájl.'); } };
    r.readAsText(f); };
  i.click();
}
async function loadBundled(){
  try{
    const res=await fetch('edzesnaplo-backup.json',{cache:'no-store'});
    if(!res.ok) throw 0;
    const d=await res.json();
    if(!Array.isArray(d.sessions)) throw 0;
    if(S.sessions.length && !(await uiConfirm('Ez felülírja a jelenlegi '+S.sessions.length+' edzést '+d.sessions.length+' mentett edzéssel. Folytatod?', {ok:'Betöltés', danger:true}))) return;
    S.sessions=d.sessions; S.weights=d.weights||{}; save(); render();
  }catch(e){ uiAlert('A tesztadat betöltése nem sikerült.'); }
}
// Síremlék (tombstone) rögzítése: törölt entitás kulcsa (edzés t+day, vagy
// saját edzés/terv/gyakorlat id). A mergeGym ezeket kizárja, így a felhő sem
// hozza vissza a törölt elemet.
// Síremlék. Kulcsonként EGY bejegyzés marad (a legfrissebb) – így a lista
// nem hízik, és az összefésülés is kulcsonként a frissebbet nézi.
function tombstone(k){ if(!S.deleted) S.deleted=[];
  S.deleted=S.deleted.filter(d=>!d || d.k!==k);
  S.deleted.push({k, at:Date.now()}); }
// Síremlék visszavonása – ha egy törölt dolgot ÚJRA létrehozol (új fotó
// ugyanahhoz a gyakorlathoz). A helyi bejegyzés törlése NEM elég: a másik
// eszközön/felhőben lévő síremlék az unióban visszatérne, és megölné a
// frisset. Ezért „élő" jelölést írunk ugyanarra a kulcsra, FRISSEBB
// időbélyeggel – a merge kulcsonként a legutolsó jelölést veszi figyelembe.
function untomb(k){ if(!S.deleted) S.deleted=[];
  S.deleted=S.deleted.filter(d=>!d || d.k!==k);
  S.deleted.push({k, at:Date.now(), alive:1}); }
/* ---- Naplózott edzés UTÓLAGOS javítása -----------------------------
 * Eddig egy lezárt edzésen csak a TÖRLÉS volt: egy elgépelt ismétlés vagy egy
 * lemaradt szett miatt az egész edzést el kellett dobni. Egy naplóban, ami
 * éles adatot őriz, ez a legrosszabb csere.
 * A szerkesztés `ed` időbélyeget tesz az edzésre – ezt a felhő-összefésülés
 * nézi ELŐSZÖR (lásd `_mergeSession`): a szándékos szerkesztés így nem
 * fordul vissza attól, hogy a másik eszközön „gazdagabb" (több szettes)
 * verzió van. E nélkül egy TÖRÖLT szettet a szinkron visszahozna. */
let editSess=null, editRep=null;
function openEditSession(i){ editSess=i; editRep=null; renderEditSheet();
  openSheet(); }
function renderEditSheet(){ const el=document.getElementById('sheetIn');
  if(el) el.innerHTML = editRep ? esRepHtml() : editSessionHtml(); }
function esSess(){ return editSess!=null ? S.sessions[editSess] : null; }
// Minden változtatás AZONNAL ment (nincs külön „Mentés"), és megjelöli az
// edzést szerkesztettként.
function esTouch(){ const s=esSess(); if(!s) return;
  s.ed=Date.now(); save(); flushCloud(); }
// A naplózott edzés gyakorlatai: először a nap sorrendjében, majd a többi.
function esExIds(s){
  const d=dayDef(s.day)||{ex:[]}, out=[], seen=new Set();
  d.ex.forEach(e=>{ if(s.log[e.id]){ out.push(e.id); seen.add(e.id); } });
  Object.keys(s.log).forEach(id=>{ if(!seen.has(id)) out.push(id); });
  return out;
}
function editSessionHtml(){
  const s=esSess();
  if(!s) return `<div class="grabber"></div><div class="empty">Ez az edzés már nincs meg.</div>`;
  let h=`<div class="grabber"></div>
    <div class="row"><div class="grow"><span class="eyebrow">${tr('Edzés javítása')}</span>
      <h2 style="font-size:22px">${esc(dayName(s))}</h2>
      <span class="small dim">${fmtDate(s.t)} · ${tr('a változás azonnal mentődik')}</span></div>
      <button onclick="closeEditSession()" style="font-size:26px;color:var(--dim);padding:0 8px">×</button></div>`;
  const ids=esExIds(s);
  if(!ids.length) h+=`<div class="empty" style="padding:18px 0">Ebben az edzésben nincs rögzített gyakorlat.</div>`;
  ids.forEach(id=>{ const e=dayExDef(s.day,id), L=s.log[id];
    h+=`<div class="card" style="margin-top:10px"><div class="pad">
      <div class="row" style="align-items:flex-start">
        <span class="grow cond" style="font-size:17px;font-weight:600">${esc(exN(e))}</span>
        <button class="iconbtn" style="color:var(--red)" onclick="esRemoveEx('${id}')" aria-label="Gyakorlat elhagyása">×</button></div>
      ${e.bw&&!(L.w>0)?`<div class="small dim" style="margin-top:6px">Testsúlyos – nincs súly</div>`
        : `<div class="wt sm" style="margin-top:8px">
             <button onclick="esBumpW('${id}',-1)" aria-label="kevesebb">−</button>
             <div class="val">${wLabel(e,L.w)}${e.bw&&L.w<=0?'':'<span>kg</span>'}</div>
             <button onclick="esBumpW('${id}',1)" aria-label="több">+</button></div>`}
      <div class="chips">`;
    (L.sets||[]).forEach((v,i)=>{
      const cls = v==null ? '' : (v>=(parseInt(e.r)||0) ? ' done' : ' miss');
      h+=`<button class="chip${cls}" onclick="esOpenRep('${id}',${i})" aria-label="${i+1}. szett">
        <span class="r">${v==null?'·':v}</span><span class="l">${i+1}. sz</span></button>`; });
    h+=`<button class="chip" onclick="esAddSet('${id}')" aria-label="Szett hozzáadása"><span class="r">+</span><span class="l">szett</span></button>`;
    h+=`</div></div></div>`; });
  return h+`<button class="btn pri" style="margin-top:14px" onclick="closeEditSession()">${tr('Kész')}</button>`;
}
// A szett-érték megadása: ugyanaz a logika, mint a lejátszóban (cél körüli
// tartomány egy koppintással + kézi mező), csak a naplóra kötve.
// „62,5 kg × 5, 5, 4" → „62,5 kg × 5, 5, 4 (RPE 8, 8, 9)" – csak ha van.
function setsTxt(l){
  const base=(l.sets||[]).map(x=>x==null?'–':x).join(', ');
  if(!l.rpe || !l.rpe.some(x=>x!=null)) return base;
  const r=(l.sets||[]).map((_,i)=> l.rpe[i]==null?'–':rpeNum(l.rpe[i])).join(', ');
  return base+' (RPE '+r+')';
}
// A javító-lapon az RPE AZONNAL mentődik (mint minden más ott), ezért
// nem kell külön „rögzítés" – a `esTouch` viszi a felhőbe is.
function esSetRpe(v){
  const s=esSess(); if(!s) return;
  const L=s.log[editRep.id]; if(!L) return;
  if(v==null && !L.rpe) return;
  if(!L.rpe) L.rpe=[];
  L.rpe[editRep.i]=v;
  if(!L.rpe.some(x=>x!=null)) delete L.rpe;   // ne maradjon csupa null tömb
  esTouch(); renderEditSheet();
}
function esRepHtml(){
  const s=esSess(); if(!s) return editSessionHtml();
  const e=dayExDef(s.day,editRep.id), L=s.log[editRep.id]||{sets:[]};
  const t=parseInt(e.r)||8, from=Math.max(0,t-4), to=t+6, cur=L.sets[editRep.i];
  let g='';
  for(let v=from; v<=to; v++) g+=`<button onclick="esSetRep(${v})"${v===cur?' style="border-color:var(--brass);color:var(--brass)"':''}>${v}</button>`;
  return `<div class="grabber"></div>
    <div class="row"><div class="grow"><span class="eyebrow">${editRep.i+1}. szett</span>
      <h2 style="font-size:22px">${esc(exN(e))}</h2>
      <span class="small dim">cél: ${e.s} × ${esc(e.r)}${e.time?'':' ism.'}</span></div>
      <button onclick="esBackToSession()" style="font-size:26px;color:var(--dim);padding:0 8px">×</button></div>
    ${rpeRow(L.rpe&&L.rpe[editRep.i]!=null?L.rpe[editRep.i]:null,'esSetRpe')}
    <div class="kb">${g}</div>
    <input id="esRepMan" type="number" inputmode="numeric" min="0" max="999" placeholder="Egyéb szám…"
      style="width:100%;margin-top:12px" value="${cur==null?'':cur}">
    <button class="btn pri" style="margin-top:8px" onclick="esSetRepManual()">${tr('Rögzítés')}</button>
    <button class="btn" style="margin-top:8px;color:var(--red)" onclick="esSetRep(null)">${tr('Szett törlése')}</button>`;
}
function esOpenRep(id,i){ editRep={id,i}; renderEditSheet(); }
function esBackToSession(){ editRep=null; renderEditSheet(); }
function esSetRep(v){ const s=esSess(); if(!s||!editRep) return;
  const L=s.log[editRep.id]; if(!L) return;
  L.sets[editRep.i]=v; esTouch(); editRep=null; renderEditSheet(); render(); }
function esSetRepManual(){
  const el=document.getElementById('esRepMan'); if(!el) return;
  const v=parseInt(el.value,10);
  if(!Number.isInteger(v)||v<0||v>999) return;      // érvénytelennél nyitva marad
  esSetRep(v);
}
function esAddSet(id){ const s=esSess(); if(!s) return;
  const L=s.log[id]; if(!L) return; L.sets.push(null); esTouch(); renderEditSheet(); }
function esBumpW(id,dir){ const s=esSess(); if(!s) return;
  const e=exDef(id), L=s.log[id]; if(!L) return;
  L.w=Math.max(0, roundTo((L.w||0)+dir*(e.inc||2.5), e.inc||2.5));
  esTouch(); renderEditSheet(); render();
}
async function esRemoveEx(id){
  const s=esSess(); if(!s) return;
  const e=exDef(id);
  if(!await uiConfirm('Kiveszed a(z) „'+exN(e)+'" gyakorlatot ebből az edzésből?\n(A többi gyakorlat marad.)', {ok:'Kivétel', danger:true})) return;
  delete s.log[id]; esTouch();
  // Ha így egyetlen rögzített szett sem maradt, az edzés üres – ezt kimondjuk.
  const ures=!Object.values(s.log).some(l=>(l.sets||[]).some(x=>x!=null));
  if(ures && await uiConfirm('Ebben az edzésben már nincs rögzített szett. Törlöd az egész edzést?', {ok:'Edzés törlése', danger:true})){
    const idx=editSess; closeEditSession(); await del(idx, true); return;
  }
  renderEditSheet(); render();
}
function closeEditSession(){ editSess=null; editRep=null; closeSheet(); render(); }

async function del(i, skipConfirm){ if(skipConfirm || await uiConfirm('Törlöd ezt az edzést?', {ok:'Törlés', danger:true})){
  const s=S.sessions[i];
  if(s){ tombstone((s.t||0)+'|'+(s.day||''));
    // Kuka: a törölt edzés 3 napig visszahívható (helyi, additív `trash`).
    trashPurge(); S.trash.push({s, at:Date.now()}); }
  S.sessions.splice(i,1); await save(); flushCloud(); render();
  if(s) toast('Edzés a kukában – 3 napig visszahozható (Napló ⋯ menü).'); } }
/* ---- Kuka: törölt edzések 3 napig ----------------------------------
   `S.trash = [{s, at}]` – additív, HELYI mező (a mentésfájl is viszi). A
   törlés síremléke ettől változatlanul megy a felhőbe; a visszahozás
   `untomb`-bal élesít, így a felhő-unió sem öli meg újra. */
const TRASH_DAYS=3;
function trashPurge(){ const lim=Date.now()-TRASH_DAYS*864e5;
  S.trash=(S.trash||[]).filter(x=>x && x.s && x.at>lim); return S.trash; }
async function trashRestore(i){ const it=trashPurge()[i]; if(!it) return;
  const s=it.s; S.trash.splice(i,1);
  untomb((s.t||0)+'|'+(s.day||''));
  if(!S.sessions.some(x=>x.t===s.t && x.day===s.day)){ S.sessions.push(s); S.sessions.sort((a,b)=>a.t-b.t); }
  await save(); flushCloud(); render(); toast('Edzés visszaállítva.');
  if(S.trash.length) openTrash(); else closeSheet(); }
function openTrash(){ const list=trashPurge();
  const left=x=>{ const h=Math.max(0,Math.ceil((x.at+TRASH_DAYS*864e5-Date.now())/36e5)); return h>=24?Math.ceil(h/24)+' nap':h+' óra'; };
  document.getElementById('sheetIn').innerHTML=`<div class="grabber"></div>
    <div class="row" style="align-items:baseline"><span class="eyebrow grow">Napló</span>
      <button onclick="closeSheet()" style="font-size:26px;color:var(--dim);padding:0 8px">×</button></div>
    <h2 style="font-size:24px;margin:2px 0 4px">Kuka</h2>
    <p class="small dim" style="margin:0 0 12px">A törölt edzés ${TRASH_DAYS} napig visszahozható, utána végleg törlődik.</p>
    ${list.length ? `<div class="card"><div class="pad" style="padding-top:4px;padding-bottom:4px">`+list.map((x,i)=>`<div class="row trow" style="gap:10px;padding:8px 0;min-height:56px">
      <span class="grow" style="min-width:0"><span style="font-weight:600;display:block">${esc(dayName(x.s))}</span>
      <span class="small dim">${fmtDate(x.s.t)} · még ${left(x)}</span></span>
      <button class="btn" style="width:auto;margin:0;padding:10px 14px;color:var(--brass)" onclick="trashRestore(${i})">Visszaállítás</button></div>`).join('')+`</div></div>`
      : '<div class="empty">A kuka üres.</div>'}`;
  openSheet(); }   // a tombstone azonnal a felhőbe
function copyAll(){
  let t='Edzésnapló\n\n';
  S.sessions.forEach(s=>{ const d=dayDef(s.day)||{ex:[]};
    t+=fmtDate(s.t)+' — '+dayName(s)+'\n';
    const seen=new Set();
    d.ex.forEach(e=>{seen.add(e.id); const l=s.log[e.id]; if(l&&l.sets.some(x=>x!=null))
      t+='  '+e.n+': '+wLabel(e,l.w)+(e.bw&&l.w<=0?'':' kg')+' × '+setsTxt(l)+'\n';});
    Object.keys(s.log).forEach(id=>{ if(seen.has(id))return; const l=s.log[id];
      if(!l.sets.some(x=>x!=null))return; const e=exDef(id);
      t+='  '+e.n+' (kivéve): '+wLabel(e,l.w)+(e.bw&&l.w<=0?'':' kg')+' × '+setsTxt(l)+'\n';});
    t+='\n'; });
  // A másolás SIKERE nyugtázás; a kudarc modál, mert ott kézzel kell másolni.
  navigator.clipboard.writeText(t).then(()=>toast('Vágólapra másolva. Beillesztheted a chatbe.'),()=>uiAlert('Nem sikerült a másolás.'));
}

