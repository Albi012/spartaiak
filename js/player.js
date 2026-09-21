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
  const order=(dayDef(S.active.day)||{ex:[]}).ex.map(x=>x.id).filter(x=>S.active.log[x]);
  return g.filter(x=>order.indexOf(x)>=0).sort((a,b)=>order.indexOf(a)-order.indexOf(b)); }
function gotoExId(id){ const exs=(dayDef(S.active.day)||{ex:[]}).ex.filter(x=>S.active.log[x.id]);
  const i=exs.findIndex(x=>x.id===id); if(i>=0) curEx=i; }

function playerView(){
  const d=dayDef(S.active.day) || {name:S.active.dayName||'Edzés', ex:[]};
  const exs=d.ex.filter(x=>S.active.log[x.id]);   // sérülés miatt kihagyottak nélkül
  if(curEx>=exs.length) curEx=exs.length-1; if(curEx<0) curEx=0;
  const e=exs[curEx], L=S.active.log[e.id], last=lastFor(e.id), t=parseInt(e.r);
  const complete=exDone(e,L), hit=L.sets.every(x=>x!=null&&x>=t);
  const missed=L.sets.some(x=>x!=null&&x<t);
  const isLast=curEx===exs.length-1;

  // Készenlét-tanács: CSAK tájékoztat, a súlyt nem állítja el.
  let rdyBar='';
  if(!isPhysioActive()){ const r=readiness();
    if(r) rdyBar=`<button class="rdystrip" style="border-color:${r.color};background:color-mix(in srgb, ${r.color} 12%, transparent)" onclick="openRdySheet()">
      <span class="num" style="color:${r.color}">${r.score}</span>
      <span class="t" style="color:${r.color}">${esc(r.label[0].toUpperCase()+r.label.slice(1))} készenlét — <b>${esc(r.hint)}</b>.</span></button>`; }

  let dots='';
  exs.forEach((x,i)=>{ const done=exDone(x,S.active.log[x.id]);
    dots+=`<button class="pdot ${i===curEx?'cur':(done?'done':'')}" onclick="exNav(${i})" aria-label="gyakorlat ${i+1}"></button>`; });

  let chips='';
  L.sets.forEach((v,i)=>{ const cls=v==null?'':(v>=t?'done':'miss');
    // Ahol van RPE, az informatívabb, mint a szett sorszáma – a sorrend
    // amúgy is látszik a chipek helyzetéből.
    const r=L.rpe&&L.rpe[i]!=null ? L.rpe[i] : null;
    chips+=`<button class="chip ${cls}" data-i="${i}" onclick="openSet('${e.id}',${i})">
      <span class="r">${v==null?'·':v}</span><span class="l">${r!=null?'@'+rpeNum(r):(i+1)+'. sz'}</span></button>`; });

  const physioMode=isPhysioActive();   // mobilitás: nincs súlyállító/eszköz
  let wt='';
  if(!e.time && !physioMode){ const vc=!e.bw?` onclick="openPlateCalc(${L.w})" style="cursor:pointer" title="Tárcsák"`:'';
    wt=`<div class="wt">
    <button onclick="bump('${e.id}',-1)" aria-label="kevesebb">−</button>
    <div class="val"${vc}>${wLabel(e,L.w)}${e.bw&&L.w<=0?'':'<span>kg</span>'}</div>
    <button onclick="bump('${e.id}',1)" aria-label="több">+</button></div>`; }

  // Egyértelmű, mindig látható eszköz-gombok: tárcsa-kalkulátor + progresszió.
  let tools='';
  if(!e.time && !physioMode){
    const t=[];
    if(!e.bw) t.push(`<button class="tool" onclick="openWarmup('${e.id}')">Bemelegítés</button>`);
    if(!e.bw) t.push(`<button class="tool" onclick="openPlateCalc(${L.w})">${ICON.dumbbell} Tárcsák</button>`);
    t.push(`<button class="tool" onclick="openProgPolicy('${e.id}')">Progresszió: ${esc(POLICY_NAME[progPolicy(e.id)].split(' ')[0])}</button>`);
    tools=`<div class="toolrow">${t.join('')}</div>`;
  }
  let note='';
  if(last) note=`<div class="prev">Előző: ${wLabel(e,last.w)}${e.bw&&last.w<=0?'':' kg'} × ${last.sets.map(x=>x==null?'–':x).join(', ')}</div>`;
  else note=`<div class="prev dim">${tr('Első alkalom – a technika a cél, ne a súly.')}</div>`;
  // Ha a súly az edzőterv ELŐÍRÁSÁBÓL jön (és nem a saját haladásodból),
  // mondjuk is meg – különben megmagyarázatlanul ugrana a szám.
  if(e.ovW && lastForT(e.id) <= ((dayDef(S.active.day)||{}).at||0))
    note+=`<div class="prev" style="color:var(--brass)">Az edzésterv előírása: ${wLabel(e,e.w)}${e.bw?'':' kg'} × ${e.s}×${esc(e.r)}</div>`;
  // Következő edzés súlyjavaslata a választott progressziós szabály szerint,
  // indoklással (auditálható). Csak akkor, ha van már rögzített szett.
  let hint='';
  if(!e.bw && L.sets.some(x=>x!=null)){
    const nx=progNext(e.id,{w:L.w,sets:L.sets});
    const arrow = nx.delta>0?`↑ ${wLabel(e,nx.w)} kg`:nx.delta<0?`↓ ${wLabel(e,nx.w)} kg`:`= ${wLabel(e,nx.w)} kg`;
    hint=`<div class="hint" onclick="openProgPolicy('${e.id}')" style="cursor:pointer">Következőre: <b>${arrow}</b> · ${esc(nx.reason)} <span class="dim">›</span></div>`;
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
      ${noteBlock}
      ${ssHint}
      ${wt}
      ${tools}
      <div class="pchips">${chips}</div>
      ${note}${hint}
      ${why}
    </div>
    <div class="pfoot">
      <button class="btn" onclick="exNav(${curEx-1})" ${curEx===0?'disabled':''} style="flex:0 0 40%">${tr('‹ Előző')}</button>
      ${isLast
        ? `<button class="btn pri" onclick="finish()" style="flex:1">${tr('Edzés lezárása')}</button>`
        : `<button class="btn pri" onclick="exNav(${curEx+1})" style="flex:1">${tr('Következő ›')}</button>`}
    </div>
    <div class="row" style="gap:10px;max-width:560px;margin:0 auto;padding:0 16px 16px;width:100%">
      <button class="btn" style="flex:1;margin:0" onclick="openPlayerNote()">Jegyzet${noteHasText()?' •':''}</button>
      <button class="btn ghost" style="flex:1;margin:0;color:var(--red)" onclick="discardActive()">Edzés eldobása</button>
    </div>
  </div>`;
}
function setWhy(id,k){ const L=S.active.log[id]; L.why=(L.why===k?null:k); save(); render(); }

function bump(id,dir){ const e=exDef(id),L=S.active.log[id];
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
  cur={id,i}; const e=exDef(id), t=parseInt(e.r);
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
  return h;
}
// A kézi mező beolvasása. Csak egész, 0..999 megy át; hibás értéknél nem
// rögzít (a mező marad, hogy javítható legyen).
function setRepManual(){
  const el=document.getElementById('repMan'); if(!el) return;
  const v=parseInt(el.value,10);
  if(!Number.isFinite(v) || v<0 || v>999){ el.value=''; el.focus(); return; }
  setRep(v);
}
