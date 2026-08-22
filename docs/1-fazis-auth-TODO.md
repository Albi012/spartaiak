# 1. fázis – bekötési TODO (feat/auth-supabase)

Ez az ág a **csontvázat** tartalmazza. Az app **változatlanul fut**
localStorage-ból; a felhő csak akkor lép be, ha van kitöltött
`supabase-config.js` ÉS bekötöd az `Auth` modult az `index.html`-be.

Terv és háttér: `docs/felho-szinkron-terv.md`.

## Mi van már kész ezen az ágon

- `supabase/schema.sql` – futtatható séma (profiles, gym_state, RLS, trigger).
- `supabase-config.example.js` – minta konfig (másold `supabase-config.js`-re).
- `js/auth.js` – `window.Auth` modul: auth műveletek + felhő-adapter
  (`cloudRead`/`cloudWrite`) + egyszeri migráció (`maybeImport`). Még nincs
  bekötve, és offline/konfig nélkül inert.
- `.gitignore` – a `supabase-config.js` és `.env` kimarad a repóból.

## Teendők a befejezéshez

- [ ] Supabase projekt létrehozása (EU régió), `schema.sql` lefuttatása.
- [ ] Auth providerek: Email (+ opcionálisan Google/Apple), Redirect URL-ek
      a Netlify-címre.
- [ ] `supabase-config.js` kitöltése az URL + anon kulccsal (NEM commitolni).
- [ ] `index.html` bekötés (a `<script>` blokk elé/mellé):

  ```html
  <script src="supabase-config.js"></script>   <!-- ha létezik -->
  <script src="js/auth.js"></script>
  ```

  A meglévő `readKey`/`writeKey` bővítése (a KEY felhőből is jöjjön):

  ```js
  async function readKey(k){
    if(k===KEY && window.Auth && Auth.isLoggedIn()){
      const cloud = await Auth.cloudRead();
      if(cloud!=null){ storeMode='local'; return cloud; }
    }
    /* … a meglévő window.storage / localStorage ág változatlan … */
  }
  async function writeKey(k,v){
    let ok=false;
    try{ localStorage.setItem(k,v); ok=true; }catch(e){}
    if(k===KEY && window.Auth && Auth.isLoggedIn()) await Auth.cloudWrite(v);
    return ok;
  }
  ```

  Indításkor:

  ```js
  if(window.Auth){
    Auth.hooks.reload = ()=>load();
    Auth.hooks.onChange = ()=>{/* frissítsd a Fiók gomb állapotát */};
    Auth.init();
  }
  ```

- [ ] Belépő UI: a felső sávba egy „Fiók" gomb → alsó lap e-mail+jelszó
      mezőkkel (`Auth.signIn` / `Auth.signUp` / `Auth.signOut`).
- [ ] Konfliktus-választó: ha belépéskor MINDKÉT oldalon van adat, kérdezz
      rá, melyik legyen az alap (a `maybeImport` most csak üres felhőnél tölt).
- [ ] Offline: döntsd el, a Supabase JS CDN-ről jöjjön-e (egyszerű, de nem
      offline) vagy a repóból + `sw.js` cache (offline, de kell hozzá build
      vagy a fájl repóba tétele). Lásd a terv 6. pontját.

## Tesztelés

Lásd `docs/felho-szinkron-terv.md` → „7. Tesztelési checklist".
Kiemelten: RLS idegen tokennel (nem szivárog), import CSAK üres felhőnél,
és offline-indulás a cache-ből.

## Fontos

- Éles adat: bekötés/import előtt mindig `backup()` (a mostani „Biztonsági
  mentés" gomb).
- A `gymlog_v1` alak változatlan → a felhő kikapcsolása után az app a
  localStorage-ból ugyanúgy fut tovább (nincs beragadás).
