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
  "weights": { "<gyakorlatId>": 55 }
}
```

- `w` – az adott edzésen használt súly kg-ban. Testsúlyos gyakorlatnál
  0 vagy a hozzáadott súly.
- `sets` – tömb, elemenként az adott szettben megcsinált ismétlésszám.
  `null` = a szett nem lett rögzítve.
- `weights` – az utoljára használt súly gyakorlatonként; ebből számol
  a program progressziót a következő edzésre.

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

## Tervezési elvek

- **Egy kézzel, izzadt ujjal használható.** Minden koppintható elem
  legalább 44px. A szett-rögzítés két koppintás legyen, ne több.
- **Sötét felület.** Teremben ez kényelmesebb és kevesebbet fogyaszt.
- **A szám a főszereplő.** A súly és az ismétlés nagy, tabuláris
  számokkal jelenik meg.
- Nincs benne kép, videólink, közösségi funkció. Ezeket szándékosan
  vettük ki – ne javasold vissza.

## Ismert hiányosságok / lehetséges irányok

1. A `PLAN` tömb a kódba van drótozva. A terv appon belüli
   szerkeszthetősége lenne a legnagyobb nyereség.
2. Nincs PWA manifest és service worker – offline nem működik.
3. A pihenőóra megáll, ha a telefon képernyője elalszik.
4. A biztonsági mentés kézi. Automatikus vagy emlékeztetős mentés jó lenne.

**Amit ne csinálj elsőre:** ne írd át React/Vue keretrendszerre.
A jelenlegi ~360 sor működik; a keretrendszer nulla új funkciót adna.

## Tesztadat

Az `edzesnaplo-backup.json` a felhasználó valódi, 7 edzésnyi adata.
A Napló fül „Visszaállítás mentésből" gombjával töltheted be
fejlesztés közben. Ezzel tesztelhető a napló, a haladásgrafikon és
az archív gyakorlatok kezelése is.
