/* ==================================================================
   Edző AI: csevegés + egy gombos heti értékelés.
   A hívás a Supabase Edge Functionön megy (Auth.askCoach) – a Claude
   API-kulcs a szerveren van, a böngészőbe sosem kerül. A kontextus a
   naplóból SZÁRMAZTATOTT összefoglaló (aiUserContext + a heti export),
   nyers napló nem megy ki. A beszélgetés NÉZET-állapot, nem tárolódik.
   ================================================================== */
let _coachMsgs=[], _coachBusy=false;

function coachAvailable(){ return !!(window.Auth && Auth.configured && Auth.configured() && Auth.isLoggedIn()); }
function coachContext(){
  return aiUserContext() + '\n\n--- Ezen a héten ---\n' + weeklyReport();
}
function coachHomeCard(){
  if(!coachAvailable()) return '';
  return `<div class="card"><button class="daybtn" onclick="openCoach()">
    <span class="daytag" style="color:var(--brass)">${ICON.friends}</span>
    <span class="grow"><span class="cond" style="font-size:21px;font-weight:600;display:block">Edző AI</span>
      <span class="small dim">Kérdezz a naplód alapján, vagy kérj heti értékelést</span></span>
    <span style="color:var(--brass);font-size:22px">›</span></button></div>`;
}
function openCoach(){ coachRender(); openSheet(); }
// Az üzenet szövege biztonságosan, bekezdésekkel (a válasz sima szöveg).
function coachFmt(t){ return esc(t).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/\n/g,'<br>'); }
function coachRender(){
  const el=document.getElementById('sheetIn'); if(!el) return;
  const bubbles=_coachMsgs.map(m=>`<div class="cmsg ${m.role==='user'?'me':'ai'}${m.err?' err':''}">${coachFmt(m.content)}</div>`).join('');
  el.innerHTML=`<div class="grabber"></div>
    <div class="row"><div class="grow"><span class="eyebrow">Edző AI</span>
      <h2 style="font-size:22px">Kérdezd az edződet</h2></div>
      <button onclick="closeSheet()" style="font-size:26px;color:var(--dim);padding:0 8px" aria-label="Bezárás">×</button></div>
    <button class="btn" style="margin-top:12px" onclick="coachWeekly()" ${_coachBusy?'disabled':''}>Heti értékelés kérése</button>
    <div id="coachLog" class="clog">${bubbles || `<p class="small dim" style="margin:0">Látja a terved, a munkasúlyaidat, a heti edzéseidet, az alvásod és a testsúlyod összefoglalóját. Nem orvos – fájdalomnál fordulj szakemberhez.</p>`}
      ${_coachBusy?'<div class="cmsg ai dim">Gondolkodik…</div>':''}</div>
    <textarea id="coachIn" rows="2" placeholder="Pl. Mennyit emeljek jövő héten fekvenyomásban?" style="width:100%;margin-top:10px;font-size:16px"></textarea>
    <button class="btn pri" style="margin-top:8px" onclick="coachSend()" ${_coachBusy?'disabled':''}>Küldés</button>
    ${_coachMsgs.length?`<button class="btn ghost" style="margin-top:6px" onclick="coachReset()">Új beszélgetés</button>`:''}`;
  const lg=document.getElementById('coachLog'); if(lg) lg.scrollTop=lg.scrollHeight;
}
async function coachAsk(text){
  if(_coachBusy || !text.trim()) return;
  _coachMsgs.push({role:'user', content:text.trim()});
  _coachBusy=true; coachRender();
  const r=await Auth.askCoach(_coachMsgs.filter(m=>!m.err).map(m=>({role:m.role, content:m.content})), coachContext());
  _coachBusy=false;
  if(r && r.reply) _coachMsgs.push({role:'assistant', content:r.reply});
  else _coachMsgs.push({role:'assistant', content:(r&&r.error)||'Az edző most nem érhető el.', err:1});
  coachRender();
}
function coachSend(){ const i=document.getElementById('coachIn'); const t=i?i.value:''; if(i) i.value=''; coachAsk(t); }
function coachWeekly(){ coachAsk('Értékeld a hetemet: mi ment jól, mi nem, és mit változtassak jövő héten (konkrét súlyokkal / szettekkel)?'); }
function coachReset(){ if(_coachBusy) return; _coachMsgs=[]; coachRender(); }
