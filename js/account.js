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
// Ugyanaz a nyelv, mint a fülökön: fejléc-kártya, a csoportok EGY-EGY
// kártyán soronként (.trow), a kapcsolók kis tolókapcsolóval (.sw).
function profRow(fn, ic, title, sub, right, col){
  return `<button class="row trow pcard" style="width:100%;text-align:left;min-height:56px;padding:8px 0;gap:12px${col?';color:'+col:''}" onclick="${fn}">
    <span class="cic"${col?` style="color:${col}"`:''}>${ic}</span>
    <span class="grow" style="min-width:0"><span style="font-weight:600;display:block">${title}</span>${sub?`<span class="small dim">${sub}</span>`:''}</span>
    ${right==null?'<span style="color:var(--dim);font-size:22px">›</span>':right}</button>`;
}
function swHtml(on){ return `<span class="sw${on?' on':''}" aria-hidden="true"><i></i></span>`; }
function openAuthSheet(){
  const configured = window.Auth && Auth.configured();
  const loggedIn = window.Auth && Auth.isLoggedIn();
  const nm=(myProfile&&myProfile.display_name)||'';
  const mail=loggedIn?(Auth.currentUser()?.email||''):'';
  const ini=(nm||mail||'?').trim().charAt(0).toUpperCase();
  const card=inner=>`<div class="card"><div class="pad" style="padding-top:4px;padding-bottom:4px">${inner}</div></div>`;
  const sect=t=>`<span class="eyebrow" style="display:block;margin:16px 0 8px">${t}</span>`;
  let h=`<div class="grabber"></div>
    <div class="row" style="align-items:center;gap:12px">
      <span class="avatar">${loggedIn?esc(ini):ICON.account}</span>
      <div class="grow" style="min-width:0"><span class="eyebrow">Profil</span>
        <div class="cond" style="font-size:22px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${loggedIn?esc(nm||'Bejelentkezve'):'Profil'}</div>
        ${mail?`<span class="small dim">${esc(mail)}</span>`:''}</div>
      <button onclick="closeSheet()" style="font-size:26px;color:var(--dim);padding:0 8px">×</button></div>`;
  h+=`<div style="margin-top:14px">${levelCard()}</div>`;   // szint / XP (streak-fókusz)
  h+=sect('Fiók · felhő-szinkron');
  if(!configured){
    h+=`<div class="notice"><span class="ntdot"></span><span class="grow small">A felhő-szinkron még nincs beállítva ezen a példányon.
      Másold a <code>supabase-config.example.js</code>-t <code>supabase-config.js</code> néven, és töltsd ki a
      Supabase URL-lel és anon kulccsal. Nélküle az app localStorage-ból fut. Részletek:
      <code>docs/1-fazis-auth-TODO.md</code>.</span></div>`;
  } else if(loggedIn){
    h+=`<div class="card"><div class="pad">
        <div class="small dim">Megjelenítendő név (a barátaid ezt látják)</div>
        <div class="row" style="gap:8px;margin-top:6px">
          <input id="dispName" type="text" placeholder="Neved" value="${esc(nm)}" style="flex:1;min-width:0;font-size:16px">
          <button class="btn" style="width:auto;margin:0;padding:12px 16px" onclick="saveDispName()">Mentés</button></div>
        <div class="small dim" style="margin-top:8px">Az edzésadatod a fiókodhoz szinkronizálódik.</div></div></div>`
      + card(profRow("closeSheet();tab='friends';render();refreshFriends();", ICON.friends, 'Barátok', 'Kód, kérések, megosztott tervek')
        + profRow('doSignOut()', ICON.back, 'Kijelentkezés', '', '')
        + profRow('openDeleteAccount()', '×', 'Fiók végleges törlése', '', '', 'var(--red)'));
  } else {
    h+=`<div class="card"><div class="pad">
      <input id="authEmail" type="email" inputmode="email" autocomplete="email" placeholder="e-mail" style="width:100%;font-size:16px">
      <input id="authPass" type="password" autocomplete="current-password" placeholder="jelszó" style="width:100%;margin-top:8px;font-size:16px">
      <div id="authErr" class="small" style="color:var(--red);margin-top:8px;display:none"></div>
      <button class="btn pri" style="margin-top:12px" onclick="doAuth('in')">Belépés</button>
      <button class="btn ghost" style="margin-top:6px" onclick="doAuth('up')">Regisztráció</button></div></div>`;
  }
  const notifOn=(function(){try{return localStorage.getItem('gymlog_notify')==='1'}catch(e){return false}})();
  h+=sect('Beállítások')+card(
      profRow('toggleMute();openAuthSheet()', ICON.timer||ICON.check, 'Hangjelzés a pihenő végén', restMuted()?'Kikapcsolva':'Bekapcsolva', swHtml(!restMuted()))
    + profRow('(async()=>{await toggleNotify();openAuthSheet();})()', ICON.more||ICON.check, 'Időzítő értesítésben', 'Ha kiváltasz az appból, a pihenő ideje értesítésben látszik', swHtml(notifOn))
    + profRow('openWelcome()', ICON.play||ICON.check, 'Bemutató megtekintése', ''));
  h+=sect(tr('Nyelv'))+`<div class="seg">
      <button class="${I18N.getLang()==='hu'?'on':''}" onclick="switchLang('hu')">${tr('Magyar')}</button>
      <button class="${I18N.getLang()==='en'?'on':''}" onclick="switchLang('en')">${tr('Angol')}</button>
    </div>`;
  h+=`<div class="small dim" style="text-align:center;margin-top:16px">${tr('Verzió')} ${APP_VERSION} · <a href="privacy.html" target="_blank" rel="noopener" style="color:var(--mut)">${tr('Adatvédelem')}</a></div>`;
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
// Ugyanaz a nyelv, mint a Tervek/Edző fülön: nincs nagy cím, keskeny
// fejsor, a listák EGY kártyán soronként (.trow). v143: a TEENDŐ (bejövő
// kérés, kapott terv) áll legfelül; a barát-sor a publikált összesítőből
// mutatja az utolsó edzést (friendStatsMap, csak származtatott adat).
let friendStatsMap={};
async function loadFriendStats(ids){
  await Promise.all(ids.map(async id=>{ try{ const st=await Auth.friendStats(id); friendStatsMap[id]=st||{}; }catch(e){ friendStatsMap[id]={}; } }));
  if(tab==='friends') render();
}
function friendAgo(last){ if(!last) return null; return Math.floor((Date.now()-last)/864e5); }
function friendsView(){
  const wrap = (inner, sub) => `<div class="wrap"><div class="row" style="align-items:center;margin:4px 0 10px">
    <span class="eyebrow grow">Barátok${sub?' · '+sub:''}</span></div>${inner}</div>`;
  const emptyCard = (title, txt, btn) => `<div class="card"><div class="pad">
      <div class="row" style="gap:12px;align-items:center"><span class="cic">${ICON.friends}</span>
      <span class="grow"><span class="cond" style="font-size:20px;font-weight:600;display:block">${title}</span>
      <span class="small dim">${txt}</span></span></div>${btn||''}</div></div>`;
  if(!(window.Auth&&Auth.configured()))
    return wrap(emptyCard('Közös edzés, kóddal', 'A barátokhoz felhő-fiók kell, ami ezen a példányon nincs beállítva.'));
  if(!Auth.isLoggedIn())
    return wrap(emptyCard('Közös edzés, kóddal', 'Lépj be a fiókodba a barátokhoz. Csak kóddal bejelölt barátok látnak, és csak összesítést.',
      `<button class="btn pri" style="margin:12px 0 0" onclick="openAuthSheet()">Belépés / fiók</button>`));
  if(friendsData==null){ refreshFriends(); return wrap(`<div class="empty">Betöltés…</div>`); }

  const me=Auth.currentUser().id, rows=friendsData;
  const accepted=rows.filter(r=>r.status==='accepted');
  const incoming=rows.filter(r=>r.status==='pending' && r.addressee===me);
  const outgoing=rows.filter(r=>r.status==='pending' && r.requester===me);
  const nameOf=r=> r.requester===me ? (r.addressee_name||'Barát') : (r.requester_name||'Barát');
  const otherId=r=> r.requester===me ? r.addressee : r.requester;
  const ini=n=>`<span class="cic" style="font-weight:700;font-size:16px">${esc((n||'?').trim().charAt(0).toUpperCase())}</span>`;
  const sect=(t)=>`<span class="eyebrow" style="display:block;margin:18px 0 8px">${t}</span>`;
  const list=(inner,cls)=>`<div class="card${cls?' '+cls:''}"><div class="pad" style="padding-top:4px;padding-bottom:4px">${inner}</div></div>`;
  let h='';
  // 1) Rád vár – a teendők legfelül, sárgarézzel.
  const shared=sharedPlansData||[];
  if(shared.length||incoming.length){
    h+=`<span class="eyebrow" style="display:block;margin:0 0 8px;color:var(--brass)">Rád vár (${shared.length+incoming.length})</span>`;
    h+=list(incoming.map(r=>`<div class="row trow" style="gap:10px;padding:8px 0;min-height:56px">
      ${ini(r.requester_name)}<span class="grow" style="min-width:0"><span style="font-weight:600;display:block">${esc(r.requester_name||'Barát')}</span>
      <span class="small dim">bejelölt barátnak</span></span>
      <button class="nbtn" onclick="doRespond('${r.requester}',true)">Elfogad</button>
      <button class="iconbtn ghost" style="color:var(--mut)" onclick="doRespond('${r.requester}',false)" aria-label="Elutasít" title="Elutasít">×</button></div>`).join('')
      + shared.map(sp=>`<div class="row trow" style="gap:10px;padding:8px 0;min-height:56px">
      <span class="cic">${ICON.plans}</span>
      <span class="grow" style="min-width:0"><span style="font-weight:600;display:block">${esc(sp.name||'Terv')}</span>
      <span class="small dim">${esc(sp.from_name||'Barát')} küldte</span></span>
      <button class="nbtn" onclick="doImportPlan('${sp.id}')">Importálás</button>
      <button class="iconbtn ghost" style="color:var(--mut)" onclick="doDiscardPlan('${sp.id}')" aria-label="Elvet" title="Elvet">×</button></div>`).join(''), 'frwait');
  }
  // 2) A saját kód – fő elem, megosztás-gombbal; a bejelölés kisebb.
  const code=(myProfile&&myProfile.friend_code)||'…';
  h+=`<div class="card"${h?' style="margin-top:14px"':''}><div class="pad">
      <span class="small dim">A te barát-kódod</span>
      <div class="row" style="align-items:center;gap:8px">
        <div class="cond grow" style="font-size:30px;font-weight:700;letter-spacing:.14em;color:var(--brass)">${esc(code)}</div>
        <button class="nbtn" onclick="shareFriendCode()">${ICON.send} Megosztás</button></div>
      <div class="small mut" style="margin:2px 0 12px">Küldd el egy barátnak, hogy bejelöljön.</div>
      <div class="row" style="gap:8px">
        <input id="friendCode" type="text" placeholder="Barát kódja" autocomplete="off" style="flex:1;min-width:0;text-transform:uppercase;font-size:16px">
        <button class="iconbtn" style="color:var(--brass)" onclick="doAddFriend()" aria-label="Bejelölés" title="Bejelölés">${ICON.plus}</button></div>
      <div id="friendErr" class="small" style="color:var(--red);margin-top:6px;display:none"></div></div></div>`;
  // 3) Barátok
  h+=sect(`Barátaid (${accepted.length})`);
  if(!accepted.length){
    h+=`<div class="card"><div class="pad"><span class="cond" style="font-size:18px;font-weight:600">Így működik</span>
      <ol class="csteps"><li>Oszd meg a kódodat egy baráttal.</li><li>Ő beírja és bejelöl – vagy te az övét.</li><li>Az elfogadás után látjátok egymás összesítőjét.</li></ol></div></div>`;
  } else {
    const need=accepted.map(otherId).filter(id=>!(id in friendStatsMap));
    if(need.length){ need.forEach(id=>friendStatsMap[id]=null); loadFriendStats(need); }
    h+=list(accepted.map(r=>{ const id=otherId(r), st=friendStatsMap[id], d=st&&st.data;
      const ago=d?friendAgo(d.last):null;
      const dot= ago==null?'':`<span class="frdot${ago<=7?' on':''}" title="${ago<=7?'Ezen a héten edzett':'Régóta nem edzett'}"></span>`;
      const meta= st===null||st===undefined ? 'Betöltés…'
        : !d||!d.sessions ? 'Még nincs megosztott adat'
        : `Utolsó: ${friendlyDate(d.last)} · 7 napban ${d.week||0} edzés`;
      return `<div class="row trow" style="gap:6px">
      <button class="row grow pcard" style="text-align:left;gap:10px;padding:8px 0;min-height:56px;min-width:0" onclick="openFriendStats('${id}','${esc(nameOf(r))}')">
        ${ini(nameOf(r))}<span class="grow" style="min-width:0"><span style="font-weight:600;display:block">${esc(nameOf(r))}${dot}</span>
        <span class="small dim frmeta">${meta}</span></span><span class="dim">›</span></button>
      <button class="iconbtn ghost" style="color:var(--mut)" onclick="doRemoveFriend('${id}')" aria-label="Törlés" title="Törlés">×</button></div>`; }).join(''));
  }
  if(outgoing.length){ h+=sect('Elküldött kérések')+list(outgoing.map(r=>`<div class="row trow" style="gap:10px;padding:8px 0;min-height:52px">
      ${ini(r.addressee_name)}<span class="grow small mut">${esc(r.addressee_name||'Barát')} · függőben</span>
      <button class="nbtn" onclick="doCancelRequest('${r.addressee}')">Visszavonás</button></div>`).join('')); }
  // 4) Átláthatóság: pontosan ez megy ki rólad.
  const my=shareSummary();
  h+=`<details class="card mmfold frseen" style="margin-top:14px"><summary class="pad row" style="gap:10px;align-items:center">
      <span class="cic">${ICON.friends}</span><span class="grow" style="font-weight:600">Mit látnak rólam?</span><span class="dim">›</span></summary>
      <div class="pad" style="padding-top:0"><div class="small dim" style="margin-bottom:8px">Csak ez az összesítő megy át – napló, jegyzet, fotó, testsúly, alvás és sérülés SOHA.</div>
      <div class="hrow"><span class="small grow">Összes edzés</span><span class="small num">${my.sessions}</span></div>
      <div class="hrow"><span class="small grow">Az utolsó 7 napban</span><span class="small num">${my.week}</span></div>
      <div class="hrow"><span class="small grow">Utolsó edzés</span><span class="small">${my.last?friendlyDate(my.last):'–'}</span></div>
      ${my.lifts.map(l=>`<div class="hrow"><span class="small grow">${esc(exN({n:l.n}))}</span><span class="small num mut">${kgNum(l.w)} kg</span></div>`).join('')}
      </div></details>`;
  return wrap(h, accepted.length?accepted.length+' fő':'');
}
async function shareFriendCode(){
  const code=myProfile&&myProfile.friend_code; if(!code) return;
  const txt='Jelölj be az edzésnaplóban! A barát-kódom: '+code;
  if(navigator.share){ try{ await navigator.share({text:txt}); return; }catch(e){ if(e&&e.name==='AbortError') return; } }
  try{ await navigator.clipboard.writeText(code); toast('Kód vágólapra másolva: '+code); }
  catch(e){ uiAlert('Nem sikerült a másolás. A kódod: '+code); }
}
async function doAddFriend(){
  const code=(document.getElementById('friendCode').value||'').trim();
  if(!code) return;
  let res='error'; try{ res=await Auth.requestFriend(code); }catch(e){}
  const errEl=document.getElementById('friendErr');
  const msg={ notfound:'Nincs ilyen kód.', self:'Ez a saját kódod.', error:'Hiba történt – ellenőrizd a hálózatot.' }[res];
  if(msg){ if(errEl){ errEl.textContent=msg; errEl.style.display='block'; } return; }
  toast(res==='accepted'?'Barátok lettetek.':'Kérés elküldve.');
  refreshFriends();   // 'ok' vagy 'accepted' → frissítés
}
async function doRespond(requesterId, accept){ try{ await Auth.respondFriend(requesterId, accept); }catch(e){} refreshFriends(); }
async function doRemoveFriend(id){ if(!(await uiConfirm('Törlöd ezt a barátot?', {ok:'Törlés', danger:true}))) return; try{ await Auth.removeFriend(id); }catch(e){} delete friendStatsMap[id]; refreshFriends(); }
// A függő kimenő kérés visszavonása – ugyanaz a törlés, mint a barátnál
// (a sémában a kérelmező is törölhet).
async function doCancelRequest(id){ try{ await Auth.removeFriend(id); }catch(e){} toast('Kérés visszavonva.'); refreshFriends(); }
async function openFriendStats(id, name){
  const head=n=>`<div class="grabber"></div>
    <div class="row" style="gap:12px;align-items:center"><span class="cic" style="width:52px;height:52px;font-weight:700;font-size:22px">${esc((n||'?').trim().charAt(0).toUpperCase())}</span>
    <div class="grow"><span class="eyebrow">Barát haladása</span><h2 style="font-size:22px">${esc(n)}</h2></div>
    <button onclick="closeSheet()" style="font-size:26px;color:var(--dim);padding:0 8px">×</button></div>`;
  document.getElementById('sheetIn').innerHTML=head(name)+`<div class="empty" style="padding:16px 0">Betöltés…</div>`;
  openSheet();
  let st=null; try{ st=await Auth.friendStats(id); }catch(e){}
  friendStatsMap[id]=st||{};
  let h=head((st&&st.display_name)||name);
  if(!st||!st.data||!st.data.sessions){ h+=`<div class="empty" style="padding:16px 0">Ez a barát még nem osztott meg adatot.</div>`; }
  else{ const d=st.data;
    const tile=(v,l)=>`<div class="frtile"><div class="num" style="font-size:26px;font-weight:700">${v}</div><div class="small dim">${l}</div></div>`;
    h+=`<div class="frtiles">${tile(d.sessions||0,'edzés')}${tile(d.week||0,'7 napban')}${tile(d.last?`<span style="font-size:17px">${friendlyDate(d.last)}</span>`:'–','utolsó')}</div>`;
    if(d.lifts&&d.lifts.length){ h+=`<span class="eyebrow" style="display:block;margin:16px 0 8px">Legnagyobb súlyok</span><div class="card"><div class="pad" style="padding-top:4px;padding-bottom:4px">`;
      d.lifts.forEach(l=>{ h+=`<div class="row trow" style="padding:10px 0;min-height:48px"><span class="grow">${esc(exN({n:l.n}))}</span><span class="num" style="font-weight:600">${kgNum(l.w)} kg</span></div>`; });
      h+=`</div></div>`; }
  }
  if((S.programs||[]).length) h+=`<button class="btn" style="margin-top:14px" onclick="openSharePlanTo('${id}','${esc((st&&st.display_name)||name)}')">${ICON.send} Terv küldése neki</button>`;
  document.getElementById('sheetIn').innerHTML=h;
}
// Fordított irány: a barátból indulva választod ki, melyik tervedet küldöd.
function openSharePlanTo(friendId, name){
  let h=`<div class="grabber"></div>
    <div class="row"><div class="grow"><span class="eyebrow">Terv küldése · ${esc(name)}</span><h2 style="font-size:22px">Melyik tervet?</h2></div>
    <button onclick="closeSheet()" style="font-size:26px;color:var(--dim);padding:0 8px">×</button></div>`;
  h+=`<div class="card"><div class="pad" style="padding-top:4px;padding-bottom:4px">`+(S.programs||[]).map(p=>`<button class="row trow pcard" style="width:100%;text-align:left;gap:10px;padding:8px 0;min-height:56px" onclick="doSharePlan('${p.id}','${friendId}','${esc(name)}')">
    <span class="cic">${ICON.plans}</span><span class="grow"><span style="font-weight:600;display:block">${esc(p.name)}</span><span class="small dim">${(p.days||[]).length} nap</span></span><span class="dim">›</span></button>`).join('')+`</div></div>`;
  document.getElementById('sheetIn').innerHTML=h; openSheet();
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

