/* ==================================================================
   A kozponti festo hurok: render(), a nezet-atmenet, a belepo
   animacio es a szam-felporgetes. Plusz a kozos formazok (esc, kgNum).
   ================================================================== */
function esc(s){return String(s).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]))}
function fmtDate(t){const d=new Date(t);return d.getFullYear()+'.'+String(d.getMonth()+1).padStart(2,'0')+'.'+String(d.getDate()).padStart(2,'0')}
// A ' kg' egységet a hívók fűzik hozzá (e.bw && w<=0 esetén nem). Ezért itt
// a testsúlyos (idős is) gyakorlatnál csak '+hozzáadott' vagy 'testsúly',
// egyébként a szám – így nincs dupla 'kg' (pl. Plank +5).
// Súly magyar alakban: az egész szám egész marad, a tizedes VESSZŐT kap
// („62,5 kg"), hogy ne keveredjen a testsúly-napló vesszős alakjával.
function kgNum(w){ const n=Math.round((+w||0)*100)/100; return String(n).replace('.',','); }
function wLabel(e,w){ if(e.bw) return w>0? '+'+kgNum(w):'testsúly'; return kgNum(w) }
function exDone(e,L){ return L && L.sets.length && L.sets.every(x=>x!=null); }

function reducedMotion(){ try{ return window.matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(e){ return false; } }
function _paint(){
  const a=document.getElementById('app');
  if(editing==='program') a.innerHTML = programView();
  else if(editing==='routine') a.innerHTML = builderView();
  else if(playing && S.active) a.innerHTML = playerView();
  else if(tab==='home') a.innerHTML = homeView();
  else if(tab==='plans') a.innerHTML = plansView();
  else if(tab==='log') a.innerHTML = logView();
  else if(tab==='friends') a.innerHTML = friendsView();
  else if(tab==='physio') a.innerHTML = physioView();
  else a.innerHTML = progView();
  document.querySelectorAll('.nav button').forEach(b=>b.classList.toggle('on', b.dataset.tab===tab));
  // Frissen rögzített szett-chip pipa-pulzusa (a nézetben, ahol látszik)
  if(justSet){ const c=a.querySelector(`.chip[data-i="${justSet.i}"]`); if(c) c.classList.add('pop'); justSet=null; }
}
let _viewKey='__init__', _enterT=null;
function render(){
  const immersive = (playing && !!S.active) || !!editing;
  document.body.classList.toggle('playing', immersive);
  const key = editing?('edit:'+editing):(playing&&S.active?'play':tab);
  const first = _viewKey==='__init__';
  const viewChanged = key!==_viewKey && !first;
  _viewKey = key;
  // A festés UTÁNI vizuális horgok (belépő animáció + statok felszámolása)
  // a festéssel egy egységben futnak – így a View Transition ágon is a
  // friss DOM-ra kerülnek, nem a régire.
  const paint = ()=>{ _paint();
    // A pihenő-gyűrű animációja az elemhez tapad, a festés viszont kicseréli
    // a DOM-ot – ezért minden festés után újra rá kell kötni.
    if(_restOn) syncRestRing();
    if(viewChanged || first){ enterAnim(); requestAnimationFrame(runCountUps); } };
  if(viewChanged && !reducedMotion() && document.startViewTransition){
    document.startViewTransition(paint);
  } else paint();
}
// Belépő animáció: az #app kap egy `.enter` osztályt, amire a CSS a
// kártyák lépcsőzetes beúszását akasztja. Tisztán megjelenés.
function enterAnim(){
  if(reducedMotion()) return;
  const a=document.getElementById('app'); if(!a) return;
  a.classList.remove('enter'); void a.offsetWidth; a.classList.add('enter');
  clearTimeout(_enterT); _enterT=setTimeout(()=>a.classList.remove('enter'), 600);
}
// Nagy stat-számok „felpörgetése" 0-ról a valós értékre (csak nézetbe lépéskor).
function runCountUps(){
  if(reducedMotion()) return;
  document.querySelectorAll('#app [data-cu]').forEach(el=>{
    const to=parseInt(el.dataset.cu,10); if(!(to>0)) return;
    // A készenlét-pontszám az a szám, amiért megnyitod a főoldalt – nem
    // mutogatni való, hanem elolvasni. 560 ms-ig visszatartani naponta
    // sokszor bosszantó; ennyi már csak „leülepedésnek" érződik.
    const dur=340, t0=performance.now();
    const step=(t)=>{ const p=Math.min(1,(t-t0)/dur), e=1-Math.pow(1-p,3);
      el.textContent=Math.round(to*e); if(p<1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
}

