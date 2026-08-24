# Edzésnapló

Egykezes, telefonra szánt push/pull edzésnapló – edzés közben, izzadt
ujjal is használható. **Egy fájl** (`index.html`), nincs build, nincs
futásidejű függőség. Telepíthető PWA, offline is fut, és opcionálisan
felhő-fiókkal több eszköz közt szinkronizál.

> A számok a főszereplők: a súly és az ismétlés nagy, tabuláris
> számokkal jelenik meg; minden koppintható elem legalább 44px; a
> szett-rögzítés két koppintás.

---

## Tartalom

- [Funkciók](#funkciók)
- [Futtatás helyben](#futtatás-helyben)
- [Deploy](#deploy)
- [Felhő-szinkron beállítása (opcionális)](#felhő-szinkron-beállítása-opcionális)
- [Adat és biztonság](#adat-és-biztonság)
- [PWA / offline és frissítés](#pwa--offline-és-frissítés)
- [Fájlok](#fájlok)
- [Fejlesztés](#fejlesztés)

---

## Funkciók

### Edzés és naplózás
- **Vezetett lejátszó:** a kezdőképernyő a mai edzést kínálja; szettenként
  két koppintás a rögzítés, pihenőóra, súlyállító.
- **Folytatás:** egy megkezdett edzés minden rögzített szettje azonnal
  mentődik – ha véletlen bezárod az appot, újranyitva a „Folytatás"
  kártyáról ott folytatod, ahol abbahagytad. Az edzés **csak szándékos
  „Edzés eldobása" vagy befejezés** hatására tűnik el.
- **Napló:** minden edzés visszanézhető (dátum, szettek, össz­terhelés);
  edzésenként törölhető.
- **Képernyő ébrentartás:** amíg a pihenő megy, a Wake Lock ébren tartja a
  képernyőt; az óra időbélyeg-alapú, tehát háttérből visszatérve is pontos.

### Terv és összeállító
- **Beépített terv:** 4 nap (Push A / Pull A / Push B / Pull B).
- **Saját gyakorlatok** (`cx_…`), **saját edzések** (routine, `r_…`) és
  **edzéstervek** (program, `p_…`) az appon belül összeállíthatók.
- **Gyakorlat-könyvtár:** ~80+ beépített gyakorlat (`x_…`), izomcsoportra
  szűrhető választóval.
- **Aktív terv választó:** ha több terved van, kiválaszthatod, melyik az
  aktív; a beépített terv is programként kezelhető és megosztható.

### Haladás (analitika)
- **Összegző statok:** összes edzés, e havi, hetes sorozat, össztömeg.
- **Edzésnaptár-heatmap:** az utolsó 16 hét napjai a napi szettszám szerint
  színezve.
- **Heti izomcsoport-terhelés:** hány munkaszett jut ezen a héten
  izomcsoportonként (a 10+ szettet elért izom sávja zöld).
- **Gyakorlatonkénti trend:** kattintható kártya → részletlap nagy
  grafikonnal, a teljes előzménnyel és a **csúccsal (PR)**.
- **Súly ⟷ térfogat váltó:** a részletlapon a munkasúly helyett a
  térfogat (Σ súly×ismétlés) görbéjét is nézheted.
- **Becsült 1RM:** Epley-becslés gyakorlatonként, a forrás-szettel.

### Testsúly
- **Testsúly-napló célvonallal:** idővonal, állítható céllal; a cél felé
  mozgás zöld, attól elfelé piros. Napi egy mérés (ugyanaznap felülír).

### Edző-funkciók
- **Okos súlyjavaslat:** a túlteljesítés arányában nagyobbat lép (nem fix
  +inc); kihagyás (>10 nap) esetén visszaépítést (−15%) ajánl.
- **Sérülés-mód:** az érintett testtájak gyakorlatai kimaradnak, a többi
  súlya −15%.
- **Kétszintű jegyzet:** állandó gyakorlat-jegyzet (padszög, technika) és
  aznapi edzés-jegyzet; **gépbeállítás-fotó** gyakorlatonként.
- **Terv-kontra-valóság:** egy koppintással rögzíthető, miért tértél el a
  tervtől; össz- és kiugró terhelés a naplóban.
- **Havi mentés-emlékeztető** a kezdőképernyőn.

### Eszközök
- **Tárcsa-kalkulátor:** edzés közben a súlyra koppintva megmutatja, mennyi
  tárcsát rakj fel oldalanként (20/15/10 kg-os rúdhoz), a ki nem rakható
  maradékot jelezve.
- **Heti összefoglaló edzőnek:** az elmúlt hét edzéseit olvasható szöveggé
  alakítja (jegyzetekkel, eltérés-okokkal), kész felkéréssel egy AI-edzőnek –
  megosztható/másolható.

### Felhő-fiók, szinkron és barátok (opcionális)
- **Fiók (Supabase Auth):** e-mail + jelszó belépés; a fiók nélkül az app
  változatlanul localStorage-ból fut.
- **Veszteségmentes szinkron:** belépve a felhő nem felülír, hanem
  **uniót** képez a helyi naplóval – két eszköz közt egyetlen rögzített
  edzés sem veszik el (részletek lentebb).
- **Barátok:** barát-kóddal jelölés, megosztott statok, **edzéstervek
  megosztása** barátok közt.

### Megjelenés
- **Világos/sötét téma:** rendszerkövetés + kézi váltó; a sötét az
  alapértelmezett (teremben kényelmesebb). A téma-preferencia független az
  edzésadattól.
- **Monokróm inline SVG ikonok** (nem emojik), így minden platformon
  egyformák és követik a témát.

---

## Futtatás helyben

Nyisd meg az `index.html`-t böngészőben, vagy indíts egy kis szervert
(a service worker és a modulbetöltés miatt ajánlott):

```bash
python3 -m http.server 8000
# majd: http://localhost:8000
```

> **Fontos:** minden origin (localhost, GitHub Pages, Netlify) **külön**
> `localStorage`-t használ. Fejlesztéshez a **Napló → „Visszaállítás
> mentésből"** gombbal töltsd be az `edzesnaplo-backup.json`-t (valódi,
> 7 edzésnyi tesztadat), hogy legyen mit mutatnia a naplónak és a
> Haladás fülnek.

---

## Deploy

### GitHub Pages (jelenlegi éles)

Az éles verzió a GitHub Pages-en fut:
**https://albi012.github.io/spartaiak/**

Minden `main`-push automatikusan deployol a
`.github/workflows/pages.yml` workflow-val (statikus oldal, nincs build,
a repó gyökeréből publikál). Egyszeri teendő volt: Repo → **Settings →
Pages → Source: GitHub Actions** (a workflow `enablement: true`-val ezt
magától is engedélyezi). A Pages **publikus** repót igényel.

### Netlify (alternatíva)

A repóhoz `netlify.toml` is tartozik (statikus oldal, `publish = "."`,
nincs build). GitHub-bekötéssel minden push deployol; gyors alternatíva a
mappa behúzása az app.netlify.com/drop oldalra. *(Megjegyzés: a Netlify
ingyenes kredit-korlátja átmenetileg befagyaszthatja az új deployokat –
ezért került az éles a GitHub Pages-re.)*

---

## Felhő-szinkron beállítása (opcionális)

Az app fiók nélkül teljesen működik. A felhő-szinkronhoz egy ingyenes
[Supabase](https://supabase.com) projekt kell:

1. Hozz létre egy Supabase projektet.
2. Futtasd le a `supabase/` alatti SQL-eket a Supabase → **SQL Editor**-ban:
   `schema.sql` (napló-tábla), `schema-friends.sql` (barátok),
   `schema-plan-shares.sql` (terv-megosztás).
3. Másold a `supabase-config.example.js`-t **`supabase-config.js`** néven,
   és töltsd ki a projekt **URL**-jével és a **publishable** (böngésző-biztos)
   kulccsal.

> **Biztonság:** a `supabase-config.js`-ben csak a *publishable/anon* kulcs
> szerepelhet – ez böngészőbe szánt, a Row Level Security véd. A
> `service_role`/secret kulcs **soha** ne kerüljön a repóba. A hozzáférést
> a táblák RLS-szabályai korlátozzák (lásd a `supabase/*.sql`-eket).

Bekötés nélkül (`supabase-config.js` hiányában) a `js/auth.js` inert marad,
az app localStorage-ból fut.

---

## Adat és biztonság

- **Tárolás:** minden edzésadat a böngésző `localStorage`-ában, a
  **`gymlog_v1`** kulcs alatt, JSON stringként. A séma **additív** és
  visszafelé kompatibilis – a régi adat migráció nélkül betöltődik, a
  hiányzó mezők alapértéket kapnak. A pontos alakot lásd a `CLAUDE.md`-ben.
- **Éles adat:** a felhasználónak valódi, több hetes naplója van. A
  `gymlog_v1` **kulcsnév és JSON-alak nem változhat** migráció nélkül; a
  gyakorlat- és terv-azonosítók (`bench`, `x_…`, `cx_…`, `r_…`, `p_…`)
  kulcsként szerepelnek – **átnevezni tilos**.
- **Veszteségmentes szinkron (unió):** a `Auth.mergeGym` a felhőt és a
  helyit összefésüli – az edzéseket azonosító (`t`+`day`) szerint
  egyesíti, ütközésnél a gazdagabb (több szett) log nyer; a kulcsolt mezők
  per-kulcs, a listák id szerint unióban. Vak felülírás tilos.
- **Törlés = tombstone:** mivel az unió visszahozná az egyik oldalon
  törölt edzést, a törlés **explicit jelölést** kap (`deleted` lista), ami
  átmegy a másik eszközre – így a törölt edzés nem tér vissza.
- **Folyamatban lévő edzés:** külön `activeT` időbélyeg dönti el –
  az eldobás megmarad, de egy frissen indított edzést nem töröl egy másik
  eszköz elavult állapota.
- **Mentés/visszaállítás:** a Napló fülről egykattintásos JSON export/import.
- **Verzió-jelző:** a ☁ (fiók) lap alján látszik a futó build verziója –
  cache-gyanú esetén ebből tudod, melyik verzió fut a kliensen.

---

## PWA / offline és frissítés

Az app telepíthető (Hozzáadás a kezdőképernyőhöz) és offline is fut. Az
első betöltés után a service worker (`sw.js`) cache-eli az app-héjat és a
Google Fontsot; a hálózat nélkül is elindul, az edzésadatot a böngésző
`localStorage`-a őrzi (a service worker **nem** érinti).

Stratégia: HTML network-first, statikus fájlok cache-first, fontok
stale-while-revalidate.

> **Frissítéskor:** ha az app-héjon módosítasz, emeld a `sw.js` tetején a
> `VERSION` konstanst (és vele az `index.html`-beli `APP_VERSION`-t), hogy
> a régi cache ürüljön és a kliens a friss verziót kapja.

---

## Fájlok

```
index.html                 az egész alkalmazás (UI + logika)
js/auth.js                 fiók + felhő-szinkron (Supabase); merge-logika
supabase-config.js         Supabase URL + publishable kulcs (nincs gitignore-olva)
supabase-config.example.js sablon a fentihez
supabase/*.sql             adatbázis-séma (napló, barátok, terv-megosztás)
manifest.webmanifest       PWA metaadat (név, ikonok, standalone)
sw.js                      service worker (offline app-héj cache)
icon-*.png                 PWA ikonok (192, 512, maskable, apple-touch)
netlify.toml               Netlify deploy konfiguráció
.github/workflows/pages.yml  GitHub Pages deploy
docs/*.md                  felhő-szinkron terv és fázis-TODO-k
CLAUDE.md                  projektkontextus + az adatszerkezet pontos leírása
edzesnaplo-backup.json     valódi tesztadat (7 edzés)
```

---

## Fejlesztés

- **Mielőtt bármit módosítasz: olvasd el a `CLAUDE.md`-t** – ott van az
  éles adatra és az azonosítókra vonatkozó összes megkötés.
- **Ne** írd át React/Vue keretrendszerre – nulla új funkciót adna.
- Videólink és közösségi funkció szándékosan nincs benne (kivétel a
  gépbeállítás-fotó). A teljes tervezési elveket és az ismert irányokat a
  `CLAUDE.md` sorolja fel.
