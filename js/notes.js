/* ==================================================================
   Ketszintu jegyzet: allando gyakorlat-jegyzet es a nap tobb
   bejegyzese, plusz a gepbeallitas-foto.
   ================================================================== */
/* ---- Jegyzetek (állandó + aznapi) és fotó -------------------------- */
// Edzés közben a jegyzet ALAPBÓL ahhoz a gyakorlathoz tartozik, amelyiken
// épp állsz – ez a gyakoribb eset (padszög, fogás, technika). A lapon egy
// kapcsolóval átváltható a mai napra, és a választás megjegyződik:
// `gymlog_noteday` kulcs ('1' = alapból a nap jegyzete). FÜGGETLEN a
// `gymlog_v1` naplóadattól, mint a többi beállítás-kulcs.
function noteDayMode(){ try{ return localStorage.getItem('gymlog_noteday')==='1'; }catch(e){ return false; } }
// Az éppen mutatott gyakorlat a lejátszóban (a playerView ugyanezt számolja).
function playerExId(){
  if(!S.active) return null;
  const d=dayDef(S.active.day)||{ex:[]};
  const exs=d.ex.filter(x=>S.active.log[x.id]);
  if(!exs.length) return null;
  const e=exs[Math.max(0, Math.min(curEx, exs.length-1))];
  return e?e.id:null;
}
// Van-e már jegyzet azon a helyen, ahová most írnánk (a gomb pöttyéhez).
function noteHasText(){
  const id=playerExId();
  return (!noteDayMode() && id) ? !!S.notes[id] : dayNotes(S.active).length>0;
}
function openPlayerNote(){
  const id=playerExId();
  openNoteSheet((!noteDayMode() && id) ? 'ex' : 'day', id||'', true);
}
// Mód-váltás a lapon belül. A már begépelt, MÉG NEM MENTETT szöveget
// átvisszük, ha a másik oldalon nincs még jegyzet – így a váltás nem nyeli
// le, amit épp írtál, de meglévőt soha nem ír felül.
function setNoteMode(day){
  const ta=document.getElementById('noteTa'), typed=ta?ta.value.trim():'';
  const id=playerExId(), wasDay=noteDayMode();
  // Amit a mező mutat, az lehet a MÁR MENTETT jegyzet is – azt nem visszük át,
  // különben a puszta mód-váltás átmásolná a régi szöveget a másik oldalra.
  // Napi módban a mező mindig ÚJ bejegyzés (vagy a szerkesztésre kijelölt),
  // ezért ott a „már mentett" csak a szerkesztett tétel szövege lehet.
  const ed = wasDay && dayNoteEdit!=null ? dayNotes(S.active).find(n=>n.t===dayNoteEdit) : null;
  const saved=((wasDay ? (ed&&ed.txt) : (id&&S.notes[id])) || '').trim();
  try{ localStorage.setItem('gymlog_noteday', day?'1':'0'); }catch(e){}
  if(typed && typed!==saved){
    if(day){ if(S.active) dayNoteSave(typed); }   // új bejegyzés, az aktuális gyakorlat bélyegével
    else if(id && !S.notes[id]) S.notes[id]=typed;
  }
  if(!day) dayNoteEdit=null;   // gyakorlat-módba lépve nincs félbehagyott szerkesztés
  openPlayerNote();
  if(typeof render==='function') render();
}
// A kapcsoló csak a lejátszóból nyitva jelenik meg (kívül nincs „mai nap").
function noteSegment(kind, fromPlayer){
  if(!fromPlayer || !S.active || !playerExId()) return '';
  return `<div class="seg" style="margin-top:12px">
    <button class="${kind==='ex'?'on':''}" onclick="setNoteMode(false)">Ehhez a gyakorlathoz</button>
    <button class="${kind==='day'?'on':''}" onclick="setNoteMode(true)">A mai naphoz</button></div>`;
}
function openNoteSheet(kind,id,fromPlayer){
  let h=`<div class="grabber"></div>`;
  if(kind==='ex'){
    const e=exDef(id), pn=S.notes[id]||'', ph=S.photos[id];
    h+=`<div class="row"><div class="grow"><span class="eyebrow">Gyakorlat-jegyzet</span>
      <h2 style="font-size:22px">${esc(exN(e))}</h2><span class="small dim">Állandó – padszög, ülésmagasság, technika</span></div>
      <button onclick="closeSheet()" style="font-size:26px;color:var(--dim);padding:0 8px">×</button></div>
      ${noteSegment('ex', fromPlayer)}
      ${gifBox(e)}
      <textarea id="noteTa" rows="3" style="width:100%;margin-top:12px;resize:vertical" placeholder="Pl. pad 30°, ülés 4-es lyuk, könyök be">${esc(pn)}</textarea>
      ${ph?`<img class="exphoto lg" src="${ph}" alt="beállítás fotó" style="margin-top:10px">`:''}
      <div class="row" style="gap:8px;margin-top:10px">
        <label class="btn" style="flex:1;margin:0;cursor:pointer">${ph?'Fotó cseréje':'Fotó hozzáadása'}<input id="photoIn" type="file" accept="image/*" capture="environment" style="display:none"></label>
        ${ph?`<button class="btn" style="flex:0 0 42%;margin:0;color:var(--red)" onclick="removePhoto('${id}')">Fotó törlése</button>`:''}
      </div>
      <button class="btn pri" style="margin-top:12px" onclick="saveNote('ex','${id}')">Mentés</button>
      <a class="btn" href="${videoUrl(e)}" target="_blank" rel="noopener noreferrer" style="margin-top:8px;display:flex;align-items:center;justify-content:center;gap:8px">${ICON.video} Technika videó</a>
      ${e.bw?'':`<button class="btn" style="margin-top:8px;text-align:left" onclick="openProgPolicy('${id}')">
        <span class="small dim">Progresszió</span><br><b>${POLICY_NAME[progPolicy(id)]}</b> <span class="dim">›</span></button>`}`;
    document.getElementById('sheetIn').innerHTML=h;
    const pin=document.getElementById('photoIn'); if(pin) pin.onchange=()=>addPhoto(id,pin.files[0]);
  } else {
    // A nap jegyzete TÖBB bejegyzés. A mező mindig ÚJ bejegyzést ír (vagy a
    // szerkesztésre kijelöltet írja felül); a korábbiak alatta listázódnak,
    // gyakorlathoz kötve, szerkeszthetően és törölhetően.
    dayNoteAbsorb();                    // a régi alakot beolvasztjuk, hogy szerkeszthető legyen
    const list=dayNotes(S.active);
    const nowEx=playerExId();
    const editing = dayNoteEdit!=null && list.some(n=>n.t===dayNoteEdit);
    const editIt = editing ? list.find(n=>n.t===dayNoteEdit) : null;
    const stampId = editing ? editIt.ex : nowEx;
    const stamp = stampId
      ? `<div class="small dim" style="margin-top:8px">${editing?'Szerkesztés':'Ide kerül'}: <b style="color:var(--mut)">${esc(exDef(stampId).n)}</b></div>`
      : '';
    let rows='';
    if(list.length){
      rows=`<div class="top" style="padding:16px 0 6px"><span class="eyebrow">Mai bejegyzések</span></div>`;
      list.slice().reverse().forEach(n=>{
        const e=n.ex&&exDef(n.ex);
        rows+=`<div class="card" style="margin-bottom:8px${n.t===dayNoteEdit?';border-color:var(--brass)':''}"><div class="pad row" style="align-items:flex-start;gap:10px">
          <button class="grow" style="text-align:left" onclick="dayNoteStartEdit(${n.t})">
            <span class="small" style="color:var(--brass)">${e?esc(exN(e)):'Általános'}</span>
            <span class="small dim"> · ${jotTime(n.t)}</span>
            <div class="small mut" style="margin-top:3px">${esc(n.txt)}</div></button>
          <button onclick="dayNoteDelete(${n.t})" aria-label="Törlés" style="color:var(--dim);font-size:20px;padding:2px 6px">×</button>
        </div></div>`;
      });
    }
    h+=`<div class="row"><div class="grow"><span class="eyebrow">Mai jegyzet</span>
      <h2 style="font-size:22px">Nap jegyzete</h2><span class="small dim">Csak erre az edzésre</span></div>
      <button onclick="closeSheet()" style="font-size:26px;color:var(--dim);padding:0 8px">×</button></div>
      ${noteSegment('day', fromPlayer)}
      <textarea id="noteTa" rows="3" style="width:100%;margin-top:12px;resize:vertical" placeholder="Pl. a 3. szettnél elment a jobb váll"></textarea>
      ${stamp}
      <button class="btn pri" style="margin-top:12px" onclick="saveNote('day','')">${editing?'Módosítás':'Hozzáadás'}</button>
      ${editing?`<button class="btn" style="margin-top:8px;color:var(--mut)" onclick="dayNoteEdit=null;openPlayerNote()">Mégse (új bejegyzés)</button>`:''}
      ${rows}`;
    document.getElementById('sheetIn').innerHTML=h;
    if(editing){ const ta=document.getElementById('noteTa'); if(ta) ta.value=editIt.txt; }
  }
  openSheet();
}
function saveNote(kind,id){
  const v=document.getElementById('noteTa').value.trim();
  if(kind==='ex'){
    // Ugyanaz a minta, mint a fotónál: az ÜRÍTÉS síremléket kap, különben a
    // felhő-unió visszahozná a törölt jegyzetet.
    if(v){ S.notes[id]=v; untomb('note:'+id); }
    else { delete S.notes[id]; tombstone('note:'+id); }
    closeSheet(); save(); render(); return;
  }
  if(!S.active){ closeSheet(); return; }
  // A nap jegyzete TÖBB bejegyzés: mindegyik ahhoz a gyakorlathoz kötve,
  // amelyiken épp álltál. Üres szöveg = nem csinálunk semmit (a meglévő
  // bejegyzéseket a listából lehet törölni).
  if(v) dayNoteSave(v);
  closeSheet(); save(); render();
}

/* ---- A nap jegyzetei (gyakorlathoz kötött bejegyzések) --------------- *
 * `S.active.dayNotes = [{t, ex, txt}]` – additív, session-szintű mező.
 * A RÉGI alak (`note` string + opcionális `noteEx`) változatlanul olvasható:
 * a `dayNotes(sess)` egyetlen bejegyzésként adja vissza, így a régi edzések
 * migráció nélkül jelennek meg. Új íráskor a `dayNotes` tömb az igazság, és
 * a `note` mezőt is karbantartjuk (összefűzve), hogy a régebbi olvasók
 * (pl. egy korábbi appverzió másik eszközön) se lássanak üres jegyzetet.
 */
function dayNotes(sess){
  if(!sess) return [];
  if(Array.isArray(sess.dayNotes)){
    const list=sess.dayNotes.filter(n=>n&&n.txt);
    // A régi, EGYszövegű `note` mezőt a `dayNoteSync` mindig a lista
    // összefűzésére írja át. Ha ELTÉR ettől, akkor egy RÉGI appverzió írta
    // (pl. a másik telefonod, amin még a korábbi build fut, és a felhő-unió
    // hozta át) – az a mondat nincs a listában, tehát külön bejegyzésként
    // mutatjuk. E nélkül a régi eszközön írt jegyzet némán eltűnne.
    if(sess.note && !dayNoteCovered(list, sess.note))
      return list.concat([{ t:dayNoteFreeT(list, sess.t||0), ex:sess.noteEx||null, txt:sess.note }]);
    return list;
  }
  if(sess.note) return [{ t:sess.t||0, ex:sess.noteEx||null, txt:sess.note }];
  return [];
}
// Benne van-e már a `note` szövege a listában? A régi mező lehet EGY jegyzet,
// vagy a lista összefűzése – utóbbi kétféle alakban is (a `dayNoteSync`
// gyakorlat-névvel, a felhő-merge anélkül fűz). Mindkettőt lefedjük, hogy egy
// már meglévő bejegyzés ne jelenjen meg másodszor is.
function dayNoteCovered(list, txt){
  const parts=String(txt).split(' · ').map(q=>q.replace(/^[^:]{1,40}: /,''));
  return parts.every(q=>list.some(n=>n.txt===q));
}
function dayNoteJoin(list){
  return list.map(n=>{ const e=n.ex&&exDef(n.ex); return (e?e.n+': ':'')+n.txt; }).join(' · ');
}
// Ütközésmentes időbélyeg a listában (a `t` a bejegyzés azonosítója).
function dayNoteFreeT(list, t){ let x=t||0; while(list.some(n=>n.t===x)) x++; return x; }
// A régi kliens `note`-ját BEOLVASZTJUK a listába, mielőtt szerkesztenénk –
// így az is törölhető/szerkeszthető lesz, nem csak látszik.
function dayNoteAbsorb(){
  if(!S.active) return;
  if(!Array.isArray(S.active.dayNotes)) S.active.dayNotes=[];
  const list=S.active.dayNotes;
  if(S.active.note && !dayNoteCovered(list, S.active.note)){
    list.push({ t:dayNoteFreeT(list, S.active.t||Date.now()), ex:S.active.noteEx||null, txt:S.active.note });
    dayNoteSync();
  }
}
// A `note` string szinkronban tartása a listával (visszafelé kompatibilitás).
function dayNoteSync(){
  if(!S.active) return;
  const list=S.active.dayNotes||[];
  if(!list.length){ delete S.active.note; delete S.active.noteEx; return; }
  S.active.note = dayNoteJoin(list);
  if(list[0].ex) S.active.noteEx=list[0].ex; else delete S.active.noteEx;
}
// Új bejegyzés (vagy a szerkesztett `editT` idejű felülírása).
let dayNoteEdit=null;     // a szerkesztés alatt álló bejegyzés `t`-je
function dayNoteSave(txt){
  if(!S.active) return;
  dayNoteAbsorb();                      // régi kliens jegyzete se vesszen el
  if(!Array.isArray(S.active.dayNotes)){
    // Első íráskor a RÉGI egyszövegű jegyzetet bejegyzéssé alakítjuk, hogy
    // ne vesszen el, ha menet közben frissült az app.
    S.active.dayNotes = S.active.note
      ? [{ t:S.active.t||Date.now(), ex:S.active.noteEx||null, txt:S.active.note }] : [];
  }
  if(dayNoteEdit!=null){
    const it=S.active.dayNotes.find(n=>n.t===dayNoteEdit);
    if(it){ it.txt=txt; dayNoteEdit=null; dayNoteSync(); S.activeT=Date.now(); return; }
    dayNoteEdit=null;
  }
  S.active.dayNotes.push({ t:Date.now(), ex:playerExId()||null, txt });
  dayNoteSync(); S.activeT=Date.now();
}
function dayNoteDelete(t){
  if(!S.active || !Array.isArray(S.active.dayNotes)) return;
  S.active.dayNotes = S.active.dayNotes.filter(n=>n.t!==t);
  if(dayNoteEdit===t) dayNoteEdit=null;
  dayNoteSync(); S.activeT=Date.now(); save(); openPlayerNote(); render();
}
function dayNoteStartEdit(t){
  const it=(S.active&&S.active.dayNotes||[]).find(n=>n.t===t); if(!it) return;
  dayNoteEdit=t; openPlayerNote();
  const ta=document.getElementById('noteTa'); if(ta){ ta.value=it.txt; ta.focus(); }
}
// Rövid óra-perc a bejegyzés mellé.
function jotTime(t){ const d=new Date(t); return d.getHours()+':'+String(d.getMinutes()).padStart(2,'0'); }
function addPhoto(id,file){
  if(!file) return;
  const ta=document.getElementById('noteTa'); const keep=ta?ta.value:'';   // ne vesszen el a beírt jegyzet
  const rd=new FileReader();
  rd.onload=()=>{ const img=new Image(); img.onload=()=>{
    const max=800, sc=Math.min(1,max/Math.max(img.width,img.height));
    const c=document.createElement('canvas'); c.width=Math.round(img.width*sc); c.height=Math.round(img.height*sc);
    c.getContext('2d').drawImage(img,0,0,c.width,c.height);
    let data; try{ data=c.toDataURL('image/jpeg',0.6); }catch(e){ uiAlert('A kép feldolgozása nem sikerült.'); return; }
    S.photos[id]=data; untomb('photo:'+id); save();   // új kép → a régi síremlék elévül
    if(storeMode==='none'){ delete S.photos[id]; uiAlert('A kép nem fért el a tárolóban – törölj néhány fotót.'); }
    openNoteSheet('ex',id);
    const ta2=document.getElementById('noteTa'); if(ta2&&keep) ta2.value=keep;
  }; img.src=rd.result; };
  rd.readAsDataURL(file);
}
// A fotó törlése SÍREMLÉKET kap (`photo:<exId>`), különben a felhő-unió
// visszahozná: a törlés önmagában csak „adat hiánya". A hatóköre szűk – a
// gyakorlat súlyát/jegyzetét nem érinti, csak a fotót.
async function removePhoto(id){ const ta=document.getElementById('noteTa'); const keep=ta?ta.value:'';
  delete S.photos[id]; tombstone('photo:'+id); await save(); flushCloud();
  openNoteSheet('ex',id);
  const ta2=document.getElementById('noteTa'); if(ta2&&keep) ta2.value=keep; }
function viewPhoto(id){ const ph=S.photos[id]; if(!ph) return;
  document.getElementById('photoImg').src=ph; document.getElementById('photo').classList.add('on'); }

