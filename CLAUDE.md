# Edzésnapló – projektkontextus

Egyfájlos webalkalmazás (`index.html`), amit telefonon, edzés közben,
egy kézzel használnak. Netlifyra van deployolva, a kezdőképernyőről indul.

## ⚠️ ÉLES ADAT VAN BENNE – ezt ne törd el

A felhasználónak valódi, több hetes edzésnaplója van a böngésző
localStorage-ában. Refaktor során a **kulcsnév és a JSON-alak nem
változhat**, hacsak nem írsz hozzá migrációt, ami a régi kulcsot
beolvassa és átalakítja.

**Kulcs:** `gymlog_v1`
**Érték:** JSON string

```json
{
  "sessions": [
    {
      "day": "pa" | "la" | "pb" | "lb",
      "t": 1753804800000,
      "log": {
        "<gyakorlatId>": { "w": 55, "sets": [5, 10, 11, null] }
      }
    }
  ],
  "active": null,
  "weights": { "<gyakorlatId>": 55 },

  "notes":  { "<gyakorlatId>": "állandó jegyzet (padszög, technika)" },
  "photos": { "<gyakorlatId>": "data:image/jpeg;base64,... (gépbeállítás)" },
  "injury": { "parts": ["mell"], "since": 1753804800000 },
  "lastBackup": 1753804800000,

  "customEx": { "cx_abc123": { "id":"cx_abc123","n":"Bolgár kitörés","mg":"láb","s":3,"r":"10","w":20,"inc":2.5,"rest":90 } },
  "routines": [ { "id":"r_abc123","name":"Láb nap","sub":"4 gyakorlat","ex":["legcurl","cx_abc123"] } ],
  "programs": [ { "id":"p_abc123","name":"Heti terv","days":["pa","r_abc123"] } ]
}
```

- `w` – az adott edzésen használt súly kg-ban. Testsúlyos gyakorlatnál
  0 vagy a hozzáadott súly.
- `sets` – tömb, elemenként az adott szettben megcsinált ismétlésszám.
  `null` = a szett nem lett rögzítve.
- `weights` – az utoljára használt súly gyakorlatonként; ebből számol
  a program progressziót a következő edzésre.

**Bővített, additív mezők** (visszafelé kompatibilisek – a régi
`gymlog_v1` adat migráció nélkül betöltődik, a hiányzó kulcsok
alapértéket kapnak; a `save()`/`backup()`/`restore()` viszi őket):

- `notes` – gyakorlathoz kötött **állandó** jegyzet (padszög, ülésmagasság,
  technikai emlékeztető).
- `photos` – gyakorlathoz kötött fotó (gépbeállítás-emlékeztető),
  lekicsinyítve (max 800px, JPEG ~0.6) base64 dataURL-ként.
- `injury` – sérülés-mód: a `parts` a terhelt testtájak (`mg` értékek).
  Új edzés indításakor az érintett gyakorlatok kimaradnak, a többi
  súlya −15%. `null` = kikapcsolva.
- `lastBackup` – az utolsó biztonsági mentés ideje; ebből jön a havi
  mentés-emlékeztető.
- `bw` – **napi testsúly-napló**: `{ 'YYYY-MM-DD': kg }` alak, naponta egy
  érték (felülírható). Additív, FÜGGETLEN az edzésadattól – a `startW`-t /
  progressziót NEM érinti. Edzés nélküli napon is rögzíthető: a főoldalon
  állandó „Napi testsúly" kártya (`bwHomeCard`) nyitja a lapot (`openBwSheet`
  → stepper ±0,1/±0,5/±1, trend-grafikon `bwChart`, utolsó napok listája;
  a lista sorára koppintva az adott nap szerkeszthető). A felhő-szinkron
  per-kulcs (dátum) unióban viszi (`auth.js` `bw` mező); törlés nincs, csak
  felülírás, így tombstone sem kell. `bwKey(t)` a helyi dátumkulcs.
- `sleep` – **alvás-napló**: `{ 'YYYY-MM-DD': {min, q} }` (alvott perc +
  minőség 1..5), naponta egy érték (felülírható). Ugyanaz a minta, mint a
  `bw`: additív, edzéstől független, per-kulcs (dátum) unióban szinkronizál
  (`auth.js` `sleep`). Főoldali „Alvás" kártya (`sleepHomeCard`) → lap
  (`openSleepSheet`: időtartam-stepper ±15p, minőség 1–5, `slpChart`,
  előzmények). **Natív Health-behúzás:** a `js/health.js` (`window.Health`)
  Capacitor-hídon HealthKit (iOS `SleepAnalysis`) / Health Connect
  (Android `SleepSession`) alvást olvas; web-en INERT
  (`Health.available()===false`) → kézi bevitel. A lap „Behúzás a
  Health-ből" gombja csak natív burokban látszik; a `Health.hooks.applySleep`
  callback menti az `S.sleep`-be. Runbook: `docs/native-health/README.md`
  (ez leváltja a TWA-tervet, ha natív egészségadat kell). `slpFmt` a
  perc→„7ó 45p" formázó.
- `rdy` – a **készenlét-pontszám** tényező-kapcsolói:
  `{sleep:1, load:1, bw:1, rest:0}` alak, hiányzó kulcs = alapértelmezés
  (`RDY_DEF`). SKALÁR preferencia: a felhő-összefésülésben az újabb állapotból
  jön (mint az `injury`/`hidePlan`), nincs külön kezelés. Maga a PONTSZÁM
  NEM tárolódik – mindig a naplóból számoljuk (lásd „Készenlét").
- Session-szinten: `note` (aznapi jegyzet), `noteEx` (**melyik gyakorlatnál
  írtad** – gyakorlat-ID; additív, régi edzésen hiányzik, olyankor csak a
  jegyzet látszik; az ELSŐ írásnál rögzül és marad, a jegyzet kiürítésekor
  törlődik), `deload` (kihagyás utáni
  visszaépítés jelző), `end` (befejezés időbélyege – az időtartamhoz;
  additív, régi edzésen hiányzik, olyankor nincs időtartam). Log-szinten:
  `why` (`busy`|`heavy`|`time` – miért tért el a tervtől).
- Az **edzés-összegzés** és a **napló** kártya egy stilizált, elöl+hátul
  **izomtérképet** (`muscleMap`) mutat: a `sessionMgSets` szettszáma szerint
  színezi a terhelt izomcsoportokat (`mg`), a nem-célzottak halvány
  sziluettek (`currentColor`, téma-követő). A naplóban a térkép
  lenyitható (`<details class="mmfold">`, alapból zárva). A szín **folytonos hőskála**
  (`mmAttr`): `color-mix()`-szel keveri a `--brass`→`--red` tokeneket a
  szettszám arányában (`MM_CAP`=12 fölött csupa piros), a telítettséget az
  opacitás adja – így téma-követő marad. A `mgChips` a szám-összesítő,
  az `mmLegend` a skála-jelmagyarázat. A **Haladás** fülön a `weeklyMgSets`
  az aktuális hét terhelését mutatja ugyanezzel a térképpel, kiemelve az
  ezen a héten kimaradt (`MGS`-ből hiányzó) izomcsoportokat.
- A PLAN gyakorlatok `mg` mezője (izomcsoport: mell, hát, váll, tricepsz,
  bicepsz, láb, törzs) a sérülés-módot és a szűrést hajtja. Ez NEM
  azonosító – szabadon hangolható.

**Okos súlyjavaslat:** a `startW`/`smartInc` a cél feletti túlteljesítés
arányában nagyobbat lép (nem fix +inc). Kihagyás (>10 nap) esetén a
`startDay` visszalépést (−15%) ajánl.

**A PLAN alapértelmezett `w` súlyai semleges, kezdő szintűek** – ezt egy
üres naplójú, új felhasználó látja első indításkor. A tulajdonos SAJÁT
számai ettől függetlenek: a `startW(id)` először a böngészőben tárolt
`weights[id]`-t (progresszióval korrigálva) használja, és csak history
nélküli gyakorlatnál esik vissza a PLAN `w`-re. Ezért a PLAN `w`
csökkentése a régi felhasználónak láthatatlan, csak a friss kezdőnek ad
biztonságos kiindulást. A `w` szabadon hangolható (NEM azonosító).

**Progressziós programok (`prog`):** választható, gyakorlatonkénti
szabály, hogy a súly hogyan lépjen a következő edzésre. Kulcsolt, additív
mező: `prog[exId] = 'linear'|'greyskull'|'double'|'off'` (a `'smart'` =
alapértelmezés, NEM tárolódik, törlődik a kulcs). A `progNext(id, L)` a
következő súlyt + indoklást a naplóból származtatja (nincs elmentett
számláló). A `startW` és a player-hint ezt használja; a hintre koppintva
az `openProgPolicy` választó nyílik (a gyakorlat-jegyzet lapról is elérhető).
Szinkron: per-kulcs unió a `weights`/`notes`/… mellett.

## Gyakorlat-azonosítók – NE nevezd át őket

Ezek kulcsként szerepelnek a mentett adatokban. Átnevezésük
adatvesztéssel egyenértékű.

```
Push A: bench, dip, incdb, ohpdb, lat, push, hipabd
Pull A: pull, row, cable, face, curl, hammer, hipabd
Push B: ohp, dbbench, dipbw, machinc, french, plank
Pull B: tbar, wide, onerow, legcurl, rear, knee
Archív (már nincs a tervben, de van rá rögzített adat): rack, abs, hyp

Megjegyzés: a PLAN 2025-ös átírásakor néhány ID neve/mozgása változott a
felhasználó terve szerint (pl. `row`/`tbar` = hasalva kézisúlyzós evezés,
`machinc` = ferdepad Smith-gépben). Az ID-k a naplóadat kulcsai, ezért NEM
lettek átnevezve – csak az `n`/paraméterek. A `hipabd` (oldalfekvő
csípőtávolítás) új, a `hyp` az ARCHIVE-ba került.
```

A `LIB` (beépített gyakorlat-könyvtár, `x_…` előtagú ID-k) ~160 további
gyakorlatot ad a választóhoz, izomcsoportra szűrhetően. Ezek is
kulcsként szerepelhetnek a naplóban – **NE nevezd át őket**. Az `exDef`
a PLAN → customEx → LIB → ARCHIVE sorrendben old fel.

Az `ARCHIVE` objektum azért van, hogy a tervből kivett gyakorlatok
neve feloldható maradjon a naplóban. Ha kiveszel egy gyakorlatot a
`PLAN`-ból, tedd át az `ARCHIVE`-ba – különben a régi adat
azonosítóként jelenik meg a felületen.

## Gyógytorna / mobilitás oldal

Külön nézet (`physioView`, `tab==='physio'`, NEM a bottom-navban – a
felső sáv **állandó gyógytorna-ikonjáról** (`physioBtn`) és a sérülés-mód
kártyájáról nyílik; a főoldali belépő-gomb kikerült, ott csak zaj volt).
**5 perces rutin testtájanként:** a `startPhysioRoutine(rid)` a meglévő
lejátszót indítja egy `physio_<testtáj>` szintetikus napra (`dayDef`/`exDef`
feloldja a `rh_` gyakorlatokat `physioExDef`-fel: 1 szett, testsúly, rövid
váltás; a tartásokat a plank-óra méri). Ez **nem edzés**: a `finish()`
`isPhysioActive()` esetén NEM naplóz (nem szennyezi a statokat/streaket),
csak lezár. A lejátszóban physio-módban nincs súlyállító/eszközsáv. A `REHAB` katalógus testtájankénti (`REGION_MG`: váll/hát/csípő/
térd/boka/törzs) mobilitás-, nyújtó- és stabilizáló gyakorlatok
gyűjteménye – **referencia, nem orvosi tanács** (a lapon kötelező
figyelmeztetés). Minden tétel: rövid `cue` + cél + „Videó" link
(`videoUrl`) + „Felvétel gyakorlatként" (`addRehabAsCustom` → `customEx`,
így edzésbe tehető és naplózható). A `REHAB`/`rh_…` ID-k referencia-ID-k
(nem naplókulcsok); a felvételkor friss `cx_…` ID keletkezik. **NE
minősíts sérülést és NE írj elő kezelést** – csak általános mozgásanyag.

## Edzés-összeállító (saját gyakorlatok / edzések / tervek)

**Kész sablonok:** a `STARTER_ROUTINES` (edzés-sablonok) és
`STARTER_PROGRAMS` (terv-sablonok) beépített, csak beépített gyakorlat-ID-kra
(PLAN + LIB) hivatkozó minták. A főoldali „Kész edzések és tervek" (`openStarters`)
katalógusból a „Hozzáadás" a felhasználó SAJÁT `routines`/`programs` közé
MÁSOLJA őket friss `r_`/`p_` ID-vel (`addStarterRoutine`/`addStarterProgram`) –
így szerkeszthetők és szinkronizálnak. A sablonok maguk nem tárolódnak a
`gymlog_v1`-ben, csak a másolatuk.

- **Saját gyakorlat** (`customEx`): a felhasználó által létrehozott
  gyakorlat, `cx_…` előtagú, ütközésmentes ID-vel. Az `exDef(id)` a
  PLAN → customEx → ARCHIVE sorrendben old fel.
- **Saját edzés** (`routines`): `{id:'r_…', name, sub, ex:[exId,…]}` +
  opcionális `exOv` (gyakorlatonkénti előírás, lásd „AI-terv importálása")
  és `at` (létrehozás ideje), ahol
  az `ex` beépített VAGY saját gyakorlat-ID-kat hivatkoz. A `dayDef(id)`
  egységes `{id,name,sub,ex:[def,…]}` alakot ad vissza PLAN-ra és
  routine-ra is; a hívók ezt használják (nem `PLAN.find`-ot).
  - **Superset/kör** (additív): opcionális `ssLinks:[exId,…]` a routine-on –
    a benne szereplő ID a listában a FÖLÖTTE lévő gyakorlathoz kapcsolódik.
    A `deriveGroups(exIds, ssLinks)` egymást követő kapcsolt elemekből 2+
    elemű köröket származtat. Induláskor a `startDay` a ténylegesen felvett
    (sérülés miatt ki nem hagyott) tagokra szűrve elmenti az aktív edzésre
    (`active.ss = [[exId,…],…]`). A lejátszó a kör tagjai közt csak rövid
    váltás-pihenőt (`SS_SWAP`) indít és a következő tagra ugrik; a teljes
    pihenő a kör VÉGÉN jön, majd visszalép az első befejezetlen tagra. Az
    `ssLinks` a routine-nal együtt szinkronizál (id-unió), külön kezelés
    nélkül. **NE nevezd át** – kulcsként hivatkozott ID-kra épül.
- **Edzésterv** (`programs`): `{id:'p_…', name, days:[dayId,…]}` – több
  edzést (beépített napot vagy saját routine-t) fog össze. A főoldalon
  szekcióként jelenik meg.
- A `startDay` az aktív edzésre elmenti a `dayName`-et, hogy egy törölt
  routine naplózott edzése is nevesíthető maradjon.
- **NE nevezd át** a `cx_…`/`r_…`/`p_…` ID-kat – ezek is kulcsként
  szerepelnek a mentett adatban.

## AI-terv importálása

A Tervek fül „AI-terv importálása" gombja (`openAiImport`) egy külső AI
edzőtől kapott edzéstervet alakít saját edzéssé/tervvé. **NEM hív LLM-et**
(offline, kulcs nélkül) és **NEM írja felül** a meglévő tervet – additív,
biztonságos import:

- A lap egy **személyre szabott, másolható promptot** ad (`buildAiPrompt`),
  ami a naplóból összeállított „rólam" kontextussal indul (`aiUserContext`:
  jelenlegi terv, edzésgyakoriság, fő munkasúlyok, 28-napos izomcsoport-
  egyensúly az `aiMgBalance`-ból + elhanyagolt csoportok, testsúly-trend,
  átlagos alvás, sérülés-mód), majd kitöltendő célok (cél / heti edzésszám
  / felszerelés / tapasztalat), végül a KÖTÖTT kimeneti formátum
  (`AI_FORMAT_BLOCK`: `NAP: <név>` sorok, alattuk
  `- <gyakorlat> | <s>x<r> | <súly/testsúly> | <pihenő>`). A pihenő
  másodpercben értendő, de a „2 perc" / „3'" alak is átjön (60-nal szoroz) –
  e nélkül a 2 a minimumra (10 mp) csúszna.
  A blokk **kimondott szabályokat** ad az edzőnek: soronként egy gyakorlat,
  mind a négy mező, konkrét szám (nem tartomány), a pihenő másodpercben, és
  külön a **testsúlyos eset** – ott a súly-mező a PLUSZ terhelés
  („testsúly", vagy „+10"), soha nem a felhasználó testsúlya. A prompt azt
  is kimondja, hogy az app a számokat SZÓ SZERINT átveszi (lásd `exOv`), így
  az edző reális kezdősúlyt ad.
  **A blokkban lévő PÉLDÁT az `aiParsePlan`-nak hibátlanul vissza kell tudnia
  olvasnia** – erre E2E-teszt van (20. szekció), ez tartja szinkronban a
  formátumot és a parsert. Ha a példát bővíted, csak olyan sorral, ami
  átmegy rajta.
  Az `aiUserContext` munkasúly-listája **név szerint deduplikál** (több ID
  viselheti ugyanazt a nevet, pl. `row`/`tbar`) és jelöli a testsúlyos plusz
  terhet, hogy az edző ne gondolja munkasúlynak. A kontextus csak
  származtatott összefoglaló (nincs nyers napló-export). Az
  `AI_FORMAT_BLOCK` alakját ne változtasd az `aiParsePlan` igazítása nélkül.
- `aiParsePlan(text)` toleráns parser (pipe-formátum ÉS szabad szöveg is);
  soha nem dob. `aiParseExLine` a sor-értelmező.
- `aiMatchEx(name)` a beírt nevet az `exLibrary()`-hez párosítja (token-
  átfedés + tartalmazás, küszöb 0.6). Ha talál, a **meglévő ID-t
  használja** → a súlytörténet összekapcsolódik; ha nem, `aiGuessMg`-vel
  becsült izomcsoporttal új `cx_` gyakorlat készül.
- Előnézet (`aiProcess`→`aiPreviewHtml`) mutatja, mi kötődik meglévőhöz
  (✓) és mi új (+); a `aiImportApply` naponta egy `r_` routine-t hoz létre
  (több nap esetén egy `p_` tervbe fűzve), majd a főoldalra visz. A PLAN
  és a meglévő routine-ok érintetlenek.
- **Az edző ELŐÍRÁSA megmarad** (`routines[i].exOv`, additív):
  `{ exId:{s, r, rest, w?} }` – a meglévő ID-re párosított gyakorlatoknál is.
  E nélkül a routine csak ID-ket tárolna, és a nap a gyakorlat SAJÁT
  alapértékeivel + a te munkasúlyoddal jelenne meg – vagyis az edző 5×3 @
  80 kg / 240 mp előírásából 4×5 @ 62,5 kg / 180 mp lenne. A `dayDef`
  olvasztja rá a defre (`ovW:1` jelzi az előírt SÚLYT); a gyakorlat-ID és a
  `weights` érintetlen, a súlytörténet tehát összekötve marad.
  A routine `at` mezője az import ideje. A `startDay` az előírt súlyt addig
  használja, amíg az adott gyakorlatot az import ÓTA nem edzetted le
  (`lastForT(id) <= at`) – utána a saját haladásod viszi tovább, miközben a
  szett/ismétlés/pihenő marad az előírás. A lejátszó ki is írja
  („Az edzésterv előírása: …"), hogy a szám ne legyen megmagyarázatlan.
  **Testsúlyos gyakorlatnál a súly a PLUSZ terhelés**, tehát ott is van
  értelme az előírásnak, mindkét irányban: explicit szám → `w` (pl. +12,5 kg
  húzódzkodásra), „testsúly" pedig `w:0` (= NINCS plusz teher) – e nélkül a
  korábbi plusz súlyod jönne fel, pedig az edző nem azt kérte. A „testsúly"
  csak akkor ad `w:0`-t, ha a feloldott gyakorlat maga is testsúlyos
  (`base.bw`); egyébként nem nyúlunk a súlyhoz.
- **Több nap esetén az új terv AKTÍVVÁ is válik** (`S.activeProgram`).
  Ez nem szépészeti: a főoldal csak az aktív terv napjait mutatja, a „Saját
  edzések" szekció pedig kihagyja azokat a routine-okat, amik tervhez
  tartoznak – aktiválás nélkül tehát az importált napok SEHOL nem
  látszanának, és a felhasználó úgy élné meg, hogy az import „felülíródott".
  A régi terv nem vész el: egy koppintás a főoldali „Aktív edzésterv"
  választóban. Ha ezt átírod, a láthatóságot biztosítsd máshogy.

## Heti összefoglaló edzőnek

A Napló fül „Heti összefoglaló edzőnek" gombja (`openWeeklyExport` →
`weeklyReport`) másolható/megosztható szöveget ad egy AI vagy valódi
edzőnek: az edzések a szettekkel, az eltérés-okokkal és a jegyzetekkel.

**Az időablak az AKTUÁLIS NAPTÁRI HÉT** (`weekStart(Date.now())`-tól, hétfő
00:00), NEM gördülő 7 nap – a szöveg „heti összefoglalót" ígér, és egy
vasárnapi edzés nem tartozik a hétfőn kezdődő héthez. Ugyanazt a
`weekStart`-ot használja, mint a hetes sorozat és a heti izomtérkép, így a
felület egységesen érti a „hetet". Ha ezen a héten még nincs edzés, az
utolsó 3 megy el, és a fejléc ezt meg is mondja („ezen a héten még nem volt
edzés") – nem tesz úgy, mintha heti anyag volna.

## Készenlét (readiness)

Egyetlen napi szám (0..100), ami az app fő tájékozódási pontja. A
`readiness(t)` **a naplóból származtatja** – nincs elmentve, nincs hozzá új
adatmező (a `rdy` kapcsolókon kívül), és **bármely múltbeli napra
kiszámolható**, csak az addigi adatokból. Ezért működik visszamenőleg a
napló-sorokon és a haladás-grafikonon is.

- **Alap:** `RDY_BASE` (80) a semleges kiindulás; a tényezők ehhez adnak
  vagy vesznek, az eredmény 0..100 közé vágva.
- **Tényezők** (`RDY_DEF`, mind ugyanazt az alakot adja –
  `{id,n,ok,delta,val,why,pct,tone}`):
  - `sleep` (`rdySleep`) – a legutóbbi éjszaka a SAJÁT 14 napos mediánhoz
    mérve (1 óra eltérés ≈ 10 pont), a bevallott minőség finomít. −20..+12.
  - `load` (`rdyLoad`) – az utolsó 7 nap szettszáma a saját 4 hetes heti
    átlagához: `delta = clamp(−(arány−1)·40, −20, +6)`.
  - `bw` (`rdyBw`) – 7 napos átlag az előző héthez. **Csak a gyors fogyást
    bünteti** (−8-ig); a stabil és a hízás nem húz le.
  - `rest` (`rdyRest`) – eltelt napok a legutóbbi edzés óta. **Alapból KI**.
- **Becsületesség (ezt ne rontsd el):** ha egy tényező még nem tud
  pontozni, `ok:false` és a delta 0 – NEM tippel és nem is nulláz. Ha
  egyetlen bekapcsolt tényezőhöz sincs adat, a `readiness()` **null**-t ad,
  és a felület el sem kezdi mutatni a számot. Egy kitalált pontszám az egész
  kezdőlapot hiteltelenné tenné.
- **„Nincs adat" ≠ „nem tud még pontozni".** Ha a felhasználó MA rögzített
  testsúlyt vagy alvást, azt a `val` mezőben ki KELL írni (halványan), a
  delta-oszlopban `–`, a `why`-ban pedig azt, hogy pontosan mi hiányzik
  (pl. „még 3 éjszaka kell", „ezen a héten még egy mérés kell"). „Nincs
  adat"-ot írni olyasmire, amit épp most vitt be, hazugság – ne vezesd
  vissza.
- **Sávok** (`rdyBand`): ≥78 „jó" (`--sage`), ≥65 „közepes" (`--brass`),
  alatta „alacsony" (`--red`). Színt mindig téma-tokenből vegyél.
- **Memoizálás:** `_rdyCache` naponta egyszer számol (a napló sok sort kér);
  a `save()` a `rdyInvalidate()`-tel üríti. Ha a számítást bővíted, az
  ürítést tartsd meg.
- **Hol jelenik meg** (a hat képernyő a `docs/`-ban hivatkozott
  „Készenlét" tervből):
  1. **Kezdőlap** – `rdyHomeCard()`: gyűrű + ítélet + a bekapcsolt tényezők
     egy-egy sora + „Miből jön ez a szám?".
  2. **Részletek-lap** – `openRdySheet()`: tényezőnkénti hozzájárulás
     (`+6`/`−4`/`±0`) magyarázó mondattal, 14 napos trend, és a
     **kapcsolók** (`rdyToggle`). Nem fekete doboz.
  3. **Lejátszó** – `.rdystrip` a fejléc alatt: a készenlét tanácsot ad a
     súlyra. **CSAK tájékoztat – a súlyt soha nem állítja el.** Ezt tartsd meg.
  4. **Összegző** – `rdyForecastCard()`: mit csinál a mai terhelés a HOLNAPI
     készenléttel. Előrejelzésként jelöljük, mert a holnapi alvás ismeretlen.
  5. **Haladás** – „átlag készenlét" stat + 30 napos görbe (`rdySpark`,
     a hézagokat átugorja) + `rdyTrendLabel` (egyenes-illesztés, nem
     átlagfelezés).
  6. **Napló** – edzés-soron a készenlét a meta-sorba fűzve
     (`logRdyInline`), és **a pihenőnap is sor** (`logRestDays` /
     `logRestRow`): az a nap, amin nem volt edzés, de rögzítettél testsúlyt
     vagy alvást. A `logKind` (Mind / Edzés / Pihenő) nézet-állapot, NEM
     tárolódik.

## Technika-animációk (GIF)

Gyakorlatonként egy rövid, hurkolt **technika-animáció** (180×180 GIF) a
`gif/` mappában. Ez a bedrótozott „Technika videó" link **kiegészítése**,
nem a helyettesítője.

- **Térkép:** `GIFX[exId] = '<fájl-alapnév>'` (a `.gif` nélkül), az
  `index.html`-ben a `VIDEO` blokk után. 159 gyakorlat, 145 fájl (néhány
  ID ugyanazt az ábrát használja, pl. `dip`/`dipbw`). A PLAN mind a 26
  gyakorlata le van fedve. **A fájlneveket NE nevezd át** – a térkép
  ezekre hivatkozik.
- **Segédek:** `gifUrl(e)` → `'gif/<név>.gif'` vagy `null`;
  `gifBox(e,{w})` → a nagy ábra + kötelező forrásmegjelölés;
  `gifThumb(e)` → 44px-es lista-bélyegkép. Mindkettő `loading="lazy"`.
- **Hol jelenik meg:** gyakorlat-jegyzet lap (`openNoteSheet('ex')`),
  haladás-részletlap (`openProgDetail`), és bélyegképként a
  gyakorlatválasztóban (`pickerRowsHtml`, a lap alján egyszeri
  forrásmegjelöléssel).
- **Sötét téma:** az ábrák fehér alapúak, ezért a `--gif-filter` token
  sötétben tompít (`brightness(.8)`), világosban `none`. Új színt itt is a
  `:root`-on adj alapértéknek.
- **Offline:** a GIF-ek **NEM részei a `sw.js` APP_SHELL-jének** – az
  app-héj könnyű marad, az ábrák futásidőben (megtekintéskor)
  cache-elődnek a cache-first ághoz. Ezt ne írd át.
- **Jogok:** az ábrák © **Gym visual** (gymvisual.com), a
  `hasaneyldrm/exercises-dataset` gyűjteményből. A forrásmegjelölést a
  `gifBox()` és a választó lap alja írja ki – **ne vedd ki**. Részletek:
  `gif/ATTRIBUTION.md`.
- Saját gyakorlat (`cx_…`) és gyógytorna-tétel (`rh_…`) nem kap ábrát; a
  `gifBox`/`gifThumb` ilyenkor üres stringet ad (nincs törött kép).

## Ikonok

A felület ikonjai **monokróm inline SVG-k** (`ICON` objektum,
`currentColor`), NEM unicode-glyphek/emojik – így a témát követik és nem
válnak platformonként színes emojivá. Új ikon is így kerüljön be; a
statikus gombok/nav ikonjait a `paintIcons()` tölti be induláskor.

## Mikro-interakciók

Kis, teremben is érezhető visszajelzések – mind `prefers-reduced-motion`
alatt kikapcsol (`reducedMotion()`), a haptika opcionális (`navigator.vibrate`):

- **Szett-rögzítés:** rövid rezgés (`vibrate(12)`) + a frissen felvett
  chip pipa-pulzusa (`justSet` → a `render` a `.chip[data-i]`-re teszi a
  `.pop` osztályt egyszer). Az idő-alapú gyakorlat (`finishTimerSet`) is a
  `setRep`-en megy át, így ugyanezt kapja.
- **Nézetváltás:** a `render` csak akkor csomagolja `document.startViewTransition`-be
  a festést, ha a **nézet-kulcs** (`_viewKey` = fül / player / szerkesztő)
  ténylegesen változott – az in-view frissítések (súlyállítás, mentés) NEM
  animálnak. Az `#app` `view-transition-name:appview`, a régi/új
  cross-fade + kis emelkedés.
- **Count-up:** a nagy stat-számok (`[data-cu]`) 0-ról a valós értékre
  pörögnek fel belépéskor (`runCountUps`, csak nézetváltáskor fut, nem
  minden `render`-nél).
- **Húzható alsó lap:** a `#sheetIn`-en lefelé húzva (felül állva,
  `scrollTop<=0`) bezárul; a `.sheet.drag` alatt nincs belépő-anim, a
  `.sheet.snap` a visszapattanás. A háttérre koppintás továbbra is zár.
- **Belépő animáció (`enterAnim`)**: nézetváltáskor (és első festéskor) az
  `#app` kap egy `.enter` osztályt ~1,1 mp-re, amire a CSS a `.wrap>*`
  kártyák **lépcsőzetes beúszását** akasztja (`riseIn`, 35 ms-os lépcsők,
  a 9. elemtől azonos késleltetés), plusz a `.mgfill` sávok kirajzolódását
  (`growX`), a `.miniring` pukkanását, az izomtérkép/heatmap/grafikonok
  halvány beúszását. A View Transition emiatt már **tiszta cross-fade**
  (nincs benne eltolás) – az irányt a kártya-lépcsőzet adja.
- **Festés utáni horgok:** a `render` a belépő animációt és a
  `runCountUps`-ot a festéssel EGY egységben (a `paint` callbacken belül)
  futtatja, így a View Transition ágon is a friss DOM-ra kerülnek.
- **Overlay-nyitás:** `.sheet/.modal/.rest/.photo` háttér lágy `fadeIn`,
  a modál-kártya és a fotó `popIn` rugóval; az alsó nav aktív ikonja
  `navPop`-ot pukkan váltáskor. Mind csak megjelenés, funkciót nem érint.

## Tárolás

`window.storage`-ot próbál először (ez csak Claude-artifactként fut),
`localStorage` a tartalék. Éles használatban mindig a localStorage fut.
Ha kiveszed a `window.storage` ágat, a `readKey`/`writeKey` interfészt
tartsd meg – a hívási helyek arra épülnek.

**Téma-preferencia:** külön `gymlog_theme` kulcs (`light` | `dark`;
hiánya = rendszerkövetés). Ez FÜGGETLEN a `gymlog_v1` edzésadattól –
a témaváltás soha nem érinti a naplót.

**Onboarding-jelző:** külön `gymlog_onboarded` kulcs (`'1'` = látta a
bemutatót). Szintén FÜGGETLEN a `gymlog_v1`-től. Az `openWelcome` első
indításkor jön (üres napló + nincs jelző); a fiók-lapról bármikor
újranyitható.

**Beállítás-kulcsok** (mind FÜGGETLEN a `gymlog_v1`-től): `gymlog_mute`
(`'1'` = pihenő-hang ki), `gymlog_noteday` (`'1'` = a lejátszó jegyzet-gombja
alapból a NAP jegyzetét nyitja; hiánya/`'0'` = az éppen mutatott
gyakorlatét – lásd „Jegyzetelés"), `gymlog_notify` (`'1'` = időzítő rendszer-
értesítésben). Utóbbi: a `tick()`/`stTick()` háttérben (`document.hidden`)
háttérváltásonként **EGYSZER**, némán posztol egy „folyamatban" értesítést
(`timerNotif`, SW `showNotification`, `rest`/`hold` tag) – NEM
másodpercenként, mert az újraposzt a lezárt telefonon minden alkalommal
felébreszti a képernyőt. A `_restNotifShown`/`_holdNotifShown` zászló
biztosítja az egyszeriséget; visszatéréskor / új időzítőnél / leállításkor
nullázódik. A végén egy hangos „letelt" értesítés jön;
visszatéréskor/leállításkor `clearNotif` törli. Best-effort (a böngésző
háttérben throttle-olhatja a JS-t), **nem szerveres push**; engedélyt a
`toggleNotify` kér a profil-lapon.

**Felhő-szinkron – veszteségmentes összefésülés:** belépve a felhő nem
felülír, hanem UNIÓT képez a helyi naplóval (`Auth.mergeGym` az
`js/auth.js`-ben; a `cloudRead`/`cloudWrite` is ezen megy át). Az
edzéseket azonosító (`t`+`day`) szerint egyesíti; ütközésnél a logot
gyakorlatonként a gazdagabb (több rögzített szett) verzió nyeri. A
kulcsolt mezők (`weights`/`notes`/`photos`/`customEx`) per-kulcs unióban,
a `routines`/`programs` id szerint unióban, a skalár preferenciák
(`injury`/`activeProgram`/`hidePlan`) az újabb állapotból (a
legutóbbi edzés időbélyege a frisseség-proxy). A **folyamatban lévő
edzés** (`active`) külön `activeT` időbélyeg szerint dől el (indítás /
szett-rögzítés / eldobás / befejezés frissíti) – így az eldobás (null,
friss `activeT`) megmarad, de egy frissen indított edzést nem töröl egy
másik eszköz elavult null-ja. Így két eszköz közt egyetlen
rögzített edzés sem veszik el. **Ha a szinkron-logikát bővíted, tartsd meg
ezt a garanciát** – vak felülírás (`upsert` merge nélkül) tilos.

**Törlés = tombstone (síremlék):** mivel az unió visszahozná az egyik
oldalon törölt elemet (a törlés „adat hiánya"), a törlést explicit jelölni
kell. A `tombstone(k)` a törölt elem kulcsát beteszi a `deleted` tömbbe
(`{k, at}`); a `mergeGym` a tombstone-listákat egyesíti, és a jelölt
elemeket kizárja az összefésült állapotból – így a törlés átmegy a másik
eszközre is. **A síremlék minden törölhető entitásra vonatkozik**, nem csak
az edzésekre:
- **edzés** (`del`): kulcs = `t+'|'+day`; a `sessions` unióból kizárva.
- **saját edzés / edzésterv** (`deleteRoutine`/`deleteProgram`): kulcs =
  `r_…`/`p_…` id; a `routines`/`programs` id-unióból kizárva.
- **saját gyakorlat** (`deleteCustomEx`): kulcs = `cx_…` id; a `customEx`
  és a hozzá tartozó kulcsolt mezők (súly/jegyzet/fotó/prog) is kimaradnak.
- **gépbeállítás-fotó** (`removePhoto`): kulcs = `photo:<exId>`.
- **gyakorlat-jegyzet ürítése** (`saveNote('ex')` üres mezővel): kulcs =
  `note:<exId>`.

**Szűk hatókörű síremlék.** A `photo:`/`note:` előtagú kulcs CSAK a saját
mezőjére hat (`SCOPE` az `auth.js`-ben) – egy törölt fotó nem viszi magával
a gyakorlat súlyát és jegyzetét. A csupasz id (`cx_…`) továbbra is mindent
kizár.

**Újra létrehozás – `untomb(k)`.** A helyi síremlék törlése NEM elég: a
másik eszközön/felhőben lévő bejegyzés az unióban visszatérne, és megölné a
frisset (pl. a törölt fotó helyére tett új képet). Ezért az `untomb` egy
`{k, at:most, alive:1}` jelölést ír ugyanarra a kulcsra. A `mergeGym`
kulcsonként a LEGFRISSEBB jelölést nézi (`dead(k)`): ha az `alive`, az elem
él; ha síremlék, törölt. A régi, `alive` nélküli bejegyzések változatlanul
törlést jelentenek. Új fotónál/jegyzetnél mindig hívd az `untomb`-ot.

Minden törlés a mentés után `flushCloud()`-dal AZONNAL a felhőbe írja a
síremléket (nem várja a debounce-t). Új törlésnél mindig hívd a
`tombstone()`-t.

## Téma (világos / sötét)

Az app követi a rendszer beállítását, és a felső sávban lévő gombbal
kézzel is váltható. A tokenek CSS-változók a `:root`-on:

- Alap `:root` = **sötét** (teremben ez az alapértelmezett).
- `@media (prefers-color-scheme: light) :root:not([data-theme])` =
  világos, ha nincs kézi választás.
- `:root[data-theme="light"|"dark"]` = a kézi váltó felülírja.

A villódzás elleni inline script a `<head>`-ben állítja be a
`data-theme`-et még festés előtt. Új szín SOHA ne legyen csak
media-blokkban definiálva – a `:root`-on legyen az alapérték.

## Tervezési elvek

- **Egy kézzel, izzadt ujjal használható.** Minden koppintható elem
  legalább 44px. A szett-rögzítés két koppintás legyen, ne több.
  A `repKbSheet` rácsa ezért a cél körüli tartományt (`t-4 … t+6`) adja
  egy koppintással, **alatta pedig kézi mező** (`#repMan` +
  `setRepManual()`) a tartományon kívüli számhoz – pl. 30 fekvőtámasz
  12-es célnál, vagy egy hosszú tartás mp-e. A mező csak egész 0..999
  értéket fogad el; érvénytelennél nem rögzít és nyitva marad. A `0`
  érvényes rögzített érték (sikertelen szett), a `null` továbbra is
  „nincs rögzítve" – ezt a „Törlés" adja.
- **Jegyzetelés edzés közben: az AKTUÁLIS gyakorlathoz.** A lejátszó
  „Jegyzet" gombja (`openPlayerNote`) alapból annak a gyakorlatnak az
  állandó jegyzetét nyitja, amelyiken épp állsz (`playerExId`) – ez a
  gyakoribb eset (padszög, fogás, technika). A lapon egy `.seg` kapcsoló
  (`noteSegment` → `setNoteMode`) vált a mai nap jegyzetére, és a választás
  megjegyződik (`gymlog_noteday`). A kapcsoló CSAK a lejátszóból nyitva
  jelenik meg (a `fromPlayer` zászlóval). Váltáskor a még nem mentett
  szöveget átvisszük, ha a másik oldal üres – meglévő jegyzetet SOHA nem ír
  felül, és a már mentett szöveget nem másolja át.
  A **napi jegyzet megjegyzi, melyik gyakorlatnál írtad** (`noteEx`): a lap
  mentés előtt kiírja („Ide kerül: …"), a napló és a heti export pedig
  „(<gyakorlat> közben)" alakban mutatja. A bélyeg az első írásnál rögzül,
  hogy később is tudd, mi közben jutott eszedbe – egy másik gyakorlatnál
  végzett szerkesztés NEM viszi el.
- **A főoldal hőse a készenlét-kártya.** A dekoratív „Melyik nap jön?"
  fejléc és a redundáns belépő-gombok (Tervek kezelése, gyógytorna)
  kikerültek – előbbi az alsó nav füle, utóbbi a felső sáv ikonja.
- **Két téma, sötét az alapértelmezett.** Teremben a sötét kényelmesebb
  és kevesebbet fogyaszt; a világos téma választható (rendszerkövetéssel).
- **A szám a főszereplő.** A súly és az ismétlés nagy, tabuláris
  számokkal jelenik meg.
- Nincs benne közösségi funkció (ezt szándékosan kihagytuk). **Kivétel a
  fotó:** gyakorlatonként egy gépbeállítás-emlékeztető kép megengedett (nem
  illusztráció, hanem emlékeztető) – lásd `photos` mező.
- **Technika-videó gyakorlatonként** (felhasználói kérésre bekerült): a
  gyakorlat-jegyzet és a haladás-részletlap „Technika videó" linkje külső
  fülön nyílik (NEM beágyazott videó). A `VIDEO[exId]` térkép a PONTOS,
  bedrótozott URL-eké; ahol nincs bejegyzés, a `videoUrl(e)` a gyakorlat
  magyar nevéből YouTube-keresést épít (mindig működik, nem rohad).
  Konkrét linket ide vegyél fel: `VIDEO['bench']='https://youtu.be/…'`.

## Ismert hiányosságok / lehetséges irányok

1. ~~A `PLAN` tömb a kódba van drótozva.~~ **Részben kész:** a beépített
   `PLAN` (4 nap) továbbra is drótozott alapértelmezés, de a felhasználó
   mellé **saját gyakorlatokat** (`customEx`), **saját edzéseket**
   (`routines`) és **edzésterveket** (`programs`) hozhat létre az appban
   (lásd „Edzés-összeállító" lentebb). A beépített azonosítók változatlanok.
2. ~~Nincs PWA manifest és service worker – offline nem működik.~~
   **Kész:** van `manifest.webmanifest` + `sw.js`, az app telepíthető
   és offline is fut (lásd „PWA / offline" lentebb).
3. ~~A pihenőóra megáll, ha a telefon képernyője elalszik.~~
   **Kész:** Wake Lock API tartja ébren a képernyőt, amíg a pihenő megy;
   az óra amúgy is időbélyeg-alapú, tehát háttérből visszatérve pontos.
4. ~~A biztonsági mentés kézi.~~ **Kész:** havi mentés-emlékeztető a
   kezdőképernyőn (`lastBackup` alapján).

**Edző-funkciók (kész):** okos súlyjavaslat (túlteljesítés-arányos ugrás),
kihagyás-felismerés (>10 nap → visszaépítés), terv-kontra-valóság
eltérés-ok egy koppintással, összterhelés/kiugró-terhelés a naplóban,
sérülés-mód (érintett gyakorlatok kihagyása + súlycsökkentés), kétszintű
jegyzet (állandó + aznapi) és gépbeállítás-fotó gyakorlatonként,
bemelegítő-szett javaslat (`warmupSets`, a munkasúlyból származtatott
lépcsők + oldalankénti tárcsakiosztás a `platesPerSide`-dal),
idő-alapú gyakorlatnál (`time:1`, pl. plank) beépített visszaszámláló óra
(`openTimerSet`: a célról számol, a végén beep+rezgés és automatikusan
rögzíti a tartott mp-et; korai leállítás = a ténylegesen tartott idő; a
„Kézi megadás" a szám-billentyűzetre – `repKbSheet` – vált vissza), valamint a
főoldali „Mit edzek ma?" ajánló (`suggestDay`), ami a heti izomtérkép
hiányait lefedő edzésnapot javasolja.

**Amit ne csinálj elsőre:** ne írd át React/Vue keretrendszerre.
A keretrendszer nulla új funkciót adna.

## PWA / offline

Az app telepíthető és offline is fut. Fájlok:

- `manifest.webmanifest` – app metaadat (név, ikonok, `display: standalone`,
  `theme_color`/`background_color`).
- `sw.js` – service worker. **Csak a statikus app-héjat cache-eli**
  (`index.html`, ikonok, manifest) és a Google Fonts fájlokat. A
  `localStorage`-t (`gymlog_v1`) NEM érinti – az edzésadat a böngészőé.
- Ikonok: `icon-192.png`, `icon-512.png`, `icon-maskable-512.png`,
  `apple-touch-icon.png`.

Stratégia: a HTML network-first (offline a cache-elt `index.html`), a
statikus fájlok cache-first, a fontok stale-while-revalidate.

**Frissítés:** ha az app-héjon változtatsz, emeld a `VERSION` konstanst a
`sw.js` tetején – ez üríti a régi cache-t. A `netlify.toml` a `sw.js`-t
`no-cache`-sel szolgálja ki, hogy a frissítés eljusson a klienshez.

## Deploy (Netlify)

`netlify.toml`: statikus oldal, nincs build, a gyökérből (`publish = "."`)
publikál. A repót a Netlify dashboardon lehet a GitHubhoz kötni (lásd
`README.md` → Deploy), utána minden push automatikusan deployol.

## Tesztadat

Az `edzesnaplo-backup.json` a felhasználó valódi, 7 edzésnyi adata.
A Napló fül „Visszaállítás mentésből" gombjával töltheted be
fejlesztés közben. Ezzel tesztelhető a napló, a haladásgrafikon és
az archív gyakorlatok kezelése is.
