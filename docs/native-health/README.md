# Natív Health-hozzáférés (alvásadat) – runbook

Ez a dokumentum azt írja le, hogyan élesíthető az **automatikus
alvás-behúzás** az Edzésnaplóban. Az **app-oldali szelet már kész** és
be van kötve (lásd lentebb); ami hátravan, az a **natív burok
(Capacitor) felépítése**, ami saját gép + fejlesztői fiókok + store-review
– ez a runbook végigvezet rajta.

> ⚠️ Ez **leváltja a `docs/android-twa` TWA-tervet** a mobilos kiadásra:
> a TWA (Chrome-fül) **nem éri el a Health Connectet**, web-app pedig a
> HealthKitet. Natív alvásadathoz Capacitor-burok kell.

## Mi van már kész (app-oldal, ebben a repóban)

- **Adatmező:** `S.sleep = { 'YYYY-MM-DD': {min, q} }` – alvott perc +
  minőség (1..5). Additív, független az edzésadattól; benne van a
  mentésben, backupban, restore-ban és a felhő-szinkron per-kulcs
  uniójában (`js/auth.js` → `'sleep'`).
- **UI:** főoldali „Alvás" kártya (`sleepHomeCard`) + rögzítő lap
  (`openSleepSheet`): időtartam-stepper, minőség 1–5, trend-grafikon,
  előzmények. Web-en kézi bevitel.
- **Híd:** `js/health.js` → `window.Health`. Web-en **inert**
  (`Health.available() === false`), a kártya kézi bevitel marad. Natív
  burokban a „Behúzás a Health-ből" gomb megjelenik a lapon, és
  `Health.syncSleep()` beolvassa az elmúlt éjszakát, majd a
  `Health.hooks.applySleep(day, min, q)` callbacken az app `S.sleep`-jébe
  menti (a bekötés az `index.html` végén van).

A `health.js` a natív olvasást egyetlen helyen (`readLastNightSleep`)
tartja, és több ismert plugin-metódusnevet próbál. A **konkrét plugin
API-jára** itt kell ráhangolni (lásd lent) – a többi kód
plugin-független.

## 1. Capacitor hozzáadása

A web-réteg marad az `index.html`; a Capacitor natív iOS/Android projektet
és egy JS↔natív hidat ad hozzá.

```bash
npm init -y
npm i @capacitor/core @capacitor/cli @capacitor/ios @capacitor/android
npx cap init "Edzésnapló" io.github.albi012.edzesnaplo --web-dir .
npx cap add ios
npx cap add android
```

- `--web-dir .` – a repó gyökere a web-réteg (nincs build lépés).
- A `capacitor.config` `server` szekciója maradjon üres (a becsomagolt
  fájlok futnak), vagy mutasson az éles URL-re, ha távoli tartalmat
  töltenél.

## 2. Health plugin

Válassz egy Capacitor health plugint, ami **mindkét** platformon tud
alvást (HealthKit `SleepAnalysis` + Health Connect `SleepSession`).
Telepítés után **igazítsd a `js/health.js` `readLastNightSleep` /
`requestPerm` hívásait a plugin tényleges API-jához** (metódusnév,
paraméter- és eredmény-alak). A `health.js` szándékosan több gyakori
alakot próbál, de a pontos szerződést a plugin dokumentációja adja.

Amit a plugintól használunk:
- **engedélykérés** alvás olvasásra,
- **lekérdezés** egy időintervallumra (elmúlt ~18 óra),
- eredmény: alvás-intervallumok (`start`, `end`, opcionális `stage`).

A `health.js` `aggregateMinutes()` összegzi az alvott perceket, az
egyértelmű „ébren/ágyban" szakaszokat kihagyva. Ha a plugin már
összesített percet ad, ott egyszerűsíthetsz.

## 3. iOS (HealthKit)

- **Apple Developer fiók** ($99/év), **Mac + Xcode**.
- Xcode → Signing & Capabilities → **+ HealthKit**.
- `Info.plist`:
  - `NSHealthShareUsageDescription` = pl. „Az Edzésnapló az alvásidőt az
    összegzőhöz és a trendekhez olvassa be. Az adat a te eszközödön
    marad."
- Olvasási típus: `HKCategoryTypeIdentifierSleepAnalysis`.
- Build/futtatás: `npx cap open ios`, majd Xcode-ból eszközre.
- App Store review: egészségadatra szigorúbb; kell a `privacy.html`
  (megvan), és a HealthKit-adat nem használható reklámra.

## 4. Android (Health Connect)

- **Android Studio**.
- `AndroidManifest.xml`: `android.permission.health.READ_SLEEP`, és a
  Health Connect láthatósági intent-filter/permission-rationale a plugin
  útmutatója szerint.
- Health Connect a rendszerben (Android 14+ beépített; korábbin külön
  alkalmazás).
- **Google Play Health Connect nyilatkozat/jóváhagyás:** az alvás
  érzékeny adattípus – a Play Console-ban külön kérni és indokolni kell a
  hozzáférést, plusz adatvédelmi nyilatkozat. Ez valódi kapu, tervezz rá
  időt.
- Build/futtatás: `npx cap open android`.

## 5. Élesítés-ellenőrzés

- Web (Netlify/GitHub Pages): a kártya **kézi bevitel** marad, „Behúzás"
  gomb nincs – ez a helyes fallback.
- Natív buildben: a lapon megjelenik a **„Behúzás a Health-ből"** gomb;
  megnyomásra engedélykérés, majd az elmúlt éjszaka betöltődik a
  stepperbe (még mented gombbal rögzíted – vagy a
  `Health.hooks.applySleep` azonnal ment, ha csendes szinkront kötsz be).
- Ha nem jön adat: a plugin API-illesztést ellenőrizd a
  `readLastNightSleep`-ben (a leggyakoribb hiba a metódusnév/eredmény-alak
  eltérése).

## Adat marad a felhasználónál

Az alvásadat a `gymlog_v1`-ben, a felhasználó eszközén tárolódik
(a felhő-szinkron opcionális, uniós). A HealthKit/Health Connect nyers
adatát nem visszük szerverre – csak az összesített napi percet + minőséget
mentjük. Az `privacy.html` fedi ezt; store-beadás előtt frissítsd, ha
kell.
