/* ==================================================================
   Also lap (sheet) nyitasa/zarasa, ido-alapu gyakorlat oraja
   es a temazott modal (confirm/alert helyett).
   ================================================================== */
/* ---- Alsó lap nyitása / zárása ---------------------------------------
 * A zárás ANIMÁLT, tehát nem azonnali – ezért kell két dolog:
 *  - `openSheet()` egyetlen belépési pont, ami törli a félbehagyott
 *    kilépés nyomait (osztály + a lehúzásból maradt inline transform);
 *  - nemzedék-számláló (`_sheetGen`): ha a 200 ms alatt ÚJ lap nyílik, a
 *    régi kilépés már nem nyúl a DOM-hoz, és nem tünteti el a frisset.
 * A `pointer-events:none` a `.closing`-on azt zárja ki, hogy a kifelé
 * úszó lapon még egyszer el lehessen találni valamit. */
const SHEET_OUT=200;
let _sheetGen=0, _sheetT=null;
function openSheet(){
  const s=document.getElementById('sheet'); if(!s) return;
  _sheetGen++; clearTimeout(_sheetT);
  s.classList.remove('closing');
  const i=document.getElementById('sheetIn');
  if(i){ i.style.transition=''; i.style.transform=''; }
  s.classList.add('on');
}
function closeSheet(){
  const s=document.getElementById('sheet');
  if(!s || !s.classList.contains('on')) return;
  const gen=++_sheetGen;
  s.classList.add('closing');
  clearTimeout(_sheetT);
  _sheetT=setTimeout(()=>{
    if(gen!==_sheetGen) return;          // közben új lap nyílt
    s.classList.remove('on','closing');
    const i=document.getElementById('sheetIn');
    if(i){ i.style.transition=''; i.style.transform=''; }
  }, SHEET_OUT);
}

/* ---- Beépített óra idő-alapú gyakorlathoz (plank stb.) ------------- */
// A cél-időről visszaszámol; a végén beep + rezgés és automatikusan
// rögzíti a teljes időt. Korai leállításnál a ténylegesen tartott mp kerül
// be. „Kézi megadás" a szám-billentyűzetre vált vissza.
let stInt=null, stEnd=0;
function fmtSec(s){ s=Math.max(0,Math.round(s)); return s>=60 ? Math.floor(s/60)+':'+String(s%60).padStart(2,'0') : String(s); }
function openTimerSet(e,i,target){
  clearInterval(stInt); stInt=null;
  const h=`<div class="grabber"></div>
    <div class="row"><div class="grow"><span class="eyebrow">${i+1}. szett · idő</span>
      <h2 style="font-size:24px">${esc(exN(e))}</h2><span class="small dim">cél: ${esc(e.r)}</span></div>
      <button onclick="closeTimerSet()" style="font-size:26px;color:var(--dim);padding:0 8px">×</button></div>
    <div style="text-align:center;margin:16px 0 8px">
      <div id="stVal" class="num" style="font-size:66px;font-weight:700;line-height:1">${fmtSec(target)}</div>
      <div class="small dim" style="margin-top:2px">másodperc · visszaszámlál a célig</div></div>
    <div class="mgtrack" style="height:8px"><span id="stBar" class="mgfill" style="--p:1;background:var(--brass)"></span></div>
    <button id="stBtn" class="btn pri" style="margin-top:14px" onclick="toggleTimerSet(${target})">Indítás</button>
    <button class="btn" style="margin-top:8px;color:var(--mut)" onclick="document.getElementById('sheetIn').innerHTML=repKbSheet(exDef(cur.id),cur.i,${target})">Kézi megadás</button>`;
  document.getElementById('sheetIn').innerHTML=h;
  openSheet();
}
function stTick(target){
  const leftMs=Math.max(0, stEnd-Date.now()), left=leftMs/1000;
  const el=document.getElementById('stVal'); if(el) el.textContent=fmtSec(Math.ceil(left));
  const bar=document.getElementById('stBar'); if(bar) bar.style.setProperty('--p', (target>0?left/target:0).toFixed(4));
  if(leftMs>0 && document.hidden && !_holdNotifShown){ _holdNotifShown=true;
    timerNotif('Tartás folyamatban', 'Szólunk, amint letelt.', 'hold', true); }
  if(leftMs<=0){ clearInterval(stInt); stInt=null; if(navigator.vibrate) navigator.vibrate([200,100,200]); beep();
    if(document.hidden) timerNotif('Tartás kész', 'Szép munka!', 'hold', false); else clearNotif('hold');
    releaseWake(); finishTimerSet(target); }
}
function toggleTimerSet(target){
  if(stInt){                                  // leállítás korán → a ténylegesen tartott idő
    clearInterval(stInt); stInt=null; releaseWake();
    finishTimerSet(Math.max(1, target - Math.ceil(Math.max(0,stEnd-Date.now())/1000))); return;
  }
  stEnd=Date.now()+target*1000; _holdNotifShown=false; acquireWake(); ensureAudio();
  const b=document.getElementById('stBtn'); if(b){ b.textContent='Leállítás'; b.classList.remove('pri'); }
  clearInterval(stInt); stInt=setInterval(()=>stTick(target),200); stTick(target);
}
function finishTimerSet(v){ clearInterval(stInt); stInt=null; clearNotif('hold'); setRep(v); }   // rögzít + pihenő indul
function closeTimerSet(){ clearInterval(stInt); stInt=null; _holdNotifShown=false; releaseWake(); clearNotif('hold'); closeSheet(); }

/* ---- Témázott modál (confirm/alert helyett) ------------------------ */
let _modalRes=null;
/* A modál zárása is ANIMÁLT, tehát nem azonnali. A DÖNTÉS viszont igen:
 * az ígéret RÖGTÖN feloldódik, a kilépés mellette fut – különben az egész
 * app 150 ms-ot késne minden megerősítés után.
 * Nemzedék-őr kell, mert a hívók gyakran nyitnak új modált a válasz után
 * (`await uiConfirm(…)` → `uiAlert(…)`): enélkül a régi kilépés tüntetné
 * el a frisset. */
const MODAL_OUT=150;
let _modalGen=0, _modalT=null;
function openModal(){
  const m=document.getElementById('modal'); if(!m) return;
  _modalGen++; clearTimeout(_modalT);
  m.classList.remove('closing'); m.classList.add('on');
}
function _closeModal(v){
  const m=document.getElementById('modal');
  const r=_modalRes; _modalRes=null;
  if(m && m.classList.contains('on')){
    const gen=++_modalGen;
    m.classList.add('closing');
    clearTimeout(_modalT);
    _modalT=setTimeout(()=>{ if(gen===_modalGen) m.classList.remove('on','closing'); }, MODAL_OUT);
  }
  if(r) r(v);                 // a döntés NEM vár az animációra
}
function uiConfirm(msg, opts){ opts=opts||{};
  return new Promise(res=>{ _modalRes=res;
    document.getElementById('modalIn').innerHTML=`<div class="modal-msg">${esc(msg)}</div>
      <div class="modal-actions">
        <button class="btn" style="flex:1;margin:0" onclick="_closeModal(false)">${esc(opts.cancel||'Mégse')}</button>
        <button class="btn ${opts.danger?'danger':'pri'}" style="flex:1;margin:0" onclick="_closeModal(true)">${esc(opts.ok||'Rendben')}</button>
      </div>`;
    openModal(); });
}
function uiAlert(msg, opts){ opts=opts||{};
  return new Promise(res=>{ _modalRes=res;
    document.getElementById('modalIn').innerHTML=`<div class="modal-msg">${esc(msg)}</div>
      <div class="modal-actions"><button class="btn pri" style="flex:1;margin:0" onclick="_closeModal()">${esc(opts.ok||'Rendben')}</button></div>`;
    openModal(); });
}
// Az RPE kiválasztása NEM rögzít: a lap nyitva marad, hogy utána a
// szám-koppintás zárja le a dolgot. Így a nem-RPE-s út 2 koppintás marad.
function pickRpe(v){ _rpePick=v; const el=document.getElementById('sheetIn');
  if(el) el.innerHTML=repKbSheet(exDef(cur.id), cur.i, parseInt(exDef(cur.id).r)||8); }
