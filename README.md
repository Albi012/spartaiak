# Edzésnapló

Egykezes, telefonra szánt push/pull edzésnapló – teremben, edzés közben,
izzadt ujjal is kényelmesen használható. A hangsúly a gyorsaságon van: a
szett-rögzítés két koppintás, minden gomb nagy, a súly és az ismétlés
nagy, jól olvasható számokkal jelenik meg.

A teljes alkalmazás **egyetlen HTML-fájl**, build és futásidejű függőség
nélkül. Telepíthető PWA, offline is működik, és opcionálisan felhő-fiókkal
több eszköz közt szinkronizál.

**Élő verzió:** https://albi012.github.io/spartaiak/

---

## Mit tud

**Edzés és naplózás**
- Vezetett lejátszó: a kezdőképernyő a mai edzést kínálja, pihenőórával és
  súlyállítóval; a szettek két koppintással rögzülnek.
- Egy megkezdett edzés minden rögzített szettje azonnal mentődik – ha
  véletlen bezárul az app, újranyitva a „Folytatás" kártyáról ott lehet
  folytatni, ahol abbamaradt.
- Napló: minden edzés visszanézhető (dátum, szettek, összterhelés).
- A képernyő ébren marad, amíg a pihenőóra megy.

**Saját tervek**
- Beépített 4 napos terv (Push A / Pull A / Push B / Pull B).
- Saját gyakorlatok, saját edzések és több napból álló edzéstervek
  összeállíthatók az appon belül.
- Beépített gyakorlat-könyvtár (~80+ gyakorlat), izomcsoportra szűrhető
  választóval.

**Haladás**
- Összegző számok: összes edzés, e havi, hetes sorozat, össztömeg.
- Edzésnaptár-heatmap az utolsó 16 hétről.
- Heti izomcsoport-terhelés: hány munkaszett jut ezen a héten mellre,
  hátra, lábra stb.
- Gyakorlatonkénti trend nagy grafikonnal, teljes előzménnyel és a
  csúccsal (PR); váltható munkasúly és térfogat (súly×ismétlés) között.
- Becsült 1RM gyakorlatonként.
- Testsúly-napló állítható célvonallal (a cél felé mozgás zöld, attól
  elfelé piros).

**Edző-funkciók**
- Okos súlyjavaslat: a túlteljesítés arányában nagyobbat lép; hosszabb
  kihagyás után visszaépítést ajánl.
- Sérülés-mód: az érintett testtájak gyakorlatai kimaradnak, a többi súlya
  csökken.
- Kétszintű jegyzet (állandó gyakorlat-jegyzet + aznapi) és
  gépbeállítás-fotó gyakorlatonként.
- Tárcsa-kalkulátor: edzés közben a súlyra koppintva megmutatja, mennyi
  tárcsát kell felrakni oldalanként.
- Heti összefoglaló: az elmúlt hét edzéseit olvasható szöveggé alakítja,
  amit el lehet küldeni egy (AI-)edzőnek.

**Fiók, szinkron és barátok** *(opcionális)*
- E-mail + jelszavas **regisztráció és belépés** – pár másodperc, a fiók
  ott helyben, az appban létrehozható. Fiók nélkül is minden működik, csak
  lokálisan.
- Belépve a felhő nem felülír, hanem **összefésül** a helyi naplóval, így
  két eszköz közt egyetlen rögzített edzés sem vész el.
- Barát-kóddal barátjelölés, megosztott statok és edzéstervek.

**Megjelenés**
- Világos/sötét téma (rendszerkövetéssel és kézi váltóval); a sötét az
  alapértelmezett, teremben kényelmesebb.

---

## Kipróbálás

A leggyorsabb az élő verzió megnyitása telefonon és **hozzáadása a
kezdőképernyőhöz** – onnantól teljes képernyős appként, offline is fut:

https://albi012.github.io/spartaiak/

Helyben egy egyszerű statikus szerverrel is futtatható:

```bash
git clone https://github.com/albi012/spartaiak
cd spartaiak
python3 -m http.server 8000
# majd: http://localhost:8000
```

Nincs telepítendő függőség és nincs build lépés – a repó egy statikus
oldal.

---

## Adat és adatvédelem

- Az edzésadat a **böngésződben** marad (`localStorage`); az app
  alapból semmit nem küld el sehová.
- Nincs benne követés, reklám vagy analitika.
- A Napló fülről egy koppintással exportálható és visszaállítható az egész
  napló JSON-ként.
- A felhő-szinkron opcionális: csak akkor lép működésbe, ha beállítasz egy
  saját [Supabase](https://supabase.com) projektet és bejelentkezel. Az
  adatot ekkor is veszteségmentesen fésüli össze, és a törlés egy másik
  eszközön sem „támad fel".

---

## Hogyan épül fel

- Vanilla JavaScript, keretrendszer nélkül; az egész UI és logika az
  `index.html`-ben.
- PWA: `manifest.webmanifest` + `sw.js` service worker az offline
  működéshez; ikonok a kezdőképernyőhöz.
- Opcionális felhő-réteg: `js/auth.js` + Supabase (Auth + Postgres az
  `supabase/` alatti sémákkal). Konfiguráció nélkül az app tisztán
  lokálisan fut.
- Deploy: GitHub Pages (a `main` minden pushnál automatikusan publikál a
  `.github/workflows/pages.yml` révén). A repóban lévő `netlify.toml`
  alternatív Netlify-deployt is lehetővé tesz.

Saját felhő-szinkronhoz: futtasd le a `supabase/*.sql` sémákat egy Supabase
projektben, majd másold a `supabase-config.example.js`-t
`supabase-config.js` néven, és töltsd ki a projekt URL-jével és a
böngésző-biztos *publishable* kulccsal. (A titkos `service_role` kulcs soha
ne kerüljön a kódba – a hozzáférést a táblák Row Level Security szabályai
védik.)

---

## Licenc

Személyes projekt. Ha felhasználnád, nyiss egy issue-t vagy vedd fel a
kapcsolatot a repó tulajdonosával.
