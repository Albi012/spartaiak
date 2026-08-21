# Edzésnapló

Push/pull edzésnapló telefonra. Egy fájl, nincs build, nincs függőség.

## Futtatás

Nyisd meg az `index.html`-t böngészőben, vagy indíts egy kis szervert:

    python3 -m http.server 8000

Majd: http://localhost:8000

> **Fontos:** a localhost és a Netlify-cím külön tárolót használ.
> Fejlesztés közben a Napló fül → „Visszaállítás mentésből" gombbal
> töltsd be az `edzesnaplo-backup.json`-t, hogy legyen tesztadat.

## Deploy (Netlify)

A repóhoz `netlify.toml` tartozik: statikus oldal, nincs build, a
gyökérből publikál (`publish = "."`). A belépési pont **`index.html`**.

**GitHub-bekötés (ajánlott – minden push automatikusan deployol):**

1. app.netlify.com → **Add new site → Import an existing project**
2. Válaszd a **GitHub**-ot, majd a `spartaiak` repót.
3. Ág: a fő ág (`main`). Build settings: hagyd üresen (a `netlify.toml`
   megadja: nincs build parancs, publish `.`).
4. **Deploy site.** Ezután minden push újradeployol.

**Gyors alternatíva (build nélkül):** húzd a mappát az
app.netlify.com/drop oldalra.

## PWA / offline

Az app **telepíthető** (Hozzáadás a kezdőképernyőhöz) és **offline is
fut**. Első betöltés után a service worker (`sw.js`) cache-eli az
app-héjat; a hálózat nélkül is elindul, az edzésadat pedig a böngésző
`localStorage`-ában marad.

> Ha az app-héjon módosítasz, emeld a `VERSION`-t a `sw.js` tetején,
> hogy a kliens a friss verziót kapja.

## Fájlok

    index.html               az egész alkalmazás
    manifest.webmanifest     PWA metaadat (név, ikonok, standalone)
    sw.js                    service worker (offline app-héj cache)
    icon-*.png               PWA ikonok (192, 512, maskable, apple-touch)
    netlify.toml             Netlify deploy konfiguráció
    CLAUDE.md                projektkontextus és az adatszerkezet leírása
    edzesnaplo-backup.json   valódi tesztadat (7 edzés)

Mielőtt bármit módosítasz: olvasd el a `CLAUDE.md`-t.
