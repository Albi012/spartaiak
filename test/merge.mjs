/* Edzésnapló – a szinkron-összefésülés tesztjeinek futtatója (Playwright).
 *
 * A `merge-test.html` böngészőben fut (az `Auth.mergeGym` regressziói), ez a
 * script fejlécnélküli Chromiumban megnyitja, és a kilépési kóddal jelzi az
 * eredményt – így CI-ben is használható.
 *
 * Futtatás (statikus szerver a repó gyökeréből, pl. `python3 -m http.server 8099`):
 *   node test/merge.mjs
 * Környezeti változók:
 *   BASE_URL     – az app URL-je (alap: http://localhost:8099)
 *   PW_CHROMIUM  – Chromium bináris útvonala (ha nem a Playwright-csomagé)
 * Kilépési kód 0, ha van eredmény, minden zöld és nincs JS-hiba.
 *
 * Fontos: a „zöld" itt NEM a hiba hiányát jelenti. Ha a teszt-oldal szkriptje
 * menet közben elszáll, sosem áll elő az eredmény (`window.__RESULT__`), és a
 * futás PIROS – nem „0 bukás". Egy félbeszakadt teszt nem lehet sikeres.
 */
import { createRequire } from 'node:module';
const { chromium } = createRequire(import.meta.url)('playwright');

const BASE = process.env.BASE_URL || 'http://localhost:8099';
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM || undefined });
const page = await browser.newPage();
const errs = [];
page.on('pageerror', e => errs.push(String(e)));

let code = 1;
try {
  await page.goto(BASE + '/test/merge-test.html');
  await page.waitForFunction(() => window.__RESULT__, null, { timeout: 20000 });
  const r = await page.evaluate(() => window.__RESULT__);
  const bukott = await page.evaluate(() =>
    [...document.querySelectorAll('#out li')]
      .filter(li => li.querySelector('.fail'))
      .map(li => li.textContent.replace(/^\s*✗\s*/, '')));
  console.log('merge-teszt: PASS', r.pass, 'FAIL', r.fail);
  if (bukott.length) console.log('BUKOTT:', JSON.stringify(bukott, null, 1));
  if (errs.length) console.log('JS HIBÁK:', JSON.stringify([...new Set(errs)], null, 1));
  if (r.pass === 0) console.log('Egyetlen ellenőrzés sem futott le – ez nem lehet sikeres.');
  code = (r.fail === 0 && r.pass > 0 && errs.length === 0) ? 0 : 1;
} catch (e) {
  console.log('A merge-teszt nem futott le végig:', e.message);
  if (errs.length) console.log('JS HIBÁK:', JSON.stringify([...new Set(errs)], null, 1));
} finally {
  await browser.close();
}
process.exit(code);
