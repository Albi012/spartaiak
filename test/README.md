# Tesztek

Két, egymást kiegészítő teszt-készlet – build és keretrendszer nélkül.

## 1. `merge-test.html` – szinkron-összefésülés (böngészőben)

Az `Auth.mergeGym` veszteségmentes összefésülésének regressziói (unió,
tombstone-ok, aktív edzés, dedup, idempotencia). Két módon futtatható:

```bash
python3 -m http.server 8099      # a repó gyökeréből

# kézzel, böngészőben – zölden kiírja az eredményt:
#   http://localhost:8099/test/merge-test.html

# parancssorból, kilépési kóddal (ez fut a CI-ben is):
node test/merge.mjs
```

A `merge.mjs` **nem tekinti sikeresnek a félbeszakadt tesztet**: ha az oldal
szkriptje menet közben elszáll, nem áll elő eredmény (`window.__RESULT__`), és
a futás piros – nem „0 bukás".

## 2. `e2e.mjs` – teljes felhasználói folyamat (Playwright)

Fejlécnélküli Chromiumban járja végig az appot: betöltés, téma, vezetett
edzés + naplózás + eszközök, napló (lenyitható izomtérkép), haladás
(statisztikák, izomtérkép-segédfüggvények), tervek/összeállító,
**superset-kör**, sérülés-mód. JS-hibát is elbukik.

Előfeltétel: statikus szerver (mint fent) + a Playwright elérhető.

```bash
# ha a Playwright helyben van telepítve (npm i -D playwright):
node test/e2e.mjs

# vagy globális Playwright + saját Chromium bináris:
NODE_PATH="$(npm root -g)" PW_CHROMIUM=/path/to/chromium \
  BASE_URL=http://localhost:8099 node test/e2e.mjs
```

Környezeti változók:

- `BASE_URL` – az app URL-je (alap: `http://localhost:8099`).
- `PW_CHROMIUM` – Chromium bináris útvonala, ha nem a Playwright-csomagé.

Kilépési kód `0`, ha minden assert zöld és nincs JS-hiba.

## CI

A `.github/workflows/tests.yml` minden push után lefuttatja mindkét készletet
(előbb a `merge.mjs`, utána az `e2e.mjs` – az utóbbi akkor is, ha az előző
elbukott, hogy egy futásból mindkét eredmény látszódjon). A Playwright a CI-ben
települ, **rögzített verzióval** (`1.56.1`, a hozzá tartozó Chromiummal); a
repóban nincs `package.json`. Ez **jelez, nem blokkol**: a Netlify deployt nem
állítja meg.
