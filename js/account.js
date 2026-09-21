/* ==================================================================
   Serules-mod, mentes-emlekezteto, felho-fiok, fiok veglegess
   torlese, baratok, edzesterv-megosztas es az onboarding.
   ================================================================== */
/* ---- Sérülés-mód --------------------------------------------------- */
function openInjury(){
  const parts=(S.injury&&S.injury.parts)||[];
  let h=`<div class="grabber"></div>
    <div class="row"><div class="grow"><span class="eyebrow">Sérülés-mód</span>
    <h2 style="font-size:22px">Terhelt testtáj</h2><span class="small dim">Az érintett gyakorlatok kimaradnak, a többi súlya csökken</span></div>
    <button onclick="closeSheet()" style="font-size:26px;color:var(--dim);padding:0 8px">×</button></div>
    <div class="whyrow" style="margin-top:12px">`;
  MGS.forEach(m=>{ h+=`<button class="whyc ${parts.indexOf(m)>=0?'on':''}" onclick="toggleInjury('${m}')">${esc(trmg(m))}</button>`; });
  h+=`</div><p class="small dim" style="margin:12px 0 0">Az új edzés indításakor lép életbe. A folyamatban lévő edzést nem módosítja.</p>
    <button class="btn" style="margin-top:12px" onclick="clearInjury()">Sérülés-mód kikapcsolása</button>`;
  document.getElementById('sheetIn').innerHTML=h;
  openSheet();
}
function toggleInjury(m){
  const parts=(S.injury&&S.injury.parts)?S.injury.parts.slice():[];
  const i=parts.indexOf(m); if(i>=0) parts.splice(i,1); else parts.push(m);
  S.injury = parts.length ? {parts:parts,since:Date.now()} : null;
  save(); openInjury(); updateInjuryBtn();
}
function clearInjury(){ S.injury=null; save(); closeSheet(); render(); updateInjuryBtn(); }
function updateInjuryBtn(){ const b=document.getElementById('injuryBtn'); if(b) b.style.color=injuryOn()?'var(--red)':'var(--mut)'; }

/* ---- Mentés-emlékeztető ------------------------------------------- */
function needsBackup(){ return !nagOff && S.sessions.length>0 && (Date.now()-(S.lastBackup||0) > 30*864e5); }
function dismissNag(){ nagOff=true; render(); }

/* ---- Fiók / felhő-szinkron (1. fázis) ------------------------------ */
function updateAuthBtn(){
  const b=document.getElementById('accountBtn'); if(!b) return;
  const on=window.Auth && Auth.isLoggedIn();
  b.style.color = on ? 'var(--sage)' : 'var(--mut)';
  b.title = on ? ('Fiók: '+(Auth.currentUser()?.email||'bejelentkezve')) : 'Fiók / felhő-szinkron';
}
// A nyelvváltás csak a FELÜLET nyelvét állítja – a napló (gyakorlat-ID-k,
// rögzített adat) érintetlen, ahogy a témaváltás sem nyúl hozzá.
function switchLang(l){ I18N.setLang(l); paintIcons(); render(); openAuthSheet(); }
function openAuthSheet(){
  const configured = window.Auth && Auth.configured();
  const loggedIn = window.Auth && Auth.isLoggedIn();
  let h=`<div class="grabber"></div>
    <div class="row"><div class="grow"><span class="eyebrow">Profil</span>
    <h2 style="font-size:22px">${loggedIn?'Bejelentkezve':'Profil'}</h2></div>
    <button onclick="closeSheet()" style="font-size:26px;color:var(--dim);padding:0 8px">×</button></div>`;
  h+=`<div style="margin-top:14px">${levelCard()}</div>`;   // szint / XP (streak-fókusz)
  h+=`<div class="eyebrow" style="margin-top:14px">Fiók · felhő-szinkron</div>`;
  if(!configured){
    h+=`<p class="small mut" style="margin-top:12px">A felhő-szinkron még nincs beállítva ezen a példányon.
      Másold a <code>supabase-config.example.js</code>-t <code>supabase-config.js</code> néven, és töltsd ki a
      Supabase URL-lel és anon kulccsal. Nélküle az app localStorage-ból fut. Részletek:
      <code>docs/1-fazis-auth-TODO.md</code>.</p>`;
  } else if(loggedIn){
    const nm=(myProfile&&myProfile.display_name)||'';
    h+=`<p class="small mut" style="margin-top:12px">${esc(Auth.currentUser()?.email||'')}</p>
      <p class="small dim" style="margin-top:6px">Az edzésadatod a fiókodhoz szinkronizálódik.</p>
      <div class="small dim" style="margin-top:14px">Megjelenítendő név (a barátaid ezt látják)</div>
      <div class="row" style="gap:8px;margin-top:4px">
        <input id="dispName" type="text" placeholder="Neved" value="${esc(nm)}" style="flex:1">
        <button class="btn" style="width:auto;margin:0;padding:12px 16px" onclick="saveDispName()">Mentés</button>
      </div>
      <button class="btn pri" style="margin-top:14px" onclick="closeSheet();tab='friends';render();refreshFriends();">Barátok</button>
      <button class="btn" style="margin-top:8px;color:var(--mut)" onclick="doSignOut()">Kijelentkezés</button>
      <button class="btn" style="margin-top:8px;color:var(--red)" onclick="openDeleteAccount()">Fiók végleges törlése</button>`;
  } else {
    h+=`<input id="authEmail" type="email" inputmode="email" autocomplete="email" placeholder="e-mail"
        style="width:100%;margin-top:12px">
      <input id="authPass" type="password" autocomplete="current-password" placeholder="jelszó"
        style="width:100%;margin-top:8px">
      <div id="authErr" class="small" style="color:var(--red);margin-top:8px;display:none"></div>
      <button class="btn pri" style="margin-top:12px" onclick="doAuth('in')">Belépés</button>
      <button class="btn" style="margin-top:8px" onclick="doAuth('up')">Regisztráció</button>`;
  }
  // Beállítások (pl. hangjelzés a pihenő végén)
  h+=`<div class="eyebrow" style="margin-top:20px">Beállítások</div>
    <button class="btn" style="margin-top:8px;text-align:left" onclick="toggleMute();openAuthSheet()">
      <span class="small dim">Hangjelzés a pihenő végén</span><br>
      <b>${restMuted()?'Kikapcsolva':'Bekapcsolva'}</b> <span class="dim">· koppints a váltáshoz</span></button>
    <button class="btn" style="margin-top:8px;text-align:left" onclick="(async()=>{await toggleNotify();openAuthSheet();})()">
      <span class="small dim">Időzítő értesítésben (háttérben)</span><br>
      <b>${(function(){try{return localStorage.getItem('gymlog_notify')==='1'}catch(e){return false}})()?'Bekapcsolva':'Kikapcsolva'}</b> <span class="dim">· ha kiváltasz az appból, a pihenő ideje értesítésben látszik</span></button>`;
  h+=`<button class="btn ghost" style="margin-top:14px;color:var(--mut)" onclick="openWelcome()">Bemutató megtekintése</button>`;
  h+=`<div class="top" style="padding:18px 0 6px"><span class="eyebrow">${tr('Nyelv')}</span></div>
    <div class="seg">
      <button class="${I18N.getLang()==='hu'?'on':''}" onclick="switchLang('hu')">${tr('Magyar')}</button>
      <button class="${I18N.getLang()==='en'?'on':''}" onclick="switchLang('en')">${tr('Angol')}</button>
    </div>`;
  h+=`<div class="small dim" style="text-align:center;margin-top:14px">${tr('Verzió')} ${APP_VERSION} · <a href="privacy.html" target="_blank" rel="noopener" style="color:var(--mut)">${tr('Adatvédelem')}</a></div>`;
  document.getElementById('sheetIn').innerHTML=h;
  openSheet();
  if(loggedIn && !myProfile){ loadProfile().then(()=>{ const s=document.getElementById('sheet');
    if(s&&s.classList.contains('on') && document.getElementById('dispName')) openAuthSheet(); }); }
}
function authErr(msg){ const e=document.getElementById('authErr'); if(e){ e.textContent=msg; e.style.display='block'; } }
async function doAuth(kind){
  const email=(document.getElementById('authEmail')||{}).value;
  const pass=(document.getElementById('authPass')||{}).value;
  if(!email||!pass){ authErr('Adj meg e-mailt és jelszót.'); return; }
  try{
    const { error } = kind==='up' ? await Auth.signUp(email,pass) : await Auth.signIn(email,pass);
    if(error){ authErr(error.message||'Hiba történt.'); return; }
    if(kind==='up'){ authErr('Kész! Erősítsd meg az e-mailt, majd lépj be.'); return; }
    closeSheet();   // a belépés az onAuthStateChange-en át frissít
  }catch(e){ authErr('Nem sikerült – ellenőrizd a hálózatot / a beállítást.'); }
}
async function doSignOut(){ await Auth.signOut(); myProfile=null; closeSheet(); }

/* ---- Fiók végleges törlése ----------------------------------------- *
 * Az App Store (5.1.1(v)) és a Google Play is megköveteli, hogy a fiók
 * APPON BELÜL törölhető legyen, ne csak e-mailben kérhető.
 *
 * Két külön dologról van szó, és ezt a lap ki is mondja:
 *  - a FELHŐ-fiók és a hozzá tartozó szerveroldali adat (ez megy),
 *  - a TELEFONON lévő napló (ez alapból MARAD – az a te edzésnaplód,
 *    nem a fiók adata; külön jelölőnégyzettel kérhető a törlése).
 * A sorrend fontos: előbb a fiók törlődik, és a helyi napló CSAK sikeres
 * szerveroldali törlés után – így egy hibás hívás nem semmisít meg semmit.
 */
let delWipeLocal=false;
function openDeleteAccount(){
  delWipeLocal=false;
  const mail=(Auth.currentUser&&Auth.currentUser()&&Auth.currentUser().email)||'';
  document.getElementById('sheetIn').innerHTML=`<div class="grabber"></div>
    <div class="row"><div class="grow"><span class="eyebrow" style="color:var(--red)">Végleges</span>
      <h2 style="font-size:22px">Fiók törlése</h2>
      <span class="small dim">${esc(mail)}</span></div>
      <button onclick="closeSheet()" style="font-size:26px;color:var(--dim);padding:0 8px">×</button></div>

    <div class="card" style="margin-top:14px;border-color:var(--red)"><div class="pad">
      <span class="eyebrow" style="color:var(--red)">Ez törlődik a felhőből</span>
      <ul class="small mut" style="margin:8px 0 0;padding-left:18px;line-height:1.7">
        <li>a fiókod és a belépésed</li>
        <li>a felhőbe szinkronizált edzésnaplód</li>
        <li>a profilod és a megjelenítendő neved</li>
        <li>a barát-kapcsolataid (a másik félnél is)</li>
        <li>a megosztott összefoglalód és a megosztott edzésterveid</li>
      </ul>
      <div class="small dim" style="margin-top:10px">Nem visszavonható, és a fiók nem állítható helyre.</div>
    </div></div>

    <div class="card" style="margin-top:10px"><div class="pad">
      <span class="eyebrow">Ez a telefonon marad</span>
      <div class="small mut" style="margin-top:6px">A készüléken tárolt edzésnaplód – ez a te adatod, nem a fiókhoz tartozik. Az app fiók nélkül is működik tovább vele.</div>
      <button class="btn" style="margin-top:10px" onclick="backup()">Biztonsági mentés letöltése</button>
      <button id="delWipe" class="btn" style="margin-top:8px;text-align:left" onclick="toggleDelWipe()">
        <span class="dim">☐</span>&nbsp; A telefonon lévő napló is törlődjön</button>
    </div></div>

    <button class="btn danger" style="margin-top:14px" onclick="confirmDeleteAccount()">Fiók végleges törlése</button>
    <button class="btn" style="margin-top:8px;color:var(--mut)" onclick="closeSheet()">Mégse</button>`;
  openSheet();
}
function toggleDelWipe(){
  delWipeLocal=!delWipeLocal;
  const b=document.getElementById('delWipe'); if(!b) return;
  b.innerHTML=`<span style="color:${delWipeLocal?'var(--red)':'var(--dim)'}">${delWipeLocal?'☑':'☐'}</span>&nbsp; A telefonon lévő napló is törlődjön`;
  b.style.borderColor = delWipeLocal ? 'var(--red)' : '';
}
async function confirmDeleteAccount(){
  const extra = delWipeLocal
    ? '\n\nA telefonon lévő naplód IS törlődni fog (' + S.sessions.length + ' edzés).'
    : '\n\nA telefonon lévő naplód megmarad.';
  if(!(await uiConfirm('Biztosan törlöd a fiókodat? Ez nem vonható vissza.'+extra,
      {ok:'Törlés', cancel:'Mégse', danger:true}))) return;
  const res = await Auth.deleteAccount();
  if(!res || !res.ok){
    await uiAlert('A törlés nem sikerült: '+((res&&res.error)||'ismeretlen hiba')+
      '\n\nA fiókod érintetlen. Próbáld újra, vagy írj a tájékoztatóban megadott címre.');
    return;
  }
  // CSAK sikeres szerveroldali törlés után nyúlunk a helyi adathoz.
  if(delWipeLocal){
    S={sessions:[], active:null, weights:{}, notes:{}, photos:{}, injury:null, lastBackup:0,
       customEx:{}, routines:[], programs:[], hidePlan:false, activeProgram:null,
       deleted:[], activeT:0, prog:{}, bw:{}, sleep:{}, rdy:null, sched:{}};
    playing=false; curEx=0; rdyInvalidate(); await save();
  }
  myProfile=null; friendsData=null; sharedPlansData=null;
  closeSheet(); updateAuthBtn(); updateFriendsBadge(); tab='home'; render(); window.scrollTo(0,0);
  await uiAlert(delWipeLocal
    ? 'A fiókod és a naplód törölve.'
    : 'A fiókod törölve. A telefonon lévő naplód megmaradt – az app fiók nélkül is működik.');
}

/* ---- Barátok (2. fázis) -------------------------------------------- */
let myProfile=null;
async function loadProfile(){ if(!(window.Auth&&Auth.isLoggedIn())) return; try{ myProfile=await Auth.getProfile(); }catch(e){} }
async function saveDispName(){
  const v=(document.getElementById('dispName').value||'').trim();
  if(!v){ uiAlert('Adj meg egy nevet.'); return; }
  await Auth.saveDisplayName(v); if(myProfile) myProfile.display_name=v; else myProfile={display_name:v};
  syncStats(); toast('Név elmentve.');
}
// Csak nem érzékeny összefoglaló megy a barátoknak (nincs jegyzet/fotó/sérülés).
function shareSummary(){
  const sessions=S.sessions||[];
  const lifts=Object.keys(S.weights||{}).filter(id=>S.weights[id]>0)
    .map(id=>({n:exDef(id).n, w:S.weights[id]})).sort((a,b)=>b.w-a.w).slice(0,6);
  return { sessions:sessions.length, week:sessions.filter(s=>Date.now()-s.t<6048e5).length,
    last:sessions.length?sessions[sessions.length-1].t:0, lifts };
}
async function syncStats(){ if(window.Auth&&Auth.isLoggedIn()){ try{ await Auth.publishStats(shareSummary(), myProfile&&myProfile.display_name); }catch(e){} } }

let friendsData=null, sharedPlansData=null;
async function refreshFriends(){
  if(!(window.Auth&&Auth.isLoggedIn())){ if(tab==='friends') render(); updateFriendsBadge(); return; }
  if(!myProfile) await loadProfile();
  try{ friendsData=await Auth.listFriendships(); }catch(e){ friendsData=[]; }
  try{ sharedPlansData=await Auth.listSharedPlans(); }catch(e){ sharedPlansData=[]; }
  updateFriendsBadge();
  if(tab==='friends') render();
}
// Értesítés-pötty: bejövő barát-kérés vagy megosztott edzésterv vár.
function friendsPending(){
  if(!(window.Auth&&Auth.isLoggedIn())) return 0;
  const me=Auth.currentUser().id;
  const inc=(friendsData||[]).filter(r=>r.status==='pending'&&r.addressee===me).length;
  return inc + (sharedPlansData||[]).length;
}
function updateFriendsBadge(){ const d=document.getElementById('friendsDot'); if(d) d.classList.toggle('on', friendsPending()>0); }
function friendsView(){
  const wrap = inner => `<div class="wrap"><div class="top"><span class="eyebrow">Közösség</span>
    <h1 style="font-size:34px;margin-top:4px">Barátok</h1></div>${inner}</div>`;
  if(!(window.Auth&&Auth.configured()))
    return wrap(`<div class="empty">A barátokhoz felhő-fiók kell, ami ezen a példányon nincs beállítva.</div>`);
  if(!Auth.isLoggedIn())
    return wrap(`<div class="empty">Lépj be a fiókodba a barátokhoz.</div>
      <button class="btn pri" onclick="openAuthSheet()">Belépés / fiók</button>`);
  if(friendsData==null){ refreshFriends(); return wrap(`<div class="empty">Betöltés…</div>`); }

  const me=Auth.currentUser().id, rows=friendsData;
  const accepted=rows.filter(r=>r.status==='accepted');
  const incoming=rows.filter(r=>r.status==='pending' && r.addressee===me);
  const outgoing=rows.filter(r=>r.status==='pending' && r.requester===me);
  const nameOf=r=> r.requester===me ? (r.addressee_name||'Barát') : (r.requester_name||'Barát');
  const otherId=r=> r.requester===me ? r.addressee : r.requester;
  let h=`<div class="card"><div class="pad">
      <span class="small dim">A te barát-kódod</span>
      <div class="cond" style="font-size:28px;font-weight:700;letter-spacing:.14em">${esc((myProfile&&myProfile.friend_code)||'…')}</div>
      <div class="small mut" style="margin-top:4px">Oszd meg egy baráttal, hogy bejelöljön.</div></div></div>
    <div class="row" style="gap:8px;margin-top:2px">
      <input id="friendCode" type="text" placeholder="Barát kódja" style="flex:1;text-transform:uppercase">
      <button class="btn pri" style="width:auto;margin:0;padding:12px 16px" onclick="doAddFriend()">Bejelölés</button></div>
    <div id="friendErr" class="small" style="color:var(--red);margin-top:6px;display:none"></div>`;
  // Beérkezett megosztott edzéstervek
  const shared=sharedPlansData||[];
  if(shared.length){ h+=`<div class="top" style="padding:18px 0 6px"><span class="eyebrow">Megosztott edzéstervek</span></div>`;
    shared.forEach(sp=>{ h+=`<div class="card"><div class="pad">
      <div class="row"><div class="grow"><span class="cond" style="font-size:18px;font-weight:600;display:block">${esc(sp.name||'Terv')}</span>
      <span class="small dim">${esc(sp.from_name||'Barát')} küldte</span></div></div>
      <div class="row" style="gap:8px;margin-top:10px">
        <button class="btn pri" style="flex:1;margin:0" onclick="doImportPlan('${sp.id}')">Importálás</button>
        <button class="btn" style="width:auto;margin:0;padding:12px 16px;color:var(--mut)" onclick="doDiscardPlan('${sp.id}')">Elvet</button></div></div>`; }); }
  if(incoming.length){ h+=`<div class="top" style="padding:18px 0 6px"><span class="eyebrow">Bejövő kérések</span></div>`;
    incoming.forEach(r=>{ h+=`<div class="card"><div class="pad row">
      <span class="grow cond" style="font-size:18px;font-weight:600">${esc(r.requester_name||'Barát')}</span>
      <button class="btn" style="width:auto;margin:0;padding:10px 14px;color:var(--sage)" onclick="doRespond('${r.requester}',true)">Elfogad</button>
      <button class="iconbtn" style="color:var(--red);margin-left:8px" onclick="doRespond('${r.requester}',false)">×</button></div></div>`; }); }
  h+=`<div class="top" style="padding:18px 0 6px"><span class="eyebrow">Barátaid (${accepted.length})</span></div>`;
  if(!accepted.length) h+=`<div class="empty" style="padding:16px 0">Még nincs barátod. Add meg egy barát kódját fentebb.</div>`;
  accepted.forEach(r=>{ const id=otherId(r);
    h+=`<div class="card"><div class="pad row">
      <button class="grow" style="text-align:left;padding:0;background:none" onclick="openFriendStats('${id}','${esc(nameOf(r))}')">
        <span class="cond" style="font-size:18px;font-weight:600;display:block">${esc(nameOf(r))}</span>
        <span class="small dim">koppints a haladásához ›</span></button>
      <button class="iconbtn" style="color:var(--red)" onclick="doRemoveFriend('${id}')" aria-label="Törlés">×</button></div></div>`; });
  if(outgoing.length){ h+=`<div class="top" style="padding:18px 0 6px"><span class="eyebrow">Elküldött kérések</span></div>`;
    outgoing.forEach(r=>{ h+=`<div class="card"><div class="pad small mut">${esc(r.addressee_name||'Barát')} · függőben</div></div>`; }); }
  return wrap(h);
}
async function doAddFriend(){
  const code=(document.getElementById('friendCode').value||'').trim();
  if(!code) return;
  let res='error'; try{ res=await Auth.requestFriend(code); }catch(e){}
  const errEl=document.getElementById('friendErr');
  const msg={ notfound:'Nincs ilyen kód.', self:'Ez a saját kódod.', error:'Hiba történt – ellenőrizd a hálózatot.' }[res];
  if(msg){ if(errEl){ errEl.textContent=msg; errEl.style.display='block'; } return; }
  refreshFriends();   // 'ok' vagy 'accepted' → frissítés
}
async function doRespond(requesterId, accept){ try{ await Auth.respondFriend(requesterId, accept); }catch(e){} refreshFriends(); }
async function doRemoveFriend(id){ if(!(await uiConfirm('Törlöd ezt a barátot?', {ok:'Törlés', danger:true}))) return; try{ await Auth.removeFriend(id); }catch(e){} refreshFriends(); }
async function openFriendStats(id, name){
  const head=n=>`<div class="grabber"></div>
    <div class="row"><div class="grow"><span class="eyebrow">Barát haladása</span><h2 style="font-size:22px">${esc(n)}</h2></div>
    <button onclick="closeSheet()" style="font-size:26px;color:var(--dim);padding:0 8px">×</button></div>`;
  document.getElementById('sheetIn').innerHTML=head(name)+`<div class="empty" style="padding:16px 0">Betöltés…</div>`;
  openSheet();
  let st=null; try{ st=await Auth.friendStats(id); }catch(e){}
  let h=head((st&&st.display_name)||name);
  if(!st||!st.data||!st.data.sessions){ h+=`<div class="empty" style="padding:16px 0">Ez a barát még nem osztott meg adatot.</div>`; }
  else{ const d=st.data;
    h+=`<div class="card"><div class="pad row">
      <div class="grow"><div class="num" style="font-size:30px;font-weight:700">${d.sessions||0}</div><div class="small dim">edzés</div></div>
      <div class="grow"><div class="num" style="font-size:30px;font-weight:700">${d.week||0}</div><div class="small dim">7 napban</div></div>
      ${d.last?`<div class="grow small dim" style="align-self:center">Utolsó:<br>${fmtDate(d.last)}</div>`:''}</div></div>`;
    if(d.lifts&&d.lifts.length){ h+=`<div class="top" style="padding:12px 0 6px"><span class="eyebrow">Legnagyobb súlyok</span></div><div class="card">`;
      d.lifts.forEach(l=>{ h+=`<div class="hrow"><span class="small grow">${esc(l.n)}</span><span class="small num mut">${kgNum(l.w)} kg</span></div>`; });
      h+=`</div>`; }
  }
  document.getElementById('sheetIn').innerHTML=h;
}

/* ---- Edzésterv megosztása / importálása ---------------------------- */
// A megosztott terv önálló csomag: a program + a benne lévő SAJÁT edzések
// + a hivatkozott SAJÁT gyakorlatok defjei. A beépítettek a fogadónál oldódnak fel.
function buildPlanPayload(programId){
  const p=progById(programId); if(!p) return null;
  const routines={}, customEx={};
  p.days.forEach(dId=>{ const r=(S.routines||[]).find(x=>x.id===dId);
    if(r){ routines[r.id]=JSON.parse(JSON.stringify(r));
      (r.ex||[]).forEach(exId=>{ if(S.customEx&&S.customEx[exId]) customEx[exId]=JSON.parse(JSON.stringify(S.customEx[exId])); }); } });
  return { program:{name:p.name, days:p.days.slice()}, routines, customEx };
}
function importPlan(payload){
  if(!payload||!payload.program) return;
  const exMap={};
  Object.values(payload.customEx||{}).forEach(e=>{ const nid=uid('cx_'); exMap[e.id]=nid; S.customEx[nid]={...e, id:nid}; });
  const dayMap={};
  Object.values(payload.routines||{}).forEach(r=>{ const nid=uid('r_'); dayMap[r.id]=nid;
    const ex=(r.ex||[]).map(x=> exMap[x]||x );
    S.routines.push({ id:nid, name:r.name, sub:ex.length+' gyakorlat', ex }); });
  const days=(payload.program.days||[]).map(d=> dayMap[d]||d );
  S.programs.push({ id:uid('p_'), name:payload.program.name||'Megosztott terv', days });
  save();
}
async function openSharePlan(programId){
  if(!(window.Auth&&Auth.isLoggedIn())){ uiAlert('A megosztáshoz lépj be a fiókodba (Barátok fül).'); return; }
  if(!friendsData) await refreshFriends();
  const me=Auth.currentUser().id;
  const acc=(friendsData||[]).filter(r=>r.status==='accepted');
  let h=`<div class="grabber"></div>
    <div class="row"><div class="grow"><span class="eyebrow">Edzésterv megosztása</span><h2 style="font-size:22px">Melyik baráttal?</h2></div>
    <button onclick="closeSheet()" style="font-size:26px;color:var(--dim);padding:0 8px">×</button></div>`;
  if(!acc.length){ h+=`<div class="empty" style="padding:16px 0">Előbb vegyél fel barátot a Barátok fülön.</div>`; }
  else acc.forEach(r=>{ const id=r.requester===me?r.addressee:r.requester; const nm=r.requester===me?(r.addressee_name||'Barát'):(r.requester_name||'Barát');
    h+=`<button class="btn" style="margin-bottom:8px" onclick="doSharePlan('${programId}','${id}','${esc(nm)}')">${esc(nm)}</button>`; });
  document.getElementById('sheetIn').innerHTML=h;
  openSheet();
}
async function doSharePlan(programId, toId, toName){
  const payload=buildPlanPayload(programId); const p=progById(programId);
  if(!payload){ uiAlert('Előbb mentsd el a tervet.'); return; }
  let ok=false; try{ ok=await Auth.sharePlan(toId, p.name, payload); }catch(e){}
  closeSheet();
  // Siker = nyugtázás (toast); a HIBA marad modál, mert ott a
  // felhasználónak újra kell próbálnia.
  if(ok) toast('Elküldve neki: '+toName); else uiAlert('Nem sikerült elküldeni.');
}
async function doImportPlan(shareId){
  const sp=(sharedPlansData||[]).find(x=>x.id===shareId); if(!sp) return;
  importPlan(sp.payload);
  try{ await Auth.deleteSharedPlan(shareId); }catch(e){}
  refreshFriends(); toast('Terv importálva – megtalálod a főoldaladon.');
}
async function doDiscardPlan(shareId){ try{ await Auth.deleteSharedPlan(shareId); }catch(e){} refreshFriends(); }

/* ---- Onboarding (első indítás bemutató) --------------------------- *
 * Külön kulcs (gymlog_onboarded), FÜGGETLEN a gymlog_v1 edzésadattól –
 * mint a téma-preferencia. Csak új (üres naplójú) felhasználónál, egyszer.
 */
function openWelcome(){
  const row=(icon,title,desc)=>`<div class="row" style="gap:12px;align-items:flex-start;margin-top:14px">
    <span style="flex:0 0 24px;color:var(--brass)">${icon}</span>
    <div class="grow"><div class="cond" style="font-size:17px;font-weight:600">${title}</div>
      <div class="small mut" style="margin-top:2px">${desc}</div></div></div>`;
  let h=`<div class="grabber"></div>
    <div class="top" style="padding:6px 0 0"><span class="eyebrow" style="color:var(--brass)">Üdv</span>
      <h2 style="font-size:26px;margin-top:2px">Edzésnapló</h2>
      <p class="small mut" style="margin:6px 0 0">Egykezes edzésnapló teremhez. A számok a főszereplők – a szett-rögzítés két koppintás.</p></div>`;
  h+=row(ICON.dumbbell,'Edzés','Koppints egy napra (Push/Pull) a főoldalon – indul a vezetett edzés pihenőórával, súlyállítóval. A végén összegzőt kapsz időtartammal és izomtérképpel.');
  h+=row(ICON.plans,'Tervek','Állíts össze saját edzést vagy tervet, vagy válassz kész sablont. Két gyakorlatot superset-körré is köthetsz.');
  h+=row(ICON.chart,'Haladás','Statok, grafikonok, becsült 1RM, és heti izomtérkép, ami jelzi a héten kimaradt izomcsoportokat.');
  h+=row(ICON.list,'Napló','Minden edzés visszanézhető; heti összefoglaló küldhető egy AI-edzőnek.');
  h+=row(ICON.account,'Fiók / szinkron','Opcionális felhő-fiók: több eszköz közt biztonságosan összefésül. Nélküle minden a böngésződben marad.');
  h+=`<button class="btn pri" style="margin-top:18px" onclick="dismissWelcome()">Kezdjük</button>`;
  document.getElementById('sheetIn').innerHTML=h;
  openSheet();
}
function dismissWelcome(){ try{ localStorage.setItem('gymlog_onboarded','1'); }catch(e){} closeSheet(); }
function maybeOnboard(){ try{ if(localStorage.getItem('gymlog_onboarded')) return; }catch(e){ return; }
  if((S.sessions||[]).length===0) openWelcome(); }

