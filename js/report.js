/* ==================================================================
   Heti osszefoglalo edzonek: szettek, elteres-okok, jegyzetek
   es a regeneracio-blokk (alvas + testsuly).
   ================================================================== */
/* ---- Heti összefoglaló (AI edzőnek) -------------------------------- */
// AZ AKTUÁLIS NAPTÁRI HÉT edzései a jegyzetekkel (hétfő 00:00-tól, ugyanaz a
// `weekStart`, amit a sorozat- és a heti izomtérkép-számítás használ) – NEM
// gördülő 7 nap, mert a szöveg „heti összefoglaló"-t ígér, és egy hétfői
// edzés nem tartozik a múlt hétbe. Ha ezen a héten még nincs edzés, az
// utolsó 3 megy el, és a fejléc ezt meg is mondja.
function weeklyReport(){
  const WHY={busy:'gép foglalt',heavy:'túl nehéz',time:'kevés idő'};
  const wkStart=weekStart(Date.now());
  let sess=(S.sessions||[]).filter(s=>s.t>=wkStart), weekly=true;
  if(!sess.length){ sess=(S.sessions||[]).slice(-3); weekly=false; }
  let t='Edzésnapló – ';
  if(weekly) t+='heti összefoglaló ('+fmtDate(wkStart)+' – '+fmtDate(Date.now())+', '+sess.length+' edzés)';
  else if(sess.length) t+='utolsó '+sess.length+' edzés ('+fmtDate(sess[0].t)+' – '+fmtDate(sess[sess.length-1].t)+') – ezen a héten még nem volt edzés';
  else t+='heti összefoglaló';
  t+='\n\nKérlek, edzőként nézd át ezeket az edzéseket – az alvással és a testsúllyal együtt –, és adj rövid visszajelzést + javaslatot a következő hétre.\n';
  const from = weekly ? wkStart : (sess.length ? new Date(sess[0].t).setHours(0,0,0,0) : wkStart);
  if(!sess.length) return t+'\n(Nincs rögzített edzés.)'+reportRecovery(wkStart, Date.now(), true);
  const line=(e,l,extraName)=>{
    const sets=l.sets.map(x=>x==null?'–':x).join(', ');
    const w=wLabel(e,l.w)+(e.bw&&l.w<=0?'':' kg');
    let ex=''; if(l.why) ex+=' ['+(WHY[l.why]||l.why)+']';
    const pn=S.notes&&S.notes[e.id]; if(pn) ex+=' (jegyzet: '+pn+')';
    return '  '+e.n+(extraName||'')+': '+w+' × '+sets+ex+'\n';
  };
  sess.forEach(s=>{ const d=dayDef(s.day)||{ex:[]};
    t+='\n— '+fmtDate(s.t)+' — '+dayName(s)+' (összterhelés: '+sessionLoad(s).toLocaleString('hu')+' kg)\n';
    // Az EDZÉS NAPJÁN rögzített alvás/testsúly ide, a szettek mellé – így az
    // edző a terhelést a regenerációval együtt látja, nem külön listában.
    const sl=(S.sleep||{})[bwKey(s.t)], kg=(S.bw||{})[bwKey(s.t)], meta=[];
    if(sl&&sl.min>0) meta.push('alvás: '+slpFmt(sl.min)+(sl.q?' ('+slpQLabel(sl.q)+')':''));
    if(kg>0) meta.push('testsúly: '+bwNum(kg)+' kg');
    if(meta.length) t+='  '+meta.join(' · ')+'\n';
    dayNotes(s).forEach(n=>{ const e=n.ex&&exDef(n.ex);
      t+='  Jegyzet'+(e?' ('+e.n+' közben)':'')+': '+n.txt+'\n'; });
    const seen=new Set();
    d.ex.forEach(e=>{ seen.add(e.id); const l=s.log[e.id]; if(l&&l.sets.some(x=>x!=null)) t+=line(e,l); });
    Object.keys(s.log).forEach(id=>{ if(seen.has(id))return; const l=s.log[id];
      if(!l.sets.some(x=>x!=null))return; t+=line(exDef(id),l,' (kivéve)'); });
  });
  return t+reportRecovery(from, Date.now(), weekly);
}
// Az összefoglaló ablakában rögzített alvás és testsúly. A szettek önmagukban
// féligazságot adnak: az edző nem tudja megítélni a terhelést, ha nem látja,
// mennyit aludt és merre megy a testsúly. Csak a TÉNYLEGESEN rögzített napokat
// írjuk ki – nem interpolálunk, nem tippelünk.
function reportRecovery(from, to, weekly){
  const inR = e => { const x=new Date(e.d+'T00:00:00').getTime(); return x>=from && x<=to; };
  const sl=slpEntries().filter(inR), bw=bwEntries().filter(inR);
  if(!sl.length && !bw.length) return '';
  const avg=a=>a.reduce((x,y)=>x+y,0)/a.length;
  let t='\n— Regeneráció'+(weekly?' (ezen a héten)':' (ebben az időszakban)')+' —\n';
  if(sl.length){
    const qs=sl.filter(e=>e.q>0);
    t+='  Alvás: átlag '+slpFmt(avg(sl.map(e=>e.min)))+' / éj ('+sl.length+' éjszaka'
      +(qs.length?', átlagos minőség '+(Math.round(avg(qs.map(e=>e.q))*10)/10).toString().replace('.',',')+'/5':'')+')\n';
    t+='    '+sl.map(e=>bwFmtDate(e.d)+': '+slpFmt(e.min)+(e.q?' ('+slpQLabel(e.q)+')':'')).join(' · ')+'\n';
  } else t+='  Alvás: ebben az időszakban nincs rögzítve.\n';
  if(bw.length){
    const m=avg(bw.map(e=>e.kg));
    // Irány az ELŐZŐ 7 nap átlagához – egy szám önmagában nem mond semmit.
    const prev=bwEntries().filter(e=>{ const x=new Date(e.d+'T00:00:00').getTime(); return x>=from-7*864e5 && x<from; });
    let d='';
    if(prev.length){ const diff=m-avg(prev.map(e=>e.kg));
      // 0,05 kg alatt a „+0,0 kg" felirat értelmetlen – mondjuk ki inkább.
      d = Math.abs(diff)<0.05 ? ' (változatlan az előző héthez)'
        : ' ('+(diff>=0?'+':'−')+bwNum(Math.abs(diff))+' kg az előző héthez)'; }
    t+='  Testsúly: átlag '+bwNum(m)+' kg'+d+'\n';
    t+='    '+bw.map(e=>bwFmtDate(e.d)+': '+bwNum(e.kg)+' kg').join(' · ')+'\n';
  } else t+='  Testsúly: ebben az időszakban nincs rögzítve.\n';
  return t;
}
let _weeklyText='';
function openWeeklyExport(){
  _weeklyText=weeklyReport();
  document.getElementById('sheetIn').innerHTML=`<div class="grabber"></div>
    <div class="row"><div class="grow"><span class="eyebrow">Heti összefoglaló</span>
    <h2 style="font-size:22px">Küldd el az edződnek</h2></div>
    <button onclick="closeSheet()" style="font-size:26px;color:var(--dim);padding:0 8px">×</button></div>
    <p class="small dim" style="margin-top:6px">Az e heti edzések (hétfőtől) a jegyzetekkel, az alvással és a testsúllyal – AI-edzőnek kész szöveggel.</p>
    <textarea id="weeklyTa" rows="9" readonly style="width:100%;margin-top:10px">${esc(_weeklyText)}</textarea>
    <div class="row" style="gap:8px;margin-top:12px">
      <button class="btn pri" style="flex:1;margin:0" onclick="shareWeekly()">Megosztás</button>
      <button class="btn" style="flex:1;margin:0" onclick="copyWeekly()">Másolás</button>
    </div>`;
  openSheet();
}
function copyWeekly(){ navigator.clipboard.writeText(_weeklyText).then(()=>toast('Vágólapra másolva – beillesztheted az AI edződnek.'),()=>uiAlert('Nem sikerült a másolás.')); }
async function shareWeekly(){
  if(navigator.share){ try{ await navigator.share({title:'Edzésnapló – heti összefoglaló', text:_weeklyText}); return; }
    catch(e){ if(e&&e.name==='AbortError') return; } }
  copyWeekly();
}

