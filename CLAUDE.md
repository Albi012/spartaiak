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
- Session-szinten: `note` (aznapi jegyzet), `deload` (kihagyás utáni
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
felső sáv **állandó gyógytorna-ikonjáról** (`physioBtn`), a főoldali
gombról és a sérülés-mód kártyáról nyílik).
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
- **Saját edzés** (`routines`): `{id:'r_…', name, sub, ex:[exId,…]}`, ahol
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

## Ikonok

A felület ikonjai **monokróm inline SVG-k** (`ICON` objektum,
`currentColor`), NEM unicode-glyphek/emojik – így a témát követik és nem
válnak platformonként színes emojivá. Új ikon is így kerüljön be; a
statikus gombok/nav ikonjait a `paintIcons()` tölti be induláskor.

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
(`'1'` = pihenő-hang ki), `gymlog_notify` (`'1'` = időzítő rendszer-
értesítésben). Utóbbi: a `tick()`/`stTick()` háttérben (`document.hidden`)
a hátralévő időt némán frissülő értesítésbe (`timerNotif`, SW
`showNotification`, `rest`/`hold` tag) írja, a végén egy hangos „letelt"
értesítést ad; visszatéréskor/leállításkor `clearNotif` törli. Best-effort
(a böngésző háttérben throttle-olhatja a JS-t), **nem szerveres push**;
engedélyt a `toggleNotify` kér a profil-lapon.

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
