/* ==================================================================
   Tema (vilagos/sotet), ikonok befestese, esemenykotesek,
   lehuzhato lap gesztusa es az app INDITASA. Ez fut utoljara.
   ================================================================== */
/* ---- Téma (világos / sötét) ---------------------------------------- */
function currentTheme(){ try{ return localStorage.getItem('gymlog_theme')||'auto'; }catch(e){ return 'auto'; } }
function effectiveDark(){ const t=currentTheme();
  if(t==='dark') return true; if(t==='light') return false;
  return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches; }
function applyTheme(){
  const t=currentTheme(), root=document.documentElement;
  if(t==='auto') delete root.dataset.theme; else root.dataset.theme=t;
  const dark=effectiveDark();
  const m=document.querySelector('meta[name="theme-color"]'); if(m) m.content=dark?'#0F1317':'#F4F2EC';
  const b=document.getElementById('themeBtn'); if(b) b.innerHTML=dark?ICON.moon:ICON.sun;
}
function paintIcons(){
  const set=(sel,svg)=>{ const el=document.querySelector(sel); if(el) el.innerHTML=svg; };
  set('#accountBtn', ICON.account);
  set('#injuryBtn', ICON.injury);
  set('#physioBtn', ICON.physio);
  const navIcon={home:ICON.dumbbell, plans:ICON.plans, log:ICON.list, prog:ICON.chart, friends:ICON.friends};
  // A statikus nav feliratai nem sablonból jönnek, ezért a nyelvet ITT
  // festjük rájuk (a `.nlbl` a magyar forrásszöveget hordozza kulcsként).
  const navLbl={home:'Edzés', plans:'Tervek', log:'Napló', prog:'Haladás', friends:'Barátok'};
  document.querySelectorAll('.nav button').forEach(btn=>{
    const ic=btn.querySelector('.ic'); if(ic) ic.innerHTML = navIcon[btn.dataset.tab] || ICON.chart;
    const lb=btn.querySelector('.nlbl'); const k=navLbl[btn.dataset.tab];
    if(lb && k) lb.textContent = tr(k);
  });
}
function toggleTheme(){
  try{ localStorage.setItem('gymlog_theme', effectiveDark()?'light':'dark'); }catch(e){}
  applyTheme();
}
document.getElementById('themeBtn').onclick=toggleTheme;
if(window.matchMedia){ window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change',()=>{ if(currentTheme()==='auto') applyTheme(); }); }
applyTheme();

document.querySelectorAll('.nav button').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;render();window.scrollTo(0,0);
  if(tab==='friends') refreshFriends();});
document.getElementById('sheet').onclick=e=>{ if(e.target.id==='sheet') closeSheet(); };
document.getElementById('modal').onclick=e=>{ if(e.target.id==='modal') _closeModal(false); };

// Húzható alsó lap: felül állva, lefelé húzva bezárható (egykezes záráshoz).
(function(){
  const sheet=document.getElementById('sheet'), inner=document.getElementById('sheetIn');
  // A lehúzás-bezárás két dologra figyel: MENNYIT húztál és MILYEN GYORSAN.
  // Csak távolság-küszöbbel egy gyors pöccintés 100 px-en nem zárt volna be,
  // pedig a szándék egyértelmű volt.
  const FLICK=0.11;                       // px/ms – efölött a pöccintés zár
  let startY=0, dy=0, dragging=false, startT=0, moved=false;
  inner.addEventListener('touchstart',e=>{
    if(e.touches.length!==1 || inner.scrollTop>0){ dragging=false; return; }
    startY=e.touches[0].clientY; dy=0; dragging=true; moved=false;
    startT=Date.now(); sheet.classList.remove('snap');
  },{passive:true});
  inner.addEventListener('touchmove',e=>{
    if(!dragging) return;
    dy=e.touches[0].clientY-startY;
    // Amíg nem indult el LEFELÉ a húzás, a felfelé mozdulás sima görgetés –
    // add vissza a böngészőnek.
    if(!moved){
      if(dy<=4){ if(inner.scrollTop>0){ dragging=false; inner.style.transform=''; sheet.classList.remove('drag'); } return; }
      moved=true;
    }
    sheet.classList.add('drag');
    // A 0 fölé húzást nem tiltjuk, csak FÉKEZZÜK: a valóságban sem áll meg
    // hirtelen semmi, és így a gesztus nem szakad félbe, ha visszahúzod.
    inner.style.transform='translateY('+(dy>0 ? dy : dy*0.2)+'px)';
  },{passive:true});
  inner.addEventListener('touchend',()=>{
    if(!dragging) return; dragging=false; sheet.classList.remove('drag');
    const h=inner.offsetHeight||400;
    const v=Math.abs(dy)/Math.max(1, Date.now()-startT);
    if(dy>Math.min(150, h*0.28) || (dy>24 && v>FLICK)){
      // Ugyanaz a kilépés, mint az ×-nél és a háttér-koppintásnál.
      // A `.drag` már le van véve, így a `sheetOut` az AKTUÁLIS (lehúzott)
      // helyzetből viszi tovább lefelé, nem ugrik vissza.
      closeSheet();
    } else {
      sheet.classList.add('snap'); inner.style.transform='';
      setTimeout(()=>sheet.classList.remove('snap'),220);
    }
    dy=0;
  });
})();
paintIcons();
load().then(()=>{ updateInjuryBtn(); maybeOnboard(); });

// Felhő-szinkron indítása (inert, ha nincs supabase-config.js).
if(window.Auth){
  Auth.hooks.reload = ()=>load().then(updateInjuryBtn);
  Auth.hooks.onChange = async ()=>{ updateAuthBtn();
    if(Auth.isLoggedIn()){ await loadProfile(); syncStats(); refreshFriends(); }
    else { myProfile=null; friendsData=null; sharedPlansData=null; updateFriendsBadge(); if(tab==='friends') render(); } };
  Auth.init().catch(()=>{});
}
updateAuthBtn();

// Natív Health-híd (alvás): a beolvasott értéket a saját S.sleep-be mentjük.
// Web-en inert (Health.available() false), így a kártya kézi bevitel marad.
if(window.Health){
  Health.hooks.applySleep = (day, min, q)=>{ if(!(min>0)) return;
    if(!S.sleep) S.sleep={}; S.sleep[day]={min:min, q:q||0}; save(); render(); };
  try{ Health.init(); }catch(e){}
}

// Service worker – offline app-héj. Az edzésadatot (localStorage) nem érinti.
if('serviceWorker' in navigator){
  window.addEventListener('load', ()=>{
    navigator.serviceWorker.register('sw.js').catch(()=>{});
  });
}
