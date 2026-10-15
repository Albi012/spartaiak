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
  return `<p class="small dim" style="margin:10px 0 0;text-align:right">Ezen a héten még <b>${q.remaining}</b> kérdés / ${q.limit}</p>`;
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
// A jelenlegi AI-terv állapota – ugyanaz a felismerés, mint amit az új
// import lecserél (`aiPrevImport`), hogy a sor azt mondja, ami történni fog.
function aiPlanStatus(){
  const pv=aiPrevImport(); if(!pv.rIds.length) return 'Még nincs AI-terv';
  const p=(S.programs||[]).find(x=>pv.pIds.includes(x.id));
  const rs=(S.routines||[]).filter(r=>pv.rIds.includes(r.id));
  const at=Math.max(0,...rs.map(r=>r.at||0));
  return `Jelenlegi AI-terv: ${esc(p?p.name:rs[0].name)} · ${rs.length} nap${at?' · '+friendlyDate(at).toLowerCase()+' importálva':''}`;
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
  if(m==='ext') h+=`<div class="card"><div class="pad">
      <span class="eyebrow">Így működik</span>
      <ol class="csteps">
        <li><b>Prompt másolása</b> – az app a naplódból megírja, mit tudjon rólad az AI.</li>
        <li><b>Elküldöd</b> a saját AI-odnak (ChatGPT, Claude, …), és kéred a tervet.</li>
        <li><b>A válasz beillesztése</b> – az app saját edzésekké alakítja.</li></ol></div></div>`;
  // Mindkét módban: terv és heti anyag a külső / valódi edzőnek.
  h+=`<span class="eyebrow" style="display:block;margin:18px 0 8px">${m==='ext'?'A saját AI-oddal':'Edzésterv és heti anyag'}</span>
    <div class="card"><div class="pad" style="padding-top:4px;padding-bottom:4px">
      ${coachRow('openAiImport()', ICON.plans, 'Edzésterv kérése AI-tól', aiPlanStatus())}
      ${coachRow('openWeeklyExport()', ICON.list, 'Heti összefoglaló edzőnek', 'Szettek, alvás, testsúly – másold be vagy küldd el')}
    </div></div>`;
  return h+'</div>';
}

// Az üzenet szövege biztonságosan, bekezdésekkel (a válasz sima szöveg).
// Félkövér + felsorolás: a „- " / „• " / „1. " kezdetű sorokból valódi lista
// lesz, a többi bekezdés marad.
function coachFmt(t){
  const lines=esc(t).replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').split('\n');
  let out='', list=null;
  const close=()=>{ if(list){ out+=`</${list}>`; list=null; } };
  lines.forEach(l=>{
    const ul=l.match(/^\s*[-•*]\s+(.*)/), ol=l.match(/^\s*\d+[.)]\s+(.*)/);
    if(ul||ol){ const k=ul?'ul':'ol'; if(list!==k){ close(); out+=`<${k}>`; list=k; } out+=`<li>${(ul||ol)[1]}</li>`; }
    else { close(); out+= l.trim() ? l+'<br>' : '<br>'; }
  });
  close(); return out.replace(/(<br>)+$/,''); }
// Egy koppintással küldhető kérdések – telefonon gépelni nehéz, és az üres
// beszélgetésnél ezek mutatják meg, mit érdemes kérdezni.
const COACH_QUICK=[
  ['Heti értékelés','Értékeld a hetemet: mi ment jól, mi nem, és mit változtassak jövő héten (konkrét súlyokkal / szettekkel)?'],
  ['Mit eddzek ma?','A naplóm, a készenlétem és a heti terhelésem alapján mit eddzek ma, és milyen súllyal?'],
  ['Hol akadtam meg?','Melyik gyakorlatban akadtam meg vagy nem jön össze a cél, és mit csináljak vele?'],
  ['Mennyit emeljek?','A legutóbbi edzésem alapján mennyit emeljek a következő edzésen gyakorlatonként?']];
function coachChatHtml(){
  const bubbles=_coachMsgs.map(m=>`<div class="cmsg ${m.role==='user'?'me':'ai'}${m.err?' err':''}">${coachFmt(m.content)}</div>`).join('');
  const off=_coachBusy||coachOut();
  return `<div class="row" style="align-items:center;margin-bottom:8px">
      <span class="eyebrow grow">Beszélgetés</span>
      ${_coachMsgs.length?`<button class="iconbtn ghost" onclick="coachReset()" aria-label="Új beszélgetés" title="Új beszélgetés">${ICON.plus||'+'}</button>`:''}</div>
    <div class="whyrow hscroll cquick">${COACH_QUICK.map((q,i)=>`<button class="whyc" onclick="coachQuick(${i})" ${off?'disabled':''}>${q[0]}</button>`).join('')}</div>
    <div id="coachLog" class="clog">${bubbles || `<p class="small dim" style="margin:0">Látja a terved, a munkasúlyaidat, a heti edzéseidet, az alvásod és a testsúlyod összefoglalóját. Nem orvos – fájdalomnál fordulj szakemberhez.</p>`}
      ${_coachBusy?'<div class="cmsg ai ctyping" aria-label="Gondolkodik"><i></i><i></i><i></i></div>':''}</div>
    ${coachQuotaHtml()}
    <div class="cinput">
      <textarea id="coachIn" rows="1" placeholder="Kérdezz az edzőtől…" style="font-size:16px" onkeydown="if(event.key==='Enter'&&!event.shiftKey){event.preventDefault();coachSend();}"></textarea>
      <button class="csend" onclick="coachSend()" ${off?'disabled':''} aria-label="Küldés">${ICON.send}</button>
    </div>`;
}
function coachQuick(i){ coachAsk(COACH_QUICK[i][1]); }
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
function coachWeekly(){ coachAsk(COACH_QUICK[0][1]); }
function coachReset(){ if(_coachBusy) return; _coachMsgs=[]; coachRender(); }
