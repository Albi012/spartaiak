# Edzésnapló

Push/pull edzésnapló telefonra. Egy fájl, nincs build, nincs függőség.

## Futtatás

Nyisd meg az `index.html`-t böngészőben, vagy indíts egy kis szervert:

    python3 -m http.server 8000

Majd: http://localhost:8000

> **Fontos:** a localhost és a Netlify-cím külön tárolót használ.
> Fejlesztés közben a Napló fül → „Visszaállítás mentésből" gombbal
> töltsd be az `edzesnaplo-backup.json`-t, hogy legyen tesztadat.

## Deploy

Netlify: húzd a mappát az app.netlify.com/drop oldalra, vagy kösd
GitHub repóhoz, és minden push automatikusan deployol.

A belépési pont **`index.html`** kell legyen, különben üres oldalt kapsz.

## Fájlok

    index.html               az egész alkalmazás
    CLAUDE.md                projektkontextus és az adatszerkezet leírása
    edzesnaplo-backup.json   valódi tesztadat (7 edzés)

Mielőtt bármit módosítasz: olvasd el a `CLAUDE.md`-t.
