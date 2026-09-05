# Android app a Play Store-ba (TWA)

> ℹ️ **Ha natív egészség-/alvásadat is kell** (Apple Health / Health
> Connect), a TWA NEM elég – az nem éri el a Health Connectet. Akkor a
> mobilos kiadást Capacitor-burokba kell tenni: lásd
> [`docs/native-health/README.md`](../native-health/README.md). A TWA
> továbbra is jó út, ha nincs szükség natív egészségadatra.

Az Edzésnapló már telepíthető PWA, ezért Androidra a legegyszerűbb út a
**Trusted Web Activity (TWA)**: az app gyakorlatilag a live PWA-t futtatja
teljes képernyőn, böngésző-sáv nélkül, Chrome motorral. Minden webes
frissítés automatikusan él, nincs külön natív karbantartás.

Ezt a lépést a **saját gépeden** kell végigcsinálni (itt a repóban csak a
sablonok + útmutató van). Kb. 30–60 perc.

## Előfeltételek

- **Node.js** (18+).
- **JDK 17** és az **Android SDK** – a Bubblewrap az elsőnél felajánlja a
  letöltésüket, vagy telepítsd Android Studióval.
- **Google Play fejlesztői fiók** – egyszeri **$25** (play.google.com/console).

## 1. Bubblewrap – projekt generálása a manifestből

```bash
npm i -g @bubblewrap/cli
bubblewrap init --manifest https://albi012.github.io/spartaiak/manifest.webmanifest
```

A varázsló kérdez; javasolt válaszok:

- **Domain:** `albi012.github.io`
- **URL path:** `/spartaiak/`
- **Application ID (package):** `io.github.albi012.edzesnaplo`
  (fordított domain, később NEM változtatható – jól válaszd meg)
- **App name / Launcher name:** `Edzésnapló`
- **Display mode:** `standalone`
- **Status bar / theme color:** `#12161C` (a manifestből jön)
- **Signing key:** engedd, hogy létrehozzon egy új keystore-t
  (`android.keystore`) – **ezt a fájlt és a jelszavát őrizd meg, e nélkül
  soha többé nem tudsz frissítést kiadni ehhez az apphoz!**

A varázsló beállításai a `twa-manifest.json`-ban tárolódnak – ennek egy
kiindulási sablonja itt: [`twa-manifest.template.json`](./twa-manifest.template.json).

## 2. Build

```bash
bubblewrap build
```

Ez legyártja az `app-release-signed.aab` (Play-hez) és egy teszt `.apk`
fájlt, és kiírja az aláírókulcs **SHA-256 ujjlenyomatát**. Ha nem látod:

```bash
keytool -list -v -keystore android.keystore -alias <alias> | grep SHA256
```

## 3. Digital Asset Links – a böngészősáv eltüntetése

A TWA csak akkor fut sáv nélkül, ha a domain igazolja, hogy az app hozzá
tartozik. Ehhez egy `assetlinks.json`-t kell közzétenni a **domain
gyökerén**:

```
https://albi012.github.io/.well-known/assetlinks.json
```

⚠️ **Buktató:** az app a `/spartaiak/` alútvonalon van, de az
`assetlinks.json` az origin **gyökerére** kell. GitHub Pages projekt-oldalnál
ez NEM a `spartaiak` repóból szolgálódik ki. Két megoldás:

- **A) Egyszerűbb hosszú távon – saját domain.** Köss egy domaint a
  `spartaiak` Pages-oldalra (repo Settings → Pages → Custom domain). Akkor a
  domain gyökere maga az app, és a `.well-known/assetlinks.json` a `spartaiak`
  repo gyökeréből mehet ki.
- **B) A `albi012.github.io` felhasználói repo.** Ha van (vagy létrehozod) egy
  `albi012.github.io` nevű repót, tedd bele a `.well-known/assetlinks.json`-t
  – az a domain gyökerén jelenik meg.

A fájl tartalma (sablon: [`assetlinks.template.json`](./assetlinks.template.json)):

```json
[{
  "relation": ["delegate_permission/common.handle_all_urls"],
  "target": {
    "namespace": "android_app",
    "package_name": "io.github.albi012.edzesnaplo",
    "sha256_cert_fingerprints": [
      "A_2._LEPESBOL_A_SAJAT_KULCS_SHA256",
      "A_PLAY_CONSOLE_APP_SIGNING_SHA256"
    ]
  }
}]
```

⚠️ **Play App Signing:** feltöltéskor a Google **újraaláírja** az appot a
saját kulcsával. Ezért a `sha256_cert_fingerprints` listába **be kell tenni a
Play Console → App integrity → App signing** alatt látható SHA-256-ot IS,
különben élesben nem tűnik el a böngészősáv. (Ezt a fingerprintet csak az
első Play-feltöltés után látod – ekkor frissítsd az assetlinks-et.)

Ellenőrzés: <https://developers.google.com/digital-asset-links/tools/generator>

## 4. Teszt

```bash
bubblewrap install    # csatlakoztatott eszközre / emulátorra rakja az apk-t
```

Ha az assetlinks él és stimmel, az app **böngészősáv nélkül** indul. Ha
látszik a sáv, az assetlinks nem verifikált (rossz domain/ujjlenyomat, vagy
még nincs kint a Play-oldali SHA-256).

## 5. Feltöltés a Play Console-ra

1. **Create app** → nyelv, app-név (`Edzésnapló`), típus: App, ingyenes.
2. **Internal testing** sáv → töltsd fel az `app-release-signed.aab`-t.
3. Kötelező adatlapok:
   - **Store listing:** leírás, ikon (512×512 megvan), grafika, **screenshotok**
     (a `docs/screenshots/` alattiak jók kiindulásnak, kell 2–8 db).
   - **Privacy policy URL:** kötelező. (Készíthetünk egy egyszerű
     adatvédelmi oldalt a repóba – szólj.)
   - **Data safety** kérdőív: az app helyben tárol; ha bekapcsolod a
     Supabase-t, e-mail + edzésadat kerül a saját szerveredre – ezt jelöld.
   - **Content rating** kérdőív, **Target audience**.
4. Előbb **belső tesztelés**, aztán **zárt/nyílt teszt**, végül **produkció**.

## Frissítés később

- **Web-tartalom** változásakor: semmi teendő – a TWA a live PWA-t tölti.
- **Natív buroknál** (ikon, csomag, Bubblewrap-verzió): `bubblewrap update`
  → `bubblewrap build`, majd új `.aab` feltöltése (emelt `versionCode`-dal).
  Ehhez KELL az eredeti `android.keystore` + jelszó.

## Tipp

A teljes folyamatot a grafikus **PWABuilder** (<https://www.pwabuilder.com>)
is végigvezeti: beadod az élő URL-t, és kész Android-csomagot ad. A fenti
assetlinks/Play-lépések ugyanígy érvényesek.
