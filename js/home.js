/* ==================================================================
   Fooldal: "Mit edzek ma?", heti nezet, nap->hetkoznap beosztas,
   terv-lista, gyogytorna oldal es az edzes inditasa (startDay).
   ================================================================== */
// „Mit edzek ma?" – az aktív terv azon napját ajánlja, amelyik a legtöbb,
// ezen a héten elhanyagolt (kevés szettet kapott) izomcsoportot fedi le.
// Tartalék ajánlás, ha az izomtérkép nem mond semmit: az aktív terv
// SORRENDJÉBEN következő nap (a régi „KÖVETKEZŐ" címke logikája).
function nextPlanDay(){
  const act=activeProg(); if(!act||!act.days||!act.days.length) return null;
  const last=[...S.sessions].reverse().find(s=>act.days.indexOf(s.day)>=0);
  const id=act.days[last ? (act.days.indexOf(last.day)+1)%act.days.length : 0], d=dayDef(id);
  return d ? {dayId:id, name:d.name, covers:[], needy:[], seq:true} : null;
}
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
    // A hátralévők KOMPAKT gombsorban: korábban napnként egy teljes széles
    // gomb volt (négy nap = 280 px), pedig ugyanez a lista lent, a terv
    // kártyáin is ott van. Itt csak a gyors indítás kell.
    h+=`<div class="wkleft">`;
    rend.forEach(x=>{ const ma=schedOf(x.id).includes(maWd);
      const napok=schedOf(x.id).map(i=>WDAY[i]).join(', ');
      h+=`<button class="wkgo${ma?' ma':''}" onclick="startDay('${x.id}')" aria-label="${esc(x.name)} – ${tr('Kezdés ›')}">
      <span>${esc(x.name)}</span>${ma?`<small>${tr('Mára beosztva')}</small>`:(napok?`<small>${esc(napok)}</small>`:'')}</button>`; });
    h+=`</div>`;
    const done=terv.filter(x=>x.done);
    if(done.length) h+=`<div class="small dim" style="margin-top:10px">${tr('Megvolt:')} ${done.map(x=>esc(x.name)+' <span style="color:var(--sage)">✓</span>').join(' · ')}</div>`;
    h+=`<button class="btn ghost" style="margin-top:6px;color:var(--mut);font-size:14px" onclick="openSchedSheet()">${schedHas()?tr('Heti beosztás módosítása'):tr('Heti beosztás megadása')}</button>`;
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
  // v151: a „Kezdés" az ELSŐ képernyőn. Sorrend: folyamatban lévő edzés →
  // figyelmeztetés → kompakt készenlét → EGY ajánlás → hét → napi mérés.
  // A terv napjainak listája (a „KÖVETKEZŐ" címkével) kikerült: ugyanazt
  // mutatta, mint a heti kártya hátralévő gombjai, és MÁSIK napot ajánlott,
  // mint a „Mit edzek ma?". A mentés-emlékeztető a lap aljára került.
  h += `<div class="wrap">`;
  if(S.active){
    const d=dayDef(S.active.day) || {name:S.active.dayName||'Edzés', ex:[]};
    const _al=activeExList(), exN=_al.length;
    const doneN=_al.filter(e=>exDone(e,S.active.log[e.id])).length;
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
  if(done && daysSince>=5 && !S.active) h+=`<div class="notice"><span class="ntdot"></span>
    <div class="grow"><b>Már ${daysSince} napja nem edzettél</b>
    <div class="small mut">A rendszeresség többet ér a tökéletes edzésnél – csak kezdd el.</div></div></div>`;
  if(injuryOn()) h+=`<div class="card" style="border-color:var(--red)"><div class="pad">
    <span class="cond" style="font-size:17px;font-weight:600;color:var(--red)">Sérülés-mód aktív – ${S.injury.parts.map(trmg).join(', ')}</span>
    <div class="small mut" style="margin-top:2px">Új edzésnél az érintett gyakorlatok kimaradnak, a többi súlya csökken.</div>
    <div class="row" style="gap:8px;margin-top:10px">
      <button class="btn" style="flex:1;margin:0" onclick="openInjury()">Módosítás / kikapcsolás</button>
      <button class="btn" style="flex:1;margin:0" onclick="openPhysio('${REG_FOR_MG[S.injury.parts[0]]||''}')">Gyógytorna ›</button>
    </div></div></div>`;
  // Mai készenlét – kompakt sor; a részletek egy koppintásra (openRdySheet).
  const rd=readiness();
  h+=rdyHomeCard();
  if(!S.active && daysSince!==0){
    const sug=suggestDay() || nextPlanDay();
    if(sug){
      const freshWeek = sug.needy && sug.needy.length===MGS.length;
      const covers = `<b>${(sug.covers||[]).map(c=>esc(trmg(c))).join(', ')}</b>`;
      const reason = sug.seq ? tr('A terved sorrendjében ez jön.')
        : sug.sched ? tr('A heti beosztásod szerint ez van mára.')
        : freshWeek ? `Kiegyensúlyozott kezdés a héthez – terheli: ${covers}.`
        : `A héten kimaradt: ${covers} – ez a nap pótolja.`;
      // A készenlét és az ajánlás egy kártyán beszél: alacsony számnál nem
      // hallgatjuk el, hogy ma könnyíteni érdemes (a súlyt NEM állítjuk el).
      const low = rd && rd.band!=='jo' ? `<div class="sughint" style="--c:${rd.color}"><span class="rdydot" style="background:${rd.color}"></span>
        ${rd.band==='alacsony' ? 'Alacsony készenlét – ma menj kisebb súllyal vagy kevesebb szettel.' : 'Közepes készenlét – ne erőltesd a csúcsot.'}</div>` : '';
      h+=`<div class="card" style="border-color:var(--brass)"><div class="pad">
        <span class="eyebrow" style="color:var(--brass)">${tr('Mit edzek ma?')}</span>
        <div class="cond" style="font-size:19px;font-weight:600;margin-top:4px">${esc(trn(sug.name))}</div>
        <div class="small mut" style="margin:2px 0 10px">${reason}</div>${low}
        <button class="btn pri" onclick="startDay('${sug.dayId}')">${tr('Kezdés ›')}</button>
        <button class="btn ghost" style="margin-top:6px;color:var(--mut)" onclick="startFree()">${tr('vagy szabad edzés')}</button></div></div>`;
    }
  }
  if(done) h+=weekPlanCard();
  h+=dailyHomeCard();
  // Az aktív terv EGY sorban (a napjai a heti kártyán és a Tervek fülön).
  const plist=programsList(), act=activeProg();
  // Több terv esetén a választó MARAD: egy AI-import után ezzel tér vissza
  // egy koppintással a régi tervre (a CLAUDE.md „AI-terv importálása" része).
  if(plist.length>1) h+=`<div class="whyrow hscroll" style="margin:4px 0 6px">`+
      plist.map(p=>`<button class="whyc ${act&&p.id===act.id?'on':''}" onclick="setActiveProgram('${p.id}')">${esc(p.builtin?'Alapterv':p.name)}</button>`).join('')+`</div>`;
  if(act) h+=`<div class="card"><button class="daybtn" onclick="tab='plans';render();window.scrollTo(0,0)">
      <span class="daytag">${ICON.plans}</span>
      <span class="grow"><span class="small dim" style="display:block">${tr('Aktív terv')}</span>
      <span class="cond" style="font-size:19px;font-weight:600">${esc(act.builtin?'Alapterv · Push / Pull':act.name)}</span></span>
      <span style="color:var(--dim);font-size:22px">›</span></button></div>`;
  // Saját edzések (amik nincsenek egyik tervben sem)
  const inProg=new Set(); (S.programs||[]).forEach(p=>p.days.forEach(x=>inProg.add(x)));
  const loose=(S.routines||[]).filter(r=>!inProg.has(r.id));
  if(loose.length){
    h+=`<div class="top" style="padding:18px 0 8px"><span class="eyebrow">Saját edzések</span></div>`;
    loose.forEach(r=>{ const last=[...S.sessions].reverse().find(s=>s.day===r.id);
      h+=dayCard(r.id, r.name, trn(r.sub)||(r.ex.length+' '+tr('gyakorlat')), last, true); });
  }
  // Szabad edzés: csak ha nincs ajánló kártya (ott másodlagos gomb).
  if(!S.active && (daysSince===0 || !(suggestDay()||nextPlanDay()))) h+=`<div class="card"><button class="daybtn" onclick="startFree()">
      <span class="daytag">+</span>
      <span class="grow"><span class="cond" style="font-size:19px;font-weight:600;display:block">${tr('Szabad edzés')}</span>
      <span class="small dim">${tr('Menet közben rakod össze, gyakorlatról gyakorlatra')}</span></span>
      <span style="color:var(--dim);font-size:22px">›</span></button></div>`;
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
  // Mentés-emlékeztető a LAP ALJÁN: ráér, ne az első dolog legyen.
  if(needsBackup()) h+=`<div class="notice"><span class="ntdot"></span>
    <div class="grow"><b>${tr('Rég mentettél biztonsági másolatot')}</b>
    <div class="small mut">${tr('Kézi mentésre senki nem emlékszik, amíg el nem veszti az adatait.')}</div>
    <div class="row" style="gap:6px;margin-top:8px"><button class="nbtn" onclick="backup()">${tr('Mentés most')}</button>
    <button onclick="dismissNag()" class="nbtn ghost">${tr('Később')}</button></div></div></div>`;
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
    h+=`<div class="card phlist"><div class="pad">
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
  // Ugyanaz a nyelv, mint a Naplón/Haladáson: nincs nagy cím, egy elsődleges
  // gomb FELÜL, a karbantartó műveletek ikonként, a saját edzések egyetlen
  // kártyán soronként (korábban edzésenként egy kártya két teljes gombbal).
  const plist=programsList(), act=activeProg();
  const inProg=new Set(); (S.programs||[]).forEach(p=>p.days.forEach(x=>inProg.add(x)));
  const loose=(S.routines||[]).filter(r=>!inProg.has(r.id)), nR=loose.length;
  const lastOf=id=>{ for(let i=S.sessions.length-1;i>=0;i--) if(S.sessions[i].day===id) return S.sessions[i]; return null; };
  let h=`<div class="wrap"><div class="row" style="align-items:center;margin:4px 0 10px">
    <span class="eyebrow grow">${plist.length} terv${nR?' · '+nR+' külön edzés':''}</span></div>
    <button class="btn pri" style="margin:0 0 6px" onclick="openNewPlan()">+ Új edzés vagy terv</button>`;
  // Az AKTÍV terv áll elöl; a terv napjai a terv kártyáján élnek (chipre
  // koppintva szerkeszthetők), a „Saját edzések" alatt csak a tervhez NEM
  // tartozók – korábban ugyanaz a nap kétszer szerepelt.
  const isAiProg=p=>!p.builtin && (p.ai || (p.days.length && p.days.every(d=>{ const r=(S.routines||[]).find(x=>x.id===d); return r && r.at; })));
  const exPreview=ids=>{ const n=ids.map(id=>exN(exDef(id))); return n.slice(0,3).join(', ')+(n.length>3?' +'+(n.length-3):''); };
  if(plist.length){
    h+=`<span class="eyebrow" style="display:block;margin:18px 0 8px">Edzéstervek</span>`;
    const ordered=[...plist].sort((x,y)=>((act&&y.id===act.id)?1:0)-((act&&x.id===act.id)?1:0));
    ordered.forEach(p=>{
      const isAct=act&&p.id===act.id, ai=isAiProg(p);
      // A nap-chip MINDEN napon koppintható: indítás vagy szerkesztés (lap),
      // és kiírja, mikor volt utoljára.
      const days=p.days.map(d=>{const dd=dayDef(d); if(!dd) return ''; const l=lastOf(d);
        return `<button class="tday" onclick="openPlanDay('${d}')">${esc(trn(dd.name))}${l?`<span class="tdl">${esc(agoShort(l.t))}</span>`:''}</button>`;}).join('');
      // A ritka (és a romboló) műveletek a ⋯ menüben: a név kapja a sort.
      h+=`<div class="card"${isAct?' style="border-color:color-mix(in srgb,var(--sage) 45%,var(--line))"':''}><div class="pad">
        <div class="row" style="align-items:center;gap:6px">
          <span class="grow" style="min-width:0"><span class="cond" style="font-size:20px;font-weight:600">${esc(p.builtin?'Alapterv':p.name)}</span>
            ${isAct?'<span class="dchip up" style="margin-left:6px">aktív</span>':''}${ai?'<span class="dchip" style="margin-left:6px;color:var(--brass)">AI</span>':''}
            <span class="small dim" style="display:block">${p.days.length} nap</span></span>
          <button class="iconbtn ghost" onclick="openPlanMenu('${p.id}')" aria-label="Terv műveletei" title="Műveletek">${ICON.more}</button>
        </div>
        <div class="tdays">${days}</div>
        ${ai?'<div class="small dim" style="margin-top:8px">AI-import – a következő AI-terv ezt cseréli le.</div>':''}
        ${isAct?'':`<button class="tact" onclick="setActiveProgram('${p.id}')">Legyen ez az aktív terv ›</button>`}
        </div></div>`;
    });
  }
  if(loose.length){
    h+=`<span class="eyebrow" style="display:block;margin:18px 0 8px">Saját edzések</span><div class="card"><div class="pad" style="padding-top:4px;padding-bottom:4px">`;
    loose.forEach(r=>{ const l=lastOf(r.id);
      h+=`<div class="row trow">
        <button class="grow pcard" style="text-align:left;min-height:44px;padding:8px 0;min-width:0" onclick="openBuilder('${r.id}')">
          <span style="font-weight:600;display:block">${esc(r.name)}</span>
          <span class="small dim" style="display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(exPreview(r.ex))||'üres'}${l?' · '+friendlyDate(l.t):''}</span></button>
        <button class="iconbtn ghost" onclick="startDay('${r.id}')" aria-label="Indítás" title="Indítás" style="color:var(--brass)">›</button>
        <button class="iconbtn ghost" style="color:var(--red)" onclick="deleteRoutine('${r.id}')" aria-label="Törlés" title="Törlés">×</button>
      </div>`; });
    h+=`</div></div>`;
  }
  const nC=S.customEx?Object.keys(S.customEx).length:0;
  h+=`<div class="row" style="gap:8px;margin-top:14px;flex-wrap:wrap">
      <button class="btn ghost" style="flex:1;margin:0;color:var(--mut)" onclick="openManageEx()">Saját gyakorlatok${nC?' ('+nC+')':''}</button>
      ${S.hidePlan?`<button class="btn ghost" style="flex:1;margin:0;color:var(--mut)" onclick="restorePlan()">Alapterv vissza</button>`:''}</div>`;
  return h+'</div>';
}
// A négy „újat csinálok" út egy lapon. A sorrend a valószínűség szerint:
// a kész sablon a leggyorsabb kiindulás, a nulláról építés a legritkább.
function openNewPlan(){
  document.getElementById('sheetIn').innerHTML=`
    <div class="row" style="align-items:baseline"><span class="eyebrow grow">Összeállítás</span>
      <button onclick="closeSheet()" style="font-size:26px;color:var(--dim);padding:0 8px">×</button></div>
    <h2 style="font-size:24px;margin:2px 0 4px">Új edzés vagy terv</h2>
    <p class="mut small" style="margin:0 0 14px">Indulj kész sablonból, vagy állítsd össze magad. AI-tervet az Edző fülön kérhetsz.</p>
    <button class="btn pri" style="margin-bottom:8px" onclick="closeSheet();openStarters()">Kész edzések és tervek ›</button>
    <button class="btn" style="margin-bottom:8px" onclick="closeSheet();openBuilder()">+ Új edzés</button>
    <button class="btn" style="margin-bottom:8px" onclick="closeSheet();openProgram()">+ Új edzésterv</button>
    <button class="btn ghost" style="margin-bottom:6px;color:var(--mut)" onclick="closeSheet();startFree()">Szabad edzés – menet közben összerakva</button>`;
  openSheet();
}
// Rövid „mikor volt" címke a nap-chipre.
function agoShort(t){ const d=Math.floor((startOfDay(Date.now())-startOfDay(t))/864e5);
  return d<=0?'ma':d===1?'tegnap':d+' napja'; }
function startOfDay(t){ const x=new Date(t); x.setHours(0,0,0,0); return x.getTime(); }
// Terv napja: indítás vagy (saját edzésnél) szerkesztés.
function openPlanDay(d){ const dd=dayDef(d); if(!dd) return; const isR=(S.routines||[]).some(x=>x.id===d);
  document.getElementById('sheetIn').innerHTML=`
    <div class="row" style="align-items:baseline"><span class="eyebrow grow">${dd.ex.length} gyakorlat</span>
      <button onclick="closeSheet()" style="font-size:26px;color:var(--dim);padding:0 8px">×</button></div>
    <h2 style="font-size:24px;margin:2px 0 6px">${esc(trn(dd.name))}</h2>
    <p class="small mut" style="margin:0 0 14px">${esc(dd.ex.map(e=>exN(e)).join(', '))}</p>
    <button class="btn pri" style="margin-bottom:8px" onclick="closeSheet();startDay('${d}')">Indítás ›</button>
    ${isR?`<button class="btn" style="margin-bottom:6px" onclick="closeSheet();openBuilder('${d}')">Szerkesztés</button>`:''}`;
  openSheet(); }
// Terv ⋯ menüje: szerkesztés, megosztás, törlés/elrejtés.
function openPlanMenu(pid){ const p=programsList().find(x=>x.id===pid); if(!p) return;
  document.getElementById('sheetIn').innerHTML=`
    <div class="row" style="align-items:baseline"><span class="eyebrow grow">Edzésterv</span>
      <button onclick="closeSheet()" style="font-size:26px;color:var(--dim);padding:0 8px">×</button></div>
    <h2 style="font-size:24px;margin:2px 0 14px">${esc(p.builtin?'Alapterv':p.name)}</h2>
    ${p.builtin?'':`<button class="btn" style="margin-bottom:8px" onclick="closeSheet();openProgram('${p.id}')">Szerkesztés</button>`}
    <button class="btn" style="margin-bottom:8px" onclick="closeSheet();openSharePlan('${p.id}')">Megosztás</button>
    <button class="btn ghost" style="margin-bottom:6px;color:var(--red)" onclick="closeSheet();${p.builtin?'deletePlan()':`deleteProgram('${p.id}')`}">${p.builtin?'Alapterv elrejtése':'Terv törlése'}</button>`;
  openSheet(); }
async function deletePlan(){ if(!await uiConfirm('Elrejted a beépített alaptervet (Push/Pull)?\nA naplózott edzéseid megmaradnak, és bármikor visszaállíthatod.', {ok:'Elrejtés', danger:true})) return;
  S.hidePlan=true; save(); render(); window.scrollTo(0,0); }
function restorePlan(){ S.hidePlan=false; save(); render(); window.scrollTo(0,0);
}
function dayCard(id,name,sub,last,editable){
  return `<div class="card"><div class="row" style="gap:0">
    <button class="daybtn grow" onclick="startDay('${id}')">
      <span class="daytag">${ICON.dumbbell}</span>
      <span class="grow"><span class="cond" style="font-size:21px;font-weight:600;display:block">${esc(name)}</span>
      <span class="small dim">${esc(sub)}${last?' · utoljára '+friendlyDate(last.t).toLowerCase():''}</span></span></button>
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
    let w = ovWLive(e, d.at) ? e.w : startW(e.id);
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
// Szabad edzés: üres edzés indul, a gyakorlatokat MENET KÖZBEN veszed fel
// (`openExPicker('free')` → `addToFree`). A napló ugyanaz, mint bármely
// edzésnél – a `day:'free'` additív nap-azonosító.
async function startFree(){
  if(S.active && !(await uiConfirm('Van egy folyamatban lévő edzés. Eldobod és újat kezdesz?', {ok:'Új edzés', danger:true}))) return;
  S.active={day:'free', t:Date.now(), log:{}, free:[], dayName:tr('Szabad edzés')}; S.activeT=Date.now();
  curEx=0; playing=true; save(); render(); window.scrollTo(0,0);
  openExPicker('free');
}
function addToFree(id){
  if(!S.active) return closeSheet();
  // Szabad edzésnél a `free` maga a nap; bármely más edzésnél az `extra`
  // lista viszi a menet közben felvett gyakorlatot (additív).
  const k=S.active.day==='free'?'free':'extra';
  if(!S.active[k]) S.active[k]=[];
  const e=exDef(id);
  if(!S.active.log[id]){
    S.active[k].push(id);
    let w=startW(id); if(S.active.deload && !e.bw) w=roundTo(w*0.85, e.inc);
    S.active.log[id]={w:w, sets:new Array(e.s).fill(null)};
  }
  curEx=Math.max(0, activeExList().findIndex(x=>x.id===id)); S.activeT=Date.now();
  closeSheet(); save(); render(); window.scrollTo(0,0);
}
function isFreeActive(){ return !!(S.active && S.active.day==='free'); }
function isPhysioActive(){ return !!(S.active && String(S.active.day).indexOf('physio_')===0); }
function resumePlayer(){ if(S.active){ playing=true; render(); window.scrollTo(0,0); } }
function pausePlayer(){ playing=false; tab='home'; stopTimer(); render(); window.scrollTo(0,0); }
async function discardActive(){ if(await uiConfirm('Biztos eldobod ezt az edzést?', {ok:'Eldobás', danger:true})){ S.active=null; S.activeT=Date.now(); playing=false; stopTimer(); tab='home'; save(); render(); window.scrollTo(0,0); } }
function exNav(i){ const n=activeExList().length;
  curEx=Math.max(0,Math.min(n-1,i)); render(); window.scrollTo(0,0); }

