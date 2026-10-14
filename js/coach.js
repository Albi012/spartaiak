/* ==================================================================
   Edző fül: minden, ami AI edzővel kapcsolatos, egy helyen.
   Két út, a fül első megnyitásakor választható (és a fejlécben váltható):
   - BEÉPÍTETT: csevegés + heti értékelés az appon belül. A hívás a
     Supabase Edge Functionön megy (Auth.askCoach) – a Claude API-kulcs a
     szerveren van, a böngészőbe sosem kerül.
   - KÜLSŐ: a saját AI-od (ChatGPT, Claude, …) – az app promptot ad, a
     választ beolvassa (AI-terv importálása), és heti összefoglalót küld.
   Az edzésterv-import MINDKÉT módban itt van, mert a beépített csevegés
   nem ír tervet. A kontextus a naplóból SZÁRMAZTATOTT összefoglaló
   (aiUserContext + a heti export), nyers napló nem megy ki. A beszélgetés
   NÉZET-állapot, nem tárolódik; a választott mód külön kulcsban
   (`gymlog_coach`: 'in' | 'ext'), FÜGGETLEN a `gymlog_v1`-től.
   ================================================================== */
let _coachMsgs=[], _coachBusy=false;
// A heti kérdéslimit állása, ahogy a SZERVER legutóbb mondta ({limit,
// remaining, resetAt}). A limitet a szerver tartja be – ez csak kijelzés,
// és az első válaszig null (addig nem tudjuk, nem tippelünk).
let _coachQuota=null;
function coachOut(){ return !!(_coachQuota && _coachQuota.remaining<=0); }
function coachQuotaHtml(){
  const q=_coachQuota; if(!q || q.limit==null) return '';
  if(q.remaining<=0){
    const d=q.resetAt ? new Date(q.resetAt) : null;
    const when=d ? `${d.getMonth()+1}. ${d.getDate()}. ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}` : '';
    return `<p class="small" style="margin:10px 0 0;color:var(--red)">Elfogyott a heti ${q.limit} kérdés.${when?' A következő ekkor szabadul fel: '+when+'.':''}</p>`;
  }
  return `<p class="small dim" style="margin:10px 0 0">Ezen a héten még <b>${q.remaining}</b> kérdés / ${q.limit}</p>`;
}

function coachMode(){ try{ const m=localStorage.getItem('gymlog_coach'); return m==='in'||m==='ext'?m:null; }catch(e){ return null; } }
function setCoachMode(m){ try{ if(m) localStorage.setItem('gymlog_coach',m); else localStorage.removeItem('gymlog_coach'); }catch(e){} render(); window.scrollTo(0,0); }
function coachAvailable(){ return !!(window.Auth && Auth.configured && Auth.configured() && Auth.isLoggedIn()); }
function coachContext(){ return aiUserContext() + '\n\n--- Ezen a héten ---\n' + weeklyReport(); }

// Ugyanaz a nyelv, mint a Tervek/Napló fülön: nincs nagy cím, egy keskeny
// fejsor, a választható utak EGY kártyán soronként (.trow), egy elsődleges gomb.
function coachRow(fn, ic, title, sub){
  return `<button class="row trow pcard" style="width:100%;text-align:left;min-height:56px;padding:10px 0;gap:12px" onclick="${fn}">
    <span class="cic">${ic}</span>
    <span class="grow" style="min-width:0"><span style="font-weight:600;display:block">${title}</span>
      <span class="small dim">${sub}</span></span>
    <span style="color:var(--dim);font-size:22px">›</span></button>`;
}
function coachView(){
  const m=coachMode();
  let h=`<div class="wrap"><div class="row" style="align-items:center;margin:4px 0 10px">
    <span class="eyebrow grow">AI edző${m?' · '+(m==='in'?'beépített':'saját AI'):''}</span>
    ${m?`<button class="btn ghost" style="width:auto;margin:0;padding:6px 10px;min-height:44px;color:var(--mut)" onclick="setCoachMode(null)">Mód váltása</button>`:''}</div>`;
  if(!m){
    h+=`<div class="card"><div class="pad">
        <div class="cond" style="font-size:24px;font-weight:600">Melyik edzővel dolgozol?</div>
        <p class="small dim" style="margin:4px 0 0">Később bármikor válthatsz.</p></div>
      <div class="pad" style="padding-top:0;padding-bottom:4px">
        ${coachRow("setCoachMode('in')", ICON.coach, 'Beépített edző', 'Az appon belül kérdezel, a naplódat ismeri. Fiók kell hozzá.')}
        ${coachRow("setCoachMode('ext')", ICON.share, 'Saját (külső) AI', 'ChatGPT, Claude vagy más: az app promptot ad és beolvassa a tervet.')}
      </div></div>`;
    return h+'</div>';
  }
  if(m==='in'){
    if(!coachAvailable())
      h+=`<div class="notice"><span class="ntdot"></span><span class="grow"><b>Ehhez be kell jelentkezned.</b>
        <span class="small dim" style="display:block">A beépített edző a fiókodon keresztül fut. Addig a saját AI-oddal is dolgozhatsz.</span></span></div>
        <button class="btn pri" style="margin:10px 0 0" onclick="openAuthSheet()">Bejelentkezés</button>
        <button class="btn ghost" style="margin:6px 0 0" onclick="setCoachMode('ext')">Inkább külső AI</button>`;
    else h+=`<div class="card"><div class="pad" id="coachBox">${coachChatHtml()}</div></div>`;
  }
  // Mindkét módban: terv és heti anyag a külső / valódi edzőnek.
  h+=`<span class="eyebrow" style="display:block;margin:18px 0 8px">${m==='ext'?'A saját AI-oddal':'Edzésterv és heti anyag'}</span>
    <div class="card"><div class="pad" style="padding-top:4px;padding-bottom:4px">
      ${coachRow('openAiImport()', ICON.plans, 'Edzésterv kérése AI-tól', 'Személyre szabott prompt → a válasz beolvasása saját edzéssé')}
      ${coachRow('openWeeklyExport()', ICON.list, 'Heti összefoglaló edzőnek', 'Szettek, alvás, testsúly – másold be vagy küldd el')}
    </div></div>`;
  return h+'</div>';
}

// Az üzenet szövege biztonságosan, bekezdésekkel (a válasz sima szöveg).
function coachFmt(t){ return esc(t).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/\n/g,'<br>'); }
function coachChatHtml(){
  const bubbles=_coachMsgs.map(m=>`<div class="cmsg ${m.role==='user'?'me':'ai'}${m.err?' err':''}">${coachFmt(m.content)}</div>`).join('');
  const off=_coachBusy||coachOut();
  return `<button class="btn" style="margin:0" onclick="coachWeekly()" ${off?'disabled':''}>Heti értékelés kérése</button>
    <div id="coachLog" class="clog">${bubbles || `<p class="small dim" style="margin:0">Látja a terved, a munkasúlyaidat, a heti edzéseidet, az alvásod és a testsúlyod összefoglalóját. Nem orvos – fájdalomnál fordulj szakemberhez.</p>`}
      ${_coachBusy?'<div class="cmsg ai dim">Gondolkodik…</div>':''}</div>
    <textarea id="coachIn" rows="2" placeholder="Pl. Mennyit emeljek jövő héten fekvenyomásban?" style="width:100%;margin-top:10px;font-size:16px"></textarea>
    <button class="btn pri" style="margin-top:8px" onclick="coachSend()" ${off?'disabled':''}>Küldés</button>
    ${coachQuotaHtml()}
    ${_coachMsgs.length?`<button class="btn ghost" style="margin-top:6px" onclick="coachReset()">Új beszélgetés</button>`:''}`;
}
// Csak a csevegő dobozát festjük újra, nem az egész fület.
function coachRender(){
  const el=document.getElementById('coachBox'); if(!el) return;
  el.innerHTML=coachChatHtml();
  const lg=document.getElementById('coachLog'); if(lg) lg.scrollTop=lg.scrollHeight;
}
async function coachAsk(text){
  if(_coachBusy || coachOut() || !text.trim()) return;
  _coachMsgs.push({role:'user', content:text.trim()});
  _coachBusy=true; coachRender();
  const r=await Auth.askCoach(_coachMsgs.filter(m=>!m.err).map(m=>({role:m.role, content:m.content})), coachContext());
  _coachBusy=false;
  if(r && r.limit!=null) _coachQuota={limit:r.limit, remaining:r.remaining, resetAt:r.resetAt||null};
  if(r && r.reply) _coachMsgs.push({role:'assistant', content:r.reply});
  else _coachMsgs.push({role:'assistant', content:(r&&r.error)||'Az edző most nem érhető el.', err:1});
  coachRender();
}
function coachSend(){ const i=document.getElementById('coachIn'); const t=i?i.value:''; if(i) i.value=''; coachAsk(t); }
function coachWeekly(){ coachAsk('Értékeld a hetemet: mi ment jól, mi nem, és mit változtassak jövő héten (konkrét súlyokkal / szettekkel)?'); }
function coachReset(){ if(_coachBusy) return; _coachMsgs=[]; coachRender(); }
