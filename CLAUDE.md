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
  "lastBackup": 1753804800000
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
  visszaépítés jelző). Log-szinten: `why` (`busy`|`heavy`|`time` – miért
  tért el a tervtől).
- A PLAN gyakorlatok `mg` mezője (izomcsoport: mell, hát, váll, tricepsz,
  bicepsz, láb, törzs) a sérülés-módot és a szűrést hajtja. Ez NEM
  azonosító – szabadon hangolható.

**Okos súlyjavaslat:** a `startW`/`smartInc` a cél feletti túlteljesítés
arányában nagyobbat lép (nem fix +inc). Kihagyás (>10 nap) esetén a
`startDay` visszalépést (−15%) ajánl.

## Gyakorlat-azonosítók – NE nevezd át őket

Ezek kulcsként szerepelnek a mentett adatokban. Átnevezésük
adatvesztéssel egyenértékű.

```
Push A: bench, dip, incdb, ohpdb, lat, push
Pull A: pull, row, cable, face, curl, hammer
Push B: ohp, dbbench, dipbw, machinc, french, plank
Pull B: tbar, wide, onerow, legcurl, hyp, rear, knee
Archív (már nincs a tervben, de van rá rögzített adat): rack, abs
```

Az `ARCHIVE` objektum azért van, hogy a tervből kivett gyakorlatok
neve feloldható maradjon a naplóban. Ha kiveszel egy gyakorlatot a
`PLAN`-ból, tedd át az `ARCHIVE`-ba – különben a régi adat
azonosítóként jelenik meg a felületen.

## Tárolás

`window.storage`-ot próbál először (ez csak Claude-artifactként fut),
`localStorage` a tartalék. Éles használatban mindig a localStorage fut.
Ha kiveszed a `window.storage` ágat, a `readKey`/`writeKey` interfészt
tartsd meg – a hívási helyek arra épülnek.

**Téma-preferencia:** külön `gymlog_theme` kulcs (`light` | `dark`;
hiánya = rendszerkövetés). Ez FÜGGETLEN a `gymlog_v1` edzésadattól –
a témaváltás soha nem érinti a naplót.

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
- Nincs benne videólink, közösségi funkció. Ezeket szándékosan
  vettük ki – ne javasold vissza. **Kivétel a fotó:** gyakorlatonként
  egy gépbeállítás-emlékeztető kép megengedett (nem illusztráció, hanem
  emlékeztető) – lásd `photos` mező.

## Ismert hiányosságok / lehetséges irányok

1. A `PLAN` tömb a kódba van drótozva. A terv appon belüli
   szerkeszthetősége lenne a legnagyobb nyereség.
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
jegyzet (állandó + aznapi) és gépbeállítás-fotó gyakorlatonként.

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
