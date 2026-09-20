/* Edzésnapló – böngészős E2E (Playwright).
 *
 * A teljes felhasználói folyamatot járja végig egy fejlécnélküli Chromiumban:
 * betöltés, téma, vezetett edzés + naplózás + eszközök, napló, haladás
 * (statisztikák, izomtérkép), tervek/összeállító, superset-kör, sérülés-mód.
 * Tiszta segéd- és nézet-függvényeket is közvetlenül ellenőriz.
 *
 * Futtatás (statikus szerver a repó gyökeréből, pl. `python3 -m http.server 8099`):
 *   node test/e2e.mjs
 * Környezeti változók:
 *   BASE_URL     – az app URL-je (alap: http://localhost:8099)
 *   PW_CHROMIUM  – Chromium bináris útvonala (ha nem a Playwright-csomagé)
 * Kilépési kód 0, ha minden zöld és nincs JS-hiba.
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
// A `require` figyeli a NODE_PATH-ot is, így a Playwright globálisan telepítve
// is megtalálható (nemcsak helyi node_modules-ból).
const { chromium } = createRequire(import.meta.url)('playwright');

const BASE = process.env.BASE_URL || 'http://localhost:8099';
const backup = JSON.parse(readFileSync(new URL('../edzesnaplo-backup.json', import.meta.url), 'utf8'));

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
const page = await browser.newPage({ viewport:{ width:390, height:820 } });

const errs=[]; const ignore=/ERR_CONNECTION|ERR_TUNNEL|esm\.sh|supabase|fonts\.g|Failed to load resource/;
page.on('pageerror', e=>errs.push('PAGEERR '+e.message));
page.on('console', m=>{ if(m.type()==='error' && !ignore.test(m.text())) errs.push('CONSOLE '+m.text()); });

let pass=0, fail=0; const fails=[];
const ok=(n,c)=>{ if(c) pass++; else { fail++; fails.push(n); } console.log((c?'✓':'✗')+' '+n); };
const wait=ms=>page.waitForTimeout(ms);
const seed=async d=>{ await page.evaluate(x=>localStorage.setItem('gymlog_v1', JSON.stringify(x)), d); await page.reload(); await wait(400); };
// Fül-váltás megbízhatóan: bezár minden lebegő réteget, majd közvetlenül renderel.
const nav=async t=>{ await page.evaluate(()=>{['modal','sheet'].forEach(id=>{const el=document.getElementById(id); if(el) el.classList.remove('on');});});
  await page.evaluate(x=>{ tab=x; render(); if(x==='friends'&&window.refreshFriends) refreshFriends(); }, t); await wait(250); };

// A vágólapos beillesztéshez engedély kell (az egykoppintásos import útja).
try{ await page.context().grantPermissions(['clipboard-read','clipboard-write'], {origin:BASE}); }catch(e){}
await page.goto(BASE+'/index.html'); await wait(300);
await seed(backup);

// ---- 1. Betöltés / főoldal ----
ok('1 app betölt (storeMode)', await page.evaluate(()=>storeMode==='local' || storeMode==='claude'));
ok('1 standards mód (nincs quirks)', await page.evaluate(()=>document.compatMode==='CSS1Compat'));
ok('1 lang=hu', await page.evaluate(()=>document.documentElement.lang==='hu'));
// A dekoratív „Melyik nap jön?" fejléc kikerült; a főoldal a készenlét-
// kártyával és a startolható napokkal kezd, fölötte a rövid összegzővel.
ok('1 nincs dekoratív főoldal-fejléc', await page.evaluate(()=>{
  const t=document.getElementById('app').textContent;
  return !/Melyik nap jön/.test(t) && !/Tervek és edzések kezelése/.test(t) && !/Gyógytorna \/ mobilitás ›/.test(t); }));
ok('1 az összegző sor megmaradt', await page.evaluate(()=>/edzés összesen/.test(document.getElementById('app').textContent)));
ok('1 a Tervek és a gyógytorna továbbra is elérhető', await page.evaluate(()=>
  !!document.querySelector('#physioBtn') && !!document.querySelector('nav button[data-tab="plans"], [data-tab="plans"]')));
ok('1 nap-kártyák láthatók', (await page.$$('.daybtn')).length>=4);
ok('1 suggestDay napot ajánl', await page.evaluate(()=>{ const s=suggestDay(); return !!(s&&s.dayId)&&Array.isArray(s.covers)&&s.covers.length>0; }));
ok('1 „Mit edzek ma?" kártya', await page.$$eval('#app .eyebrow',es=>es.some(e=>/Mit edzek ma/.test(e.textContent))));

// ---- 2. Téma váltás ----
const t0=await page.evaluate(()=>document.documentElement.getAttribute('data-theme'));
await page.evaluate(()=>toggleTheme && toggleTheme()); await wait(150);
ok('2 téma vált', t0!==await page.evaluate(()=>document.documentElement.getAttribute('data-theme')));
await page.evaluate(()=>toggleTheme && toggleTheme()); await wait(100);

// ---- 3. Edzés indítás + naplózás + eszközök ----
await page.evaluate(()=>{ window.uiConfirm=()=>Promise.resolve(true); window.uiAlert=()=>Promise.resolve(); });
await page.evaluate(()=>startDay('pa')); await wait(300);
ok('3 lejátszó megnyílt', await page.evaluate(()=>playing===true && !!S.active));
await page.evaluate(()=>{ const e=dayDef(S.active.day).ex.filter(x=>S.active.log[x.id])[0]; cur={id:e.id,i:0}; setRep(8); }); await wait(200);
ok('3 szett rögzült', await page.evaluate(()=>{ const e=dayDef(S.active.day).ex.filter(x=>S.active.log[x.id])[0]; return S.active.log[e.id].sets[0]===8; }));
const wBefore=await page.evaluate(()=>{ const e=dayDef(S.active.day).ex.filter(x=>S.active.log[x.id])[0]; return S.active.log[e.id].w; });
await page.evaluate(()=>{ const e=dayDef(S.active.day).ex.filter(x=>S.active.log[x.id])[0]; bump(e.id,1); }); await wait(150);
ok('3 súlyállítás (+)', await page.evaluate(()=>{ const e=dayDef(S.active.day).ex.filter(x=>S.active.log[x.id])[0]; return S.active.log[e.id].w; })>wBefore);
await page.evaluate(()=>openPlateCalc(100)); await wait(150);
ok('3 tárcsa-kalkulátor', (await page.$$('.plate')).length>0); await page.evaluate(()=>closeSheet());
await page.evaluate(()=>openNoteSheet('day','')); await wait(120);
await page.evaluate(()=>{ document.getElementById('noteTa').value='fáradt'; saveNote('day',''); }); await wait(150);
ok('3 aznapi jegyzet', await page.evaluate(()=>dayNotes(S.active).length===1 && dayNotes(S.active)[0].txt==='fáradt'));
await page.evaluate(()=>{ const e=dayDef(S.active.day).ex.filter(x=>S.active.log[x.id])[0]; setWhy(e.id,'time'); }); await wait(120);
ok('3 eltérés-ok', await page.evaluate(()=>{ const e=dayDef(S.active.day).ex.filter(x=>S.active.log[x.id])[0]; return S.active.log[e.id].why==='time'; }));
await page.evaluate(()=>{ const e=dayDef(S.active.day).ex.filter(x=>S.active.log[x.id])[0]; setProgPolicy(e.id,'linear'); }); await wait(150);
ok('3 progresszió-policy', await page.evaluate(()=>Object.values(S.prog||{}).includes('linear')));
const sessBefore=await page.evaluate(()=>S.sessions.length);
await page.evaluate(()=>finish()); await wait(300);
ok('3 edzés befejezve', await page.evaluate(()=>S.sessions.length)===sessBefore+1);
ok('3 finish után active=null', await page.evaluate(()=>S.active===null));
ok('3 end időbélyeg rögzült', await page.evaluate(()=>{ const s=S.sessions[S.sessions.length-1]; return s.end>s.t; }));
ok('3 összegző izomtérkép', (await page.$$('#sheet .muscmap')).length>0);
await page.evaluate(()=>closeSheet());

// ---- 4. Napló fül + lenyitható izomtérkép ----
await nav('log'); await wait(250);
ok('4 napló renderel', (await page.$$('#app .card')).length>0);
ok('4 heti export gomb', await page.$$eval('#app button',bs=>bs.some(b=>/Heti összefoglaló/.test(b.textContent))));
ok('4 izomtérkép lenyitható (details)', (await page.$$('#app details.mmfold')).length>0);
ok('4 térkép alapból zárva', await page.evaluate(()=>!document.querySelector('#app details.mmfold').open));
const sB=await page.evaluate(()=>S.sessions.length);
await page.evaluate(()=>del(0)); await wait(250);
ok('4 törlés csökkent', await page.evaluate(()=>S.sessions.length)===sB-1);
ok('4 tombstone létrejött', await page.evaluate(()=>(S.deleted||[]).length>0));

// ---- 5. Haladás fül: statisztikák + izomtérkép segédfüggvények ----
await nav('prog'); await wait(300);
ok('5 statok', (await page.$$('#app .statgrid .stat')).length===4);
ok('5 heatmap', (await page.$$('.hmcell')).length>0);
ok('5 havi aktivitás kártya', await page.$$eval('#app .eyebrow',es=>es.some(e=>/Havi aktivitás/.test(e.textContent))));
ok('5 monthlyCounts 6 hónap', await page.evaluate(()=>monthlyCounts(6).length===6));
ok('5 mostImproved tömb', await page.evaluate(()=>Array.isArray(mostImproved(3))));
ok('5 whyBreakdown total szám', await page.evaluate(()=>typeof whyBreakdown().total==='number'));
ok('5 sessionMgSets nem üres', await page.evaluate(()=>Object.keys(sessionMgSets(S.sessions[0])).length>0));
ok('5 muscleMap SVG-t ad', await page.evaluate(()=>muscleMap(sessionMgSets(S.sessions[0])).startsWith('<svg')));
ok('5 mmAttr color-mix a terheltre', await page.evaluate(()=>mmAttr('mell',{mell:8}).includes('color-mix')));
ok('5 mmAttr sziluett a nem-terheltre', await page.evaluate(()=>mmAttr('mell',{}).includes('currentColor')));
ok('5 weeklyMgSets map', await page.evaluate(()=>typeof weeklyMgSets()==='object'));
ok('5 LIB bővült, nincs dup/ütközés', await page.evaluate(()=>{
  const ids=LIB_ARR.map(e=>e.id), dup=ids.filter((x,i)=>ids.indexOf(x)!==i);
  const planIds=[]; PLAN.forEach(d=>d.ex.forEach(e=>planIds.push(e.id)));
  const clash=ids.filter(x=>planIds.includes(x)||ARCHIVE[x]);
  const badMg=LIB_ARR.filter(e=>!MGS.includes(e.mg));
  return dup.length===0 && clash.length===0 && badMg.length===0
    && !!LIB['x_ropepush'] && !!LIB['x_trapbar'] && !!LIB['x_crunch'] && Object.keys(LIB).length>=160; }));
ok('5 fmtDur formátum', await page.evaluate(()=>fmtDur(70*60000).includes('ó')));
ok('5 videoUrl kereső-fallback + override', await page.evaluate(()=>{
  const s=videoUrl(exDef('x_squat')); VIDEO['x_squat']='https://youtu.be/x'; const o=videoUrl(exDef('x_squat')); delete VIDEO['x_squat'];
  return s.startsWith('https://www.youtube.com/results?search_query=') && o==='https://youtu.be/x'; }));
ok('5 warmupSets lépcsők', await page.evaluate(()=>{ const w=warmupSets(60,20); return w.length>=3 && w[0].w<60; }));
ok('5 warmupSets rúd alatt üres', await page.evaluate(()=>warmupSets(20,20).length===0));
await page.evaluate(()=>openWarmup('bench')); await wait(150);
ok('5 bemelegítő lap renderel', (await page.$$('#sheet .wrow')).length>0);
await page.evaluate(()=>closeSheet()); await wait(120);
// idő-alapú gyakorlat (plank) → beépített óra
ok('5 fmtSec formátum', await page.evaluate(()=>fmtSec(90)==='1:30' && fmtSec(45)==='45'));
await page.evaluate(()=>{ S.active={day:'pb',t:Date.now(),log:{plank:{w:0,sets:[null,null,null]}}}; openSet('plank',0); }); await wait(150);
ok('5 idő-gyakorlat órát nyit', await page.evaluate(()=>!!document.getElementById('stVal') && document.getElementById('stBtn').textContent==='Indítás'));
ok('5 óra a tartott időt rögzíti', await page.evaluate(()=>{ cur={id:'plank',i:0}; finishTimerSet(30); return S.active.log.plank.sets[0]===30; }));
await page.evaluate(()=>{ stopTimer(); S.active=null; playing=false; closeSheet(); render(); }); await wait(150);
await page.$$eval('.pcard',els=>els[0] && els[0].click()); await wait(250);
ok('5 gyakorlat-részletlap', (await page.$$('.seg button')).length>=2);
await page.evaluate(()=>closeSheet());

// ---- 6. Tervek + összeállító + superset ----
await nav('plans'); await wait(250);
ok('6 tervek fül', (await page.$eval('#app h1',e=>e.textContent)).includes('Tervek'));
await page.evaluate(()=>openBuilder()); await wait(200);
ok('6 összeállító megnyílt', await page.evaluate(()=>editing==='routine'));
await page.evaluate(()=>{ draft.name='SS teszt'; draft.ex=['bench','row','ohp']; draftToggleLink('row'); render(); }); await wait(150);
ok('6 superset link kapcsoló aktív', (await page.$$('.sslink.on')).length>0);
await page.evaluate(()=>saveDraft()); await wait(200);
ok('6 új edzés (ssLinks) mentve', await page.evaluate(()=>{ const r=S.routines.find(x=>x.name==='SS teszt'); return r && JSON.stringify(r.ssLinks)===JSON.stringify(['row']); }));
ok('6 deriveGroups kör', await page.evaluate(()=>JSON.stringify(deriveGroups(['bench','row','ohp'],['row']))===JSON.stringify([['bench','row']])));
// superset lejátszó viselkedés
const rid=await page.evaluate(()=>S.routines.find(x=>x.name==='SS teszt').id);
await page.evaluate(id=>startDay(id), rid); await wait(300);
ok('6 startDay active.ss', await page.evaluate(()=>JSON.stringify(S.active.ss)===JSON.stringify([['bench','row']])));
await page.evaluate(()=>{ cur={id:'bench',i:0}; setRep(8); }); await wait(200);
ok('6 setRep superset: ugrás a párra', await page.evaluate(()=>{ const exs=dayDef(S.active.day).ex.filter(x=>S.active.log[x.id]); return exs[curEx].id==='row'; }));
ok('6 setRep superset: rövid váltás-pihenő', await page.evaluate(()=>tLen<=20));
await page.evaluate(()=>{ cur={id:'row',i:0}; setRep(8); }); await wait(200);
ok('6 setRep kör vége: teljes pihenő', await page.evaluate(()=>tLen===exDef('row').rest));
ok('6 setRep kör vége: vissza az elsőre', await page.evaluate(()=>{ const exs=dayDef(S.active.day).ex.filter(x=>S.active.log[x.id]); return exs[curEx].id==='bench'; }));
await page.evaluate(()=>discardActive()); await wait(200);
await nav('plans'); await wait(200);
await page.evaluate(()=>{ const r=S.routines.find(x=>x.name==='SS teszt'); deleteRoutine(r.id); }); await wait(250);
ok('6 edzés törlése (tombstone)', await page.evaluate(()=>!S.routines.some(r=>r.name==='SS teszt') && (S.deleted||[]).length>0));

// ---- 7. Barátok fül (nincs felhő) ----
await nav('friends'); await wait(250);
ok('7 barátok fül renderel', (await page.$$('#app')).length>0);

// ---- 8. Sérülés-mód ----
await page.evaluate(()=>openInjury && openInjury()); await wait(150);
ok('8 sérülés-mód lap', await page.evaluate(()=>document.getElementById('sheet').classList.contains('on'))); await page.evaluate(()=>closeSheet());

// ---- 9. Gyógytorna / mobilitás oldal ----
await page.evaluate(()=>openPhysio()); await wait(200);
ok('9 gyógytorna oldal renderel', await page.evaluate(()=>tab==='physio' && document.querySelectorAll('#app .whyc').length>=6 && document.getElementById('app').textContent.includes('nem orvosi tanács')));
await page.evaluate(()=>setPhysioRegion('knee')); await wait(150);
ok('9 testtáj-váltás (térd)', await page.evaluate(()=>physioRegion==='knee'));
const cxB=await page.evaluate(()=>Object.keys(S.customEx||{}).length);
await page.evaluate(()=>addRehabAsCustom('core','rh_plank2')); await wait(150);
ok('9 felvétel gyakorlatként → customEx', await page.evaluate(()=>Object.keys(S.customEx||{}).length)===cxB+1);
ok('9 az új customEx time-alapú', await page.evaluate(()=>{ const k=Object.keys(S.customEx); return !!S.customEx[k[k.length-1]].time; }));
// 5 perces mobilitás rutin: indul, physio nap, finish NEM naplóz
await page.evaluate(()=>{ window.uiConfirm=()=>Promise.resolve(true); startPhysioRoutine('shoulder'); }); await wait(250);
ok('9 mobilitás rutin indul (physio nap)', await page.evaluate(()=>playing && S.active && S.active.day==='physio_shoulder' && Object.keys(S.active.log).length===5 && (dayDef(S.active.day)||{}).physio));
ok('9 physio módban nincs súlyállító', await page.evaluate(()=>!document.querySelector('.player .wt')));
const physSessB=await page.evaluate(()=>S.sessions.length);
await page.evaluate(()=>finish()); await wait(200);
ok('9 finish NEM naplóz (nem edzés)', await page.evaluate(()=>S.active===null && S.sessions.length)===physSessB);
ok('9 appbar gyógytorna-gomb', await page.evaluate(()=>!!document.querySelector('#physioBtn')));
// Időzítő-értesítés: alapból ki, engedély nélkül a timerNotif biztonságos no-op
ok('9 értesítés alapból ki + biztonságos', await page.evaluate(async ()=>{ const off=!notifyEnabled(); let threw=false; try{ await timerNotif('x','y','rest',true); await clearNotif('rest'); }catch(e){ threw=true; } return off && !threw; }));

// 10. Napi testsúly-napló
await page.evaluate(()=>{ tab='home'; render(); });
ok('10 testsúly kártya a főoldalon', await page.evaluate(()=>document.getElementById('app').textContent.includes('testsúly')||document.getElementById('app').textContent.includes('Testsúly')));
ok('10 rögzítés ma + mentés', await page.evaluate(()=>{ openBwSheet(); const start=bwDraft; bwStep(0.5); bwStep(0.5); bwSave();
  const k=bwKey(Date.now()); return Math.abs(S.bw[k]-(start+1))<0.001; }));
ok('10 felülírás nem szaporít napot', await page.evaluate(()=>{ const n1=Object.keys(S.bw).length; openBwSheet(); bwStep(-0.3); bwSave(); return Object.keys(S.bw).length===n1; }));
ok('10 bw a mentett JSON-ban', await page.evaluate(async ()=>{ const raw=await readKey('gymlog_v1'); return raw.includes('"bw"'); }));

// 11. Alvás-napló + Health-híd
await page.evaluate(()=>{ tab='home'; render(); });
ok('11 alvás kártya a főoldalon', await page.evaluate(()=>document.getElementById('app').textContent.includes('Alvás')));
ok('11 Health web-en inert (nincs dobás)', await page.evaluate(()=>!!window.Health && Health.available()===false));
ok('11 rögzítés + minőség + mentés', await page.evaluate(()=>{ openSleepSheet(); slpStep(60); slpSetQ(4); slpSave();
  const k=bwKey(Date.now()); return S.sleep[k] && S.sleep[k].min>0 && S.sleep[k].q===4; }));
ok('11 slpFmt formázás', await page.evaluate(()=>slpFmt(465)==='7ó 45p' && slpFmt(480)==='8ó'));
ok('11 sleep a mentett JSON-ban', await page.evaluate(async ()=>{ const raw=await readKey('gymlog_v1'); return raw.includes('"sleep"'); }));

// 12. AI-terv import
ok('12 parser: napok + gyakorlatok', await page.evaluate(()=>{ const d=aiParsePlan('NAP: Teszt A\n- Fekvenyomás | 4x5 | 70 | 180\n- Kamugyakorlat XY | 3x10 | 20'); return d.length===1 && d[0].ex.length===2 && d[0].ex[0].s===4 && d[0].ex[0].w===70; }));
ok('12 párosítás meglévő ID-re', await page.evaluate(()=>{ const m=aiMatchEx('Fekvenyomás'); return !!m && m.id==='bench'; }));
ok('12 ismeretlen nem párosít', await page.evaluate(()=>aiMatchEx('Zzz qwerty kamu')===null));
ok('12 testsúly-jelölés', await page.evaluate(()=>{ const d=aiParsePlan('- Húzódzkodás | 4x8 | testsúly'); return d[0].ex[0].bw===1 && d[0].ex[0].w===0; }));
ok('12 személyre szabott prompt (formátum + kontextus)', await page.evaluate(()=>{
  S.weights=Object.assign({},S.weights,{bench:80}); if(!S.bw)S.bw={}; S.bw[bwKey(Date.now())]=78;
  const p=buildAiPrompt();
  return p.includes('NAP:') && p.includes('| <pihenő') && p.includes('Rólam') && (p.includes('munkasúlyok')||p.includes('Testsúly')); }));
ok('12 import: routine + customEx (meglévő ID újrahasznál)', await page.evaluate(()=>{
  const before=(S.routines||[]).length, bcx=Object.keys(S.customEx||{}).length;
  aiResolved=[{name:'Teszt A', ex:[
    {parsed:{name:'Fekvenyomás',s:4,r:'5',w:70,bw:0,rest:180,hasW:true}, match:aiMatchEx('Fekvenyomás')},
    {parsed:{name:'Zzz Kamu',s:3,r:'10',w:20,bw:0,rest:90,hasW:true}, match:null}]}];
  aiImportApply(); if(typeof _closeModal==='function') _closeModal(false);
  const r=S.routines[S.routines.length-1];
  return S.routines.length===before+1 && Object.keys(S.customEx).length===bcx+1 && r.ex[0]==='bench' && String(r.ex[1]).indexOf('cx_')===0;
}));

// 13. Technika-animációk (GIF)
ok('13 GIFX térkép + minden PLAN gyakorlatnak van ábrája', await page.evaluate(()=>{
  const ids=[...new Set(PLAN.flatMap(d=>d.ex.map(e=>e.id)))];
  return typeof GIFX==='object' && Object.keys(GIFX).length>100 && ids.every(id=>!!GIFX[id]); }));
ok('13 gifUrl relatív útvonal / ismeretlenre null', await page.evaluate(()=>
  gifUrl(exDef('bench'))==='gif/'+GIFX.bench+'.gif' && gifUrl({id:'nincs_ilyen'})===null));
ok('13 gifBox forrásmegjelöléssel', await page.evaluate(()=>{
  const h=gifBox(exDef('bench')); return h.includes('gymvisual.com') && h.includes('loading="lazy"') && gifBox({id:'nincs_ilyen'})===''; }));
ok('13 jegyzet-lapon megjelenik az ábra', await page.evaluate(async ()=>{
  openNoteSheet('ex','bench'); const im=document.querySelector('#sheetIn .exgif img');
  const okk=!!im && im.getAttribute('src').startsWith('gif/'); closeSheet(); return okk; }));
ok('13 a GIF-fájl tényleg letölthető', await page.evaluate(async ()=>{
  const r=await fetch(gifUrl(exDef('bench'))); return r.ok && (r.headers.get('content-type')||'').includes('gif'); }));
ok('13 választóban bélyegkép (lusta)', await page.evaluate(()=>{
  draft={id:null,name:'t',ex:[],ssLinks:[]}; openExPicker();
  const th=document.querySelectorAll('#pickerRows .exgift');
  const okk=th.length>50 && th[0].getAttribute('loading')==='lazy'
    && document.getElementById('sheetIn').textContent.includes('Gym visual');
  closeSheet(); return okk; }));
ok('13 a GIF-ek NEM az app-héj része (offline-könnyű)', await page.evaluate(async ()=>{
  const t=await (await fetch('sw.js')).text(); const m=t.match(/APP_SHELL\s*=\s*\[[^\]]*\]/);
  return !!m && !/gif\//.test(m[0]); }));

// 14. Kézi ismétlés-megadás (a rács tartományán kívüli szám)
await page.evaluate(()=>{ if(!S.active) startDay('pa'); }); await wait(300);
const manEx = await page.evaluate(()=>{ const e=dayDef(S.active.day).ex.filter(x=>S.active.log[x.id])[0]; openSet(e.id,0); return e.id; }); await wait(200);
ok('14 a lapon van kézi mező + Rögzítés', await page.evaluate(()=>{
  const el=document.getElementById('repMan');
  return !!el && el.getAttribute('inputmode')==='numeric' && /Rögzítés/.test(document.getElementById('sheetIn').textContent); }));
ok('14 tartományon kívüli szám rögzül', await page.evaluate(id=>{
  document.getElementById('repMan').value='27'; setRepManual(); return S.active.log[id].sets[0]; }, manEx)===27);
await page.evaluate(id=>openSet(id,1), manEx); await wait(200);
ok('14 nulla is rögzíthető (nem „nincs rögzítve")', await page.evaluate(id=>{
  document.getElementById('repMan').value='0'; setRepManual(); return S.active.log[id].sets[1]===0; }, manEx));
await page.evaluate(id=>openSet(id,2), manEx); await wait(200);
ok('14 érvénytelen érték nem rögzít, a lap nyitva marad', await page.evaluate(id=>{
  document.getElementById('repMan').value='1500'; setRepManual();
  return S.active.log[id].sets[2]===null && document.getElementById('sheet').classList.contains('on'); }, manEx));
ok('14 üres mező sem rögzít', await page.evaluate(id=>{
  document.getElementById('repMan').value=''; setRepManual(); return S.active.log[id].sets[2]===null; }, manEx));
await page.evaluate(()=>closeSheet());
ok('14 idő-alapú gyakorlatnál is van kézi mező', await page.evaluate(()=>{
  const h=repKbSheet({id:'plank',n:'Plank',r:'45 mp',time:1},0,45);
  return h.includes('id="repMan"') && h.includes('mp'); }));

// 15. Készenlét (readiness)
ok('15 üres naplónál NINCS kitalált szám', await page.evaluate(()=>{
  const bak={s:S.sessions,b:S.bw,sl:S.sleep};
  S.sessions=[]; S.bw={}; S.sleep={}; rdyInvalidate();
  const r=readiness(), card=rdyHomeCard();
  S.sessions=bak.s; S.bw=bak.b; S.sleep=bak.sl; rdyInvalidate();
  return r===null && card===''; }));
// Dús adat: 21 nap alvás + testsúly a meglévő edzések mellé
await page.evaluate(()=>{
  const D=864e5, now=Date.now();
  const k=t=>bwKey(t);
  // A naplót a MAI naphoz igazítjuk: a mentés dátumai fixek, enélkül a teszt
  // a fali órától függne (idővel kiürülne a terhelés-ablak, és a readiness
  // jogosan null-t adna).
  S.sessions.sort((a,b)=>a.t-b.t).forEach((x,i,arr)=>{ x.t = now-(arr.length-1-i)*3*D; });
  S.bw={}; S.sleep={};
  for(let i=20;i>=0;i--){ const t=now-i*D;
    S.bw[k(t)]=Math.round((78.2+Math.sin(i/3)*0.3)*10)/10;
    S.sleep[k(t)]={min: i===0?450:410+Math.round(Math.sin(i/2)*30), q:4}; }
  rdyInvalidate();
});
ok('15 van pontszám és 0..100 közé esik', await page.evaluate(()=>{ const r=readiness();
  return !!r && Number.isInteger(r.score) && r.score>=0 && r.score<=100; }));
ok('15 a pontszám = alap + a bekapcsolt tényezők összege', await page.evaluate(()=>{ const r=readiness();
  const sum=r.factors.filter(f=>f.on&&f.ok).reduce((a,f)=>a+f.delta,0);
  return r.score===Math.max(0,Math.min(100,RDY_BASE+sum)); }));
ok('15 a kikapcsolt tényező nem számít bele', await page.evaluate(()=>{
  const a=readiness().score; rdyToggle('sleep'); const b=readiness().score;
  const sl=readiness().factors.find(f=>f.id==='sleep');
  rdyToggle('sleep'); rdyInvalidate();
  return sl.on===false && (sl.delta===0 ? a===b : a!==b); }));
ok('15 a kapcsoló a naplóadatot nem érinti', await page.evaluate(async ()=>{
  const before=JSON.stringify(S.sessions); rdyToggle('rest'); rdyToggle('rest');
  return JSON.stringify(S.sessions)===before && S.rdy && typeof S.rdy==='object'; }));
ok('15 rdy a mentett JSON-ban', await page.evaluate(async ()=>{ const raw=await readKey('gymlog_v1'); return raw.includes('"rdy"'); }));
ok('15 múltbeli napra is számol (napló/grafikon)', await page.evaluate(()=>{
  const h=rdyHistory(14); return h.length===14 && h.filter(x=>x.v!=null).length>=3; }));
ok('15 a jövőbeli adat nem szivárog vissza', await page.evaluate(()=>{
  // egy régi napra a MAI alvás nem számíthat bele
  const old=Date.now()-40*864e5; const r=readiness(old);
  const sl=r? r.factors.find(f=>f.id==='sleep') : null;
  return !r || !sl.ok; }));
// A ma rögzített érték akkor is látszik, ha még nem tud pontozni – „nincs
// adat" hazugság volna, ha épp most vitte be.
ok('15 a ma rögzített érték látszik, akkor is, ha még nem pontoz', await page.evaluate(()=>{
  const bak={b:S.bw, sl:S.sleep};
  const k=bwKey(Date.now());
  S.bw={[k]:78.4}; S.sleep={[k]:{min:440,q:4}}; rdyInvalidate();
  const r=readiness();
  if(!r){ S.bw=bak.b; S.sleep=bak.sl; rdyInvalidate(); return false; }
  const sl=r.factors.find(f=>f.id==='sleep'), bw=r.factors.find(f=>f.id==='bw');
  const good = !sl.ok && sl.val==='7ó 20p' && /alapvonalad/.test(sl.why)
            && !bw.ok && bw.val==='78,4 kg' && /mérés kell/.test(bw.why)
            && !/nincs adat/i.test(rdyHomeCard());
  S.bw=bak.b; S.sleep=bak.sl; rdyInvalidate();
  return good; }));
ok('15 a nem pontozó tényező deltája 0 (a szám nem torzul)', await page.evaluate(()=>{
  const bak={b:S.bw, sl:S.sleep};
  const k=bwKey(Date.now());
  S.bw={[k]:78.4}; S.sleep={[k]:{min:440,q:4}}; rdyInvalidate();
  const r=readiness();
  const good = r.factors.filter(f=>!f.ok).every(f=>f.delta===0);
  S.bw=bak.b; S.sleep=bak.sl; rdyInvalidate();
  return good; }));
ok('15 sávok: 82 jó / 70 közepes / 50 alacsony', await page.evaluate(()=>
  rdyBand(82).band==='jo' && rdyBand(70).band==='kozep' && rdyBand(50).band==='alacsony'));
// A 14. szekció aktív edzést hagyott futni – a lejátszó elfedné a füleket.
await page.evaluate(()=>{ S.active=null; playing=false; closeSheet(); tab='home'; render(); }); await wait(300);
ok('15 főoldali kártya + gyűrű', await page.evaluate(()=>{
  const c=document.querySelector('#app .rdycard');
  return !!c && !!c.querySelector('.rdyring .rdy-fg') && c.textContent.includes('készenlét'); }));
await page.evaluate(()=>openRdySheet()); await wait(250);
ok('15 részletek-lap: tényezőnkénti hozzájárulás + kapcsolók', await page.evaluate(()=>{
  const t=document.getElementById('sheetIn').textContent;
  return t.includes('Miből jön') && t.includes('Mi számítson bele') && t.includes('SAJÁT'); }));
await page.evaluate(()=>closeSheet());
await nav('prog'); await wait(250);
ok('15 Haladás: készenlét-trend', await page.evaluate(()=>
  document.getElementById('app').textContent.includes('Készenlét · 30 nap')));
await nav('log'); await wait(250);
ok('15 Napló: pihenőnap sor + készenlét', await page.evaluate(()=>{
  const t=document.getElementById('app').textContent;
  return t.includes('Pihenő') && t.includes('készenlét'); }));
ok('15 Napló szűrő: csak edzés / csak pihenő', await page.evaluate(()=>{
  setLogKind('rest'); const only=document.getElementById('app').textContent;
  setLogKind('ex');   const ex=document.getElementById('app').textContent;
  setLogKind(null);
  return !only.includes('szett ·') && ex.includes('szett'); }));
await page.evaluate(()=>{ window.uiConfirm=()=>Promise.resolve(true); startDay('pa'); }); await wait(300);
ok('15 lejátszó: készenlét-sáv (csak tanács, a súlyt nem állítja)', await page.evaluate(()=>{
  const st=document.querySelector('.player .rdystrip');
  const e=dayDef(S.active.day).ex.filter(x=>S.active.log[x.id])[0];
  const w=S.active.log[e.id].w; render();
  return !!st && S.active.log[e.id].w===w; }));
await page.evaluate(()=>{ S.active=null; playing=false; tab='home'; render(); }); await wait(200);

// 16. Jegyzet: alapból az éppen mutatott gyakorlathoz
await page.evaluate(()=>{ S.active=null; playing=false; try{localStorage.removeItem('gymlog_noteday')}catch(e){}
  window.uiConfirm=()=>Promise.resolve(true); tab='home'; render(); startDay('pa'); }); await wait(400);
await page.evaluate(()=>exNav(1)); await wait(200);
ok('16 alapból a gyakorlathoz köt (nem a naphoz)', await page.evaluate(()=>{
  openPlayerNote();
  const t=document.getElementById('sheetIn').textContent;
  return noteDayMode()===false && /Gyakorlat-jegyzet/.test(t) && t.includes(exDef(playerExId()).n); }));
ok('16 a lapon ott a kapcsoló', await page.evaluate(()=>
  document.querySelectorAll('#sheetIn .seg button').length===2));
ok('16 a jegyzet az AKTUÁLIS gyakorlathoz mentődik', await page.evaluate(()=>{
  const id=playerExId(); openPlayerNote();
  document.getElementById('noteTa').value='pad 30 fok'; saveNote('ex',id);
  return S.notes[id]==='pad 30 fok' && !(S.active&&S.active.note); }));
ok('16 átváltás a mai napra, és megjegyzi', await page.evaluate(()=>{
  openPlayerNote(); setNoteMode(true);
  const t=document.getElementById('sheetIn').textContent;
  return noteDayMode()===true && /Nap jegyzete/.test(t); }));
ok('16 a váltás nem nyeli le a begépelt szöveget', await page.evaluate(()=>{
  // vissza gyakorlat-módba, gépelünk, majd váltunk – a szöveg új napi bejegyzés lesz
  setNoteMode(false); openPlayerNote();
  const id=playerExId(); const volt=S.notes[id];
  document.getElementById('noteTa').value='ezt még nem mentettem';
  setNoteMode(true);
  const l=dayNotes(S.active);
  const atment = l.length>0 && l[l.length-1].txt==='ezt még nem mentettem' && l[l.length-1].ex===id;
  delete S.active.dayNotes; delete S.active.note; delete S.active.noteEx;
  S.notes[id]=volt; setNoteMode(false);
  return atment; }));
ok('16 meglévő jegyzetet a váltás soha nem ír felül', await page.evaluate(()=>{
  const id=playerExId(); S.notes[id]='EREDETI';
  delete S.active.dayNotes; S.active.note='NAPI';
  try{localStorage.setItem('gymlog_noteday','1')}catch(e){}
  openPlayerNote(); document.getElementById('noteTa').value='új szöveg'; setNoteMode(false);
  const l=dayNotes(S.active);
  const ok2 = S.notes[id]==='EREDETI' && l.length===1 && l[0].txt==='NAPI';
  delete S.active.note; delete S.active.noteEx; delete S.active.dayNotes; delete S.notes[id];
  try{localStorage.removeItem('gymlog_noteday')}catch(e){}
  return ok2; }));
// A napi jegyzet megjegyzi, MELYIK gyakorlatnál írtad.
ok('16 a napi jegyzet bélyeget kap az aktuális gyakorlatról', await page.evaluate(()=>{
  delete S.active.note; delete S.active.noteEx; delete S.active.dayNotes;
  exNav(3); const itt=playerExId();
  openPlayerNote(); setNoteMode(true);
  const elo=document.getElementById('sheetIn').textContent.includes(exDef(itt).n);  // mentés ELŐTT is látszik
  document.getElementById('noteTa').value='bal váll kicsit húz'; saveNote('day','');
  const l=dayNotes(S.active);
  return elo && l.length===1 && l[0].ex===itt && l[0].txt==='bal váll kicsit húz'; }));
// EZ a lényeg: a másik gyakorlatnál írt jegyzet ÚJ bejegyzés, saját bélyeggel –
// nem írja felül az elsőt és nem örökli annak gyakorlatát.
ok('16 másik gyakorlatnál írva ÚJ bejegyzés lesz, saját bélyeggel', await page.evaluate(()=>{
  const elso=dayNotes(S.active)[0]; exNav(5); const masik=playerExId();
  openPlayerNote(); document.getElementById('noteTa').value='a gép 4-es lyukon jó'; saveNote('day','');
  const l=dayNotes(S.active);
  return l.length===2 && l[0].ex===elso.ex && l[0].txt===elso.txt
      && l[1].ex===masik && l[1].txt==='a gép 4-es lyukon jó' && masik!==elso.ex; }));
ok('16 bejegyzés szerkeszthető (a bélyege marad)', await page.evaluate(()=>{
  const cel=dayNotes(S.active)[0];
  dayNoteStartEdit(cel.t);
  document.getElementById('noteTa').value='bal váll NAGYON húz'; saveNote('day','');
  const l=dayNotes(S.active);
  return l.length===2 && l[0].t===cel.t && l[0].ex===cel.ex && l[0].txt==='bal váll NAGYON húz'; }));
ok('16 bejegyzés törölhető, a többi marad', await page.evaluate(()=>{
  const cel=dayNotes(S.active)[0]; dayNoteDelete(cel.t); closeSheet();
  const l=dayNotes(S.active);
  return l.length===1 && l[0].txt==='a gép 4-es lyukon jó'; }));
ok('16 az utolsó bejegyzés törlésével a napi jegyzet is eltűnik', await page.evaluate(()=>{
  dayNoteDelete(dayNotes(S.active)[0].t); closeSheet();
  return dayNotes(S.active).length===0 && S.active.note===undefined && S.active.noteEx===undefined; }));
ok('16 a napló minden bejegyzést a saját gyakorlatához ír ki', await page.evaluate(()=>{
  const fake={t:Date.now(),day:'pa',log:{bench:{w:60,sets:[5,5,5]}},dayNotes:[
    {t:Date.now(),ex:'ohpdb',txt:'fáradt'},{t:Date.now()+1,ex:'bench',txt:'kisebb fogás'}]};
  S.sessions.push(fake); const h=logView(); S.sessions.pop();
  return h.includes('Vállból nyomás ülve') && h.includes('fáradt')
      && h.includes('Fekvenyomás') && h.includes('kisebb fogás'); }));
ok('16 a napló kiírja, melyik gyakorlatnál íródott (régi alak)', await page.evaluate(()=>{
  const fake={t:Date.now(),day:'pa',log:{bench:{w:60,sets:[5,5,5]}},note:'fáradt',noteEx:'ohpdb'};
  S.sessions.push(fake); const h=logView(); S.sessions.pop();
  return h.includes('Vállból nyomás ülve') && h.includes('közben') && h.includes('fáradt'); }));
ok('16 bélyeg nélküli régi jegyzet is rendben jelenik meg', await page.evaluate(()=>{
  const fake={t:Date.now(),day:'pa',log:{bench:{w:60,sets:[5,5,5]}},note:'régi jegyzet'};
  S.sessions.push(fake); const h=logView().replace(/<[^>]*>/g,''); S.sessions.pop();
  return h.includes('Jegyzet: régi jegyzet') && !/közben/.test(h.split('régi jegyzet')[0].slice(-80)); }));
ok('16 a lejátszón kívül nincs kapcsoló', await page.evaluate(()=>{
  openNoteSheet('ex','bench');
  const n=document.querySelectorAll('#sheetIn .seg button').length; closeSheet(); return n===0; }));
await page.evaluate(()=>{ S.active=null; playing=false; closeSheet(); tab='home'; render(); }); await wait(200);

// 17. Heti összefoglaló edzőnek: AZ AKTUÁLIS NAPTÁRI HÉT, nem gördülő 7 nap
ok('17 a múlt heti edzés kimarad, akkor is, ha 7 napon belüli', await page.evaluate(()=>{
  const bak=S.sessions, ws=weekStart(Date.now());
  S.sessions=[
    {t:ws-12*36e5, day:'pa', log:{bench:{w:60,sets:[5,5,5]}}, note:'MULTHETI'},  // vasárnap este
    {t:ws+2*36e5,  day:'la', log:{pull:{w:0,sets:[8,8,8]}},   note:'EHETI'}      // hétfő reggel
  ];
  const t=weeklyReport(); S.sessions=bak;
  return t.includes('EHETI') && !t.includes('MULTHETI') && /heti összefoglaló/.test(t); }));
ok('17 a fejléc a hét kezdetétől máig szól', await page.evaluate(()=>{
  const bak=S.sessions, ws=weekStart(Date.now());
  S.sessions=[{t:ws+2*36e5, day:'pa', log:{bench:{w:60,sets:[5,5,5]}}}];
  const t=weeklyReport().split('\n')[0]; S.sessions=bak;
  return t.includes(fmtDate(ws)) && t.includes(fmtDate(Date.now())) && t.includes('1 edzés'); }));
ok('17 üres héten az utolsó edzésekre esik vissza, és ezt ki is mondja', await page.evaluate(()=>{
  const bak=S.sessions, ws=weekStart(Date.now());
  S.sessions=[{t:ws-3*864e5, day:'pa', log:{bench:{w:60,sets:[5,5,5]}}}];
  const t=weeklyReport(); S.sessions=bak;
  return /utolsó 1 edzés/.test(t) && /ezen a héten még nem volt edzés/.test(t); }));
ok('17 a lap leírása is a hetet ígéri', await page.evaluate(()=>{
  openWeeklyExport(); const t=document.getElementById('sheetIn').textContent; closeSheet();
  return /e heti/.test(t) && !/elmúlt 7 nap/.test(t); }));
// A szettek önmagukban féligazság – az alvás és a testsúly is menjen el.
ok('17 az edzés napján mért alvás és testsúly a napra kerül', await page.evaluate(()=>{
  const bak={s:S.sessions,b:S.bw,sl:S.sleep}, ws=weekStart(Date.now());
  // Az edzés MA legyen (de a héten belül) – különben hétfőn a jövőbe esne.
  const nap=Math.max(ws, Date.now()-36e5), k=bwKey(nap);
  S.sessions=[{t:nap, day:'pa', log:{bench:{w:60,sets:[5,5,5]}}}];
  S.bw={[k]:78.4}; S.sleep={[k]:{min:440,q:4}};
  const t=weeklyReport(); S.sessions=bak.s; S.bw=bak.b; S.sleep=bak.sl;
  const blokk=t.split('—')[2]||'';
  return /alvás: 7ó 20p \(jó\)/.test(blokk) && /testsúly: 78,4 kg/.test(blokk); }));
// Az összesítést KÖZVETLENÜL, rögzített ablakon nézzük – a `weeklyReport`
// ablaka az aktuális naptári hét, így hétfőn nem férne bele három nap, és a
// teszt a fali órától függene.
ok('17 a regeneráció-blokk összesíti az ablak alvását és testsúlyát', await page.evaluate(()=>{
  const bak={b:S.bw,sl:S.sleep};
  const D=864e5, ma=new Date(new Date().setHours(0,0,0,0)).getTime();
  S.bw={}; S.sleep={};
  for(let i=0;i<3;i++){ const k=bwKey(ma-(2-i)*D);
    S.bw[k]=78+i*0.2; S.sleep[k]={min:420+i*30,q:4}; }
  const t=reportRecovery(ma-2*D, Date.now(), true);
  S.bw=bak.b; S.sleep=bak.sl;
  return /Regeneráció \(ezen a héten\)/.test(t)
      && /Alvás: átlag 7ó 30p \/ éj \(3 éjszaka, átlagos minőség 4\/5\)/.test(t)
      && /Testsúly: átlag 78,2 kg/.test(t); }));
ok('17 a testsúly iránya az előző héthez képest is megy', await page.evaluate(()=>{
  const bak={b:S.bw,sl:S.sleep};
  const D=864e5, ma=new Date(new Date().setHours(0,0,0,0)).getTime();
  S.bw={[bwKey(ma)]:79, [bwKey(ma-3*D)]:78}; S.sleep={};
  const t=reportRecovery(ma, Date.now(), true);
  S.bw=bak.b; S.sleep=bak.sl;
  return /\+1,0 kg az előző héthez/.test(t); }));
// 0,05 kg alatt a „+0,0 kg" felirat értelmetlen volna.
ok('17 az elhanyagolható testsúly-eltérést kimondja, nem +0,0-t ír', await page.evaluate(()=>{
  const bak={b:S.bw,sl:S.sleep};
  const D=864e5, ma=new Date(new Date().setHours(0,0,0,0)).getTime();
  S.bw={[bwKey(ma)]:78.02, [bwKey(ma-3*D)]:78}; S.sleep={};
  const t=reportRecovery(ma, Date.now(), true);
  S.bw=bak.b; S.sleep=bak.sl;
  return /változatlan az előző héthez/.test(t) && !/\+0,0 kg/.test(t); }));
ok('17 rögzítés nélkül NEM talál ki adatot', await page.evaluate(()=>{
  const bak={s:S.sessions,b:S.bw,sl:S.sleep}, ws=weekStart(Date.now());
  S.sessions=[{t:Math.max(ws, Date.now()-36e5), day:'pa', log:{bench:{w:60,sets:[5,5,5]}}}];
  S.bw={}; S.sleep={};
  const t=weeklyReport(); S.sessions=bak.s; S.bw=bak.b; S.sleep=bak.sl;
  return !/Regeneráció/.test(t) && !/Alvás:/.test(t) && !/Testsúly:/.test(t); }));
ok('17 csak alvás van: a testsúlyról megmondja, hogy nincs (nem hallgatja el)', await page.evaluate(()=>{
  const bak={b:S.bw,sl:S.sleep};
  const ma=new Date(new Date().setHours(0,0,0,0)).getTime();
  S.bw={}; S.sleep={[bwKey(ma)]:{min:450,q:5}};
  const t=reportRecovery(ma, Date.now(), true);
  S.bw=bak.b; S.sleep=bak.sl;
  return /Alvás: átlag 7ó 30p/.test(t) && /Testsúly: ebben az időszakban nincs rögzítve/.test(t); }));

// 18. Két bejelentett hiba: AI-import láthatósága + fotó/jegyzet törlése
await page.evaluate(()=>{ S.active=null; playing=false; closeSheet(); tab='home'; render(); }); await wait(200);
ok('18 többnapos AI-import AKTÍV tervvé válik (nem tűnik el)', await page.evaluate(async ()=>{
  window.uiAlert=m=>{ window.__a=m; return Promise.resolve(); };
  const terv='NAP: AI Push\n- Fekvenyomás | 4x6 | 60 | 180\nNAP: AI Pull\n- Húzódzkodás | 4x8 | testsúly | 150';
  aiResolved = aiParsePlan(terv).map(d=>({name:d.name, ex:d.ex.map(x=>({parsed:x, match:aiMatchEx(x.name)}))}));
  await aiImportApply();
  const p=S.programs[S.programs.length-1];
  return S.activeProgram===p.id && (activeProg()||{}).name==='AI edzésterv'; }));
ok('18 az importált napok LÁTSZANAK a főoldalon', await page.evaluate(()=>{
  tab='home'; render();
  const t=document.getElementById('app').textContent;
  return /AI Push/.test(t) && /AI Pull/.test(t); }));
ok('18 a régi terv nem veszett el, visszaválasztható', await page.evaluate(()=>
  programsList().some(p=>p.builtin) && /Alapterv/.test(document.getElementById('app').textContent)));
ok('18 fotó törlése síremléket kap', await page.evaluate(async ()=>{
  S.photos={bench:'FOTO'}; S.deleted=[]; await removePhoto('bench');
  return S.photos.bench===undefined && (S.deleted||[]).some(d=>d.k==='photo:bench' && !d.alive); }));
ok('18 a törölt fotó felhő-kör után sem tér vissza', await page.evaluate(async ()=>{
  S.photos={bench:'FOTO'}; S.notes={bench:'JEGYZET'}; S.weights=Object.assign({},S.weights,{bench:80});
  S.deleted=[]; await save();
  const felho=await readKey('gymlog_v1');
  await removePhoto('bench');
  const m=JSON.parse(Auth.mergeGym(await readKey('gymlog_v1'), felho));
  return m.photos.bench===undefined && m.notes.bench==='JEGYZET' && m.weights.bench===80; }));
ok('18 új fotó ugyanoda túléli a régi síremléket', await page.evaluate(async ()=>{
  const felho=await readKey('gymlog_v1');            // ebben a síremlék
  S.photos.bench='UJ'; untomb('photo:bench'); await save();
  const m=JSON.parse(Auth.mergeGym(await readKey('gymlog_v1'), felho));
  return m.photos.bench==='UJ'; }));
ok('18 kiürített gyakorlat-jegyzet sem tér vissza', await page.evaluate(async ()=>{
  S.notes={bench:'valami'}; S.deleted=[]; await save();
  const felho=await readKey('gymlog_v1');
  document.getElementById('sheetIn').innerHTML='<textarea id="noteTa"></textarea>';
  saveNote('ex','bench'); await save();
  const m=JSON.parse(Auth.mergeGym(await readKey('gymlog_v1'), felho));
  return m.notes.bench===undefined; }));

// 19. Az AI-terv ELŐÍRÁSA (szett/ism./pihenő/súly) nem vész el
await page.evaluate(()=>{ S.active=null; playing=false; closeSheet();
  window.uiConfirm=()=>Promise.resolve(false); window.uiAlert=()=>Promise.resolve();
  // friss dátumok, hogy ne a visszaépítés (deload) fusson
  const D=864e5, now=Date.now();
  S.sessions.forEach((s,i)=>{ s.t=now-(S.sessions.length-i)*2*D; });
  tab='home'; render(); }); await wait(300);
const sajat = await page.evaluate(()=>startW('bench'));
ok('19 az előírás a routine-on tárolódik (exOv), az ID-k érintetlenek', await page.evaluate(async ()=>{
  const terv='NAP: AI Push\n- Fekvenyomás | 5x3 | 80 | 240';
  aiResolved=aiParsePlan(terv).map(d=>({name:d.name, ex:d.ex.map(x=>({parsed:x, match:aiMatchEx(x.name)}))}));
  await aiImportApply();
  const r=S.routines[S.routines.length-1]; window.__rid=r.id;
  return r.ex[0]==='bench' && r.exOv && r.exOv.bench.s===5 && r.exOv.bench.r==='3'
      && r.exOv.bench.rest===240 && r.exOv.bench.w===80 && r.at>0; }));
ok('19 a nap az ELŐÍRÁST mutatja, nem a gyakorlat alapértékeit', await page.evaluate(()=>{
  const e=dayDef(window.__rid).ex.find(x=>x.id==='bench');
  return e.s===5 && e.r==='3' && e.rest===240 && e.w===80 && e.ovW===1; }));
ok('19 az első indítás az előírt súllyal indul (nem a saját munkasúllyal)', await page.evaluate(async ()=>{
  await startDay(window.__rid); return S.active.log.bench.w; })===80 && sajat!==80);
await wait(400);   // a render View Transitionön át is fusson le
ok('19 a lejátszó megmondja, hogy ez az edzésterv előírása', await page.evaluate(()=>{
  const pl=document.querySelector('.player');
  return !!pl && /edzésterv előírása/.test(pl.textContent); }));
ok('19 miután leedzed, a SAJÁT haladásod viszi tovább', await page.evaluate(async ()=>{
  const ex=dayDef(S.active.day).ex.filter(x=>S.active.log[x.id]);
  ex.forEach(e=>{ S.active.log[e.id].sets=S.active.log[e.id].sets.map(()=>3); });
  S.active.log.bench.w=82.5; finish(); if(window.closeFinish) closeFinish();
  await new Promise(r=>setTimeout(r,200));
  await startDay(window.__rid);
  const e=dayDef(S.active.day).ex.find(x=>x.id==='bench');
  // a súly már a naplóból jön, a szett/ism./pihenő viszont marad az előírás
  return S.active.log.bench.w>=82.5 && e.s===5 && e.r==='3' && e.rest===240; }));
ok('19 a beépített PLAN napokat nem érinti', await page.evaluate(()=>{
  const e=dayDef('pa').ex.find(x=>x.id==='bench');
  return e.s===4 && e.r==='5' && !e.ovW; }));
// Testsúlyos gyakorlatnál a súly a PLUSZ terhelés – ott is van értelme az
// előírásnak, mindkét irányban.
ok('19 „testsúly" előírás = NINCS plusz teher (nem a régi plusz súlyod)', await page.evaluate(async ()=>{
  S.active=null; playing=false;
  S.weights.pull=7.5;                                     // korábban plusz súllyal húzódzkodtál
  aiResolved=aiParsePlan('NAP: AI Pull\n- Húzódzkodás | 4x8 | testsúly | 150')
    .map(d=>({name:d.name, ex:d.ex.map(x=>({parsed:x, match:aiMatchEx(x.name)}))}));
  await aiImportApply();
  const r=S.routines[S.routines.length-1];
  await startDay(r.id);
  return r.exOv.pull.w===0 && r.exOv.pull.s===4 && r.exOv.pull.rest===150
      && S.active.log.pull.w===0 && wLabel(exDef('pull'),0)==='testsúly'; }));
ok('19 előírt PLUSZ súly testsúlyos gyakorlatra érvényesül', await page.evaluate(async ()=>{
  S.active=null; playing=false;
  aiResolved=aiParsePlan('NAP: AI Pull2\n- Húzódzkodás | 4x6 | 12.5 | 180')
    .map(d=>({name:d.name, ex:d.ex.map(x=>({parsed:x, match:aiMatchEx(x.name)}))}));
  await aiImportApply();
  const r=S.routines[S.routines.length-1];
  await startDay(r.id);
  return r.exOv.pull.w===12.5 && S.active.log.pull.w===12.5; }));
ok('19 percben megadott pihenő másodpercre vált', await page.evaluate(()=>
  aiParseExLine('X | 4x8 | testsúly | 2 perc').rest===120
  && aiParseExLine('X | 4x8 | testsúly | 150').rest===150
  && aiParseExLine('X | 4x8 | testsúly | 90 mp').rest===90
  && aiParseExLine("X | 4x8 | testsúly | 3'").rest===180));
await page.evaluate(()=>{ S.active=null; playing=false; closeSheet(); tab='home'; render(); }); await wait(200);

// 20. Az edzőnek szóló prompt és a parser összhangja
// A legfontosabb: a promptban lévő PÉLDÁT az importőrnek hibátlanul vissza
// kell tudnia olvasnia – így a formátum-blokk és az `aiParsePlan` nem
// csúszhat szét (a CLAUDE.md is ezt köti ki).
ok('20 a prompt saját példája hibátlanul visszaparseolható', await page.evaluate(()=>{
  const pelda=AI_FORMAT_BLOCK.split('Példa:')[1].split('Szabályok:')[0].trim();
  const days=aiParsePlan(pelda);
  if(days.length!==2) return false;
  const all=days.flatMap(d=>d.ex);
  return all.length===5 && all.every(x=>aiMatchEx(x.name));      // mind ismert gyakorlat
}));
ok('20 a példa súlyai/pihenői pontosan jönnek át', await page.evaluate(()=>{
  const pelda=AI_FORMAT_BLOCK.split('Példa:')[1].split('Szabályok:')[0].trim();
  const ex=aiParsePlan(pelda).flatMap(d=>d.ex);
  const fek=ex.find(x=>/Fekvenyomás/.test(x.name));
  const tol=ex.find(x=>/Tolódzkodás/.test(x.name));
  const huz=ex.find(x=>/Húzódzkodás/.test(x.name));
  return fek.w===70 && fek.rest===180 && fek.s===4
      && tol.bw===1 && tol.hasW===false                          // „testsúly"
      && huz.hasW===true && huz.w===10 && huz.rest===180;         // „+10" plusz teher
}));
ok('20 a prompt kimondja a testsúlyos szabályt', await page.evaluate(()=>{
  const t=AI_FORMAT_BLOCK;
  return /PLUSZ terhelést jelenti/.test(t) && /ha nincs plusz teher/.test(t)
      && /Soha ne írd a súly-mezőbe a saját testsúlyomat/.test(t); }));
ok('20 a prompt jelzi, hogy a számokat szó szerint vesszük', await page.evaluate(()=>
  /SZÓ SZERINT átveszi/.test(buildAiPrompt())));
ok('20 a munkasúly-lista jelöli a testsúlyos plusz terhet', await page.evaluate(()=>{
  S.weights=Object.assign({}, S.weights, {pull:70});
  return /Húzódzkodás \+70 kg plusz teher \(testsúlyos\)/.test(aiUserContext().find(x=>/munkasúly/.test(x))); }));
ok('20 a munkasúly-lista nem duplázza az azonos nevű gyakorlatot', await page.evaluate(()=>{
  S.weights=Object.assign({}, S.weights, {row:65, tbar:45});     // azonos nevű ID-k
  const sor=aiUserContext().find(x=>/munkasúly/.test(x));
  const nevek=sor.replace('Jelenlegi munkasúlyok: ','').split(', ')
    .map(x=>x.replace(/\s[+\d].*$/,''));
  return new Set(nevek).size===nevek.length; }));

// 21. Fiók végleges törlése (App Store 5.1.1(v) / Google Play követelmény)
await page.evaluate(()=>{ S.active=null; playing=false; closeSheet(); tab='home'; render();
  window.__rpc=0;
  window.Auth=Object.assign(window.Auth||{}, {
    isLoggedIn:()=>true, currentUser:()=>({email:'teszt@pelda.hu'}),
    signOut:async()=>{}, deleteAccount:async()=>{ window.__rpc++; return {ok:true}; } }); });
await wait(200);
ok('21 a lap kimondja, mi törlődik és mi marad', await page.evaluate(()=>{
  openDeleteAccount(); const t=document.getElementById('sheetIn').textContent;
  return /teszt@pelda\.hu/.test(t) && /barát-kapcsolataid/.test(t)
      && /telefonon marad/.test(t) && /Biztonsági mentés/.test(t)
      && /Nem visszavonható/.test(t); }));
ok('21 a helyi napló törlése alapból KI van kapcsolva', await page.evaluate(()=>delWipeLocal===false));
ok('21 törlés: a fiók megy, a helyi napló marad', await page.evaluate(async ()=>{
  window.uiConfirm=()=>Promise.resolve(true); window.uiAlert=m=>{window.__u=m;return Promise.resolve();};
  const elotte=S.sessions.length; window.__rpc=0;
  openDeleteAccount(); await confirmDeleteAccount();
  return window.__rpc===1 && S.sessions.length===elotte && /naplód megmaradt/.test(window.__u); }));
ok('21 megerősítés nélkül NEM töröl', await page.evaluate(async ()=>{
  window.uiConfirm=()=>Promise.resolve(false); window.__rpc=0;
  openDeleteAccount(); await confirmDeleteAccount();
  window.uiConfirm=()=>Promise.resolve(true);
  return window.__rpc===0; }));
ok('21 szerveroldali HIBA esetén a helyi napló érintetlen', await page.evaluate(async ()=>{
  window.Auth.deleteAccount=async()=>({ok:false,error:'hálózati hiba'});
  openDeleteAccount(); toggleDelWipe();                    // helyi törlést IS kérünk
  const elotte=S.sessions.length;
  await confirmDeleteAccount();
  const jo = S.sessions.length===elotte && /nem sikerült/.test(window.__u) && /érintetlen/.test(window.__u);
  window.Auth.deleteAccount=async()=>({ok:true});
  return jo; }));
ok('21 bejelölve a helyi napló is törlődik', await page.evaluate(async ()=>{
  openDeleteAccount(); toggleDelWipe();
  await confirmDeleteAccount();
  const raw=JSON.parse(await readKey('gymlog_v1'));
  return S.sessions.length===0 && raw.sessions.length===0
      && S.routines.length===0 && Object.keys(S.customEx).length===0; }));
ok('21 az adatvédelmi tájékoztató leírja a törlést (Play-hez kell URL is)', await page.evaluate(async ()=>{
  const t=await (await fetch('privacy.html')).text();
  return /id="fiok-torles"/.test(t) && /id="account-deletion"/.test(t)
      && /Fiók végleges törlése/.test(t) && /Delete account permanently/.test(t); }));
ok('21 a szerveroldali függvény csak a SAJÁT fiókot törli', await page.evaluate(async ()=>{
  const sql=await (await fetch('supabase/schema-delete-account.sql')).text();
  return /security definer/i.test(sql) && /auth\.uid\(\)/.test(sql)
      && /delete from auth\.users where id = uid/i.test(sql)
      && /grant execute .* to authenticated/i.test(sql)
      && /revoke all on function/i.test(sql); }));

// 22. AI-import: három lépés, egykoppintásos beillesztés, szerkeszthető előnézet
const AITERV='NAP: AI Push\n- Fekvenyomás | 5x3 | 80 | 240\n- Vállból nyomás | 3x10 | 16 | 90\nNAP: AI Pull\n- Húzódzkodás | 4x6 | testsúly | 2 perc';
await page.evaluate(()=>{ S.active=null; playing=false; closeSheet(); tab='plans'; render(); }); await wait(200);
ok('22 az import az 1. lépésen nyílik (prompt)', await page.evaluate(()=>{
  openAiImport(); const t=document.getElementById('sheetIn').textContent;
  return aiStep===1 && /Kérd el a tervet/.test(t) && /Prompt másolása/.test(t)
      && !/Feldolgozás/.test(t); }));          // a külön Feldolgozás-gomb megszűnt
ok('22 a prompt másolása magától a 2. lépésre visz', await page.evaluate(async ()=>{
  aiCopyTpl(); await new Promise(r=>setTimeout(r,120));
  const t=document.getElementById('sheetIn').textContent;
  const vagolap=await navigator.clipboard.readText();
  return aiStep===2 && /Illeszd be a választ/.test(t) && vagolap.includes('NAP:'); }));
ok('22 gépelés után magától felismeri az edzéseket', await page.evaluate(async (terv)=>{
  aiTextInput(terv); await new Promise(r=>setTimeout(r,500));
  const t=document.getElementById('aiStat').textContent;
  return aiStep===2 && aiResolved && aiResolved.length===2 && /2 edzés · 3 gyakorlat/.test(t); }, AITERV));
ok('22 vágólapról EGY koppintás elvisz az előnézetig', await page.evaluate(async (terv)=>{
  openAiImport(); aiGo(2);
  await navigator.clipboard.writeText(terv);
  await aiPasteClip();
  const t=document.getElementById('sheetIn').textContent;
  return aiStep===3 && /Fekvenyomás/.test(t) && /Hozzáadás az edzéseimhez/.test(t); }, AITERV));
ok('22 az előnézet mutatja az előírt súlyt és pihenőt is', await page.evaluate(()=>{
  const t=document.getElementById('sheetIn').textContent;
  return /5×3/.test(t) && /80 kg/.test(t) && /240 mp pihenő/.test(t) && /120 mp pihenő/.test(t); }));
ok('22 a párosítás átköthető másik gyakorlatra', await page.evaluate(()=>{
  const nev=aiResolved[0].ex[0].parsed.name;
  aiEditItem(0,0);                                   // választó „ai" módban
  const pt=document.getElementById('sheetIn').textContent;
  const elokeszitett = pickerQ===nev;                // a kereső már ki van töltve
  aiBindPick('ohp');
  return /Melyikhez kösse/.test(pt) && elokeszitett && aiStep===3
      && aiResolved[0].ex[0].match.id==='ohp'; }));
ok('22 vissza is köthető ÚJ gyakorlatra', await page.evaluate(()=>{
  aiEditItem(0,0); aiBindNew();
  return aiStep===3 && aiResolved[0].ex[0].match===null; }));
ok('22 felesleges sor és nap elhagyható', await page.evaluate(()=>{
  const elotte=aiResolved[0].ex.length;
  aiRemoveItem(0,1); const sor=aiResolved[0].ex.length===elotte-1;
  aiRemoveDay(1); return sor && aiResolved.length===1; }));
ok('22 a SZERKESZTETT előnézet szerint importál', await page.evaluate(async ()=>{
  window.uiAlert=m=>{ window.__a=m; return Promise.resolve(); };
  const rElotte=(S.routines||[]).length;
  await aiImportApply();
  const r=S.routines[S.routines.length-1];
  return S.routines.length===rElotte+1 && r.ex.length===1
      && Object.keys(S.customEx).some(k=>S.customEx[k].n==='Fekvenyomás'); }));
ok('22 az utolsó sor elhagyása visszavisz a beillesztéshez', await page.evaluate(async (terv)=>{
  openAiImport(); aiTextInput(terv); await new Promise(r=>setTimeout(r,500)); aiGo(3);
  aiRemoveDay(0); aiRemoveDay(0);
  return aiStep===2 && aiResolved===null; }, AITERV));
ok('22 felismerhetetlen szövegnél formátum-emlékeztetőt kínál', await page.evaluate(async ()=>{
  openAiImport(); aiGo(2); aiTextInput('Szia! Jövő héten pihenj sokat, aztán beszéljük meg.');
  await new Promise(r=>setTimeout(r,500));
  const t=document.getElementById('aiStat').textContent;
  return !aiResolved && /Formátum-emlékeztető másolása/.test(t); }));
ok('22 a lépéssáv nem enged előre feldolgozatlan előnézetre', await page.evaluate(()=>{
  aiGo(3); return aiStep===2; }));
// Ha TE ürítetted ki az előnézetet, ne azt mondja, hogy olvashatatlan a szöveg.
ok('22 saját ürítés után őszinte üzenet + újrafeldolgozás', await page.evaluate(async (terv)=>{
  openAiImport(); aiGo(2); aiTextInput(terv); await new Promise(r=>setTimeout(r,500)); aiGo(3);
  aiRemoveDay(0); aiRemoveDay(0);
  const t=document.getElementById('aiStat').textContent;
  const jo = aiStep===2 && /Minden sort elhagytál/.test(t) && !/nem sikerült edzést kiolvasni/.test(t)
          && /Újra feldolgozás/.test(t);
  aiReparse();                                     // vissza lehet hozni a szövegből
  return jo && aiStep===3 && aiResolved.length===2; }, AITERV));
await page.evaluate(()=>closeSheet());
// A RÉGI (egyszövegű) jegyzet ne tűnjön el, ha a felhőből érkezett a lista mellé.
ok('16 idegen (régi kliens) napi jegyzet külön bejegyzésként látszik', await page.evaluate(()=>{
  const fake={t:Date.now(),day:'pa',log:{bench:{w:60,sets:[5,5,5]}},
    dayNotes:[{t:Date.now(),ex:'bench',txt:'UJ'}], note:'MASIK TELEFONON IRTAM', noteEx:'ohpdb'};
  const l=dayNotes(fake);
  S.sessions.push(fake); const h=logView(); S.sessions.pop();
  return l.length===2 && l[1].txt==='MASIK TELEFONON IRTAM' && l[1].ex==='ohpdb'
      && h.includes('MASIK TELEFONON IRTAM'); }));
ok('16 az összefűzött régi mező NEM duplikálódik', await page.evaluate(()=>{
  const fake={t:1,day:'pa',log:{},dayNotes:[{t:10,ex:'bench',txt:'egy'},{t:20,ex:'ohpdb',txt:'kettő'}],
    note:'Fekvenyomás: egy · Vállból nyomás ülve: kettő'};
  return dayNotes(fake).length===2; }));
// Egy napon belüli DUPLA gyakorlat: a napló gyakorlatonként egy szett-sort
// vezet, ezért a két sor összeolvadna és az egyik előírás elveszne.
ok('22 dupla gyakorlat esetén figyelmeztet és NEM importál', await page.evaluate(async ()=>{
  window.uiAlert=m=>{ window.__a=m; return Promise.resolve(); };
  const T='NAP: X\n- Fekvenyomás | 5x3 | 80 | 240\n- Fekvenyomás | 3x10 | 50 | 90';
  openAiImport(); aiGo(2); aiTextInput(T); await new Promise(r=>setTimeout(r,500)); aiGo(3);
  const el=document.getElementById('sheetIn');
  const gomb=[...el.querySelectorAll('button')].find(b=>/Hozzáadás az edzéseimhez/.test(b.textContent));
  const n=(S.routines||[]).length; await aiImportApply();
  return aiHasDup() && gomb && gomb.disabled && /kétszer szerepel/.test(el.textContent)
      && (S.routines||[]).length===n; }));
ok('22 feloldás után mehet, és a MEGMARADT előírás a helyes', await page.evaluate(async ()=>{
  aiRemoveItem(0,1);
  await aiImportApply();
  // Az import a korábbi AI-terv HELYÉRE kerül (24. szekció), ezért nem a
  // darabszámot nézzük, hanem a ténylegesen létrejött edzést.
  const r=(S.routines||[]).find(x=>x.ai===1);
  return !!r && r.ex.length===1 && r.ex[0]==='bench'
      && r.exOv.bench.s===5 && r.exOv.bench.w===80; }));
// Külön gyakorlatokra kötve nincs ütközés.
ok('22 más-más gyakorlat nem számít duplának', await page.evaluate(async ()=>{
  const T='NAP: X\n- Fekvenyomás | 5x3 | 80 | 240\n- Vállból nyomás | 3x10 | 16 | 90';
  openAiImport(); aiGo(2); aiTextInput(T); await new Promise(r=>setTimeout(r,500)); aiGo(3);
  return !aiHasDup(); }));
await page.evaluate(()=>closeSheet());

// 24. Az ÚJ AI-import a korábbi HELYÉRE kerül (nem gyűlnek egymásra)
await page.evaluate(()=>{ window.uiAlert=m=>{ window.__a=m; return Promise.resolve(); };
  window.uiConfirm=()=>Promise.resolve(true);
  S.routines=[]; S.programs=[]; S.deleted=[]; S.activeProgram=null; });
const AI2='NAP: AI Push\nNAP_SOR\nNAP: AI Pull\nNAP_SOR2';
const TERV_A='NAP: A Push\n- Fekvenyomás | 4x6 | 60 | 90\nNAP: A Pull\n- Húzódzkodás | 4x8 | testsúly | 120';
const TERV_B='NAP: B Push\n- Vállból nyomás | 3x10 | 16 | 90\nNAP: B Pull\n- Hasalva kézisúlyzós evezés | 4x10 | 22 | 75';
const aiImport = async (terv)=>page.evaluate(async t=>{
  openAiImport(); aiGo(2); aiTextInput(t); await new Promise(r=>setTimeout(r,500));
  aiGo(3); await aiImportApply();
  return { r:(S.routines||[]).length, p:(S.programs||[]).length, act:S.activeProgram }; }, terv);

const imp1 = await aiImport(TERV_A);
ok('24 az első import létrejön', imp1.r===2 && imp1.p===1 && !!imp1.act);
// Saját (kézzel készített) edzés és terv – ezekhez NEM szabad nyúlni.
await page.evaluate(()=>{
  S.routines.push({id:'r_sajat', name:'Kézzel rakott nap', sub:'1 gyakorlat', ex:['bench']});
  S.programs.push({id:'p_sajat', name:'Saját tervem', days:['r_sajat','pa']});
  addStarterRoutine(Object.keys(STARTER_ROUTINES)[0], true);   // sablonból másolt
});
const kezzelElotte = await page.evaluate(()=>(S.routines||[]).filter(r=>!(r.ai===1||r.at>0)).length);
const imp2 = await aiImport(TERV_B);
ok('24 a MÁSODIK import nem szaporítja az AI-terveket', await page.evaluate(()=>
  (S.routines||[]).filter(r=>r.ai===1||r.at>0).length===2
  && (S.programs||[]).filter(p=>p.ai===1).length===1));
ok('24 az új terv napjai az ÚJ tervből valók', await page.evaluate(()=>{
  const p=(S.programs||[]).find(x=>x.ai===1);
  const nevek=p.days.map(d=>(S.routines.find(r=>r.id===d)||{}).name).join(',');
  return /B Push/.test(nevek) && /B Pull/.test(nevek) && !/A Push/.test(nevek); }));
ok('24 a SAJÁT edzések és tervek érintetlenek', await page.evaluate((n)=>
  (S.routines||[]).filter(r=>!(r.ai===1||r.at>0)).length===n
  && (S.programs||[]).some(p=>p.id==='p_sajat')
  && (S.routines||[]).some(r=>r.id==='r_sajat'), kezzelElotte));
ok('24 a régi AI-elemek síremléket kapnak (a felhő se hozza vissza)', await page.evaluate(()=>{
  const k=(S.deleted||[]).filter(d=>d&&d.k&&!d.alive).map(d=>d.k);
  return k.length>=3 && k.some(x=>x.indexOf('r_')===0) && k.some(x=>x.indexOf('p_')===0); }));
ok('24 az aktív terv az ÚJ import lett', await page.evaluate(()=>
  S.activeProgram===((S.programs||[]).find(p=>p.ai===1)||{}).id));
// A korábbi importból naplózott edzés NEVE megmarad a napló számára.
ok('24 a törölt AI-nap naplózott edzése nevesített marad', await page.evaluate(()=>{
  const fake={t:Date.now(), day:'r_regen_torolt', dayName:'A Push', log:{bench:{w:60,sets:[6,6,6]}}};
  S.sessions.push(fake); const nev=dayName(fake); const h=logView(); S.sessions.pop();
  return nev==='A Push' && h.includes('A Push'); }));
// A RÉGI, jelölő nélküli (csak `at`-tel bíró) import is lecserélődik.
ok('24 a régi, ai-jelölő nélküli import is lecserélődik', await page.evaluate(async ()=>{
  S.routines=[{id:'r_regi1', name:'Régi AI nap', sub:'1', ex:['bench'], at:1}];
  S.programs=[{id:'p_regi', name:'AI edzésterv', days:['r_regi1']}];
  S.activeProgram='p_regi'; S.deleted=[];
  const prev=aiPrevImport();
  openAiImport(); aiGo(2); aiTextInput('NAP: Új\n- Fekvenyomás | 4x6 | 60 | 90');
  await new Promise(r=>setTimeout(r,500)); aiGo(3); await aiImportApply();
  return prev.rIds.length===1 && prev.pIds.length===1
      && !(S.routines||[]).some(r=>r.id==='r_regi1')
      && !(S.programs||[]).some(p=>p.id==='p_regi'); }));
ok('24 az előnézet előre kimondja a cserét', await page.evaluate(async ()=>{
  openAiImport(); aiGo(2); aiTextInput('NAP: X\n- Fekvenyomás | 4x6 | 60 | 90');
  await new Promise(r=>setTimeout(r,500)); aiGo(3);
  const t=document.getElementById('sheetIn').textContent; closeSheet();
  return /korábbi AI-importod/.test(t) && /helyére kerül/.test(t); }));
ok('24 első importnál NINCS csere-figyelmeztetés', await page.evaluate(async ()=>{
  S.routines=[]; S.programs=[]; S.activeProgram=null;
  openAiImport(); aiGo(2); aiTextInput('NAP: X\n- Fekvenyomás | 4x6 | 60 | 90');
  await new Promise(r=>setTimeout(r,500)); aiGo(3);
  const t=document.getElementById('sheetIn').textContent; closeSheet();
  return !/korábbi AI-importod/.test(t); }));

// 23. Súlyok magyar alakja: tizedes VESSZŐ (a testsúly-napló is így írja)
ok('23 kgNum egész marad egész, a tizedes vesszőt kap', await page.evaluate(()=>
  JSON.stringify([62.5,60,2.5,0,1.25].map(kgNum))===JSON.stringify(['62,5','60','2,5','0','1,25'])));
ok('23 a heti edzői export súlyai vesszősek', await page.evaluate(()=>{
  const bak=S.sessions, ws=weekStart(Date.now());
  S.sessions=[{t:Math.max(ws,Date.now()-36e5),day:'pa',log:{bench:{w:62.5,sets:[5,5,5]}}}];
  const t=weeklyReport(); S.sessions=bak;
  return /Fekvenyomás: 62,5 kg/.test(t) && !/62\.5/.test(t); }));
ok('23 a tárcsa-kalkulátor is vesszős', await page.evaluate(()=>{
  openPlateCalc(102.5); const t=document.getElementById('plRes').textContent; closeSheet();
  return /41,25 kg/.test(t) && !/41\.25/.test(t); }));
ok('23 a bemelegítő tárcsakiosztása is vesszős', await page.evaluate(()=>{
  const bak=S.active;                       // az openWarmup az aktív edzésből veszi a súlyt
  S.active={t:Date.now(),day:'pa',log:{bench:{w:62.5,sets:[null,null,null]}}};
  openWarmup('bench'); const t=document.getElementById('sheetIn').textContent;
  closeSheet(); S.active=bak;
  return /62,5 kg/.test(t) && !/\d\.\d/.test(t); }));
ok('23 a testsúlyos gyakorlat felirata nem változott', await page.evaluate(()=>
  wLabel({bw:1},0)==='testsúly' && wLabel({bw:1},12.5)==='+12,5' && wLabel({},0)==='0'));

// 25. Stagnálás-felismerés (a naplóból származtatva, tárolt mező nélkül)
const mkSess=(nap,w,sets)=>({t:Date.now()-nap*864e5, day:'pa', log:{bench:{w,sets}}});
ok('25 kevés adatnál NEM mond ítéletet', await page.evaluate(()=>{
  const bak=S.sessions;
  S.sessions=[{t:Date.now()-3*864e5,day:'pa',log:{bench:{w:60,sets:[5,5,5]}}}];
  const r=stallOf('bench'); S.sessions=bak; return r===null; }));
ok('25 három bukás után „nem jön össze"', await page.evaluate((m)=>{
  const bak=S.sessions, D=864e5, e=exDef('bench'), t=parseInt(e.r)||8;
  S.sessions=[];
  for(let i=6;i>=4;i--) S.sessions.push({t:Date.now()-i*D,day:'pa',
    log:{bench:{w:60,sets:Array(e.s).fill(t)}}});            // megvolt
  for(let i=3;i>=1;i--) S.sessions.push({t:Date.now()-i*D,day:'pa',
    log:{bench:{w:60,sets:Array(e.s).fill(t-2)}}});          // 3× cél alatt
  const r=stallOf('bench'); S.sessions=bak;
  return !!r && r.state==='fail' && r.fail===3 && /nem jött össze/.test(r.txt); }, 0));
ok('25 az OKOS progresszió is visszalép 3 bukás után', await page.evaluate(()=>{
  const bak={s:S.sessions,p:S.prog}, D=864e5, e=exDef('bench'), t=parseInt(e.r)||8;
  S.sessions=[]; S.prog={};
  for(let i=6;i>=4;i--) S.sessions.push({t:Date.now()-i*D,day:'pa',log:{bench:{w:60,sets:Array(e.s).fill(t)}}});
  for(let i=3;i>=1;i--) S.sessions.push({t:Date.now()-i*D,day:'pa',log:{bench:{w:60,sets:Array(e.s).fill(t-2)}}});
  const n=progNext('bench', lastFor('bench'));
  S.sessions=bak.s; S.prog=bak.p;
  return progPolicy('bench')==='smart' && n.w<60 && n.delta<0 && /visszaépítés/.test(n.reason); }));
ok('25 EGY bukás után még nem lép vissza', await page.evaluate(()=>{
  const bak=S.sessions, D=864e5, e=exDef('bench'), t=parseInt(e.r)||8;
  S.sessions=[];
  for(let i=5;i>=2;i--) S.sessions.push({t:Date.now()-i*D,day:'pa',log:{bench:{w:60,sets:Array(e.s).fill(t)}}});
  S.sessions.push({t:Date.now()-D,day:'pa',log:{bench:{w:60,sets:Array(e.s).fill(t-2)}}});
  const n=progNext('bench', lastFor('bench')); S.sessions=bak;
  return n.w===60 && n.delta===0; }));
ok('25 régóta változatlan súly = megakadt', await page.evaluate(()=>{
  const bak=S.sessions, D=864e5, e=exDef('bench'), t=parseInt(e.r)||8;
  S.sessions=[{t:Date.now()-40*D,day:'pa',log:{bench:{w:55,sets:Array(e.s).fill(t)}}}];
  // 30 napja tartja a 60-at, a célt hozza, de nem lép feljebb
  [30,20,10,2].forEach(d=>S.sessions.push({t:Date.now()-d*D,day:'pa',
    log:{bench:{w:60,sets:Array(e.s).fill(t)}}}));
  const r=stallOf('bench'); S.sessions=bak;
  return !!r && r.state==='stall' && r.days>=21 && r.since>=2 && /nem emelkedett a súly/.test(r.txt); }));
ok('25 emelkedő súlynál nincs riasztás', await page.evaluate(()=>{
  const bak=S.sessions, D=864e5, e=exDef('bench'), t=parseInt(e.r)||8;
  S.sessions=[];
  [40,30,20,10,2].forEach((d,i)=>S.sessions.push({t:Date.now()-d*D,day:'pa',
    log:{bench:{w:50+i*2.5,sets:Array(e.s).fill(t)}}}));
  const r=stallOf('bench'); S.sessions=bak; return r===null; }));
ok('25 tiszta testsúlyos gyakorlatnál nem a súlyt méri', await page.evaluate(()=>{
  const bak=S.sessions, D=864e5, e=exDef('dipbw'), t=parseInt(e.r)||8;
  S.sessions=[];
  [40,30,20,10,2].forEach(d=>S.sessions.push({t:Date.now()-d*D,day:'pb',
    log:{dipbw:{w:0,sets:Array(e.s).fill(t)}}}));
  const r=stallOf('dipbw'); S.sessions=bak; return r===null; }));
ok('25 a Haladás fülön megjelenik a kártya', await page.evaluate(()=>{
  const bak=S.sessions, D=864e5, e=exDef('bench'), t=parseInt(e.r)||8;
  S.sessions=[{t:Date.now()-40*D,day:'pa',log:{bench:{w:55,sets:Array(e.s).fill(t)}}}];
  [30,20,10,2].forEach(d=>S.sessions.push({t:Date.now()-d*D,day:'pa',
    log:{bench:{w:60,sets:Array(e.s).fill(t)}}}));
  const h=progView(); S.sessions=bak;
  return /Megakadt gyakorlatok/.test(h) && /Fekvenyomás/.test(h); }));
ok('25 üres naplónál nincs kártya', await page.evaluate(()=>{
  const bak=S.sessions; S.sessions=[]; const c=stallCard(); S.sessions=bak; return c===''; }));
ok('25 a felismerés nem ír a naplóba', await page.evaluate(()=>{
  const elotte=JSON.stringify(S.sessions);
  stalledList(); stallCard();
  return JSON.stringify(S.sessions)===elotte && S.stall===undefined; }));

// 26. Offline önellátás: semmi nem jön idegen hosztról
{
  const kulso=[];
  const fig = r=>{ const u=r.url();
    if(!u.startsWith(BASE) && !u.startsWith('data:') && !u.startsWith('blob:')) kulso.push(u); };
  page.on('request', fig);
  await page.reload(); await wait(900);
  await page.evaluate(async ()=>{ try{ await document.fonts.ready; }catch(e){} });
  await wait(300);
  page.off('request', fig);
  ok('26 az oldal betöltése NEM kér semmit idegen hoszttól',
     kulso.length===0 || (console.log('   külső:', [...new Set(kulso)]), false));
}
ok('26 nincs CDN-hivatkozás a forrásban', await page.evaluate(async ()=>{
  const f=async u=>(await fetch(u)).text();
  const [html, auth, sw] = await Promise.all([f('index.html'), f('js/auth.js'), f('sw.js')]);
  const tilos=/esm\.sh|unpkg\.com|cdn\.jsdelivr|cdnjs\.cloudflare/;
  return !tilos.test(html) && !tilos.test(auth) && !tilos.test(sw)
      && !/fonts\.googleapis\.com/.test(html); }));
ok('26 a Supabase a repóból jön és működik', await page.evaluate(async ()=>{
  const r=await fetch('vendor/supabase.js'); if(!r.ok) return false;
  const el=document.createElement('script'); el.src='vendor/supabase.js';
  await new Promise((res,rej)=>{ el.onload=res; el.onerror=rej; document.head.appendChild(el); });
  return !!(window.supabase && typeof window.supabase.createClient==='function')
      && !!window.supabase.createClient('https://pelda.supabase.co','teszt-kulcs'); }));
ok('26 a betűk helyi fájlra mutatnak (magyar ő/ű is)', await page.evaluate(async ()=>{
  const css=await (await fetch('vendor/fonts.css')).text();
  const urlok=[...css.matchAll(/url\(([^)]+)\)/g)].map(m=>m[1]);
  const helyi=urlok.length>0 && urlok.every(u=>!/^https?:/.test(u));
  // a latin-ext alkészlet kell a magyar ő/ű-höz
  const r=await fetch('vendor/fonts/BarlowCondensed-600-latin-ext.woff2');
  return helyi && r.ok && /latin-ext/.test(css); }));
ok('26 a service worker app-héja tartalmazza a helyi függőségeket', await page.evaluate(async ()=>{
  const sw=await (await fetch('sw.js')).text();
  const shell=sw.slice(sw.indexOf('APP_SHELL'), sw.indexOf(']', sw.indexOf('APP_SHELL')));
  return /vendor\/supabase\.js/.test(shell) && /vendor\/fonts\.css/.test(shell)
      && (shell.match(/\.woff2/g)||[]).length>=12; }));
ok('26 a vendor mappa dokumentált és licencelt', await page.evaluate(async ()=>{
  const [rd, lic] = await Promise.all([
    fetch('vendor/README.md').then(r=>r.text()), fetch('vendor/LICENSE-supabase.txt').then(r=>r.text())]);
  return /supabase-js/.test(rd) && /2\.116\.0/.test(rd) && /MIT/i.test(lic); }));

// 27. Barátok fül – a felület kilépve/belépve, és a szerveroldal teljessége
ok('27 felhő-konfig nélkül kimondja, hogy nincs beállítva', await page.evaluate(()=>{
  const bak=window.Auth;
  window.Auth={ configured:()=>false, isLoggedIn:()=>false };
  const t=friendsView().replace(/<[^>]*>/g,' '); window.Auth=bak;
  return /nincs beállítva/.test(t) && !/Betöltés/.test(t); }));
ok('27 kilépve belépésre hív, nem hibázik', await page.evaluate(()=>{
  const bak=window.Auth;
  window.Auth={ configured:()=>true, isLoggedIn:()=>false };
  const t=friendsView().replace(/<[^>]*>/g,' '); window.Auth=bak;
  return /Lépj be/.test(t) && /Belépés/.test(t); }));
ok('27 belépve a barát-kód, a kérések és a barátok is megjelennek', await page.evaluate(()=>{
  const bak={a:window.Auth, f:friendsData, s:sharedPlansData, p:myProfile};
  window.Auth={ configured:()=>true, isLoggedIn:()=>true, currentUser:()=>({id:'en'}) };
  myProfile={ display_name:'Én', friend_code:'ABC123' };
  friendsData=[
    { requester:'en', addressee:'b1', addressee_name:'Béla', status:'accepted' },
    { requester:'c1', addressee:'en', requester_name:'Csaba', status:'pending' },
    { requester:'en', addressee:'d1', addressee_name:'Dóra', status:'pending' }];
  sharedPlansData=[{ id:'sp1', name:'Erő blokk', from_name:'Béla' }];
  const h=friendsView(), t=h.replace(/<[^>]*>/g,' ');
  window.Auth=bak.a; friendsData=bak.f; sharedPlansData=bak.s; myProfile=bak.p;
  return /ABC123/.test(t) && /Béla/.test(t) && /Csaba/.test(t) && /Dóra/.test(t)
      && /Erő blokk/.test(t) && /Barátaid \(1\)/.test(t) && /függőben/.test(t); }));
ok('27 a bejövő kérés badge-et kap', await page.evaluate(()=>{
  const bak={a:window.Auth, f:friendsData};
  window.Auth={ configured:()=>true, isLoggedIn:()=>true, currentUser:()=>({id:'en'}) };
  friendsData=[{ requester:'c1', addressee:'en', requester_name:'Csaba', status:'pending' }];
  const n=friendsPending(); updateFriendsBadge();
  const pont=document.getElementById('friendsDot');
  const on=!!(pont && pont.classList.contains('on'));
  friendsData=[]; updateFriendsBadge();
  const off=!(pont && pont.classList.contains('on'));
  window.Auth=bak.a; friendsData=bak.f;
  return n===1 && on && off; }));
ok('27 a barát neve escape-elve megy ki (nem HTML)', await page.evaluate(()=>{
  const bak={a:window.Auth, f:friendsData, p:myProfile};
  window.Auth={ configured:()=>true, isLoggedIn:()=>true, currentUser:()=>({id:'en'}) };
  myProfile={ friend_code:'X' };
  friendsData=[{ requester:'en', addressee:'b1', addressee_name:'<img src=x onerror=alert(1)>', status:'accepted' }];
  const h=friendsView();
  window.Auth=bak.a; friendsData=bak.f; myProfile=bak.p;
  return !/<img src=x/.test(h) && /&lt;img/.test(h); }));
// A szerveroldal teljessége: minden használt tábla/RPC legyen sémában, ÉS a
// fiók-törlés fedje le – különben árva sor marad a törölt fiók után.
ok('27 minden használt tábla és RPC szerepel a sémafájlokban', await page.evaluate(async ()=>{
  const auth=await (await fetch('js/auth.js')).text();
  const sql=(await Promise.all(['schema.sql','schema-friends.sql','schema-plan-shares.sql','schema-delete-account.sql']
    .map(f=>fetch('supabase/'+f).then(r=>r.text())))).join('\n');
  const nevek=[...new Set([...auth.matchAll(/\.(?:from|rpc)\('([a-z_]+)'/g)].map(m=>m[1]))];
  window.__hianyzo=nevek.filter(n=>!new RegExp('\\b'+n+'\\b').test(sql));
  return nevek.length>=6 && window.__hianyzo.length===0; }));
ok('27 a fiók-törlés MINDEN felhasználói táblát takarít', await page.evaluate(async ()=>{
  const auth=await (await fetch('js/auth.js')).text();
  const del=await (await fetch('supabase/schema-delete-account.sql')).text();
  const tablak=[...new Set([...auth.matchAll(/\.from\('([a-z_]+)'\)/g)].map(m=>m[1]))];
  window.__nemTorolt=tablak.filter(t=>!new RegExp('delete from public\\.'+t+'\\b').test(del));
  return tablak.length>=5 && window.__nemTorolt.length===0; }));

// 28. Heti nézet a főoldalon (hétfőtől, a naplóból – nem talál ki menetrendet)
ok('28 hét hétfőtől, 7 nap', await page.evaluate(()=>{
  const d=weekDays();
  return d.length===7 && d[0].lbl==='H' && d[6].lbl==='V'
      && d[0].t===weekStart(Date.now())
      && d.filter(x=>x.ma).length===1; }));
ok('28 a mai edzés a mai cellába kerül', await page.evaluate(()=>{
  const bak=S.sessions, ws=weekStart(Date.now());
  const t=Math.max(ws, Date.now()-36e5);
  S.sessions=[{t, day:'pa', dayName:'Push A', log:{bench:{w:60,sets:[5,5,5]}}}];
  const d=weekDays(), ma=d.find(x=>x.ma); S.sessions=bak;
  return ma.sess.length===1 && d.filter(x=>x.sess.length).length===1; }));
ok('28 a MÚLT heti edzés nem számít bele', await page.evaluate(()=>{
  const bak=S.sessions, ws=weekStart(Date.now());
  S.sessions=[{t:ws-12*36e5, day:'pa', dayName:'Push A', log:{bench:{w:60,sets:[5,5,5]}}}];
  const d=weekDays(), p=weekPlan(); S.sessions=bak;
  return d.every(x=>!x.sess.length) && p.every(x=>!x.done); }));
ok('28 csak mérés = pihenőnap jelölés, nem edzés', await page.evaluate(()=>{
  const bak={s:S.sessions,b:S.bw,sl:S.sleep};
  S.sessions=[]; S.bw={[bwKey(Date.now())]:80}; S.sleep={};
  const ma=weekDays().find(x=>x.ma);
  S.sessions=bak.s; S.bw=bak.b; S.sleep=bak.sl;
  return ma.pihen===true && ma.sess.length===0; }));
ok('28 a terv napjai: megvolt / hátra van', await page.evaluate(()=>{
  const bak={s:S.sessions,a:S.activeProgram}; S.activeProgram=null;   // beépített PLAN
  const t=Math.max(weekStart(Date.now()), Date.now()-36e5);
  S.sessions=[{t, day:'pa', dayName:'Push A', log:{bench:{w:60,sets:[5,5,5]}}}];
  const p=weekPlan(); S.sessions=bak.s; S.activeProgram=bak.a;
  return p.length===4 && p.filter(x=>x.done).length===1
      && p.find(x=>x.id==='pa').done===true; }));
ok('28 a kártya a hátralévő napokat indíthatóan mutatja', await page.evaluate(()=>{
  const bak={s:S.sessions,a:S.activeProgram}; S.activeProgram=null;
  const t=Math.max(weekStart(Date.now()), Date.now()-36e5);
  S.sessions=[{t, day:'pa', dayName:'Push A', log:{bench:{w:60,sets:[5,5,5]}}}];
  const h=weekPlanCard(); S.sessions=bak.s; S.activeProgram=bak.a;
  return /Ez a hét/.test(h) && /1\/4 edzés/.test(h)
      && /még hátra van/.test(h) && /startDay\('la'\)/.test(h)
      && !/startDay\('pa'\)/.test(h)          // a megvoltat nem kínálja újra
      && /Megvolt: Push A/.test(h); }));
ok('28 teljesített hétnél elismerés, nem üres lista', await page.evaluate(()=>{
  const bak={s:S.sessions,a:S.activeProgram}; S.activeProgram=null;
  const ws=weekStart(Date.now()), t=Math.max(ws, Date.now()-36e5);
  S.sessions=['pa','la','pb','lb'].map(d=>({t, day:d, dayName:d, log:{bench:{w:60,sets:[5]}}}));
  const h=weekPlanCard(); S.sessions=bak.s; S.activeProgram=bak.a;
  return /4\/4 edzés/.test(h) && /végigcsináltad/.test(h) && !/startDay/.test(h); }));
ok('28 üres naplónál nincs heti kártya a főoldalon', await page.evaluate(()=>{
  const bak=S.sessions; S.sessions=[]; const h=homeView(); S.sessions=bak;
  return !/Ez a hét/.test(h); }));
ok('28 a heti nézet nem ír a naplóba', await page.evaluate(()=>{
  const elotte=JSON.stringify(S.sessions);
  weekDays(); weekPlan(); weekPlanCard();
  return JSON.stringify(S.sessions)===elotte; }));

// 29. Pihenő: kis óra a név mellett, nem teljes képernyős ablak
await page.evaluate(async ()=>{ window.uiConfirm=()=>Promise.resolve(true); window.uiAlert=()=>Promise.resolve();
  stopTimer(); S.active=null; playing=false; closeSheet(); await startDay('pa'); });
await wait(450);
ok('29 nincs többé teljes képernyős pihenő-overlay', await page.evaluate(()=>
  !document.getElementById('rest') && !document.querySelector('.rest') && typeof adjustRest==='undefined'));
await page.evaluate(()=>{ const e=dayDef(S.active.day).ex[0]; cur={id:e.id,i:0}; setRep(8); });
await wait(400);
ok('29 szett után elindul, és a GYAKORLAT NEVE MELLETT jelenik meg', await page.evaluate(()=>{
  const pill=document.querySelector('.restpill');
  const sor=document.querySelector('.pname').closest('.row');
  return restRunning() && !!pill && sor.contains(pill); }));
ok('29 a kis óra a célsúlyt ELNYOMÓ overlay helyett hagyja látszani a felületet', await page.evaluate(()=>
  !!document.querySelector('.pchips') && !!document.querySelector('.pfoot')
  && getComputedStyle(document.querySelector('.restpill')).position!=='fixed'));
ok('29 a koppintható terület legalább 44px', await page.evaluate(()=>{
  const r=document.querySelector('.restpill').getBoundingClientRect();
  return r.width>=44 && r.height>=44; }));
ok('29 a kiírt idő a hátralévő időt mutatja', await page.evaluate(()=>{
  const t=document.querySelector('.rp-val').textContent;
  const [m,sec]=t.split(':').map(Number);
  const varhato=Math.ceil(Math.max(0,tEnd-Date.now())/1000);
  return /^\d+:\d{2}$/.test(t) && Math.abs((m*60+sec)-varhato)<=1; }));
ok('29 újrafestés után is a FRISS időt mutatja (nem villan rosszat)', await page.evaluate(()=>{
  render();
  const t=document.querySelector('.rp-val').textContent;
  const [m,sec]=t.split(':').map(Number);
  const varhato=Math.ceil(Math.max(0,tEnd-Date.now())/1000);
  return Math.abs((m*60+sec)-varhato)<=1; }));
// Az óra AZONNAL leáll, de a rövid kilépő animációt megvárja, mielőtt
// kikerül a DOM-ból – különben a fejléc sora ránduló ugrással rendeződne át.
ok('29 egy koppintás leállítja és eltünteti', await page.evaluate(async ()=>{
  document.querySelector('.restpill').click();
  const azonnalLeallt = !restRunning();
  await new Promise(r=>setTimeout(r,350));
  return azonnalLeallt && !document.querySelector('.restpill'); }));
// A lejátszóból kilépve a pihenő is leáll (ez a korábbi viselkedés): ha
// félbehagyod az edzést, nem jár tovább a háttérben egy óra, ami majd megszólal.
ok('29 a lejátszóból kilépve a pihenő is leáll, az óra eltűnik', await page.evaluate(async ()=>{
  playing=true; tab='home'; startTimer(90);
  await new Promise(r=>setTimeout(r,250));
  const futott=restRunning();
  pausePlayer();
  // a festés View Transitionön keresztül is mehet – várjunk a friss DOM-ra
  await new Promise(r=>setTimeout(r,500));
  return futott && !restRunning() && !document.querySelector('.restpill'); }));
ok('29 letelve magától eltűnik', await page.evaluate(async ()=>{
  playing=true; tab='home';
  S.active=S.active||{t:Date.now(),day:'pa',log:{}};
  startTimer(1); tEnd=Date.now()-1; tick();
  await new Promise(r=>setTimeout(r,1500));
  return !restRunning(); }));
await page.evaluate(()=>{ stopTimer(); S.active=null; playing=false; tab='home'; render(); });
await wait(200);

// 30. Mentés/visszaállítás: a TELJES állapot menjen, ne vesszen el mező
ok('30 a mentés ugyanazokat a mezőket viszi, mint amit a save() eltesz', await page.evaluate(async ()=>{
  const src=await (await fetch('index.html')).text();
  const mezok = blokk => [...blokk.matchAll(/([a-zA-Z]+)\s*:\s*S\.[a-zA-Z]+/g)].map(m=>m[1]);
  const saveB  = src.slice(src.indexOf('async function save()'), src.indexOf('const ok=await writeKey'));
  const backB  = src.slice(src.indexOf('function backup()'), src.indexOf('const b=new Blob'));
  // A folyamatban lévő edzés szándékosan marad ki a mentésfájlból.
  const kihagy = new Set(['active','activeT']);
  const kell = mezok(saveB).filter(x=>!kihagy.has(x));
  const van  = new Set(mezok(backB));
  window.__hianyzoMentes = kell.filter(x=>!van.has(x));
  return kell.length>=14 && window.__hianyzoMentes.length===0; }));
ok('30 a visszaállítás vissza is olvassa a kritikus mezőket', await page.evaluate(async ()=>{
  const src=await (await fetch('index.html')).text();
  const r=src.slice(src.indexOf('function restore()'), src.indexOf('function loadBundled'));
  return ['prog','injury','hidePlan','activeProgram','deleted','rdy'].every(k=>
    r.includes('d.'+k) && r.includes('S.'+k+'=')); }));
ok('30 körbe-teszt: a progresszió, az aktív terv és a síremlékek túlélik', await page.evaluate(()=>{
  const bak=JSON.parse(JSON.stringify({p:S.prog,a:S.activeProgram,d:S.deleted,i:S.injury,h:S.hidePlan}));
  S.prog={bench:'linear'}; S.activeProgram='p_teszt'; S.injury={parts:['váll'],since:1};
  S.hidePlan=true; S.deleted=[{k:'r_torolt',at:1}];
  // ugyanaz a szerializálás, amit a backup() csinál
  const v=JSON.parse(JSON.stringify({sessions:S.sessions,weights:S.weights,notes:S.notes,photos:S.photos,
    customEx:S.customEx,routines:S.routines,programs:S.programs,bw:S.bw,sleep:S.sleep,rdy:S.rdy,
    prog:S.prog,injury:S.injury,hidePlan:S.hidePlan,activeProgram:S.activeProgram,
    deleted:S.deleted,lastBackup:S.lastBackup}));
  S.prog=bak.p; S.activeProgram=bak.a; S.deleted=bak.d; S.injury=bak.i; S.hidePlan=bak.h;
  return v.prog.bench==='linear' && v.activeProgram==='p_teszt'
      && v.deleted[0].k==='r_torolt' && v.injury.parts[0]==='váll' && v.hidePlan===true; }));
ok('30 a RÉGI, szűkebb mentésfájl is betölthető marad', await page.evaluate(async ()=>{
  const src=await (await fetch('index.html')).text();
  const r=src.slice(src.indexOf('function restore()'), src.indexOf('function loadBundled'));
  // minden új mező feltételes olvasás – különben a régi fájl felülírná üressel
  return /if\(d\.prog\)/.test(r) && /if\(d\.injury!==undefined\)/.test(r)
      && /if\(Array\.isArray\(d\.deleted\)\)/.test(r); }));
ok('30 a mentés jelzi, melyik appverzió írta', await page.evaluate(async ()=>{
  const src=await (await fetch('index.html')).text();
  const b=src.slice(src.indexOf('function backup()'), src.indexOf('const b=new Blob'));
  return /app:\s*APP_VERSION/.test(b); }));

// 31. Naplózott edzés UTÓLAGOS javítása
await page.evaluate(()=>{ window.uiConfirm=()=>Promise.resolve(true); window.uiAlert=()=>Promise.resolve();
  closeSheet(); S.active=null; playing=false;
  S.sessions.push({t:Date.now()-2*864e5, day:'pa', dayName:'Push A',
    log:{ bench:{w:60,sets:[8,8,7]}, ohpdb:{w:14,sets:[10,10,10]} }});
  tab='log'; render(); });
await wait(300);
const utolso = await page.evaluate(()=>S.sessions.length-1);
ok('31 a napló-soron van „Javítás" gomb', await page.evaluate(()=>/openEditSession\(/.test(logView())));
ok('31 a szerkesztő a rögzített gyakorlatokat listázza', await page.evaluate((i)=>{
  openEditSession(i);
  const t=document.getElementById('sheetIn').textContent;
  return /Edzés javítása/.test(t) && /Fekvenyomás/.test(t) && /Vállból nyomás ülve/.test(t); }, utolso));
ok('31 elgépelt ismétlés javítható', await page.evaluate((i)=>{
  esOpenRep('bench',2); esSetRep(9);
  return JSON.stringify(S.sessions[i].log.bench.sets)==='[8,8,9]'; }, utolso));
ok('31 lemaradt szett pótolható', await page.evaluate((i)=>{
  esAddSet('bench'); esOpenRep('bench',3); esSetRep(6);
  return JSON.stringify(S.sessions[i].log.bench.sets)==='[8,8,9,6]'; }, utolso));
ok('31 téves szett törölhető (null lesz, nem tűnik el a hely)', await page.evaluate((i)=>{
  esOpenRep('bench',3); esSetRep(null);
  return JSON.stringify(S.sessions[i].log.bench.sets)==='[8,8,9,null]'; }, utolso));
ok('31 a súly is javítható a gyakorlat lépésével', await page.evaluate((i)=>{
  const e=exDef('bench'), volt=S.sessions[i].log.bench.w;
  esBumpW('bench',1);
  return S.sessions[i].log.bench.w===volt+(e.inc||2.5); }, utolso));
ok('31 gyakorlat kivehető az edzésből, a többi marad', await page.evaluate(async (i)=>{
  await esRemoveEx('ohpdb');
  const s=S.sessions[i];
  return !s.log.ohpdb && !!s.log.bench; }, utolso));
ok('31 a javítás `ed` bélyeget tesz az edzésre', await page.evaluate((i)=>
  S.sessions[i].ed>0, utolso));
ok('31 a javított érték a naplóban is látszik', await page.evaluate((i)=>{
  closeEditSession();
  const h=logView();
  return h.includes('8, 8, 9, –'); }, utolso));
// A LÉNYEG: a szándékos javítás ne forduljon vissza a felhőből.
ok('31 a felhő NEM hozza vissza a kivett szettet', await page.evaluate(()=>{
  const alap={active:null,weights:{},notes:{},photos:{},customEx:{},routines:[],programs:[],deleted:[]};
  const felho={...alap, sessions:[{t:5000,day:'pa',log:{bench:{w:60,sets:[8,8,8,8]}}}]};      // gazdagabb
  const helyi={...alap, sessions:[{t:5000,day:'pa',ed:9999,log:{bench:{w:60,sets:[8,8]}}}]};  // szerkesztett
  const m=JSON.parse(window.Auth.mergeGym(JSON.stringify(felho), JSON.stringify(helyi)));
  return JSON.stringify(m.sessions[0].log.bench.sets)==='[8,8]' && m.sessions[0].ed===9999; }));
ok('31 két szerkesztés közül a FRISSEBB nyer', await page.evaluate(()=>{
  const alap={active:null,weights:{},notes:{},photos:{},customEx:{},routines:[],programs:[],deleted:[]};
  const regi={...alap, sessions:[{t:6000,day:'pa',ed:100,log:{bench:{w:60,sets:[5]}}}]};
  const uj  ={...alap, sessions:[{t:6000,day:'pa',ed:200,log:{bench:{w:70,sets:[3,3]}}}]};
  const m=JSON.parse(window.Auth.mergeGym(JSON.stringify(regi), JSON.stringify(uj)));
  return m.sessions[0].log.bench.w===70 && m.sessions[0].ed===200; }));
ok('31 szerkesztetlen edzéseknél marad a „gazdagabb nyer" szabály', await page.evaluate(()=>{
  const alap={active:null,weights:{},notes:{},photos:{},customEx:{},routines:[],programs:[],deleted:[]};
  const a={...alap, sessions:[{t:7000,day:'pa',log:{bench:{w:60,sets:[8,null,null]}}}]};
  const b={...alap, sessions:[{t:7000,day:'pa',log:{bench:{w:60,sets:[8,8,8]}}}]};
  const m=JSON.parse(window.Auth.mergeGym(JSON.stringify(a), JSON.stringify(b)));
  return JSON.stringify(m.sessions[0].log.bench.sets)==='[8,8,8]'; }));
await page.evaluate((i)=>{ closeEditSession(); S.sessions.splice(i,1); }, utolso);
await wait(150);

// 32. Nap → hétköznap beosztás (opcionális, kulcsolt, additív)
await page.evaluate(()=>{ window.uiConfirm=()=>Promise.resolve(true); closeSheet();
  S.sched={}; S.activeProgram=null; S.active=null; playing=false; tab='home'; render(); });
await wait(250);
ok('32 beosztás nélkül a heti nézet csak sorrendet mutat', await page.evaluate(()=>{
  const h=weekPlanCard();
  return !schedHas() && !/wkplan/.test(h) && /Heti beosztás megadása/.test(h); }));
ok('32 egy nap több hétköznapra is betehető', await page.evaluate(()=>{
  schedToggle('pa',0); schedToggle('pa',3);
  return JSON.stringify(schedOf('pa'))==='[0,3]' && schedHas(); }));
ok('32 ismételt koppintás leveszi', await page.evaluate(()=>{
  schedToggle('pa',3);
  return JSON.stringify(schedOf('pa'))==='[0]'; }));
ok('32 a beosztott nap megjelenik a heti cellánál', await page.evaluate(()=>{
  const h=weekPlanCard();
  return /wkplan/.test(h) && /Push A/.test(h); }));
ok('32 csak az AKTÍV terv napjai számítanak', await page.evaluate(()=>{
  S.sched={ r_masik_tervbol:[0], pa:[0] };
  const ids=schedFor(0); S.sched={pa:[0]};
  return ids.length===1 && ids[0]==='pa'; }));
ok('32 a mára beosztott edzés kerül előre, és ki is mondja', await page.evaluate(()=>{
  const maWd=(new Date().getDay()+6)%7;
  S.sched={ lb:[maWd] };                       // a Pull B-t tesszük mára
  const h=weekPlanCard(); S.sched={pa:[0]};
  const elso=h.indexOf('Pull B'), masik=h.indexOf('Push A');
  return /Mára beosztva/.test(h) && elso>0 && (masik<0 || elso<masik); }));
ok('32 a „Mit edzek ma?" a beosztást követi, nem az izomtérképet', await page.evaluate(()=>{
  const bak=S.sessions; S.sessions=[];
  const maWd=(new Date().getDay()+6)%7;
  S.sched={ lb:[maWd] };
  const sug=suggestDay(); S.sched={pa:[0]}; S.sessions=bak;
  return !!sug && sug.dayId==='lb' && sug.sched===true; }));
ok('32 a MA már megcsinált beosztott edzést nem ajánlja újra', await page.evaluate(()=>{
  const bak=S.sessions;
  const maWd=(new Date().getDay()+6)%7, t=Math.max(weekStart(Date.now()), Date.now()-36e5);
  S.sessions=[{t, day:'lb', dayName:'Pull B', log:{tbar:{w:20,sets:[10]}}}];
  S.sched={ lb:[maWd] };
  const sug=suggestDay(); S.sched={pa:[0]}; S.sessions=bak;
  return !sug || sug.dayId!=='lb'; }));
ok('32 a beosztás mentődik és szinkronizál (kulcsolt unió)', await page.evaluate(async ()=>{
  S.sched={pa:[0],lb:[3]}; await save();
  const raw=await readKey('gymlog_v1');
  const mentve=JSON.parse(raw).sched;
  const alap={active:null,sessions:[],weights:{},notes:{},photos:{},customEx:{},routines:[],programs:[],deleted:[]};
  const A={...alap, sched:{pa:[0]}}, B={...alap, sched:{lb:[3]}};
  const m=JSON.parse(window.Auth.mergeGym(JSON.stringify(A), JSON.stringify(B)));
  return JSON.stringify(mentve.pa)==='[0]' && !!m.sched.pa && !!m.sched.lb; }));
ok('32 a mentésfájl is viszi', await page.evaluate(async ()=>{
  const src=await (await fetch('index.html')).text();
  const b=src.slice(src.indexOf('function backup()'), src.indexOf('const b=new Blob'));
  return /sched:S\.sched/.test(b); }));
ok('32 törölt saját edzés nem hagy árva beosztást', await page.evaluate(async ()=>{
  S.routines=[{id:'r_sched_x', name:'X nap', sub:'1', ex:['bench']}];
  S.sched={r_sched_x:[2]};
  await deleteRoutine('r_sched_x');
  return !(S.sched||{}).r_sched_x; }));
ok('32 a beosztás egyben törölhető', await page.evaluate(async ()=>{
  S.sched={pa:[0],lb:[3]}; await schedClear();
  return !schedHas(); }));
await page.evaluate(()=>{ S.sched={}; closeSheet(); tab='home'; render(); });
await wait(150);

// 33. Nyelvi réteg (a magyar a forrásnyelv, az angol fokozatosan épül)
ok('33 alapból magyar, akkor is, ha a böngésző angol', await page.evaluate(()=>
  I18N.getLang()==='hu' && document.documentElement.lang==='hu'
  && (navigator.language||'').toLowerCase().indexOf('hu')!==0));
ok('33 fordítatlan szöveg MAGYARUL jön, nem üresen', await page.evaluate(()=>{
  I18N.setLang('en');
  const x=tr('Ez egy soha le nem fordított mondat.');
  I18N.setLang('hu');
  return x==='Ez egy soha le nem fordított mondat.'; }));
ok('33 angolra váltva a felület szövege tényleg megváltozik', await page.evaluate(()=>{
  const huNav=(document.querySelector('.nav button .nlbl')||{}).textContent;
  switchLang('en');
  const enNav=(document.querySelector('.nav button .nlbl')||{}).textContent;
  const enCard=weekPlanCard();
  switchLang('hu');
  const vissza=(document.querySelector('.nav button .nlbl')||{}).textContent;
  return huNav==='Edzés' && enNav==='Workout' && /This week/.test(enCard) && vissza==='Edzés'; }));
ok('33 a nyelv a lemezen marad, és a html lang követi', await page.evaluate(()=>{
  switchLang('en');
  const mentve=localStorage.getItem('gymlog_lang'), l=document.documentElement.lang;
  switchLang('hu');
  return mentve==='en' && l==='en' && document.documentElement.lang==='hu'; }));
ok('33 a nyelvváltás NEM nyúl a naplóhoz', await page.evaluate(()=>{
  const elotte=JSON.stringify(S.sessions)+'|'+JSON.stringify(S.weights);
  switchLang('en'); switchLang('hu');
  return JSON.stringify(S.sessions)+'|'+JSON.stringify(S.weights)===elotte; }));
ok('33 a behelyettesítés működik', await page.evaluate(()=>
  tr('{n} edzés', {n:12})==='12 edzés'));
ok('33 a globális neve `tr` (az egybetűs `t` lokálisokat árnyékolna)', await page.evaluate(()=>
  typeof window.tr==='function' && typeof window.t!=='function'));
ok('33 az i18n az app-héjban van (offline is)', await page.evaluate(async ()=>{
  const sw=await (await fetch('sw.js')).text();
  return /js\/i18n\.js/.test(sw) && (await fetch('js/i18n.js')).ok; }));
ok('33 a profil-lapon ott a nyelvválasztó', await page.evaluate(()=>{
  openAuthSheet(); const t=document.getElementById('sheetIn').textContent; closeSheet();
  return /Nyelv/.test(t) && /Magyar/.test(t) && /Angol/.test(t); }));

// ---- 34. Testsúly-trend kártya a Haladás fülön ----
// Mindent a `S.bw` mérésekből számol – nincs új mező, nincs elmentett trend.
const bwKeyOf=(t)=>{ const d=new Date(t); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); };
const bwSeed=(napok, fn)=>{ const b={}, D=864e5, now=Date.now();
  for(let i=napok-1;i>=0;i--) b[bwKeyOf(now-i*D)]=fn(i); return b; };
const alapSess=[0,3,6,9].map(i=>({day:'pa', t:Date.now()-i*864e5, log:{bench:{w:60,sets:[5,5,5,5]}}}));

await seed({sessions:alapSess, active:null, weights:{bench:60},
            bw: bwSeed(40, i=>Math.round((80-i*0.05)*10)/10)});
await nav('prog');
ok('34 a kártya kikerül a Haladás fülre', await page.evaluate(()=>
  /Testsúly · \d+ nap/.test(document.getElementById('app').textContent)));
ok('34 a mai súly és a mérésszám is ki van írva', await page.evaluate(()=>{
  const t=document.getElementById('app').textContent;
  return /80,0 kg/.test(t) && /40 mérés/.test(t); }));
ok('34 a kg magyar alakban megy ki (tizedes VESSZŐ)', await page.evaluate(()=>{
  const c=bwProgCard();
  return /\d,\d/.test(c) && !/\d\.\d\s*kg/.test(c); }));
ok('34 a meredekség valódi NAPOKKAL számol, nem sorszámmal', await page.evaluate(()=>{
  // +1 kg 14 nap alatt = +0,5 kg/hét, akkor is, ha csak 5 mérés van.
  const D=864e5, k=t=>{const d=new Date(t);return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')};
  const arr=[14,10,7,3,0].map(i=>({d:k(Date.now()-i*D), kg:80+(14-i)/14}));
  const s=bwSlopeWeek(arr);
  return Math.abs(s-0.5)<0.02; }));
ok('34 5 mérés alatt NEM mond irányt', await page.evaluate(()=>
  bwSlopeWeek([{d:'2026-01-01',kg:80},{d:'2026-01-02',kg:81}])===null));
ok('34 a 7 napos átlag az előző héthez mér', await page.evaluate(()=>{
  const c=bwProgCard();
  return /7 napos átlag/.test(c) && /Az előző héthez/.test(c); }));
ok('34 a kártya a testsúly-lapot nyitja', await page.evaluate(()=>
  /openBwSheet\(\)/.test(bwProgCard())));

// Becsületesség: kevés mérésből nincs kártya, és nincs kitalált pont.
await seed({sessions:alapSess, active:null, weights:{bench:60},
            bw: bwSeed(1, ()=>80)});
await nav('prog');
ok('34 EGY mérésből nincs kártya (üres grafikont nem mutatunk)', await page.evaluate(()=>
  bwProgCard()==='' && !/Testsúly · /.test(document.getElementById('app').textContent)));
await seed({sessions:alapSess, active:null, weights:{bench:60}, bw:{}});
await nav('prog');
ok('34 testsúly-napló nélkül a Haladás fül ugyanúgy megvan', await page.evaluate(()=>{
  const t=document.getElementById('app').textContent;
  return bwProgCard()==='' && /Edzésnaptár/.test(t); }));
// Csak a MÉRT napok kerülnek a grafikonra – interpoláció nincs.
await seed({sessions:alapSess, active:null, weights:{bench:60},
            bw: (()=>{ const D=864e5, b={}; [60,30,10,4,0].forEach(i=>{
              const d=new Date(Date.now()-i*D);
              b[d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')]=80; }); return b; })()});
await nav('prog');
ok('34 a ritka mérés nem lesz kitalált napokkal kitöltve', await page.evaluate(()=>
  /5 mérés/.test(bwProgCard())));
ok('34 a 90 napos ablakon kívüli mérés kimarad', await page.evaluate(()=>{
  const D=864e5, d=new Date(Date.now()-200*D);
  S.bw[d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')]=99;
  const c=bwProgCard(); return /5 mérés/.test(c) && !/99/.test(c); }));
ok('34 angolul is olvasható (nem fél-magyar)', await page.evaluate(()=>{
  S.bw={}; const D=864e5;
  for(let i=39;i>=0;i--){ const d=new Date(Date.now()-i*D);
    S.bw[d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0')]=80; }
  I18N.setLang('en'); const c=bwProgCard(); I18N.setLang('hu');
  return /Bodyweight · 40 days/.test(c) && /40 measurements/.test(c)
    && /7-day average/.test(c) && /Vs. previous week/.test(c) && /Log bodyweight/.test(c) && !/nap/.test(c.replace(/[a-z]/g,'')); }));
ok('34 a kártya NEM tárol semmit (a napló változatlan)', await page.evaluate(()=>{
  const elotte=localStorage.getItem('gymlog_v1');
  bwProgCard(); bwProgCard();
  return localStorage.getItem('gymlog_v1')===elotte; }));

// ---- 35. Mozgás-rendszer (Emil Kowalski-féle UI-polish szabályok) ----
// Ezek a szabályok könnyen visszakúsznak egy-egy gyors javításnál, ezért
// a CSS SZÖVEGÉRE is állítunk feltételeket, nem csak a viselkedésre.
// A megjegyzéseket kivágjuk: a szabályokról ÍRNI szabad, csak használni nem.
const css = await page.evaluate(async ()=>{
  const html = await (await fetch('index.html')).text();
  const raw = (html.match(/<style>([\s\S]*?)<\/style>/)||[])[1]||'';
  return raw.replace(/\/\*[\s\S]*?\*\//g,' '); });

ok('35 `ease-in` sehol – lassan indul, attól lomha a felület', !/[^-]ease-in[^-]/.test(css));
ok('35 nincs `transition: all` (mindig konkrét tulajdonság)', !/transition:\s*all/.test(css));
// A `scaleX(0)` KIVÉTEL: egy üres kitöltő-sáv nem „a semmiből" jelenik meg,
// hanem feltöltődik. A tiltás az ELEMEK belépésére szól.
ok('35 semmi nem scale(0)-ból lép be', !/[^X]scale\(0\)/.test(css));
ok('35 vannak easing-tokenek a :root-on (nem szórt cubic-bezier)', await page.evaluate(()=>{
  const v=getComputedStyle(document.documentElement);
  return v.getPropertyValue('--ease-out').trim().startsWith('cubic-bezier')
      && v.getPropertyValue('--ease-in-out').trim().startsWith('cubic-bezier'); }));

// Koppintás-visszajelzés: minden nyomható elem jelezzen vissza, és a
// mérték MÉRETHEZ kötött rendszer legyen (.94 / .97 / .99), ne találgatás.
await seed(backup); await nav('home');
const press = await (async ()=>{
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  const {root} = await cdp.send('DOM.getDocument');
  const out = {};
  for(const sel of ['.daybtn','.btn','.iconbtn','.nav button']){
    const {nodeId} = await cdp.send('DOM.querySelector', {nodeId:root.nodeId, selector:sel});
    if(!nodeId){ out[sel]=null; continue; }
    await cdp.send('CSS.forcePseudoState', {nodeId, forcedPseudoClasses:['active']});
    await wait(120);
    out[sel] = await page.evaluate(s=>{
      const el=document.querySelector(s);
      const t = s==='.daybtn' ? el.parentElement : el;   // a nagy kártya húzódik össze
      const m = getComputedStyle(t).transform.match(/matrix\(([\d.]+)/);
      return m ? +m[1] : 1; }, sel);
    await cdp.send('CSS.forcePseudoState', {nodeId, forcedPseudoClasses:[]});
  }
  return out; })();
ok('35 minden nyomható elem visszajelez koppintásra', Object.values(press).every(v=>v!=null && v<1));
ok('35 a visszajelzés mértéke a 0,94–0,99 sávban van', Object.values(press).every(v=>v>=0.94 && v<=0.99));
ok('35 a nagy kártya finomabban húzódik, mint a kis ikon', press['.daybtn'] > press['.iconbtn']);
ok('35 a gomb érezhetően visszajelez (a régi .99+opacity nem az)', press['.btn']<=0.975);

// Sávok: transform, nem width – a szélesség minden képkockán layoutot kér.
ok('35 a kitöltő sávok transformmal rajzolnak, nem width-tel',
  /\.mgfill\{transition:transform/.test(css.replace(/\s/g,''))
  && /\.rdybar>span\{[^}]*transform:scaleX/.test(css.replace(/\n/g,''))
  && !/transition:width/.test(css));
await seed(backup); await nav('home');
ok('35 a sáv tényleges szélessége egyezik a beállított aránnyal', await page.evaluate(()=>{
  const el=[...document.querySelectorAll('.rdybar>span')].find(s=>+getComputedStyle(s).getPropertyValue('--p')>0.05);
  if(!el) return true;   // nincs pontozható tényező – nincs mit ellenőrizni
  const p=+getComputedStyle(el).getPropertyValue('--p');
  const r=el.getBoundingClientRect().width / el.parentElement.getBoundingClientRect().width;
  return Math.abs(r-p) < 0.02; }));

// Gyakoriság-szabály: a fül-váltást naponta sokszor csinálod, ezért rövid.
ok('35 a belépő animáció 300 ms alatt marad', /riseIn \.2\ds/.test(css));
ok('35 a lépcső a 6. kártyánál megáll (nem várakoztat a 9-ig)',
  /nth-child\(n\+6\)\{animation-delay:\.15s\}/.test(css) && !/animation-delay:\.2\ds/.test(css));
ok('35 a készenlét-szám nem tartja vissza magát fél másodpercig', await page.evaluate(async ()=>{
  const html=await (await fetch('index.html')).text();
  const m=html.match(/const dur=(\d+), t0=performance\.now/);
  return m && +m[1] <= 400; }));

// A gyűrűk ugyanazt csinálják – ugyanaz az időzítésük is.
// A készenlét-gyűrű és a mini-gyűrű ugyanazt a dolgot rajzolja: ne legyen
// két külön időzítésük, amit egyenként hangolgat valaki.
const ringT = name => (css.match(new RegExp('[^}{]*\\'+name+'[^}{]*\\{[^}]*stroke-dashoffset\\s+(\\d+m?s)'))||[])[1];
ok('35 a két készenlét-gyűrű időzítése egységes',
  !!ringT('.rdy-fg') && ringT('.rdy-fg')===ringT('.mr-fg'));

// Csökkentett mozgás: a MOZGÁS tűnik el, a visszajelzés nem.
ok('35 a belépő animációk prefers-reduced-motion alá vannak zárva',
  /@media \(prefers-reduced-motion: no-preference\)/.test(css)
  && css.indexOf('@keyframes riseIn') > css.indexOf('@media (prefers-reduced-motion: no-preference)'));

// ---- 36. Pihenő-gyűrű a lejátszóban ----
// A gyűrű ürülése EGYETLEN animáció a pihenő teljes hosszára, nem
// másodpercenként ötször újraírt attribútum.
await seed({sessions:[], active:null, weights:{}});
await page.evaluate(()=>{ startDay('pa'); render(); }); await wait(350);
await page.evaluate(()=>startTimer(60)); await wait(300);

ok('36 a gyűrűt egyetlen animáció viszi', await page.evaluate(()=>
  document.getElementById('restRing').getAnimations().length===1));
ok('36 az animáció a pihenő TELJES hosszára szól', await page.evaluate(()=>{
  const t=document.getElementById('restRing').getAnimations()[0].effect.getTiming();
  return t.duration>=58000 && t.duration<=60000; }));
ok('36 visszaszámlálás = `linear` (állandó mozgás, nem be/kilépés)', await page.evaluate(()=>
  document.getElementById('restRing').getAnimations()[0].effect.getTiming().easing==='linear'));
ok('36 a gyűrű tényleg ürül', await (async ()=>{
  const a=await page.evaluate(()=>parseFloat(getComputedStyle(document.getElementById('restRing')).strokeDashoffset));
  await wait(1200);
  const b=await page.evaluate(()=>parseFloat(getComputedStyle(document.getElementById('restRing')).strokeDashoffset));
  return b>a; })());
ok('36 újrafestés után sem szakad meg (a render újraköti)', await page.evaluate(()=>{
  render(); return document.getElementById('restRing').getAnimations().length===1; }));

// A régi hiba: a 200 ms-os átmenet újraindításkor VISSZAFELÉ söpört a körön.
await page.evaluate(()=>startTimer(90)); await wait(60);
ok('36 újraindításkor nem söpör visszafelé', await page.evaluate(()=>
  parseFloat(getComputedStyle(document.getElementById('restRing')).strokeDashoffset) < 3));

// A pihenő alatt a telefon a képernyőt is ébren tartja – ne dolgozzon feleslegesen.
ok('36 a pihenő alatt másodpercenként EGY DOM-írás van, nem tíz', await page.evaluate(async ()=>{
  let n=0;
  const obs=new MutationObserver(ms=>{ n+=ms.length; });
  obs.observe(document.querySelector('.restpill'), {subtree:true, childList:true,
    characterData:true, attributes:true});
  await new Promise(r=>setTimeout(r,3000));
  obs.disconnect();
  return n<=4;   // 3 mp alatt ~3 szöveg-frissítés; a régi kód ~30 írást csinált
}));

// Be- és kilépés: a fejléc sora ne ránduljon, és a kilépés legyen a fürgébb.
ok('36 a kilépő animáció megvárása után tűnik csak el az óra', await (async ()=>{
  await page.evaluate(()=>stopTimer());
  const kozben = await page.evaluate(()=>!!document.querySelector('.restpill'));
  await wait(400);
  const utana = await page.evaluate(()=>!document.querySelector('.restpill'));
  return kozben && utana; })());
ok('36 a kilépés gyorsabb, mint a belépés', await page.evaluate(async ()=>{
  const kf=[{opacity:1},{opacity:0}];
  startTimer(45); render();
  const pill=document.querySelector('.restpill');
  if(!pill) return false;
  // az `animRestPill` időzítései: be 160 ms, ki 120 ms
  const src=await (await fetch('index.html')).text();
  const m=src.match(/duration:\s*dir==='in'\?(\d+):(\d+)/);
  stopTimer();
  return m && +m[2] < +m[1]; }));
await wait(400);

// A gyűrű a KIJELZŐ, nem dísz: csökkentett mozgásnál is mennie kell.
ok('36 a gyűrű nincs a prefers-reduced-motion blokkba zárva', await page.evaluate(async ()=>{
  const html=await (await fetch('index.html')).text();
  const css=(html.match(/<style>([\s\S]*?)<\/style>/)||[])[1]||'';
  // nincs rá CSS-animáció egyáltalán – WAAPI viszi, ami mindig fut
  return !/restDrain/.test(css) && !/\.rp-fg\{[^}]*transition/.test(css); }));
ok('36 a v101-ben leváltott pihenő-overlay maradéka kitakarítva', await page.evaluate(async ()=>{
  const html=await (await fetch('index.html')).text();
  return !/\.rest\.on/.test(html) && !/rest-card/.test(html); }));
await page.evaluate(()=>{ stopTimer(); playing=false; tab='home'; S.active=null; render(); });
await wait(300);

// ---- 37. Lap-kilépés + a legtöbbet nyomott kontrollok ----
await seed(backup); await nav('home');

// A lap ugyanazon az úton megy ki, amin bejött.
ok('37 a lap nem tűnik el, hanem lecsúszik', await page.evaluate(async ()=>{
  openBwSheet(); await new Promise(r=>setTimeout(r,320));
  closeSheet(); await new Promise(r=>setTimeout(r,90));
  const s=document.getElementById('sheet'), i=document.getElementById('sheetIn');
  const m=getComputedStyle(i).transform.match(/,\s*([\d.]+)\)$/);
  const csuszik = !!m && +m[1] > 40;
  await new Promise(r=>setTimeout(r,250));
  return csuszik && s.classList.contains('on')===false; }));
ok('37 a TARTALOM nem halványul, csak a sötétítés', await page.evaluate(async ()=>{
  openBwSheet(); await new Promise(r=>setTimeout(r,320));
  closeSheet(); await new Promise(r=>setTimeout(r,90));
  const s=document.getElementById('sheet'), i=document.getElementById('sheetIn');
  const tartalom = +getComputedStyle(i).opacity;
  const sotetites = +getComputedStyle(s,'::before').opacity;
  await new Promise(r=>setTimeout(r,250));
  return tartalom===1 && sotetites<0.8; }));
ok('37 a kilépés gyorsabb, mint a belépés', await page.evaluate(async ()=>{
  const html=await (await fetch('index.html')).text();
  const be=(html.match(/sheetUp \.(\d+)s/)||[])[1];          // .26s
  const ki=(html.match(/const SHEET_OUT=(\d+)/)||[])[1];     // 200
  return be && ki && +ki < +be*10; }));

// Megszakíthatóság: ha a kilépés alatt ÚJ lap nyílik, a friss nem tűnhet el.
ok('37 a kilépés közben nyitott új lap megmarad', await page.evaluate(async ()=>{
  openBwSheet(); await new Promise(r=>setTimeout(r,320));
  closeSheet();
  await new Promise(r=>setTimeout(r,60));
  openSleepSheet();
  await new Promise(r=>setTimeout(r,500));   // jóval a régi kilépés lejárta után
  const s=document.getElementById('sheet');
  return s.classList.contains('on') && !s.classList.contains('closing')
      && getComputedStyle(document.getElementById('sheetIn')).transform==='none'; }));

// Egy felület, egy kimeneti út: a lehúzás is a closeSheet-en megy.
ok('37 a lehúzásnak nincs külön kilépése', await page.evaluate(async ()=>{
  const html=await (await fetch('index.html')).text();
  return !/translateY\(110%\)/.test(html); }));
ok('37 minden lapnyitás egy belépési ponton megy', await page.evaluate(async ()=>{
  const html=await (await fetch('index.html')).text();
  // csak a teszt-segéd és az openSheet maga nyúlhat közvetlenül az osztályhoz
  return !/getElementById\('sheet'\)\.classList\.add\('on'\)/.test(html); }));

// Csökkentett mozgás: a CSÚSZÁS marad el, a halványulás nem.
await page.emulateMedia({reducedMotion:'reduce'});
ok('37 csökkentett mozgásnál nem csúszik, de nem is villan', await page.evaluate(async ()=>{
  openBwSheet(); await new Promise(r=>setTimeout(r,320));
  closeSheet(); await new Promise(r=>setTimeout(r,90));
  const s=document.getElementById('sheet'), i=document.getElementById('sheetIn');
  const nincsCsuszas = getComputedStyle(i).transform==='none';
  const halvanyul = +getComputedStyle(s,'::before').opacity < 0.8;
  await new Promise(r=>setTimeout(r,250));
  return nincsCsuszas && halvanyul; }));
await page.emulateMedia({reducedMotion:null});
await wait(200);

// A két legtöbbet nyomott kontroll: az ujjad ELTAKARJA a gombot, ezért a
// háttérváltás önmagában láthatatlan – a `scale` a gomb SZÉLÉT mozdítja.
const press2 = await (async ()=>{
  // Tiszta állapot: a `backup` hozhat folyamatban lévő edzést, olyankor a
  // `startDay` nem indul, és a súlyállító meg sem jelenne a lejátszóban.
  await seed({sessions:[], active:null, weights:{}});
  await page.evaluate(()=>{ startDay('pa'); render(); }); await wait(350);
  await page.evaluate(()=>{ openSet('bench',0); }); await wait(350);
  const cdp=await page.context().newCDPSession(page);
  await cdp.send('DOM.enable'); await cdp.send('CSS.enable');
  const {root}=await cdp.send('DOM.getDocument');
  const out={};
  for(const sel of ['.kb button','.wt button']){
    const {nodeId}=await cdp.send('DOM.querySelector',{nodeId:root.nodeId,selector:sel});
    if(!nodeId){ out[sel]=null; continue; }
    await cdp.send('CSS.forcePseudoState',{nodeId,forcedPseudoClasses:['active']});
    await wait(120);
    out[sel]=await page.evaluate(x=>{
      const m=getComputedStyle(document.querySelector(x)).transform.match(/matrix\(([\d.]+)/);
      return m?+m[1]:1; }, sel);
    await cdp.send('CSS.forcePseudoState',{nodeId,forcedPseudoClasses:[]});
  }
  return out; })();
ok('37 a szett-rács gombja összehúzódik lenyomva', press2['.kb button']!=null && press2['.kb button']<1);
ok('37 a súlyállító gombja összehúzódik lenyomva', press2['.wt button']!=null && press2['.wt button']<1);
ok('37 mindkettő a --press-sm rendszerértéket kapja',
  press2['.kb button']===press2['.wt button'] && Math.abs(press2['.kb button']-0.94)<0.005);
await page.evaluate(()=>{ closeSheet(); playing=false; tab='home'; S.active=null; render(); });
await wait(350);

console.log('\n==== ÖSSZEGZÉS ====');
console.log('PASS:', pass, 'FAIL:', fail);
if(fails.length) console.log('BUKOTT:', JSON.stringify(fails,null,1));
console.log('JS HIBÁK:', errs.length? JSON.stringify([...new Set(errs)],null,1):'nincs');
await browser.close();
process.exit(fail===0 && errs.length===0 ? 0 : 1);
