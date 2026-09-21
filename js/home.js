/* ==================================================================
   Fooldal: "Mit edzek ma?", heti nezet, nap->hetkoznap beosztas,
   terv-lista, gyogytorna oldal es az edzes inditasa (startDay).
   ================================================================== */
// „Mit edzek ma?" – az aktív terv azon napját ajánlja, amelyik a legtöbb,
// ezen a héten elhanyagolt (kevés szettet kapott) izomcsoportot fedi le.
function suggestDay(){
  const act=activeProg(); if(!act||!act.days||!act.days.length) return null;
  // HA van heti beosztás, az a mérvadó: a mai napra betett, még meg nem
  // csinált edzést ajánljuk. Az izomtérkép-alapú ajánlás azért van, hogy
  // beosztás NÉLKÜL is legyen mit mondani – nem írja felül a döntésedet.
  const maWd=(new Date().getDay()+6)%7, ws=weekStart(Date.now());
  const maiak=schedFor(maWd).filter(id=>!(S.sessions||[]).some(x=>(x.t||0)>=ws && x.day===id));
  if(maiak.length){ const d=dayDef(maiak[0]);
    if(d) return { dayId:d.id, name:d.name, score:0, lastT:0, covers:[], needy:[], sched:true }; }
  const wk=weeklyMgSets();
  let needy=MGS.filter(mg=>!wk[mg]);                       // ezen a héten 0 szett
  if(!needy.length) needy=[...MGS].sort((a,b)=>(wk[a]||0)-(wk[b]||0)).slice(0,2);
  const needSet=new Set(needy);
  let best=null;
  act.days.forEach(dId=>{ const d=dayDef(dId); if(!d) return;
    const covered=new Set(); d.ex.forEach(e=>{ if(needSet.has(e.mg)) covered.add(e.mg); });
    const last=[...S.sessions].reverse().find(s=>s.day===dId), lastT=last?last.t:0;
    if(!best || covered.size>best.score || (covered.size===best.score && lastT<best.lastT))
      best={dayId:dId, name:d.name, score:covered.size, lastT, covers:[...covered]};
  });
  if(!best || best.score===0) return null;
  return {...best, needy};
}
/* ---- Heti nézet – előre is lássunk, ne csak vissza ------------------
 * A hét HÉTFŐTŐL indul (ugyanaz a `weekStart`, mint a sorozatnál, a heti
 * izomtérképnél és az edzői exportnál), hogy a felület egységesen értse a
 * „hetet". Két dolgot mutat, és egyiket sem TALÁLJA KI: mit edzettél eddig
 * ezen a héten (a naplóból), és az aktív terv mely napjai vannak még hátra.
 * Az appban NINCS nap→hétköznap beosztás – ezért a hátralévő napok listája
 * SORREND, nem menetrend; nem teszünk úgy, mintha lenne órarended. */
const WDAY=['H','K','Sze','Cs','P','Szo','V'];
function weekDays(){
  const ws=weekStart(Date.now()), ma=new Date(new Date().setHours(0,0,0,0)).getTime();
  return WDAY.map((lbl,i)=>{
    const t0=ws+i*864e5, t1=t0+864e5;
    const sess=(S.sessions||[]).filter(s=>(s.t||0)>=t0 && (s.t||0)<t1);
    const k=bwKey(t0);
    return { lbl, t:t0, ma:t0===ma, jovo:t0>ma, sess,
      pihen: !sess.length && !!((S.bw&&S.bw[k]) || (S.sleep&&S.sleep[k])) };
  });
}
// Az aktív terv napjai + megvolt-e MÁR EZEN A HÉTEN.
function weekPlan(){
  const act=activeProg(), ws=weekStart(Date.now());
  return ((act&&act.days)||[]).map(id=>{ const d=dayDef(id); if(!d) return null;
    const s=(S.sessions||[]).find(x=>(x.t||0)>=ws && x.day===id);
    return { id, name:d.name, done:!!s, t:s?s.t:0 };
  }).filter(Boolean);
}
/* ---- Nap → hétköznap beosztás (opcionális) --------------------------
 * `S.sched[dayId] = [0..6]` – MELY hétköznapokra tetted be azt az edzést
 * (0 = hétfő, a `WDAY` sorrendje). Kulcsolt, additív mező: a felhő-szinkron
 * per-kulcs unióban viszi, mint a `weights`/`prog`-ot.
 * Ez OPCIONÁLIS: beosztás nélkül a heti nézet változatlanul sorrendet mutat,
 * nem menetrendet – nem találunk ki órarendet magunktól. */
function schedOf(dayId){ const a=(S.sched||{})[dayId]; return Array.isArray(a)?a:[]; }
// Egy hétköznapra betett edzések (az AKTÍV tervből, hogy törölt vagy más
// tervhez tartozó nap ne szivárogjon be).
function schedFor(wd){
  const act=activeProg(), ids=(act&&act.days)||[];
  return ids.filter(id=>schedOf(id).includes(wd));
}
function schedHas(){ return Object.values(S.sched||{}).some(a=>Array.isArray(a)&&a.length); }
function schedToggle(dayId, wd){
  if(!S.sched) S.sched={};
  const cur=schedOf(dayId).slice(), i=cur.indexOf(wd);
  if(i>=0) cur.splice(i,1); else cur.push(wd);
  if(cur.length) S.sched[dayId]=cur.sort((a,b)=>a-b); else delete S.sched[dayId];
  save(); renderSchedSheet();
}
function openSchedSheet(){ renderSchedSheet(); openSheet(); }
function renderSchedSheet(){
  const act=activeProg(), ids=(act&&act.days)||[];
  let h=`<div class="grabber"></div>
    <div class="row"><div class="grow"><span class="eyebrow">${tr('Heti beosztás')}</span>
      <h2 style="font-size:22px">${tr('Melyik nap mi?')}</h2>
      <span class="small dim">${tr('Nem kötelező – beosztás nélkül a heti nézet csak sorrendet mutat.')}</span></div>
      <button onclick="closeSheet();render()" style="font-size:26px;color:var(--dim);padding:0 8px">×</button></div>`;
  if(!ids.length) return void (document.getElementById('sheetIn').innerHTML =
    h+`<div class="empty" style="padding:18px 0">Az aktív tervedben nincs edzésnap.</div>`);
  ids.forEach(id=>{ const d=dayDef(id); if(!d) return;
    h+=`<div class="card" style="margin-top:10px"><div class="pad">
      <div class="cond" style="font-size:17px;font-weight:600">${esc(trn(d.name))}</div>
      <div class="whyrow" style="margin-top:8px">`
      + WDAY.map((lbl,i)=>`<button class="whyc ${schedOf(id).includes(i)?'on':''}"
          onclick="schedToggle('${id}',${i})">${lbl}</button>`).join('')
      + `</div></div></div>`; });
  h+=`<div class="small dim" style="margin-top:12px">${tr('Egy edzés több napra is betehető (pl. hétfő és csütörtök). A beosztás csak javaslat – bármikor indíthatsz bármit.')}</div>`;
  if(schedHas()) h+=`<button class="btn" style="margin-top:10px;color:var(--red)" onclick="schedClear()">${tr('Beosztás törlése')}</button>`;
  h+=`<button class="btn pri" style="margin-top:10px" onclick="closeSheet();render()">${tr('Kész')}</button>`;
  document.getElementById('sheetIn').innerHTML=h;
}
async function schedClear(){
  if(!await uiConfirm('Törlöd a heti beosztást?\n(Az edzéseid és terveid megmaradnak.)', {ok:'Törlés', danger:true})) return;
  S.sched={}; save(); renderSchedSheet();
}

function weekPlanCard(){
  const days=weekDays(), terv=weekPlan();
  const meg=terv.filter(x=>!x.done), kesz=terv.length-meg.length;
  let h=`<div class="card"><div class="pad">
    <div class="row" style="align-items:baseline">
      <span class="eyebrow grow">${tr('Ez a hét')}</span>
      ${terv.length?`<span class="small dim">${kesz}/${terv.length} edzés</span>`:''}</div>
    <div class="wkrow">`;
  days.forEach((d,i)=>{
    const cls = d.sess.length ? 'done' : d.pihen ? 'rest' : '';
    const jel = d.sess.length ? (d.sess.length>1?d.sess.length:'✓') : d.pihen ? '·' : '';
    // Beosztott, de még meg nem csinált edzés: a cella alatt a nap neve.
    const terve = d.sess.length ? [] : schedFor(i).map(id=>(dayDef(id)||{}).name).filter(Boolean);
    h+=`<div class="wkday"><span class="wklbl"${d.ma?' style="color:var(--brass)"':''}>${d.lbl}</span>
      <span class="wkcell ${cls}${d.ma?' today':''}${d.jovo?' future':''}"
        title="${fmtDate(d.t)}${d.sess.length?' – '+d.sess.map(x=>esc(dayName(x))).join(', '):(terve.length?' – terv: '+terve.map(esc).join(', '):'')}">${jel}</span>
      ${terve.length?`<span class="wkplan">${esc(terve[0])}${terve.length>1?' +'+(terve.length-1):''}</span>`:''}</div>`;
  });
  h+=`</div>`;
  if(terv.length){
    h+=`<div class="small mut" style="margin-top:12px">${meg.length
      ? tr('Az aktív tervedből még hátra van:')
      : tr('A tervedet végigcsináltad ezen a héten. Szép munka.')}</div>`;
    const maWd=(new Date().getDay()+6)%7;
    // Beosztással: a MAI napra betett edzés kerül előre, és ki is mondjuk.
    const rend=meg.slice().sort((a,b)=>
      (schedOf(b.id).includes(maWd)?1:0)-(schedOf(a.id).includes(maWd)?1:0));
    rend.forEach(x=>{ const ma=schedOf(x.id).includes(maWd);
      const napok=schedOf(x.id).map(i=>WDAY[i]).join(', ');
      h+=`<button class="btn" style="text-align:left;margin-top:8px${ma?';border-color:var(--brass)':''}" onclick="startDay('${x.id}')">
      <span style="font-weight:600">${esc(x.name)}</span>
      <span class="small dim" style="display:block;margin-top:2px">${ma?'<span style="color:var(--brass)">'+tr('Mára beosztva')+'</span> · ':(napok?esc(napok)+' · ':'')}${tr('Kezdés ›')}</span></button>`; });
    const done=terv.filter(x=>x.done);
    if(done.length) h+=`<div class="small dim" style="margin-top:10px">${tr('Megvolt:')} ${done.map(x=>esc(x.name)+' <span style="color:var(--sage)">✓</span>').join(' · ')}</div>`;
    h+=`<button class="btn" style="margin-top:10px;color:var(--mut)" onclick="openSchedSheet()">${schedHas()?tr('Heti beosztás módosítása'):tr('Heti beosztás megadása')}</button>`;
  }
  return h+`</div></div>`;
}
function homeView(){
  const done = S.sessions.length;
  const wk = S.sessions.filter(s=>Date.now()-s.t < 6048e5).length;
  const lastT = done ? Math.max(...S.sessions.map(s=>s.t)) : 0;
  const daysSince = done ? Math.floor((Date.now()-lastT)/864e5) : null;
  const ago = daysSince==null?'':(daysSince<=0?'ma':daysSince===1?'tegnap':daysSince+' napja');
  let h='';
  if(storeMode==='none') h+=`<div class="wrap"><div class="card" style="border-color:var(--red);margin-top:16px"><div class="pad">
    <span class="cond" style="font-size:18px;font-weight:600;color:var(--red)">A mentés nem működik</span>
    <div class="small mut" style="margin-top:4px">Ez a böngésző letiltotta a helyi tárolást. Kapcsold ki a privát böngészést, vagy engedélyezd a sütiket ehhez az oldalhoz – különben minden bezáráskor elvesznek az adatok.</div></div></div></div>`;
  // A főoldal hőse a készenlét-kártya; a „Melyik nap jön?" fejléc-blokk
  // kikerült (a nap kiválasztását a kártyák és a „Mit edzek ma?" viszik).
  // A rövid összegző sor marad – az valódi információ.
  h += `<div class="wrap">${done?`<div class="top" style="padding-bottom:0">
    <p class="mut small" style="margin:0">${done} edzés összesen · ${wk} az elmúlt 7 napban · utoljára ${ago}</p></div>`:''}`;
  // Finom emlékeztető, ha csúszol (a rendszeresség a lényeg). Magától eltűnik,
  // amint legközelebb edzel.
  if(done && daysSince>=5 && !S.active) h+=`<div class="card" style="border-color:var(--brass)"><div class="pad">
    <span class="cond" style="font-size:17px;font-weight:600">Már ${daysSince} napja nem edzettél</span>
    <div class="small mut" style="margin-top:2px">A rendszeresség többet ér a tökéletes edzésnél. Válassz egy napot alább, és csak kezdd el.</div></div></div>`;
  if(needsBackup()) h+=`<div class="card" style="border-color:var(--brass)"><div class="pad">
    <div class="row"><div class="grow"><span class="cond" style="font-size:17px;font-weight:600">${tr('Rég mentettél biztonsági másolatot')}</span>
    <div class="small mut" style="margin-top:2px">${tr('Kézi mentésre senki nem emlékszik, amíg el nem veszti az adatait.')}</div></div>
    <button onclick="dismissNag()" class="small dim" style="padding:8px">${tr('Később')}</button></div>
    <button class="btn pri" style="margin-top:10px" onclick="backup()">${tr('Mentés most')}</button></div></div>`;
  if(injuryOn()) h+=`<div class="card" style="border-color:var(--red)"><div class="pad">
    <span class="cond" style="font-size:17px;font-weight:600;color:var(--red)">Sérülés-mód aktív – ${S.injury.parts.join(', ')}</span>
    <div class="small mut" style="margin-top:2px">Új edzésnél az érintett gyakorlatok kimaradnak, a többi súlya csökken.</div>
    <div class="row" style="gap:8px;margin-top:10px">
      <button class="btn" style="flex:1;margin:0" onclick="openInjury()">Módosítás / kikapcsolás</button>
      <button class="btn" style="flex:1;margin:0" onclick="openPhysio('${REG_FOR_MG[S.injury.parts[0]]||''}')">Gyógytorna ›</button>
    </div></div></div>`;
  if(S.active){
    const d=dayDef(S.active.day) || {name:S.active.dayName||'Edzés', ex:[]};
    const exN=d.ex.filter(e=>S.active.log[e.id]).length;
    const doneN=d.ex.filter(e=>exDone(e,S.active.log[e.id])).length;
    const frac=exN?doneN/exN:0, R=19, C=2*Math.PI*R, off=(C*(1-frac)).toFixed(1);
    const pct=Math.round(frac*100);
    h+=`<div class="card" style="border-color:var(--brass)"><button class="daybtn" onclick="resumePlayer()">
      <span class="miniring" role="img" aria-label="${pct}% kész">
        <svg viewBox="0 0 46 46" aria-hidden="true">
          <circle class="mr-bg" cx="23" cy="23" r="${R}"></circle>
          <circle class="mr-fg" cx="23" cy="23" r="${R}" style="stroke-dasharray:${C.toFixed(1)};stroke-dashoffset:${off}"></circle>
        </svg>
        <span class="mr-ic">${ICON.play}</span></span>
      <span class="grow"><span class="cond" style="font-size:21px;font-weight:600;display:block">${tr('Folytatás')} – ${esc(trn(d.name))}</span>
      <span class="small dim">${doneN}/${exN} gyakorlat kész</span></span>
      <span style="color:var(--brass);font-size:22px">›</span></button></div>`;
  }
  // Mai készenlét – a nap fő száma. Csak akkor jelenik meg, ha van hozzá
  // valódi adat (lásd `readiness()`); üres naplónál nincs kitalált szám.
  h+=rdyHomeCard();
  // „Mit edzek ma?" – a heti hiányokat lefedő nap ajánlása (ha nem edzett ma
  // és nincs folyamatban lévő edzés).
  if(!S.active && daysSince!==0){
    const sug=suggestDay();
    if(sug){
      const freshWeek = sug.needy.length===MGS.length;   // ezen a héten még nincs edzés
      const covers = `<b>${sug.covers.map(esc).join(', ')}</b>`;
      const reason = sug.sched
        ? tr('A heti beosztásod szerint ez van mára.')
        : freshWeek
        ? `Kiegyensúlyozott kezdés a héthez – terheli: ${covers}.`
        : `A héten kimaradt: ${covers} – ez a nap pótolja.`;
      h+=`<div class="card" style="border-color:var(--brass)"><div class="pad">
        <span class="eyebrow" style="color:var(--brass)">${tr('Mit edzek ma?')}</span>
        <div class="cond" style="font-size:19px;font-weight:600;margin-top:4px">${esc(sug.name)}</div>
        <div class="small mut" style="margin:2px 0 10px">${reason}</div>
        <button class="btn pri" onclick="startDay('${sug.dayId}')">${tr('Kezdés ›')}</button></div></div>`;
    }
  }
  // Heti nézet: mi van meg és mi van hátra. Üres naplónál nem kerül ki –
  // első indításkor még nincs mit összegezni.
  if(done) h+=weekPlanCard();
  // Napi testsúly + alvás – edzés nélküli napon is (mindig látható)
  h+=bwHomeCard();
  h+=sleepHomeCard();
  // Edzéstervek: aktív választó + a kiválasztott terv napjai
  const plist=programsList(), act=activeProg();
  if(plist.length>1){
    h+=`<div class="top" style="padding:16px 0 6px"><span class="eyebrow">Aktív edzésterv</span></div>
      <div class="whyrow" style="margin-bottom:6px">`+
      plist.map(p=>`<button class="whyc ${act&&p.id===act.id?'on':''}" onclick="setActiveProgram('${p.id}')">${esc(p.builtin?'Alapterv':p.name)}</button>`).join('')
      +`</div>`;
  }
  if(act){
    h+=`<div class="top" style="padding:12px 0 8px"><div class="row"><span class="eyebrow grow">${esc(act.name)}</span>
      <button class="iconbtn" onclick="openSharePlan('${act.id}')" aria-label="Megosztás baráttal" title="Megosztás baráttal">${ICON.share}</button>
      ${act.builtin
        ? `<button class="iconbtn" onclick="deletePlan()" aria-label="Alapterv törlése" title="Alapterv törlése" style="color:var(--red)">×</button>`
        : `<button class="iconbtn" onclick="openProgram('${act.id}')" aria-label="Szerkesztés" title="Szerkesztés">${ICON.edit}</button>`}
      </div></div>`;
    const dayIds=act.days;
    const lastInProg=[...S.sessions].reverse().find(s=>dayIds.indexOf(s.day)>=0);
    const nextIdx = lastInProg ? (dayIds.indexOf(lastInProg.day)+1)%dayIds.length : 0;
    dayIds.forEach((dId,i)=>{ const d=dayDef(dId); if(!d) return;
      const last=[...S.sessions].reverse().find(s=>s.day===dId);
      const pIdx=PLAN.findIndex(x=>x.id===dId);
      const tag = pIdx>=0 ? (pIdx+1) : ICON.dumbbell;
      const isNext = i===nextIdx && !S.active;
      h+=`<div class="card"><button class="daybtn" onclick="startDay('${dId}')">
        <span class="daytag">${tag}</span>
        <span class="grow"><span class="cond" style="font-size:21px;font-weight:600;display:block">${esc(trn(d.name))}${isNext?'<span class="pill">'+tr('KÖVETKEZŐ')+'</span>':''}</span>
        <span class="small dim">${esc(trn(d.sub)||(d.ex.length+' '+tr('gyakorlat')))}${last?' · utoljára '+fmtDate(last.t):' · még nem volt'}</span></span>
        <span style="color:var(--dim);font-size:22px">›</span></button></div>`;
    });
  }
  // Saját edzések (amik nincsenek egyik tervben sem)
  const inProg=new Set(); (S.programs||[]).forEach(p=>p.days.forEach(x=>inProg.add(x)));
  const loose=(S.routines||[]).filter(r=>!inProg.has(r.id));
  if(loose.length){
    h+=`<div class="top" style="padding:18px 0 8px"><span class="eyebrow">Saját edzések</span></div>`;
    loose.forEach(r=>{ const last=[...S.sessions].reverse().find(s=>s.day===r.id);
      h+=dayCard(r.id, r.name, trn(r.sub)||(r.ex.length+' '+tr('gyakorlat')), last, true); });
  }
  // Összeállítás/kezelés a külön „Tervek" fülön. Itt csak akkor mutatunk
  // belépőt, ha nincs mit startolni (különben a főoldal a startolható
  // aktív edzésekre/tervekre fókuszál).
  if(!act && !loose.length && !S.active){
    h+=`<div class="card"><div class="pad">
      <span class="cond" style="font-size:18px;font-weight:600">Nincs még edzésterved</span>
      <div class="small mut" style="margin:4px 0 10px">Állíts össze egyet, vagy válassz kész sablont a Tervek fülön.</div>
      <button class="btn pri" onclick="tab='plans';render();window.scrollTo(0,0)">Tervek fül ›</button></div></div>`;
  }
  // A „Tervek és edzések kezelése" és a „Gyógytorna / mobilitás" belépő
  // kikerült a főoldalról: az előbbi az alsó nav „Tervek" füle, az utóbbi a
  // felső sáv állandó gyógytorna-ikonja (`physioBtn`) – mindkettő egy
  // koppintás, a főoldalon csak zaj volt.
  return h+'</div>';
}

/* ---- Gyógytorna / mobilitás oldal --------------------------------- */
function openPhysio(region){ physioRegion=region||physioRegion||''; tab='physio'; render(); window.scrollTo(0,0); }
function setPhysioRegion(id){ physioRegion=id; render(); window.scrollTo(0,0); }
// A referenciából saját gyakorlatot készít (customEx), hogy edzésbe tehető
// és naplózható legyen. A testtáj → izomcsoport a REGION_MG-ből.
function addRehabAsCustom(rid, exid){
  const reg=REHAB.find(r=>r.id===rid), e=reg&&reg.ex.find(x=>x.id===exid); if(!e) return;
  const parts=String(e.r).split('×'); const sets=parseInt(parts[0])||2; const reps=(parts[1]||'10').trim();
  const id=uid('cx_');
  S.customEx[id]={id, n:e.n, mg:REGION_MG[rid]||'törzs', s:sets, r:reps, w:0, inc:2.5, rest:45, bw:1, ...(e.time?{time:1}:{})};
  save(); toast('„'+exN(e)+'" felvéve a saját gyakorlataid közé – edzésbe teheted a Tervek fülön.');
}
function physioView(){
  const reg=REHAB.find(r=>r.id===physioRegion)||REHAB[0]; physioRegion=reg.id;
  let h=`<div class="wrap"><div class="top"><span class="eyebrow">Gyógytorna · mobilitás</span>
    <h1 style="font-size:34px;margin-top:4px">Mozgás &amp; prehab</h1>
    <p class="mut small" style="margin:6px 0 0">Testtájankénti mobilitás-, nyújtó- és stabilizáló gyakorlatok.</p></div>
    <div class="card" style="border-color:var(--brass)"><div class="pad small mut">
      <b style="color:var(--brass)">Fontos:</b> ez általános mozgásanyag, <b>nem orvosi tanács</b>.
      Fájdalom, friss vagy tartós sérülés esetén fordulj gyógytornászhoz/orvoshoz. Fájdalmasan soha ne erőltesd.
    </div></div>
    <div class="whyrow" style="flex-wrap:wrap;margin:12px 0 8px">`+
    REHAB.map(r=>`<button class="whyc ${r.id===reg.id?'on':''}" onclick="setPhysioRegion('${r.id}')">${esc(trn(r.name))}</button>`).join('')
    +`</div>`;
  h+=`<button class="btn pri" style="margin:0 0 12px;display:flex;align-items:center;justify-content:center;gap:8px" onclick="startPhysioRoutine('${reg.id}')">${ICON.play} 5 perces rutin – ${esc(reg.name)}</button>
    <p class="small dim" style="margin:-4px 2px 12px">Vezetett kör: minden gyakorlat 1 sor, rövid váltással; a tartásokat óra méri. Nem kerül a naplóba.</p>`;
  reg.ex.forEach(e=>{
    h+=`<div class="card"><div class="pad">
      <div class="row" style="align-items:baseline"><span class="cond grow" style="font-size:18px;font-weight:600">${esc(exN(e))}</span>
        <span class="small dim" style="white-space:nowrap">${esc(e.r)}</span></div>
      <div class="small mut" style="margin:4px 0 10px">${esc(e.cue)}</div>
      <div class="row" style="gap:8px">
        <a class="btn" href="${videoUrl(e)}" target="_blank" rel="noopener noreferrer" style="flex:1;margin:0;display:flex;align-items:center;justify-content:center;gap:8px">${ICON.video} Videó</a>
        <button class="btn" style="flex:1;margin:0" onclick="addRehabAsCustom('${reg.id}','${e.id}')">Felvétel gyakorlatként</button>
      </div></div></div>`;
  });
  return h+'</div>';
}
// „Tervek" fül: az edzések és edzéstervek KEZELÉSE (létrehozás, szerkesztés,
// sablonok, saját gyakorlatok). A főoldal csak a startolható aktívokat mutatja.
function plansView(){
  let h=`<div class="wrap"><div class="top"><span class="eyebrow">Összeállítás</span>
    <h1 style="font-size:34px;margin-top:4px">Tervek és edzések</h1>
    <p class="mut small" style="margin:6px 0 0">Hozz létre, szerkessz, vagy válassz kész sablont.</p></div>`;
  const plist=programsList();
  if(plist.length){
    h+=`<div class="top" style="padding:16px 0 6px"><span class="eyebrow">Edzéstervek</span></div>`;
    plist.forEach(p=>{
      const days=p.days.map(d=>{const dd=dayDef(d);return dd?esc(dd.name):null;}).filter(Boolean).join(' · ');
      h+=`<div class="card"><div class="pad"><div class="row" style="align-items:baseline">
        <span class="cond grow" style="font-size:19px;font-weight:600">${esc(p.builtin?'Alapterv':p.name)}</span>
        <span class="small dim">${p.days.length} nap</span></div>
        <div class="small mut" style="margin:4px 0 10px">${days}</div>
        <div class="row" style="gap:8px">
          ${p.builtin
            ? `<button class="btn ghost" style="flex:1;margin:0;color:var(--red)" onclick="deletePlan()">Elrejtés</button>`
            : `<button class="btn" style="flex:1;margin:0" onclick="openProgram('${p.id}')">Szerkesztés</button>`}
          <button class="btn" style="flex:0 0 40%;margin:0" onclick="openSharePlan('${p.id}')">Megosztás</button>
        </div>
        ${p.builtin?'':`<button class="btn ghost" style="margin-top:8px;color:var(--red)" onclick="deleteProgram('${p.id}')">Terv törlése</button>`}
        </div></div>`;
    });
  }
  if((S.routines||[]).length){
    h+=`<div class="top" style="padding:16px 0 6px"><span class="eyebrow">Saját edzések</span></div>`;
    S.routines.forEach(r=>{
      h+=`<div class="card"><div class="pad"><div class="row" style="align-items:baseline">
        <span class="cond grow" style="font-size:18px;font-weight:600">${esc(r.name)}</span>
        <span class="small dim">${r.ex.length} gyakorlat</span></div>
        <div class="row" style="gap:8px;margin-top:8px">
          <button class="btn" style="flex:1;margin:0" onclick="openBuilder('${r.id}')">Szerkesztés</button>
          <button class="btn ghost" style="flex:0 0 40%;margin:0;color:var(--red)" onclick="deleteRoutine('${r.id}')">Törlés</button>
        </div></div></div>`;
    });
  }
  // Korábban öt egyforma, teljes szélességű gomb állt itt egymás alatt,
  // pedig négy közülük ugyanazt a kérdést válaszolja meg: „hogyan csinálok
  // újat?". Egy elsődleges gomb, mögötte a négy út – a „Saját gyakorlatok"
  // marad külön, mert az nem új dolog létrehozása, hanem karbantartás.
  h+=`<button class="btn pri" style="margin-top:14px" onclick="openNewPlan()">+ Új edzés vagy terv</button>
      ${S.hidePlan?`<button class="btn ghost" style="margin-top:8px;color:var(--mut)" onclick="restorePlan()">Beépített alapterv visszaállítása</button>`:''}
      <button class="btn ghost" style="margin-top:8px;margin-bottom:4px;color:var(--mut)" onclick="openManageEx()">Saját gyakorlatok kezelése${(S.customEx&&Object.keys(S.customEx).length)?' ('+Object.keys(S.customEx).length+')':''}</button>`;
  return h+'</div>';
}
// A négy „újat csinálok" út egy lapon. A sorrend a valószínűség szerint:
// a kész sablon a leggyorsabb kiindulás, a nulláról építés a legritkább.
function openNewPlan(){
  document.getElementById('sheetIn').innerHTML=`
    <div class="row" style="align-items:baseline"><span class="eyebrow grow">Összeállítás</span>
      <button onclick="closeSheet()" style="font-size:26px;color:var(--dim);padding:0 8px">×</button></div>
    <h2 style="font-size:24px;margin:2px 0 4px">Új edzés vagy terv</h2>
    <p class="mut small" style="margin:0 0 14px">Indulj kész sablonból, hozz be AI-tervet, vagy állítsd össze magad.</p>
    <button class="btn pri" style="margin-bottom:8px" onclick="closeSheet();openStarters()">Kész edzések és tervek ›</button>
    <button class="btn" style="margin-bottom:8px" onclick="closeSheet();openAiImport()">AI-terv importálása ›</button>
    <button class="btn" style="margin-bottom:8px" onclick="closeSheet();openBuilder()">+ Új edzés</button>
    <button class="btn" style="margin-bottom:6px" onclick="closeSheet();openProgram()">+ Új edzésterv</button>`;
  openSheet();
}
async function deletePlan(){ if(!await uiConfirm('Elrejted a beépített alaptervet (Push/Pull)?\nA naplózott edzéseid megmaradnak, és bármikor visszaállíthatod.', {ok:'Elrejtés', danger:true})) return;
  S.hidePlan=true; save(); render(); window.scrollTo(0,0); }
function restorePlan(){ S.hidePlan=false; save(); render(); window.scrollTo(0,0);
}
function dayCard(id,name,sub,last,editable){
  return `<div class="card"><div class="row" style="gap:0">
    <button class="daybtn grow" onclick="startDay('${id}')">
      <span class="daytag">${ICON.dumbbell}</span>
      <span class="grow"><span class="cond" style="font-size:21px;font-weight:600;display:block">${esc(name)}</span>
      <span class="small dim">${esc(sub)}${last?' · utoljára '+fmtDate(last.t):''}</span></span></button>
    ${editable?`<button class="iconbtn" style="margin:0 12px 0 0" onclick="openBuilder('${id}')" aria-label="Szerkesztés" title="Szerkesztés">${ICON.edit}</button>`:''}
  </div></div>`;
}

function roundTo(v,step){ return Math.max(0, Math.round(v/step)*step); }
async function startDay(id){
  if(S.active && !(await uiConfirm('Van egy folyamatban lévő edzés. Eldobod és újat kezdesz?', {ok:'Új edzés', danger:true}))) return;
  // Kihagyás-felismerés: 10 napnál hosszabb szünet után visszalépést ajánl.
  const lastT = S.sessions.length ? S.sessions[S.sessions.length-1].t : 0;
  const gap = lastT ? (Date.now()-lastT)/864e5 : 0;
  let deload=false;
  if(gap>10) deload = await uiConfirm(Math.round(gap)+' nap kihagyás.\n\nKérsz visszalépést? (kb. -15% súly és több ismétlés a célhoz, hogy fokozatosan épülj vissza.)', {ok:'Igen, visszalépés', cancel:'Nem'});
  const d=dayDef(id); if(!d){ return; }
  S.active={day:id,t:Date.now(),log:{},deload:deload,dayName:d.name}; S.activeT=Date.now();
  d.ex.forEach(e=>{
    if(exAffected(e)) return;                 // sérülés-mód: érintett gyakorlat kimarad
    // Előírt súly (edzőterv): addig érvényes, amíg ezt a gyakorlatot az
    // előírás ÓTA nem edzetted le – onnantól a saját haladásod viszi.
    let w = (e.ovW && lastForT(e.id) <= (d.at||0)) ? e.w : startW(e.id);
    if(deload && !e.bw) w=roundTo(w*0.85, e.inc);
    S.active.log[e.id]={w:w,sets:new Array(e.s).fill(null)};
  });
  // Superset-körök: a routine ssLinks-éből, csak a ténylegesen felvett
  // (sérülés miatt ki nem hagyott) gyakorlatokra szűrve. 2+ elemtől él.
  const groups=deriveGroups(d.ex.map(e=>e.id), d.ssLinks)
    .map(g=>g.filter(id=>S.active.log[id])).filter(g=>g.length>1);
  if(groups.length) S.active.ss=groups;
  curEx=0; playing=true; save(); render(); window.scrollTo(0,0);
}
// 5 perces mobilitás rutin indítása (testtájra). A lejátszót használja, de
// befejezéskor NEM naplózódik (nem edzés) – lásd finish().
async function startPhysioRoutine(rid){
  if(S.active && !(await uiConfirm('Van egy folyamatban lévő edzés. Eldobod és a mobilitás rutint kezded?', {ok:'Rutin indítása', danger:true}))) return;
  const d=dayDef('physio_'+rid); if(!d) return;
  S.active={day:d.id, t:Date.now(), log:{}, dayName:d.name}; S.activeT=Date.now();
  d.ex.forEach(e=>{ S.active.log[e.id]={w:0, sets:new Array(e.s).fill(null)}; });
  curEx=0; playing=true; save(); render(); window.scrollTo(0,0);
}
function isPhysioActive(){ return !!(S.active && String(S.active.day).indexOf('physio_')===0); }
function resumePlayer(){ if(S.active){ playing=true; render(); window.scrollTo(0,0); } }
function pausePlayer(){ playing=false; tab='home'; stopTimer(); render(); window.scrollTo(0,0); }
async function discardActive(){ if(await uiConfirm('Biztos eldobod ezt az edzést?', {ok:'Eldobás', danger:true})){ S.active=null; S.activeT=Date.now(); playing=false; stopTimer(); tab='home'; save(); render(); window.scrollTo(0,0); } }
function exNav(i){ const d=dayDef(S.active.day)||{ex:[]}; const n=d.ex.filter(x=>S.active.log[x.id]).length;
  curEx=Math.max(0,Math.min(n-1,i)); render(); window.scrollTo(0,0); }

