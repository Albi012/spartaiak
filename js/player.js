/* ==================================================================
   A lejatszo: superset-korok, a jatekos nezet, sulyallitas,
   RPE-valaszto es a szett-rogzito lap.
   ================================================================== */
// -- Superset a lejátszóban -------------------------------------------
const SS_SWAP=20;   // rövid váltás-pihenő két superset-gyakorlat között (mp)
function ssGroups(){ return (S.active && S.active.ss) || []; }
function ssGroupOf(id){ return ssGroups().find(g=>g.indexOf(id)>=0) || null; }
// Kör-címke: A1, A2, B1… a csoport sorrendje + a pozíció szerint.
function ssLabel(id){ const gs=ssGroups(), g=ssGroupOf(id); if(!g) return '';
  return String.fromCharCode(65+gs.indexOf(g))+(g.indexOf(id)+1); }
// A csoport aktív (naplózott) tagjai, a routine sorrendjében.
function ssActiveMembers(id){ const g=ssGroupOf(id); if(!g) return [];
  const order=activeExList().map(x=>x.id);
  return g.filter(x=>order.indexOf(x)>=0).sort((a,b)=>order.indexOf(a)-order.indexOf(b)); }
// Az aktív edzés gyakorlatai a lejátszó sorrendjében: a nap (sérülés miatt
// ki nem hagyott) gyakorlatai + az edzés KÖZBEN felvettek (`S.active.extra`,
// additív; szabad edzésnél a `free` lista maga a nap).
function activeExList(){ if(!S.active) return [];
  const l=(dayDef(S.active.day)||{ex:[]}).ex.filter(x=>S.active.log[x.id]);
  if(S.active.day!=='free') (S.active.extra||[]).forEach(id=>{
    if(S.active.log[id] && !l.some(x=>x.id===id)) l.push(exDef(id)); });
  return l; }
function gotoExId(id){ const exs=activeExList();
  const i=exs.findIndex(x=>x.id===id); if(i>=0) curEx=i; }

function playerView(){
  const d=dayDef(S.active.day) || {name:S.active.dayName||'Edzés', ex:[]};
  const exs=activeExList();   // sérülés miatt kihagyottak nélkül + menet közben felvettek
  if(curEx>=exs.length) curEx=exs.length-1; if(curEx<0) curEx=0;
  if(!exs.length) return freeEmptyView(d);   // szabad edzés, még üres
  const e=exs[curEx], L=S.active.log[e.id], last=lastFor(e.id), t=parseInt(e.r);
  const complete=exDone(e,L), hit=L.sets.every(x=>x!=null&&x>=t);
  const missed=L.sets.some(x=>x!=null&&x<t);
  const isLast=curEx===exs.length-1;

  // Készenlét-tanács: CSAK tájékoztat, a súlyt nem állítja el.
  let rdyBar='';
  if(!isPhysioActive()){ const r=readiness();
    // Halk, egysoros: tanács, nem riasztás. Koppintásra a részletek.
    if(r) rdyBar=`<button class="rdystrip" onclick="openRdySheet()">
      <span class="rdot" style="background:${r.color}"></span>
      <span class="num" style="color:${r.color}">${r.score}</span>
      <span class="t">${esc(r.hint)}</span><span class="dim">›</span></button>`; }

  let dots='';
  exs.forEach((x,i)=>{ const done=exDone(x,S.active.log[x.id]);
    dots+=`<button class="pdot ${i===curEx?'cur':(done?'done':'')}" onclick="exNav(${i})" aria-label="gyakorlat ${i+1}"></button>`; });

  let chips='';
  L.sets.forEach((v,i)=>{ const cls=v==null?'':(v>=t?'done':'miss');
    // Ahol van RPE, az informatívabb, mint a szett sorszáma – a sorrend
    // amúgy is látszik a chipek helyzetéből.
    const r=L.rpe&&L.rpe[i]!=null ? L.rpe[i] : null;
    chips+=`<button class="chip ${cls}" data-i="${i}" onclick="openSet('${e.id}',${i})">
      <span class="r">${v==null?'·':v}</span><span class="l">${dropN(L,i)?'+'+dropN(L,i)+' drop':r!=null?'@'+rpeNum(r):(i+1)+'. sz'}</span></button>`; });
  // Menet közben plusz szett (pl. jól ment, belefér még egy) – a cél-szám
  // nem változik, csak a lista nő. Gyógytornánál nincs.
  if(!isPhysioActive()) chips+=`<button class="chip addset" onclick="addLiveSet('${e.id}')" aria-label="Szett hozzáadása"><span class="r">+</span><span class="l">szett</span></button>`;

  const physioMode=isPhysioActive();   // mobilitás: nincs súlyállító/eszköz
  let wt='';
  // A szám koppintásra KÉZI bevitelt nyit (a ± csak lépked); a tárcsa-
  // kalkulátor az eszközsorban marad.
  if(!e.time && !physioMode){ const vc=` onclick="openWManual('${e.id}')" style="cursor:pointer" title="Súly beírása"`;
    wt=`<div class="wt">
    <button onclick="bump('${e.id}',-1)" aria-label="kevesebb">−</button>
    <div class="val"${vc}>${wLabel(e,L.w)}${e.bw&&L.w<=0?'':'<span>kg</span>'}</div>
    <button onclick="bump('${e.id}',1)" aria-label="több">+</button></div>`; }

  // Egyértelmű, mindig látható eszköz-gombok: tárcsa-kalkulátor + progresszió.
  let tools='';
  if(!e.time && !physioMode){
    const t=[];
    if(!e.bw) t.push(`<button class="tool" onclick="openPlateCalc(${L.w})">${ICON.dumbbell} Tárcsák</button>`);
    t.push(`<button class="tool" onclick="openProgPolicy('${e.id}')">Progresszió: ${esc(POLICY_NAME[progPolicy(e.id)].split(' ')[0])}</button>`);
    tools=`<div class="toolrow">${t.join('')}</div>`;
  }
  let note='';
  if(last) note=`<div class="prev">Előző: ${wLabel(e,last.w)}${e.bw&&last.w<=0?'':' kg'} × ${last.sets.map(x=>x==null?'–':x).join(', ')}</div>`;
  else note=`<div class="prev dim">${tr('Első alkalom – a technika a cél, ne a súly.')}</div>`;
  // Ha a súly az edzőterv ELŐÍRÁSÁBÓL jön (és nem a saját haladásodból),
  // mondjuk is meg – különben megmagyarázatlanul ugrana a szám.
  if(ovWLive(e, (dayDef(S.active.day)||{}).at))
    note+=`<div class="prev" style="color:var(--brass)">Az edzésterv előírása: ${wLabel(e,e.w)}${e.bw?'':' kg'} × ${e.s}×${esc(e.r)}</div>`;
  // Következő edzés súlyjavaslata a választott progressziós szabály szerint,
  // indoklással (auditálható). Csak akkor, ha van már rögzített szett.
  let hint='';
  if(!e.bw && L.sets.some(x=>x!=null)){
    const nx=progNext(e.id,{w:L.w,sets:L.sets},e);
    const arrow = nx.delta>0?`↑ ${wLabel(e,nx.w)} kg`:nx.delta<0?`↓ ${wLabel(e,nx.w)} kg`:`= ${wLabel(e,nx.w)} kg`;
    hint=`<button class="hint" onclick="openProgPolicy('${e.id}')" title="${esc(nx.reason)}">Következőre: <b>${arrow}</b> <span class="hr">${esc(nx.reason)}</span> <span class="dim">›</span></button>`;
  }

  // Állandó gyakorlat-jegyzet + fotó
  const pn=S.notes[e.id], ph=S.photos[e.id];
  const noteBlock = (pn||ph) ? `<div class="exnote">
      ${ph?`<img class="exphoto" src="${ph}" onclick="viewPhoto('${e.id}')" alt="beállítás fotó">`:''}
      ${pn?`<div class="exnote-t">${esc(pn)}</div>`:''}
    </div>` : '';

  // Terv kontra valóság: ha van kihagyott ismétlés, egy koppintással megkérdi az okot
  let why='';
  if(complete && missed && !e.time){
    const cur=L.why;
    why=`<div class="whyrow"><span class="small dim" style="width:100%">Miért tért el a tervtől?</span>
      ${[['busy','Gép foglalt'],['heavy','Túl nehéz volt'],['time','Kevés idő']].map(([k,lab])=>
        `<button class="whyc ${cur===k?'on':''}" onclick="setWhy('${e.id}','${k}')">${lab}</button>`).join('')}</div>`;
  }

  // A soron következő szett a FŐSZEREPLŐ: egy nagy gomb, egy koppintással
  // a rácsra (a chipek maradnak a javításhoz / áttekintéshez).
  const ni=L.sets.findIndex(x=>x==null);
  const nextSet = (!physioMode && ni>=0) ? `<button class="nextset" onclick="openSet('${e.id}',${ni})">
      <span class="ns-n">${ni+1}. szett</span>
      <span class="ns-t">cél ${esc(e.r)}${e.time?' mp':' ism.'}${e.time?'':' · '+wLabel(e,L.w)+(e.bw&&L.w<=0?'':' kg')}</span>
      <span class="ns-go">${e.time?'Indítás':'Rögzítés'} ›</span></button>` : '';
  // Mi jön utána – a pöttysor nevet nem mond.
  const nx2=exs[curEx+1];
  const upNext = nx2 ? `<button class="upnext" onclick="exNav(${curEx+1})"><span class="dim">Következik:</span> <b>${esc(exN(nx2))}</b> <span class="dim">· ${nx2.s}×${esc(nx2.r)}</span></button>` : '';

  const deloadBanner = S.active.deload ? `<div class="banner">Kihagyás utáni visszaépítés: kisebb súly, a célnál pár ismétléssel több.</div>` : '';

  // Superset-kör: címke + a kör tagjainak felsorolása, jelezve, hogy a
  // pihenő a kör VÉGÉN jön (a tagok közt csak rövid váltás).
  const ssMembers=ssActiveMembers(e.id);
  const ssBadge = ssMembers.length ? `<span class="ssbadge">Superset ${ssLabel(e.id)}</span>` : '';
  const ssHint = ssMembers.length
    ? `<div class="ssrow">${ssMembers.map(id=>`<span class="${id===e.id?'cur':''}">${esc(ssLabel(id))} ${esc(exDef(id).n)}</span>`).join('<span class="arr">→</span>')}
        <div class="small dim" style="width:100%;margin-top:4px">Egymás után, pihenő a kör végén</div></div>`
    : '';

  return `<div class="player">
    <div class="ptop">
      <button class="iconbtn" onclick="pausePlayer()" aria-label="Szünet" title="Szünet">${ICON.back}</button>
      <div class="pmid"><div class="d">${d.name}${S.active.deload?' · visszaépítés':''}</div><div class="c">gyakorlat ${curEx+1} / ${exs.length}</div></div>
      <button class="iconbtn" onclick="finish()" aria-label="Edzés lezárása" title="Edzés lezárása" style="color:var(--sage)">${ICON.check}</button>
    </div>
    ${rdyBar}
    <div class="pdots">${dots}</div>
    <div class="pmain">
      ${deloadBanner}
      <div>
        <div class="row" style="align-items:flex-start">
          <div class="grow"><div class="pname">${esc(exN(e))}</div>
          <div class="pmeta">${complete?'<span class="done-badge">kész</span>':`<span class="tgt">cél: ${e.s} × ${e.r}${e.time?'':' ism.'}</span>`}${ssBadge}</div></div>
          ${restPillHtml()}
          <button class="iconbtn" onclick="openNoteSheet('ex','${e.id}')" aria-label="Jegyzet és fotó" title="Jegyzet és fotó">${ICON.edit}</button>
        </div>
      </div>
      ${physioMode ? physioCounterHtml(e,L) : `${noteBlock}
      ${ssHint}
      ${wt}
      ${tools}
      <div class="pchips">${chips}</div>
      ${nextSet}
      ${note}${hint}`}
      ${why}
    </div>
    ${upNext}
    <div class="pfoot">
      <button class="btn" onclick="exNav(${curEx-1})" ${curEx===0?'disabled':''} style="flex:0 0 40%">${tr('‹ Előző')}</button>
      ${isLast && isFreeActive()
        ? `<button class="btn pri" onclick="openExPicker('free')" style="flex:1">${tr('+ Következő gyakorlat')}</button>`
        : isLast
        ? `<button class="btn pri" onclick="finish()" style="flex:1">${tr('Edzés lezárása')}</button>`
        : `<button class="btn pri" onclick="exNav(${curEx+1})" style="flex:1">${tr('Következő ›')}</button>`}
    </div>
    <div class="row" style="gap:10px;max-width:560px;margin:0 auto;padding:0 16px 16px;width:100%">
      ${isFreeActive()&&isLast?`<button class="btn" style="flex:1;margin:0" onclick="finish()">${tr('Lezárás')}</button>`:`<button class="btn" style="flex:1;margin:0" onclick="openExPicker('free')">+ Gyakorlat</button>`}
      <button class="btn" style="flex:1;margin:0" onclick="openPlayerNote()">Jegyzet${noteHasText()?' •':''}</button>
      <button class="iconbtn" style="flex:none;width:52px;height:52px" onclick="openPlayerMenu()" aria-label="Továbbiak" title="Továbbiak">${ICON.more}</button>
    </div>
  </div>`;
}
// Szabad edzés, amíg még egy gyakorlat sincs benne: egyetlen teendő van.
function freeEmptyView(d){
  return `<div class="player">
    <div class="ptop">
      <button class="iconbtn" onclick="pausePlayer()" aria-label="Szünet" title="Szünet">${ICON.back}</button>
      <div class="pmid"><div class="d">${esc(d.name)}</div><div class="c">${tr('menet közben állítod össze')}</div></div>
      <span style="width:44px"></span>
    </div>
    <div class="pmain" style="justify-content:center;text-align:center">
      <div class="cond" style="font-size:26px;font-weight:600">${tr('Mivel kezdesz?')}</div>
      <p class="mut small" style="margin:6px 0 18px">${tr('Vedd fel az első gyakorlatot – a többit akkor, amikor odaérsz.')}</p>
      <button class="btn pri" onclick="openExPicker('free')">+ Gyakorlat hozzáadása</button>
    </div>
    <div class="row" style="gap:10px;max-width:560px;margin:0 auto;padding:0 16px 16px;width:100%">
      <button class="btn ghost" style="flex:1;margin:0;color:var(--red)" onclick="discardActive()">Edzés eldobása</button>
    </div>
  </div>`;
}
/* ---- Gyógytorna-lejátszó: EGY nagy számláló -------------------------
   Mobilitás-gyakorlatnál nincs súly és nincs szett-rács: egyetlen nagy kör
   a feladat. Ismétlésnél minden koppintás +1 (a célnál magától rögzít),
   tartásnál a kör indítja az órát. A kártya zsálya tónusú, hogy gyógytornát
   sugalljon, ne edzést. A számláló NÉZET-állapot (`_phCount`). */
let _phCount=0, _phFor='';
function rehabCue(id){ for(const r of REHAB){ const x=r.ex.find(y=>y.id===id); if(x) return x.cue; } return ''; }
function physioCounterHtml(e,L){
  if(_phFor!==e.id){ _phFor=e.id; _phCount=0; }
  const t=parseInt(e.r)||10, done=L.sets[0]!=null, cue=rehabCue(e.id);
  const R=88, C=2*Math.PI*R;
  const val = done ? L.sets[0] : (e.time ? t : _phCount);
  const frac = done ? 1 : (e.time ? 0 : Math.min(1,_phCount/t));
  const unit = e.time ? 'mp' : (done||_phCount ? '/ '+t : 'ismétlés');
  const act = done ? `phRedo('${e.id}')` : (e.time ? `openSet('${e.id}',0)` : `phTap('${e.id}')`);
  const lbl = done ? 'Kész – koppints az újrakezdéshez' : (e.time ? 'Koppints az óra indításához' : 'Koppints minden ismétlésnél');
  return `<div class="phcard">
    <span class="phbadge">${ICON.physio} Gyógytorna</span>
    ${cue?`<p class="phcue">${esc(cue)}</p>`:''}
    <button class="phring${done?' done':''}" onclick="${act}" aria-label="${lbl}">
      <svg viewBox="0 0 200 200"><circle cx="100" cy="100" r="${R}" class="bg"/>
        <circle cx="100" cy="100" r="${R}" class="fg" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C*(1-frac)).toFixed(1)}"/></svg>
      <span class="phnum">${val}</span><span class="phunit">${done?'✓ kész':unit}</span></button>
    <div class="small dim" style="text-align:center">${lbl}</div>
    ${!done && !e.time ? `<div class="row" style="gap:8px;width:100%">
      <button class="btn" style="flex:0 0 30%;margin:0" onclick="phStep(-1)" ${_phCount?'':'disabled'}>−1</button>
      <button class="btn" style="flex:1;margin:0" onclick="phSave('${e.id}')" ${_phCount?'':'disabled'}>Rögzítés (${_phCount})</button></div>` : ''}
    <div class="small dim" style="text-align:center">Fájdalmasan soha ne erőltesd.</div>
  </div>`;
}
function phTap(id){ if(_phFor!==id){ _phFor=id; _phCount=0; } _phCount++; try{ if(!reducedMotion() && navigator.vibrate) navigator.vibrate(8); }catch(x){}
  const t=parseInt(activeExDef(id).r)||10;
  if(_phCount>=t) return phSave(id);
  render(); }
function phStep(d){ _phCount=Math.max(0,_phCount+d); render(); }
function phSave(id){ cur={id, i:0}; _rpePick=null; const n=_phCount; _phCount=0; setRep(n); }
function phRedo(id){ const L=S.active.log[id]; L.sets[0]=null; _phCount=0; _phFor=id; save(); render(); }
// A ritka, veszélyes vagy másodlagos műveletek egy lapon – az „Eldobás"
// korábban piros, egyenrangú gombként a hüvelykujj alatt állt.
function openPlayerMenu(){
  document.getElementById('sheetIn').innerHTML=`<div class="grabber"></div>
    <div class="row" style="align-items:baseline"><span class="eyebrow grow">Edzés</span>
      <button onclick="closeSheet()" style="font-size:26px;color:var(--dim);padding:0 8px">×</button></div>
    <h2 style="font-size:22px;margin:2px 0 12px">${esc(S.active.dayName||'Edzés')}</h2>
    <button class="btn" style="margin-bottom:8px" onclick="closeSheet();openExPicker('free')">+ Gyakorlat hozzáadása</button>
    <button class="btn" style="margin-bottom:8px" onclick="closeSheet();finish()">Edzés lezárása</button>
    <button class="btn" style="margin-bottom:8px" onclick="closeSheet();pausePlayer()">Szünet – vissza a főoldalra</button>
    <button class="btn ghost" style="margin-bottom:4px;color:var(--red)" onclick="closeSheet();discardActive()">Edzés eldobása</button>`;
  openSheet(); }
function setWhy(id,k){ const L=S.active.log[id]; L.why=(L.why===k?null:k); save(); render(); }

// Plusz szett a futó edzéshez. Az RPE-tömb (ha van) párhuzamos marad.
function addLiveSet(id){ const L=S.active&&S.active.log[id]; if(!L) return;
  if(L.sets.length>=20) return;
  L.sets.push(null); if(L.rpe) L.rpe.push(null); if(L.drops) L.drops.push(null);
  S.activeT=Date.now(); save(); render(); }
// Kézi súly: a ± lépkedés mellett beírható a pontos szám (vessző is jó).
function openWManual(id){ const e=activeExDef(id), L=S.active.log[id];
  document.getElementById('sheetIn').innerHTML=`<div class="grabber"></div>
    <div class="row"><div class="grow"><span class="eyebrow">${e.bw?'Plusz súly':'Súly'}</span><h2 style="font-size:22px">${esc(exN(e))}</h2></div>
    <button onclick="closeSheet()" style="font-size:26px;color:var(--dim);padding:0 8px">×</button></div>
    <div class="row" style="gap:8px;margin-top:12px;align-items:center">
      <input id="wMan" type="text" inputmode="decimal" autocomplete="off" value="${kgNum(L.w)}" style="flex:1;min-width:0;font-size:28px;font-weight:700;text-align:center" onkeydown="if(event.key==='Enter')setWManual('${id}')">
      <span class="dim" style="font-size:18px">kg</span></div>
    <div id="wManErr" class="small" style="color:var(--red);margin-top:6px;display:none">Adj meg egy számot 0 és 999 között.</div>
    <button class="btn pri" style="margin-top:12px" onclick="setWManual('${id}')">Beállítás</button>`;
  openSheet(); setTimeout(()=>{ const i=document.getElementById('wMan'); if(i){ i.focus(); i.select(); } },60); }
function setWManual(id){ const L=S.active&&S.active.log[id]; if(!L) return;
  const raw=(document.getElementById('wMan')||{}).value||'';
  const v=parseFloat(String(raw).replace(',','.').replace(/[^0-9.]/g,''));
  if(!isFinite(v)||v<0||v>999){ const er=document.getElementById('wManErr'); if(er) er.style.display='block'; return; }
  L.w=Math.round(v*100)/100; S.weights[id]=L.w; save(); closeSheet(); render(); }
function bump(id,dir){ const e=activeExDef(id),L=S.active.log[id];
  L.w=Math.max(0, Math.round((L.w+dir*e.inc)*10)/10); S.weights[id]=L.w; save(); render(); }

/* ---- RPE (érzékelt nehézség) – OPCIONÁLIS ---------------------------
 * `log[exId].rpe = [8, null, 9.5, …]` – a `sets` tömbbel PÁRHUZAMOS,
 * additív mező. Hiánya = sosem rögzítetted; `null` egy elemben = azt a
 * szettet nem minősítetted. A régi napló migráció nélkül betöltődik.
 *
 * A LEGFONTOSABB megkötés: a szett-rögzítés MARAD két koppintás. Az RPE
 * nem kötelező lépés – ha nem nyúlsz hozzá, semmi nem változik. Aki
 * használja, előbb koppint egy RPE-chipre (a lap NYITVA marad), aztán a
 * számra: az rögzíti mindkettőt. Vagyis 2 koppintás → 3, de csak annak,
 * aki kéri.
 *
 * Skála: 10 = egy ismétlés sem maradt benne, 8 = kb. 2 maradt.
 * SOHA nem előválasztott érték – egy tippelt RPE rosszabb, mint a semmi. */
const RPE_VALS=[7,7.5,8,8.5,9,9.5,10];
let _rpePick=null;
// Az utolsó rögzített szett RPE-je (a progresszióhoz). null = nincs.
function lastRpe(L){
  if(!L || !L.rpe || !L.sets) return null;
  for(let i=L.sets.length-1;i>=0;i--) if(L.sets[i]!=null && L.rpe[i]!=null) return L.rpe[i];
  return null;
}
// „8" és „7,5" – a magyar tizedes itt is vessző, mint a súlynál.
function rpeNum(v){ return String(v).replace('.',','); }
// Az RPE-chipsor. `sel` a kiválasztott érték, `fn` a koppintás kezelője.
function rpeRow(sel, fn){
  return `<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:12px">
    <span class="small dim" style="flex:0 0 100%">${tr('Mennyire volt nehéz?')} <span class="dim">${tr('(nem kötelező)')}</span></span>
    <span class="small dim" style="flex:0 0 100%;margin-bottom:4px;font-size:12px">${tr('10 = egy ismétlés sem maradt benne · 8 = még kettő belefért')}</span>
    ${RPE_VALS.map(v=>`<button class="whyc${sel===v?' on':''}" onclick="${fn}(${v})">${rpeNum(v)}</button>`).join('')}
    <button class="whyc${sel==null?' on':''}" onclick="${fn}(null)">–</button>
  </div>`;
}

let cur=null, justSet=null;
function openSet(id,i){
  cur={id,i}; const e=activeExDef(id), t=parseInt(e.r);
  const _L=S.active.log[id];
  _rpePick = (_L && _L.rpe && _L.rpe[i]!=null) ? _L.rpe[i] : null;
  if(e.time){ openTimerSet(e,i,t); return; }    // idő-alapú gyakorlat → visszaszámláló
  document.getElementById('sheetIn').innerHTML=repKbSheet(e,i,t);
  openSheet();
}
// Ismétlés-választó billentyűzet (a cél körüli tartomány) + kézi mező.
// A rács a tipikus esetet fedi két koppintással; a mező azért kell, mert a
// tartományon kívüli szám (pl. 30 fekvőtámasz 12-es célnál, vagy egy hosszú
// tartás mp-e) különben nem rögzíthető.
function repKbSheet(e,i,t){
  const opts=[]; for(let k=Math.max(1,t-4);k<=t+6;k++) opts.push(k);
  const unit=e.time?'mp':'ismétlés';
  let h=`<div class="grabber"></div>
    <div class="row"><div class="grow"><span class="eyebrow">${i+1}. szett</span>
    <h2 style="font-size:24px">${esc(exN(e))}</h2><span class="small dim">cél: ${esc(e.r)}${e.time?'':' ismétlés'}</span></div>
    <button onclick="closeSheet()" style="font-size:26px;color:var(--dim);padding:0 8px">×</button></div>
    ${rpeRow(_rpePick,'pickRpe')}
    <div class="kb">`;
  opts.forEach(k=>{ h+=`<button onclick="setRep(${k})" style="${k==t?'border-color:var(--brass);color:var(--brass)':''}">${k}</button>`; });
  h+=`</div>
    <div class="row" style="gap:8px;margin-top:12px">
      <input id="repMan" type="number" inputmode="numeric" pattern="[0-9]*" min="0" max="999" step="1"
        class="num" placeholder="Egyéb…" aria-label="Kézi ${unit}-megadás"
        style="flex:1;min-width:0;font-size:20px;font-weight:600;text-align:center"
        onkeydown="if(event.key==='Enter'){event.preventDefault();setRepManual();}">
      <button class="btn pri" style="flex:0 0 42%;margin:0" onclick="setRepManual()">Rögzítés</button>
    </div>
    <button class="btn" style="margin-top:8px;color:var(--mut)" onclick="setRep(null)">Törlés</button>`;
  h+=dropSectionHtml(e,i);
  return h;
}
/* ---- Dropset – OPCIONÁLIS ------------------------------------------
 * `log[exId].drops` a `sets`-szel PÁRHUZAMOS tömb: `drops[i] = [{w, r}, …]`
 * (a fő szett UTÁN, csökkentett súllyal, pihenő nélkül folytatott részek),
 * `null` = nincs drop. Additív: hiánya = sosem volt dropset, a régi napló
 * változatlan. A progresszió és a becsült 1RM a FŐ szettet nézi; a
 * térfogatba (exVolume) és a szövegbe (setsTxt) a dropok is beleszámítanak.
 */
function dropN(L,i){ return (L&&L.drops&&L.drops[i]) ? L.drops[i].length : 0; }
function dropSectionHtml(e,i){ return dropBoxHtml(e,S.active.log[cur.id],i,'addDrop','delDrop'); }
// Közös drop-szakasz: a lejátszó (addDrop/delDrop) és a napló javító-lapja
// (esAddDrop/esDelDrop) ugyanezt a felületet kapja, csak más gazdára köt.
function dropBoxHtml(e,L,i,addFn,delFn){
  if(e.time) return '';
  const done=L.sets[i]!=null, list=(L.drops&&L.drops[i])||[];
  const last=list.length?list[list.length-1].w:L.w;
  const sug=Math.max(0, Math.round(last*0.8/(e.inc||2.5))*(e.inc||2.5));
  let h=`<div class="dropbox"><div class="row" style="align-items:baseline"><span class="eyebrow grow">Dropset</span>
    <span class="small dim">súlyt csökkentve, pihenő nélkül tovább</span></div>`;
  list.forEach((d,k)=>{ h+=`<div class="row trow" style="gap:8px;min-height:44px"><span class="grow">↓ <b class="num">${kgNum(d.w)} kg</b> × <b class="num">${d.r}</b></span>
    <button class="iconbtn ghost" style="color:var(--mut)" onclick="${delFn}(${i},${k})" aria-label="Drop törlése">×</button></div>`; });
  if(!done) h+=`<div class="small dim" style="margin-top:6px">Előbb rögzítsd a fő szettet – utána a chipre koppintva felveheted a dropokat.</div>`;
  else h+=`<div class="row" style="gap:6px;margin-top:8px;align-items:center">
      <input id="dropW" type="text" inputmode="decimal" value="${kgNum(sug)}" aria-label="Drop súly" style="flex:1;min-width:0;font-size:18px;text-align:center"><span class="dim">kg ×</span>
      <input id="dropR" type="number" inputmode="numeric" pattern="[0-9]*" placeholder="ism." aria-label="Drop ismétlés" style="flex:1;min-width:0;font-size:18px;text-align:center" onkeydown="if(event.key==='Enter')${addFn}(${i})">
      <button class="btn" style="width:auto;margin:0;padding:12px 14px;color:var(--brass)" onclick="${addFn}(${i})">+ Drop</button></div>`;
  return h+`</div>`;
}
// A mezőkből olvas és a logba ír; true, ha felvett egy dropot.
function dropPush(L,i){ if(!L||L.sets[i]==null) return false;
  const w=parseFloat(String((document.getElementById('dropW')||{}).value||'').replace(',','.'));
  const r=parseInt((document.getElementById('dropR')||{}).value,10);
  if(!isFinite(w)||w<0||w>999||!Number.isFinite(r)||r<1||r>999){ const el=document.getElementById(Number.isFinite(r)&&r>=1?'dropW':'dropR'); if(el) el.focus(); return false; }
  if(!L.drops) L.drops=[];
  while(L.drops.length<L.sets.length) L.drops.push(null);
  (L.drops[i]=L.drops[i]||[]).push({w:Math.round(w*100)/100, r});
  return true; }
function dropCut(L,i,k){ if(!L||!L.drops||!L.drops[i]) return false;
  L.drops[i].splice(k,1); if(!L.drops[i].length) L.drops[i]=null;
  if(!L.drops.some(x=>x)) delete L.drops;
  return true; }
function addDrop(i){ const L=S.active.log[cur.id]; if(!dropPush(L,i)) return;
  S.activeT=Date.now(); save(); render(); openSet(cur.id,i); }
function delDrop(i,k){ if(!dropCut(S.active.log[cur.id],i,k)) return;
  save(); render(); openSet(cur.id,i); }
// A kézi mező beolvasása. Csak egész, 0..999 megy át; hibás értéknél nem
// rögzít (a mező marad, hogy javítható legyen).
function setRepManual(){
  const el=document.getElementById('repMan'); if(!el) return;
  const v=parseInt(el.value,10);
  if(!Number.isFinite(v) || v<0 || v>999){ el.value=''; el.focus(); return; }
  setRep(v);
}
