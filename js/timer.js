/* ==================================================================
   Szett rogzitese (setRep), kepernyo ebren tartasa, hang,
   ertesitesek es a piheno-ora (gyuru + visszaszamlalas).
   ================================================================== */
function setRep(v){
  const e=exDef(cur.id), L=S.active.log[cur.id];
  L.sets[cur.i]=v;
  // Az `rpe` tömb csak akkor keletkezik, ha tényleg van mit belerakni –
  // üres napló ne hízzon üres tömbökkel.
  if(_rpePick!=null || (L.rpe && L.rpe[cur.i]!=null)){
    if(!L.rpe) L.rpe=[];
    L.rpe[cur.i] = (v==null) ? null : _rpePick;   // a szett törlése az RPE-t is viszi
  }
  S.activeT=Date.now();
  closeSheet(); save();
  if(v==null){ render(); return; }
  if(navigator.vibrate) navigator.vibrate(12);   // rövid haptikus visszajelzés a rögzítésre
  justSet={id:cur.id,i:cur.i};                    // a chip pipa-pulzusa a következő festésnél
  // Superset: a kör tagjai közt csak rövid váltás + ugrás a következő tagra;
  // a teljes pihenő a kör VÉGÉN indul, és visszalépünk az első befejezetlen
  // tagra a következő körhöz.
  const mem=ssActiveMembers(cur.id);
  if(mem.length){
    const pos=mem.indexOf(cur.id);
    if(pos>=0 && pos<mem.length-1){ gotoExId(mem[pos+1]); render(); startTimer(Math.min(e.rest, SS_SWAP)); return; }
    const back=mem.find(id=>S.active.log[id].sets.some(x=>x==null));
    if(back) gotoExId(back);
    render(); startTimer(e.rest); return;
  }
  render(); startTimer(e.rest);
}

async function acquireWake(){ try{ if('wakeLock' in navigator && !wl){ wl=await navigator.wakeLock.request('screen'); wl.addEventListener('release',()=>{ wl=null; }); } }catch(e){ wl=null; } }
function releaseWake(){ try{ if(wl){ wl.release(); wl=null; } }catch(e){ wl=null; } }
// Hangjelzés a pihenő végén (WebAudio). Az AudioContext-et felhasználói
// koppintáskor (startTimer, szett-rögzítés után) oldjuk fel, hogy a végi
// biccentés megszólalhasson. Némítható (gymlog_mute kulcs, független a naplótól).
let audioCtx=null;
function restMuted(){ try{ return localStorage.getItem('gymlog_mute')==='1'; }catch(e){ return false; } }
function updateMuteLabel(){ const b=document.getElementById('muteBtn'); if(b) b.textContent = restMuted()?'Hang ki':'Hang be'; }
function toggleMute(){ try{ localStorage.setItem('gymlog_mute', restMuted()?'0':'1'); }catch(e){} updateMuteLabel(); if(!restMuted()){ ensureAudio(); beep(); } }
function ensureAudio(){ try{ if(!audioCtx) audioCtx=new (window.AudioContext||window.webkitAudioContext)(); if(audioCtx.state==='suspended') audioCtx.resume(); }catch(e){} }
function beep(){ if(restMuted()) return; try{ if(!audioCtx) return;
  const o=audioCtx.createOscillator(), g=audioCtx.createGain(), t=audioCtx.currentTime;
  o.type='sine'; o.frequency.setValueAtTime(880,t);
  g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(0.3,t+0.02); g.gain.exponentialRampToValueAtTime(0.0001,t+0.35);
  o.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t+0.37); }catch(e){} }

// Rendszer-értesítés a pihenő/tartás hátralévő idejével – opcionális
// (gymlog_notify kulcs, alap: ki). Csak háttérben (document.hidden) jelenik
// meg, hogy foreground-ban ne legyen zajos. Best-effort: a böngésző háttérben
// throttle-olhatja a JS-t, így mély háttérben késhet. Nem szerveres push.
// Háttér-értesítés: stintenként EGYSZER posztolunk (nem másodpercenként –
// az újraposztolás a lezárt telefonon minden alkalommal felébreszti a
// képernyőt). A zászlót visszaváltásnál / új időzítőnél nullázzuk.
let _restNotifShown=false, _holdNotifShown=false;
function notifyEnabled(){ try{ return localStorage.getItem('gymlog_notify')==='1' && ('Notification' in window) && Notification.permission==='granted'; }catch(e){ return false; } }
async function toggleNotify(){
  const turnOn = localStorage.getItem('gymlog_notify')!=='1';
  if(turnOn){
    if(!('Notification' in window)){ await uiAlert('Ez a böngésző nem támogatja az értesítéseket.'); return; }
    let p=Notification.permission;
    if(p==='default'){ try{ p=await Notification.requestPermission(); }catch(e){} }
    if(p!=='granted'){ await uiAlert('Az értesítés a böngészőben nincs engedélyezve. A telefon beállításaiban engedélyezheted az oldalnak.'); return; }
  }
  try{ localStorage.setItem('gymlog_notify', turnOn?'1':'0'); }catch(e){}
}
async function timerNotif(title, body, tag, silent){
  if(!notifyEnabled()) return;
  try{ const reg=await navigator.serviceWorker.getRegistration();
    if(reg && reg.showNotification){ reg.showNotification(title,{body,tag,renotify:false,silent:!!silent,icon:'./icon-192.png',badge:'./icon-192.png'}); return; } }catch(e){}
  try{ new Notification(title,{body,tag,silent:!!silent,icon:'./icon-192.png'}); }catch(e){}
}
async function clearNotif(tag){
  try{ const reg=await navigator.serviceWorker.getRegistration();
    if(reg && reg.getNotifications){ (await reg.getNotifications({tag})).forEach(n=>n.close()); } }catch(e){}
}
/* ---- Pihenő: kis óra a gyakorlat neve mellett -----------------------
 * Korábban teljes képernyős overlay volt, amit minden szett után ki kellett
 * nyomni – edzés közben pont azt takarta el, amit látni akarsz (hol tartasz,
 * mennyi van hátra). Most a lejátszóban, a név mellett fut egy 52px-es
 * gyűrű; MAGA A GYŰRŰ a gomb: egy koppintás leállítja.
 * Az óra időbélyeg-alapú (`tEnd`), tehát háttérből visszatérve is pontos. */
let _restOn=false;
function restRunning(){ return _restOn; }
// A kis óra a lejátszó újrafestésekor is a FRISS értékkel születik meg, hogy
// a `render()` és a következő `tick()` közti ~200 ms-ben se villanjon rosszat.
function restPillHtml(){
  if(!_restOn) return '';
  const left=Math.max(0,tEnd-Date.now()), s=Math.ceil(left/1000);
  const R=23, C=2*Math.PI*R, frac=tLen? left/(tLen*1000) : 0;
  return `<button class="restpill" onclick="stopTimer()" aria-label="${tr('Pihenő – koppints a leállításhoz')}" title="${tr('Pihenő – koppints a leállításhoz')}">
    <svg viewBox="0 0 52 52" aria-hidden="true">
      <circle class="rp-bg" cx="26" cy="26" r="${R}"></circle>
      <circle class="rp-fg" id="restRing" cx="26" cy="26" r="${R}"
        style="stroke-dasharray:${C.toFixed(1)};stroke-dashoffset:${(C*(1-frac)).toFixed(1)}"></circle>
    </svg><span class="rp-val" id="restVal">${Math.floor(s/60)}:${String(s%60).padStart(2,'0')}</span></button>`;
}
/* ---- A gyűrű ürülése: EGY animáció, nem per-tick DOM-írás ------------
 * A pihenő hossza induláskor ismert, tehát a mozgás előre meghatározott –
 * ilyenkor deklaratív animáció való, nem másodpercenként ötször újraírt
 * attribútum. A korábbi megoldásban a 200 ms-os tick és a 200 ms-os CSS
 * átmenet egymásra esett: a gyűrű folyamatosan utánhúzott, sosem ért célba,
 * és minden tickben újrafestette az SVG-t – pont akkor, amikor a telefon a
 * képernyőt is ébren tartja. Újraindításkor ráadásul visszafelé söpört.
 * `linear`, mert ez ÁLLANDÓ mozgás (visszaszámlálás), nem be- vagy kilépés.
 * Minden újrafestés után újra kell kötni (a `render` a DOM-ot kicseréli),
 * ezért a `render` festés-horga is meghívja. */
function syncRestRing(){
  const ring=document.getElementById('restRing'); if(!ring) return;
  const left=Math.max(0, tEnd-Date.now());
  const R=23, C=2*Math.PI*R, frac=tLen ? left/(tLen*1000) : 0;
  if(ring.getAnimations) ring.getAnimations().forEach(a=>a.cancel());
  ring.style.strokeDasharray=C.toFixed(1);
  ring.style.strokeDashoffset=C.toFixed(1);        // végállapot: üres gyűrű
  _restShown='';                                    // a szöveg is írjon újra
  if(left<=0 || !ring.animate) return;
  ring.animate([{strokeDashoffset:(C*(1-frac)).toFixed(1)},
                {strokeDashoffset:C.toFixed(1)}],
               {duration:left, easing:'linear', fill:'forwards'});
}
/* Az óra a gyakorlat neve MELLETT jelenik meg és tűnik el: enélkül a fejléc
 * sora ránduló ugrással rendeződik át. Szettenként látod, ezért rövid.
 * A kilépés GYORSABB, mint a belépés: a megjelenésről te döntesz, az
 * eltűnés a rendszer válasza – a válasz legyen a fürgébb.
 * Csökkentett mozgásnál elmarad, de a `done` akkor is lefut. */
function animRestPill(dir, done){
  const pill=document.querySelector('.restpill');
  if(!pill || !pill.animate || reducedMotion()){ if(done) done(); return; }
  const kf = dir==='in' ? [{transform:'scale(.9)',opacity:0},{transform:'scale(1)',opacity:1}]
                        : [{transform:'scale(1)',opacity:1},{transform:'scale(.9)',opacity:0}];
  const an = pill.animate(kf, {duration: dir==='in'?160:120,
    easing:'cubic-bezier(.23,1,.32,1)', fill:'forwards'});   // = --ease-out
  if(done) an.finished.then(done, done);
}
let _restShown='';
function startTimer(sec){
  tLen=sec; tEnd=Date.now()+sec*1000; _restNotifShown=false; _restOn=true;
  acquireWake();                                   // ne aludjon el a képernyő pihenő közben
  ensureAudio();                                   // hang feloldása (a szett-rögzítés koppintásán belül)
  clearInterval(tInt); tInt=setInterval(tick,200);
  if(playing) render();                            // hogy a kis óra kikerüljön a név mellé
  tick(); syncRestRing(); animRestPill('in');
}
function stopTimer(){
  clearInterval(tInt); _restNotifShown=false;
  const volt=_restOn; _restOn=false;
  releaseWake(); clearNotif('rest');
  // A festés VÁRJA MEG a kilépő animációt – különben a `render` kitörölné
  // az elemet, mielőtt bármit mutatna. (A többi hívó előbb `playing=false`-t
  // állít, ott ez az ág nem is fut.)
  if(volt && playing) animRestPill('out', ()=>{ if(!_restOn) render(); });
}
function tick(){
  const left=Math.max(0,tEnd-Date.now());
  const s=Math.ceil(left/1000);
  // A lejátszón kívül (szüneteltetve, másik fülön) nincs mit frissíteni –
  // az óra viszont tovább jár, és a végén ugyanúgy szól.
  // A gyűrűt NEM írjuk itt: azt a `syncRestRing` egyetlen animációja viszi.
  // A szöveg másodpercenként változik, a tick viszont 200 ms-onként fut –
  // öt írásból négy ugyanazt tette be. Csak valódi változásnál nyúlunk a
  // DOM-hoz, így a pihenő alatt gyakorlatilag nincs festési munka.
  const txt=Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
  if(txt!==_restShown){ _restShown=txt;
    const val=document.getElementById('restVal'); if(val) val.textContent=txt; }
  // Háttérben: EGYSZER, némán jelezzük, hogy megy a pihenő (nem
  // másodpercenként – az újraposzt felébreszti a lezárt képernyőt).
  if(left>0 && document.hidden && !_restNotifShown){ _restNotifShown=true;
    timerNotif('Pihenő folyamatban', 'Szólunk, amint letelt.', 'rest', true); }
  if(left<=0){ clearInterval(tInt); if(navigator.vibrate) navigator.vibrate([200,100,200]); beep();
    if(document.hidden) timerNotif('Pihenő letelt', 'Jöhet a következő szett!', 'rest', false); else clearNotif('rest');
    releaseWake();
    setTimeout(()=>{ _restOn=false;
      if(playing) animRestPill('out', ()=>{ if(!_restOn) render(); }); }, 1200); }
}
updateMuteLabel();
// A képernyőzár feloldódhat háttérbe váltáskor – ha még megy a pihenő, kérjük vissza.
document.addEventListener('visibilitychange',()=>{ if(document.visibilityState==='visible'){
  clearNotif('rest'); clearNotif('hold');   // visszatérve a képernyőn látszik az óra
  _restNotifShown=false; _holdNotifShown=false;   // legközelebbi háttérváltásnál újra jelezhet egyszer
  // Háttérben a böngésző fékezi az animációkat, így a gyűrű lemaradhat az
  // időbélyeg-alapú órától. Visszatéréskor újraszámoljuk – enélkül a szám és
  // a gyűrű mást mutatna, és pont ez a fajta apróság rontja el a bizalmat.
  if(_restOn && Date.now()<tEnd){ acquireWake(); syncRestRing(); } } });

