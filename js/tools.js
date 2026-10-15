/* ==================================================================
   Terem-segedek: tarcsa-kalkulator (platesPerSide).
   ================================================================== */
/* ---- Tárcsa-kalkulátor -------------------------------------------- */
// Egy rúdra oldalanként kirakandó tárcsák egy cél-súlyhoz. Standard
// kg-os tárcsakészlet, mohó algoritmus. (Saját, egyszerű implementáció.)
let plateBar=20;
// Oldalankénti tárcsakiosztás egy cél-súlyhoz. Visszaad: perSide (kg),
// used (tárcsák listája), rem (ami nem rakható ki), belowBar (rúd alatt).
function platesPerSide(target, bar){
  const perSide=Math.round((target-bar)/2*100)/100;
  if(perSide<0) return {perSide, used:[], rem:0, belowBar:true};
  const PLATES=[25,20,15,10,5,2.5,1.25]; let rem=perSide; const used=[];
  PLATES.forEach(p=>{ while(rem>=p-1e-9){ used.push(p); rem=Math.round((rem-p)*100)/100; } });
  return {perSide, used, rem, belowBar:false};
}
function openPlateCalc(preW){
  const w=preW>0?preW:60;
  let h=`<div class="grabber"></div>
    <div class="row"><div class="grow"><span class="eyebrow">Tárcsa-kalkulátor</span>
      <h2 style="font-size:22px">Mennyi tárcsa oldalanként?</h2></div>
      <button onclick="closeSheet()" style="font-size:26px;color:var(--dim);padding:0 8px">×</button></div>
    <label class="small dim">Cél súly (kg)</label>
    <input id="plW" type="number" inputmode="decimal" step="1.25" value="${w}" oninput="renderPlateRes()" style="width:100%;margin:6px 0 12px;font-size:24px">
    <div class="seg" id="plBar">${[20,15,10].map(b=>`<button class="${plateBar===b?'on':''}" onclick="setPlateBar(${b})">${b} kg rúd</button>`).join('')}</div>
    <div id="plRes"></div>`;
  document.getElementById('sheetIn').innerHTML=h;
  openSheet();
  renderPlateRes();
}
function setPlateBar(b){ plateBar=b;
  document.querySelectorAll('#plBar button').forEach(btn=>btn.classList.toggle('on',btn.textContent.indexOf(b+' ')===0));
  renderPlateRes(); }
function renderPlateRes(){
  const el=document.getElementById('plRes'); if(!el) return;
  const target=parseFloat(document.getElementById('plW').value)||0;
  const r=platesPerSide(target, plateBar);
  if(r.belowBar){ el.innerHTML=`<div class="platesum">A cél kisebb a rúdnál (${plateBar} kg).</div>`; return; }
  if(r.perSide===0){ el.innerHTML=`<div class="platesum">Csak a rúd – nincs tárcsa.</div>`; return; }
  const bars=r.used.map(p=>`<span class="plate" style="height:${Math.round(28+p)}px">${kgNum(p)}</span>`).join('');
  let sum=`Oldalanként ${kgNum(r.perSide)} kg · ${r.used.length} tárcsa`;
  if(r.rem>0.01) sum+=` · ${kgNum(r.rem)} kg így nem rakható ki`;
  el.innerHTML=`<div class="plateres">${bars||'<span class="dim">–</span>'}</div><div class="platesum">${sum}</div>`;
}


