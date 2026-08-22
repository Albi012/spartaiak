# 1. fázis – Fiók + felhő-szinkron (Supabase)

Konkrét megvalósítási terv. Cél: a mostani, kizárólag `localStorage`-ban élő
edzésnapló (`gymlog_v1`) **fiókhoz kötése** és **több eszköz közti
szinkronizálása**, a közösségi funkciók (barátok) *nélkül*. Ez önmagában
megoldja a több eszközt és az automatikus mentést is.

> **Alapelv:** a `gymlog_v1` JSON-alak NEM változik. A felhő ugyanazt a
> stringet tárolja, amit ma a `writeKey('gymlog_v1', …)` ír. Így a jelenlegi
> `readKey`/`writeKey` réteg mögé egy „felhő" ág illeszthető – a hívási
> helyek nem változnak.

---

## 0. Áttekintés

```
Böngésző (index.html)                 Supabase
┌─────────────────────────┐          ┌───────────────────────────┐
│ readKey/writeKey         │  HTTPS   │ Auth (email, Google, Apple)│
│  ├─ localStorage (cache) │ <──────> │ Postgres: gym_state        │
│  └─ felhő-adapter (új)   │          │ Row Level Security         │
│ offline-first megmarad   │          │ (csak a saját sorod)       │
└─────────────────────────┘          └───────────────────────────┘
```

- **Frontend:** marad statikus (Netlify), de bejön egy Supabase JS kliens.
- **Igazság forrása:** belépve a felhő; kilépve / offline a localStorage cache.
- **Titkok:** a Supabase *anon* kulcs publikus lehet (a böngészőbe kerül) –
  az adatot a **Row Level Security** védi, nem a kulcs titkossága.

---

## 1. Supabase projekt beállítása

1. supabase.com → új projekt (régió: EU, GDPR miatt).
2. **Project Settings → API**: jegyezd fel a `Project URL`-t és az
   `anon public` kulcsot (ez megy a frontendbe).
3. **Authentication → Providers**: kapcsold be az *Email*-t; opcionálisan
   *Google* és *Apple* (mobilhoz kényelmes). Email megerősítés bekapcsolva.
4. **Authentication → URL Configuration**: a Netlify-cím legyen a
   `Site URL` és a `Redirect URLs` közt (különben a belépés utáni
   visszairányítás nem működik).

---

## 2. Adatbázis-séma (SQL)

**Döntés:** 1. fázisban NEM normalizáljuk az edzéseket sorokra. Egyetlen
JSON-blobot tárolunk felhasználónként, ami pontosan a mai `gymlog_v1`.
Ez a legkisebb kockázat és a `readKey`/`writeKey`-hez tökéletesen illik.
(A 2. fázisban – barátok – lesz külön `workouts` tábla a lekérdezhető
megosztáshoz; lásd lentebb.)

Futtasd a **SQL Editor**-ban:

```sql
-- Profil (a auth.users mellé)
create table public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  created_at timestamptz default now()
);

-- A teljes edzésnapló-állapot, egy sor / felhasználó.
-- A data JSON pontosan a mai gymlog_v1 tartalom.
create table public.gym_state (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- Row Level Security: mindenki CSAK a saját sorát látja/írja.
alter table public.profiles  enable row level security;
alter table public.gym_state enable row level security;

create policy "profil: saját" on public.profiles
  for all using (auth.uid() = id) with check (auth.uid() = id);

create policy "állapot: saját" on public.gym_state
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Új regisztrációnál automatikusan jöjjön létre a profil + üres állapot.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles(id) values (new.id) on conflict do nothing;
  insert into public.gym_state(user_id, data) values (new.id, '{}'::jsonb)
    on conflict do nothing;
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
```

> **Fotók:** a mostani `photos` base64-ként a JSON-ban ül. Kis mennyiségnél
> ez a `jsonb`-ben elfér, de gyorsan hízik. **2. fázisra** javasolt a
> Supabase **Storage**-ba tenni a képeket, és a JSON-ban csak az URL-t
> tárolni. 1. fázisban maradhat a blobban (egyszerűbb import).

---

## 3. Frontend integráció – a felhő-adapter

A Supabase kliens betöltése (a `<head>`-be, a fontok mellé). Mivel az app
CSP-mentes statikus oldal, ESM importtal a legtisztább:

```html
<script type="module">
  import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
  window.sb = createClient('https://<PROJECT>.supabase.co', '<ANON_KULCS>');
</script>
```

> Ha offline-first fontos (teremben nincs net), a `@supabase/supabase-js`-t
> érdemes a build/`sw.js` cache-be tenni, nem CDN-ről húzni. Ez a lépés a
> „nincs build" elvet megtöri – vagy vállalod a minimál buildet (pl. Vite),
> vagy a fájlt beteszed a repóba és a service worker cache-eli.

A meglévő `readKey`/`writeKey` bővítése (a hívási helyek változatlanok):

```js
let cloudUser = null;           // be van-e jelentkezve

async function readKey(k){
  // 1) felhő, ha be van jelentkezve
  if(cloudUser && k===KEY){
    const { data } = await sb.from('gym_state')
      .select('data').eq('user_id', cloudUser.id).single();
    if(data){ localStorage.setItem(k, JSON.stringify(data.data)); // cache
              return JSON.stringify(data.data); }
  }
  // 2) meglévő localStorage / window.storage ág (változatlan) …
}

async function writeKey(k,v){
  let ok=false;
  try{ localStorage.setItem(k,v); ok=true; }catch(e){}          // gyors helyi cache
  if(cloudUser && k===KEY){
    await sb.from('gym_state').upsert({
      user_id: cloudUser.id, data: JSON.parse(v), updated_at: new Date().toISOString()
    });                                                          // felhőbe
  }
  return ok;
}
```

Belépés-figyelés (a `load()` elé):

```js
sb.auth.onAuthStateChange((_e, session)=>{
  cloudUser = session?.user || null;
  load();                       // újratöltés a megfelelő forrásból
});
```

Egy minimál **belépő nézet** (új „Fiók" fül vagy a felső sávban egy gomb):
- kijelentkezve: e-mail + jelszó mező, „Belépés" / „Regisztráció”,
  `sb.auth.signInWithPassword` / `signUp`, plusz `signInWithOAuth` gombok.
- belépve: e-mail cím + „Kilépés" (`sb.auth.signOut`).

---

## 4. Egyszeri migráció: localStorage → felhő

Ez a legkényesebb lépés (éles adat!). Belépés után, ha a felhő üres, de van
helyi napló, ajánld fel az importot – NE csendben írd felül semelyik oldalt.

```js
async function maybeImport(){
  const local = localStorage.getItem(KEY);
  if(!local) return;
  const { data } = await sb.from('gym_state')
    .select('data').eq('user_id', cloudUser.id).single();
  const cloudEmpty = !data || !data.data || !(data.data.sessions||[]).length;
  const localHas   = (JSON.parse(local).sessions||[]).length > 0;
  if(cloudEmpty && localHas &&
     confirm('Feltöltsem a helyi naplódat ('+JSON.parse(local).sessions.length+
             ' edzés) a fiókodba?')){
    await writeKey(KEY, local);   // felmegy a felhőbe
  }
}
```

Sorrend: **belépés → maybeImport → load**. Ha mindkét oldalon van adat,
ne dönts helyette: mutasd a kettőt és kérdezz (melyik legyen az alap).

---

## 5. Szinkron és konfliktus

- **Egy eszköz:** nincs gond, minden `save()` felmegy.
- **Több eszköz:** minden `save()` az egész blobot upsertálja. Két eszköz
  párhuzamos írásánál „utolsó nyer”. Ez naplóhoz elfogadható, de:
  - tárold a session-öket `t` időbélyeggel (már megvan) → később
    edzésenkénti összefésülés lehetséges,
  - opcionálisan `updated_at` ellenőrzés írás előtt (ha a felhő újabb,
    kérdezz rá).
- **Offline:** a localStorage cache-ből fut az app; neten visszatérve a
  következő `save()` felzárkóztatja a felhőt. (Ha komolyabb offline-szinkron
  kell, az a 2+ fázis.)

---

## 6. Netlify / build hatások

- A frontend maradhat statikus a Netlify-on. Az anon kulcs + URL mehet
  build-időben környezeti változóból, vagy egyszerűen beégetve (publikus).
- Ha a Supabase JS-t nem CDN-ről akarod (offline), az igényel egy minimál
  bundlert (pl. Vite) VAGY a fájl repóba tételét + `sw.js` cache-t. Döntsd
  el, mennyire fontos a teljes offline a belépett módban.

---

## 7. Tesztelési checklist

- [ ] Regisztráció → profil + üres `gym_state` sor létrejön (trigger).
- [ ] Belépés két böngészőből ugyanazzal a fiókkal → ugyanaz a napló.
- [ ] Import felajánlás CSAK üres felhő + nem üres helyi esetén jelenik meg.
- [ ] `save()` után a másik eszközön újratöltésre látszik a változás.
- [ ] RLS: egy másik user tokenjével a `gym_state` lekérés ÜRES (nem szivárog).
- [ ] Offline (repülő mód): app betölt a cache-ből, neten visszatérve szinkron.
- [ ] Kijelentkezés → a helyi cache marad, de a felhő-írás leáll.

---

## 8. Kockázatok / visszaút

- **Éles adat:** import előtt mindig `backup()` (a mostani „Biztonsági
  mentés" gomb) — így fájlként is megvan, bármi történik.
- **Offline-first gyengülhet:** a fő használati hely a terem (rossz net) —
  ügyelj, hogy belépve is a cache-ből induljon az app, ne blokkoljon a
  hálózatra várva.
- **RLS a gerinc:** ha bármelyik policy hibás, adat szivároghat. A fenti
  „csak a saját sor" policy-t teszteld idegen tokennel is.
- **Visszaút:** mivel a `gymlog_v1` alak változatlan, a felhő kikapcsolása
  után az app a localStorage-ból ugyanúgy fut tovább — nincs beragadás.

---

## Előretekintés – 2. fázis (barátok) alapjai

Amikor jön a közösségi rész, a `gym_state` blob mellé bejön a normalizált,
lekérdezhető réteg:

```sql
create table public.workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  day text, t timestamptz, log jsonb,
  visibility text default 'private'      -- private | friends
);
create table public.friendships (
  user_id uuid references auth.users(id) on delete cascade,
  friend_id uuid references auth.users(id) on delete cascade,
  status text default 'pending',         -- pending | accepted
  primary key (user_id, friend_id)
);
```

Barát-láthatóság RLS-sel: „látom a workout-ot, ha az enyém, VAGY
`visibility='friends'` és van elfogadott `friendship` köztünk". A `gym_state`
akkor a saját, gyors kliens-állapot marad; a `workouts` a megosztható,
lekérdezhető nézet.
