# 1. fázis – bekötési TODO (feat/auth-supabase)

Az app **változatlanul fut** localStorage-ból; a felhő csak akkor lép be,
ha van kitöltött `supabase-config.js` és belépsz. A **bekötés kész** –
lentebb már csak a Supabase-oldali beállítás + teszt maradt.

Terv és háttér: `docs/felho-szinkron-terv.md`.

## Mi van már kész ezen az ágon

- `supabase/schema.sql` – futtatható séma (profiles, gym_state, RLS, trigger).
- `supabase-config.example.js` – minta konfig (másold `supabase-config.js`-re).
- `js/auth.js` – `window.Auth` modul: auth műveletek + felhő-adapter
  (`cloudRead`/`cloudWrite`) + egyszeri migráció (`maybeImport`). Konfig
  nélkül / offline inert.
- **`index.html` bekötve:** `supabase-config.js` + `js/auth.js` betöltve;
  a `readKey`/`writeKey` felhő-ágra kötve; a felső sávban „Fiók" gomb (☁);
  belépő/regisztrációs alsó lap; `Auth.init` bekötve a `load` hookokkal.
- **`sw.js`** cache-eli a `js/auth.js`-t (offline app-héj); `VERSION` v6.
- `.gitignore` – a `supabase-config.js` és `.env` kimarad a repóból.

## Teendők a befejezéshez (Supabase-oldal + teszt)

- [x] `index.html` bekötés + belépő UI + readKey/writeKey felhő-ág.
- [ ] Supabase projekt létrehozása (EU régió), `schema.sql` lefuttatása. *(kész, ha lefuttattad)*
- [ ] Auth providerek: Email (+ opcionálisan Google/Apple), Redirect URL-ek
      a Netlify-címre.
- [ ] `supabase-config.js` kitöltése az URL + anon kulccsal (NEM commitolni).
- [ ] Élő teszt: belépés → a helyi napló feltöltésének felajánlása → másik
      eszközön ugyanaz.
- [ ] Konfliktus-választó: ha belépéskor MINDKÉT oldalon van adat, most a
      `maybeImport` CSAK üres felhőnél tölt – ide jöhet egy „melyik legyen
      az alap?" választó.
- [ ] Offline döntés: a Supabase JS most CDN-ről (esm.sh) jön → belépett
      módban online kell az első betöltéshez. Ha teljes offline kell,
      a supabase-js-t a repóba + `sw.js` cache-be kell tenni (lásd terv 6.).

## Tesztelés

Lásd `docs/felho-szinkron-terv.md` → „7. Tesztelési checklist".
Kiemelten: RLS idegen tokennel (nem szivárog), import CSAK üres felhőnél,
és offline-indulás a cache-ből.

## Fontos

- Éles adat: bekötés/import előtt mindig `backup()` (a mostani „Biztonsági
  mentés" gomb).
- A `gymlog_v1` alak változatlan → a felhő kikapcsolása után az app a
  localStorage-ból ugyanúgy fut tovább (nincs beragadás).
