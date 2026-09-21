/* ==================================================================
   Edzes-osszeallito: sajat edzes (routines), gyakorlat-valaszto,
   sajat gyakorlat (customEx) es edzesterv (programs).
   ================================================================== */
/* ================= Edzés-összeállító (saját edzések) ================ */
function openBuilder(id){
  if(id){ const r=S.routines.find(x=>x.id===id);
    draft = r ? {id:r.id,name:r.name,ex:r.ex.slice(),ssLinks:(r.ssLinks||[]).slice(),isNew:false} : null; if(!draft) return; }
  else draft = {id:uid('r_'),name:'',ex:[],ssLinks:[],isNew:true};
  editing='routine'; render(); window.scrollTo(0,0);
}
function closeBuilder(){ editing=false; draft=null; render(); window.scrollTo(0,0); }
function updateBuilderSave(){ const ok=draft&&draft.name.trim()&&draft.ex.length>0;
  document.querySelectorAll('#draftSave,#draftSaveTop').forEach(b=>b.disabled=!ok); }
function draftMove(i,dir){ const j=i+dir; if(j<0||j>=draft.ex.length) return;
  const a=draft.ex; [a[i],a[j]]=[a[j],a[i]]; render(); }
function draftRemove(i){ draft.ex.splice(i,1); render(); }
function saveDraft(){
  if(!draft.name.trim()||!draft.ex.length){ uiAlert('Adj nevet és legalább egy gyakorlatot.'); return; }
  // Csak érvényes (a listában lévő, nem az első pozíción árva) linkeket tartunk meg.
  const links=(draft.ssLinks||[]).filter(id=>{ const i=draft.ex.indexOf(id); return i>0; });
  const r={id:draft.id,name:draft.name.trim(),sub:draft.ex.length+' gyakorlat',ex:draft.ex.slice()};
  if(links.length) r.ssLinks=links;
  const idx=S.routines.findIndex(x=>x.id===draft.id);
  if(idx>=0) S.routines[idx]=r; else S.routines.push(r);
  editing=false; draft=null; save(); tab='home'; render(); window.scrollTo(0,0);
}
// Superset-kapcsoló: az i. gyakorlat (i>0) össze/szét a fölöttivel.
function draftToggleLink(exId){
  if(!draft.ssLinks) draft.ssLinks=[];
  const i=draft.ssLinks.indexOf(exId);
  if(i>=0) draft.ssLinks.splice(i,1); else draft.ssLinks.push(exId);
  render();
}
async function deleteRoutine(id){
  if(!await uiConfirm('Törlöd ezt a saját edzést?\n(A már naplózott edzések megmaradnak.)', {ok:'Törlés', danger:true})) return;
  S.routines=S.routines.filter(x=>x.id!==id);
  (S.programs||[]).forEach(p=>{ p.days=p.days.filter(d=>d!==id); });
  if(S.sched) delete S.sched[id];        // ne maradjon árva beosztás
  tombstone(id);   // síremlék: a felhő-merge se hozza vissza
  editing=false; draft=null; await save(); flushCloud(); render(); window.scrollTo(0,0);   // a jelenlegi fülön marad
}
function builderView(){
  const canSave = draft.name.trim() && draft.ex.length>0;
  let items='';
  draft.ex.forEach((exId,i)=>{ const e=exDef(exId);
    const linked = i>0 && (draft.ssLinks||[]).includes(exId);
    if(i>0) items+=`<button class="sslink ${linked?'on':''}" onclick="draftToggleLink('${exId}')">${linked?'⛓ Superset az előzővel · bontás':'+ Superset az előzővel'}</button>`;
    items+=`<div class="card"${linked?' style="border-color:var(--brass)"':''}><div class="pad row">
      <span class="grow"><span class="cond" style="font-size:18px;font-weight:600;display:block">${esc(exN(e))}</span>
      <span class="small dim">${e.s}×${e.r}${e.mg?' · '+esc(trmg(e.mg)):''}</span></span>
      <button class="iconbtn" onclick="draftMove(${i},-1)" ${i===0?'disabled':''} aria-label="fel">↑</button>
      <button class="iconbtn" onclick="draftMove(${i},1)" ${i===draft.ex.length-1?'disabled':''} aria-label="le">↓</button>
      <button class="iconbtn" style="color:var(--red)" onclick="draftRemove(${i})" aria-label="törlés">×</button>
    </div></div>`;
  });
  if(!draft.ex.length) items=`<div class="empty" style="padding:24px">Még nincs gyakorlat.<br>Add hozzá lentebb.</div>`;
  return `<div class="player">
    <div class="ptop">
      <button class="iconbtn" onclick="closeBuilder()" aria-label="Mégse">${ICON.back}</button>
      <div class="pmid"><div class="d">Edzés összeállítása</div><div class="c">${draft.isNew?'új edzés':'szerkesztés'}</div></div>
      <button class="iconbtn" id="draftSaveTop" onclick="saveDraft()" ${canSave?'':'disabled'} style="color:var(--sage)" aria-label="Mentés">${ICON.check}</button>
    </div>
    <div class="pmain" style="justify-content:flex-start;gap:12px">
      <input id="draftName" type="text" placeholder="Edzés neve (pl. Láb nap)" value="${esc(draft.name)}"
        oninput="draft.name=this.value;updateBuilderSave()" style="width:100%;font-size:18px">
      ${items}
      <button class="btn" onclick="openExPicker()">+ Gyakorlat hozzáadása</button>
      ${!draft.isNew?`<button class="btn ghost" style="color:var(--red)" onclick="deleteRoutine('${draft.id}')">Edzés törlése</button>`:''}
      <button class="btn pri" id="draftSave" onclick="saveDraft()" ${canSave?'':'disabled'}>Mentés</button>
    </div>
  </div>`;
}

/* Gyakorlat-választó lap */
// A választó két gazdát szolgál: az edzés-összeállítót (`draft`) és az
// AI-import előnézetét (`ai`), ahol egy rossz párosítást kötünk át. A sorok
// ezért a `pickerChoose`-on mennek át, nem közvetlenül az `addToDraft`-on.
let pickerQ='', pickerMg='', pickerMode='draft';
function openExPicker(mode,q){ pickerQ=q||''; pickerMg=''; pickerMode=mode||'draft'; renderPicker(); openSheet(); }
function pickerChoose(id){ return pickerMode==='ai' ? aiBindPick(id) : addToDraft(id); }
// A találati listát és a chipeket külön frissítjük, hogy a kereső input
// DOM-eleme gépelés közben ne épüljön újra (megmaradjon a fókusz + kurzor).
function pickerRowsHtml(){
  const q=pickerQ.toLowerCase();
  const lib=exLibrary().filter(e=>
    (!q || e.n.toLowerCase().includes(q) || exN(e).toLowerCase().includes(q)) &&
    (!pickerMg || (e.mg||'')===pickerMg));
  return lib.map(e=>`<button class="btn" style="text-align:left;display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:8px" onclick="pickerChoose('${e.id}')">
      ${gifThumb(e)}
      <span class="grow" style="min-width:0"><span style="font-weight:600">${esc(exN(e))}</span>
      <span class="small dim" style="display:block">${e.s}×${e.r}${e.mg?' · '+esc(trmg(e.mg)):''} · ${esc(tr(e.src))}</span></span>
      <span style="color:var(--brass);font-size:24px;flex:none">+</span></button>`).join('')
    || '<div class="empty">Nincs találat ebben az izomcsoportban.</div>';
}
function pickerChipsHtml(){
  return `<button class="whyc ${pickerMg===''?'on':''}" onclick="setPickerMg('')">Mind</button>`
    + MGS.map(m=>`<button class="whyc ${pickerMg===m?'on':''}" onclick="setPickerMg('${m}')">${esc(trmg(m))}</button>`).join('');
}
function renderPickerRows(){ const el=document.getElementById('pickerRows'); if(el) el.innerHTML=pickerRowsHtml(); }
function renderPickerChips(){ const el=document.getElementById('pickerChips'); if(el) el.innerHTML=pickerChipsHtml(); }
function setPickerMg(m){ pickerMg=(pickerMg===m?'':m); renderPickerChips(); renderPickerRows(); }
function renderPicker(){
  const ai = pickerMode==='ai';
  document.getElementById('sheetIn').innerHTML=`<div class="grabber"></div>
    <div class="row"><div class="grow"><span class="eyebrow">${ai?'Párosítás cseréje':'Gyakorlat hozzáadása'}</span>
    <h2 style="font-size:22px">${ai?'Melyikhez kösse?':'Válassz vagy hozz létre'}</h2></div>
    <button onclick="${ai?'aiBackToPreview()':'closeSheet()'}" style="font-size:26px;color:var(--dim);padding:0 8px">×</button></div>
    <input type="text" placeholder="Keresés név szerint…" value="${esc(pickerQ)}" oninput="pickerQ=this.value;renderPickerRows()" style="width:100%;margin:12px 0 10px">
    <div class="whyrow" id="pickerChips" style="margin-bottom:12px">${pickerChipsHtml()}</div>
    ${ai?`<button class="btn" style="margin-bottom:12px" onclick="aiBindNew()">Maradjon új gyakorlat</button>`
        :`<button class="btn pri" style="margin-bottom:12px" onclick="openCustomEx()">+ Új saját gyakorlat</button>`}
    <div id="pickerRows" style="max-height:40dvh;overflow-y:auto">${pickerRowsHtml()}</div>
    <p class="small dim" style="text-align:center;margin:10px 0 0">Ábrák © <a href="https://gymvisual.com/" target="_blank" rel="noopener noreferrer" style="color:var(--dim)">Gym visual</a></p>`;
}
function addToDraft(exId){ draft.ex.push(exId); closeSheet(); render(); }

/* Új saját gyakorlat űrlap */
/* Saját gyakorlatok kezelése (lista + szerkesztés + törlés) */
function openManageEx(){
  const list=Object.values(S.customEx||{});
  const rows = list.length ? list.map(e=>`<div class="card"><div class="pad row">
      <span class="grow"><span class="cond" style="font-size:18px;font-weight:600;display:block">${esc(exN(e))}</span>
      <span class="small dim">${e.s}×${e.r}${e.mg?' · '+esc(trmg(e.mg)):''}${e.bw?' · testsúly':''}</span></span>
      <button class="iconbtn" onclick="openCustomEx('${e.id}','manage')" aria-label="Szerkesztés" title="Szerkesztés">${ICON.edit}</button>
      <button class="iconbtn" style="color:var(--red)" onclick="deleteCustomEx('${e.id}')" aria-label="Törlés" title="Törlés">×</button>
    </div></div>`).join('') : '<div class="empty">Még nincs saját gyakorlatod.</div>';
  document.getElementById('sheetIn').innerHTML=`<div class="grabber"></div>
    <div class="row"><div class="grow"><span class="eyebrow">Saját gyakorlatok</span>
    <h2 style="font-size:22px">Kezelés</h2></div>
    <button onclick="closeSheet()" style="font-size:26px;color:var(--dim);padding:0 8px">×</button></div>
    <button class="btn pri" style="margin:12px 0" onclick="openCustomEx(null,'manage')">+ Új saját gyakorlat</button>
    <div style="max-height:52dvh;overflow-y:auto">${rows}</div>`;
  openSheet();
}
async function deleteCustomEx(id){
  const used=(S.routines||[]).some(r=>r.ex.indexOf(id)>=0);
  if(!await uiConfirm('Törlöd ezt a saját gyakorlatot?'+(used?'\nA saját edzésekből is kikerül.':'')+'\n(A már naplózott edzésekben az adat megmarad.)', {ok:'Törlés', danger:true})) return;
  delete S.customEx[id];
  (S.routines||[]).forEach(r=>{ r.ex=r.ex.filter(x=>x!==id); });
  tombstone(id); await save(); flushCloud(); openManageEx();   // síremlék + azonnali felhő
}

let cxMg='', cxEditId=null, cxReturn='picker';
function openCustomEx(id, ret){
  cxEditId = id || null; cxReturn = ret || 'picker';
  const e = cxEditId ? S.customEx[cxEditId] : null;
  cxMg = e ? (e.mg||'') : '';
  const val=(v,d)=> e!=null ? v : d;
  const back = cxReturn==='manage' ? 'openManageEx()' : 'renderPicker()';
  document.getElementById('sheetIn').innerHTML=`<div class="grabber"></div>
    <div class="row"><div class="grow"><span class="eyebrow">${cxEditId?'Saját gyakorlat szerkesztése':'Új saját gyakorlat'}</span>
    <h2 style="font-size:22px">Add meg a részleteit</h2></div>
    <button onclick="${back}" style="font-size:26px;color:var(--dim);padding:0 8px">×</button></div>
    <input id="cxName" placeholder="Név (pl. Bolgár kitörés)" value="${e?esc(e.n):''}" style="width:100%;margin-top:12px">
    <div class="small dim" style="margin-top:10px">Izomcsoport (a sérülés-módhoz)</div>
    <div class="whyrow" id="cxMg" style="margin-top:6px">${MGS.map(m=>`<button class="whyc ${e&&e.mg===m?'on':''}" data-mg="${m}" onclick="pickCxMg(this)">${esc(trmg(m))}</button>`).join('')}</div>
    <div class="row" style="gap:8px;margin-top:12px">
      <label class="small dim" style="flex:1">Szett<input id="cxSets" type="number" inputmode="numeric" value="${val(e&&e.s,3)}" style="width:100%;margin-top:4px"></label>
      <label class="small dim" style="flex:1">Ismétlés<input id="cxReps" type="text" value="${e?esc(e.r):'10'}" style="width:100%;margin-top:4px"></label>
    </div>
    <div class="row" style="gap:8px;margin-top:8px">
      <label class="small dim" style="flex:1">Kezdősúly<input id="cxW" type="number" inputmode="decimal" value="${val(e&&e.w,20)}" style="width:100%;margin-top:4px"></label>
      <label class="small dim" style="flex:1">Lépés<input id="cxInc" type="number" inputmode="decimal" value="${val(e&&e.inc,2.5)}" style="width:100%;margin-top:4px"></label>
      <label class="small dim" style="flex:1">Pihenő (mp)<input id="cxRest" type="number" inputmode="numeric" value="${val(e&&e.rest,90)}" style="width:100%;margin-top:4px"></label>
    </div>
    <label class="row small" style="gap:8px;margin-top:12px"><input id="cxBw" type="checkbox" ${e&&e.bw?'checked':''} style="width:auto"> Testsúlyos gyakorlat</label>
    <button class="btn pri" style="margin-top:14px" onclick="saveCustomEx()">${cxEditId?'Mentés':'Létrehozás és hozzáadás'}</button>`;
}
function pickCxMg(btn){ cxMg=btn.dataset.mg; document.querySelectorAll('#cxMg .whyc').forEach(b=>b.classList.toggle('on', b===btn)); }
function saveCustomEx(){
  const name=(document.getElementById('cxName').value||'').trim();
  if(!name){ uiAlert('Adj nevet a gyakorlatnak.'); return; }
  const def={ n:name, mg:cxMg||'törzs',
    s:Math.max(1,parseInt(document.getElementById('cxSets').value)||3),
    r:(document.getElementById('cxReps').value||'10').trim(),
    w:Math.max(0,parseFloat(document.getElementById('cxW').value)||0),
    inc:Math.max(0.5,parseFloat(document.getElementById('cxInc').value)||2.5),
    rest:Math.max(10,parseInt(document.getElementById('cxRest').value)||90) };
  if(document.getElementById('cxBw').checked) def.bw=1;
  if(cxEditId){ def.id=cxEditId; S.customEx[cxEditId]=def; }
  else { const id=uid('cx_'); def.id=id; S.customEx[id]=def; if(cxReturn==='picker' && draft) draft.ex.push(id); }
  const ret=cxReturn; cxMg=''; cxEditId=null; save();
  if(ret==='manage') openManageEx();
  else { closeSheet(); render(); }
}

/* ================= Edzéstervek (programok) ========================= */
let prog=null;
function openProgram(id){
  if(id){ const p=S.programs.find(x=>x.id===id);
    prog = p ? {id:p.id,name:p.name,days:p.days.slice(),isNew:false} : null; if(!prog) return; }
  else prog = {id:uid('p_'),name:'',days:[],isNew:true};
  editing='program'; render(); window.scrollTo(0,0);
}
function closeProgram(){ editing=false; prog=null; render(); window.scrollTo(0,0); }
function updateProgSave(){ const ok=prog && prog.name.trim() && prog.days.length>0;
  document.querySelectorAll('#progSave,#progSaveTop').forEach(b=>b.disabled=!ok); }
function progMove(i,dir){ const j=i+dir; if(j<0||j>=prog.days.length) return;
  const a=prog.days; [a[i],a[j]]=[a[j],a[i]]; render(); }
function progRemove(i){ prog.days.splice(i,1); render(); }
function saveProgram(){
  if(!prog.name.trim()||!prog.days.length){ uiAlert('Adj nevet és legalább egy edzést.'); return; }
  const p={id:prog.id,name:prog.name.trim(),days:prog.days.slice()};
  const idx=S.programs.findIndex(x=>x.id===prog.id);
  if(idx>=0) S.programs[idx]=p; else S.programs.push(p);
  editing=false; prog=null; save(); tab='home'; render(); window.scrollTo(0,0);
}
async function deleteProgram(id){ if(!await uiConfirm('Törlöd ezt az edzéstervet?\n(A benne lévő edzések megmaradnak.)', {ok:'Törlés', danger:true})) return;
  S.programs=S.programs.filter(x=>x.id!==id); tombstone(id); editing=false; prog=null; await save(); flushCloud(); render(); window.scrollTo(0,0); }  // síremlék + azonnali felhő
function programView(){
  const canSave = prog.name.trim() && prog.days.length>0;
  let items='';
  prog.days.forEach((dId,i)=>{ const d=dayDef(dId);
    items+=`<div class="card"><div class="pad row">
      <span class="grow"><span class="cond" style="font-size:18px;font-weight:600">${esc(d?d.name:'(törölt edzés)')}</span></span>
      <button class="iconbtn" onclick="progMove(${i},-1)" ${i===0?'disabled':''} aria-label="fel">↑</button>
      <button class="iconbtn" onclick="progMove(${i},1)" ${i===prog.days.length-1?'disabled':''} aria-label="le">↓</button>
      <button class="iconbtn" style="color:var(--red)" onclick="progRemove(${i})" aria-label="törlés">×</button>
    </div></div>`;
  });
  if(!prog.days.length) items=`<div class="empty" style="padding:24px">Még nincs edzés a tervben.<br>Add hozzá lentebb.</div>`;
  return `<div class="player">
    <div class="ptop">
      <button class="iconbtn" onclick="closeProgram()" aria-label="Mégse">${ICON.back}</button>
      <div class="pmid"><div class="d">Edzésterv</div><div class="c">${prog.isNew?'új terv':'szerkesztés'}</div></div>
      <button class="iconbtn" id="progSaveTop" onclick="saveProgram()" ${canSave?'':'disabled'} style="color:var(--sage)" aria-label="Mentés">${ICON.check}</button>
    </div>
    <div class="pmain" style="justify-content:flex-start;gap:12px">
      <input id="progName" type="text" placeholder="Terv neve (pl. Nyári tömeg)" value="${esc(prog.name)}"
        oninput="prog.name=this.value;updateProgSave()" style="width:100%;font-size:18px">
      ${items}
      <button class="btn" onclick="openDayPicker()">+ Edzés hozzáadása</button>
      ${(S.programs||[]).some(x=>x.id===prog.id)?`<button class="btn" onclick="openSharePlan('${prog.id}')">Megosztás baráttal</button>`:''}
      ${!prog.isNew?`<button class="btn ghost" style="color:var(--red)" onclick="deleteProgram('${prog.id}')">Terv törlése</button>`:''}
      <button class="btn pri" id="progSave" onclick="saveProgram()" ${canSave?'':'disabled'}>Mentés</button>
    </div>
  </div>`;
}
function openDayPicker(){
  const days=PLAN.map(d=>({id:d.id,name:d.name,src:'beépített'}))
    .concat(S.routines.map(r=>({id:r.id,name:r.name,src:'saját'})));
  const rows=days.map(d=>`<button class="btn" style="text-align:left;display:flex;justify-content:space-between;align-items:center;margin-bottom:8px" onclick="addToProg('${d.id}')">
      <span><span style="font-weight:600">${esc(d.name)}</span> <span class="small dim">· ${esc(tr(d.src))}</span></span>
      <span style="color:var(--brass);font-size:24px">+</span></button>`).join('');
  document.getElementById('sheetIn').innerHTML=`<div class="grabber"></div>
    <div class="row"><div class="grow"><span class="eyebrow">Edzés hozzáadása a tervhez</span>
    <h2 style="font-size:22px">Válassz edzést</h2></div>
    <button onclick="closeSheet()" style="font-size:26px;color:var(--dim);padding:0 8px">×</button></div>
    <div style="max-height:52dvh;overflow-y:auto;margin-top:12px">${rows}</div>`;
  openSheet();
}
function addToProg(dId){ prog.days.push(dId); closeSheet(); render(); }

