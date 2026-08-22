# 2. fázis – Barátok (beüzemelés)

Ez az ág (`feat/friends`) a barát-funkciót adja. Regressziómentes: belépés
nélkül / a barát-felület nélkül minden változatlanul működik. **Élő Supabase
kell** a teszthez (a fejlesztői környezet tiltja), ezért előbb próbáld ki,
utána merge a `main`-be.

## Beüzemelés

1. Supabase → SQL Editor → futtasd a **`supabase/schema-friends.sql`**-t
   (feltételezi az 1. fázis `schema.sql`-jét: profiles, gym_state).
2. Deployold ezt az ágat (vagy futtasd lokálisan), és lépj be a fiókoddal.
3. A **☁ Fiók** lapon adj meg egy **Megjelenítendő nevet** → Mentés.
4. Nyisd meg a **Barátok** lapot: ott a **barát-kódod** (6 jegyű).

## Tesztforgatókönyv (két fiók kell)

- „A" fiók megnyitja a Barátok lapot → látja a kódját.
- „B" fiók beírja „A" kódját → **Bejelölés** → 'ok' (függőben).
- „A" fiók a **Bejövő kérések** alatt **Elfogad**.
- Mindkettő látja a másikat a **Barátaid** listában.
- Egy edzés lezárása után a **haladás** (edzésszám, 7 napi, legnagyobb
  súlyok) megjelenik a barátnál (koppints a nevére).

## Mit oszt meg (adatvédelem)

- CSAK összefoglaló: edzésszám, elmúlt 7 nap, utolsó edzés dátuma, és a 6
  legnagyobb munkasúly (`shared_stats`).
- **NEM** oszt meg: nyers napló, jegyzetek, fotók, sérülés-adat. Ezeket a
  `gym_state` tárolja, amit az RLS csak a tulajnak enged.
- Barát KÓDDAL adható hozzá (nem e-maillel), így nincs e-mail-kutatás.

## Ellenőrzési checklist

- [ ] `schema-friends.sql` lefutott (profiles bővült, friendships +
      shared_stats + request_friend RPC létrejött).
- [ ] Kérés → elfogadás → mindkét oldalon barát.
- [ ] Barát haladása látszik; idegen (nem barát) `shared_stats`-ot NEM lát
      (RLS – teszteld egy harmadik fiókkal).
- [ ] Barát törlése után a haladás már nem elérhető.
- [ ] Kijelentkezve / a barát-felület nélkül az app változatlan.

## Kód

- `js/auth.js`: `getProfile`, `saveDisplayName`, `requestFriend`,
  `listFriendships`, `respondFriend`, `removeFriend`, `friendStats`,
  `publishStats`.
- `index.html`: a Fiók lapon név + barát-kód + „Barátok" gomb; a Barátok
  lap (kód, bejelölés, kérések, barátlista, barát-haladás); a megosztás
  frissül belépéskor és edzés lezárásakor (`syncStats`).
