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

await page.goto(BASE+'/index.html'); await wait(300);
await seed(backup);

// ---- 1. Betöltés / főoldal ----
ok('1 app betölt (storeMode)', await page.evaluate(()=>storeMode==='local' || storeMode==='claude'));
ok('1 standards mód (nincs quirks)', await page.evaluate(()=>document.compatMode==='CSS1Compat'));
ok('1 lang=hu', await page.evaluate(()=>document.documentElement.lang==='hu'));
ok('1 főoldal címe', (await page.$eval('#app h1',e=>e.textContent)).includes('Melyik nap'));
ok('1 nap-kártyák láthatók', (await page.$$('.daybtn')).length>=4);

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
ok('3 aznapi jegyzet', await page.evaluate(()=>S.active.note==='fáradt'));
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
ok('5 fmtDur formátum', await page.evaluate(()=>fmtDur(70*60000).includes('ó')));
ok('5 warmupSets lépcsők', await page.evaluate(()=>{ const w=warmupSets(60,20); return w.length>=3 && w[0].w<60; }));
ok('5 warmupSets rúd alatt üres', await page.evaluate(()=>warmupSets(20,20).length===0));
await page.evaluate(()=>openWarmup('bench')); await wait(150);
ok('5 bemelegítő lap renderel', (await page.$$('#sheet .wrow')).length>0);
await page.evaluate(()=>closeSheet()); await wait(120);
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

console.log('\n==== ÖSSZEGZÉS ====');
console.log('PASS:', pass, 'FAIL:', fail);
if(fails.length) console.log('BUKOTT:', JSON.stringify(fails,null,1));
console.log('JS HIBÁK:', errs.length? JSON.stringify([...new Set(errs)],null,1):'nincs');
await browser.close();
process.exit(fail===0 && errs.length===0 ? 0 : 1);
