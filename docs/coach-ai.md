# Edző AI – telepítés

Az app „Edző AI" lapja egy Supabase Edge Functiont hív
(`supabase/functions/coach/index.ts`), az pedig a Claude API-t. Az API-kulcs
CSAK a Supabase titkai között van – a böngészőbe és a repóba sosem kerül.

## 1. Anthropic API-kulcs

console.anthropic.com → API Keys → új kulcs. Érdemes a Console-ban havi
költéskeretet (spend limit) is beállítani.

## 2. Titkok a Supabase-ben

Supabase Dashboard → Project Settings → Edge Functions → Secrets:

| név | érték |
|---|---|
| `ANTHROPIC_API_KEY` | az 1. lépés kulcsa |
| `COACH_ALLOWED_EMAILS` | a használható fiókok e-mail-címe(i), vesszővel |
| `COACH_WEEKLY_LIMIT` | *(nem kötelező)* heti kérdéslimit fiókonként, alapból 20 |

(`SUPABASE_URL` és `SUPABASE_ANON_KEY` alapból elérhető.)

## 3. A kérdéslimit táblája

Supabase → SQL Editor: futtasd a `supabase/schema-coach.sql`-t, majd ÚJRA a
`supabase/schema-delete-account.sql`-t (a fiók-törlés ezt a táblát is
takarítja). Enélkül az edző „A kérdéslimit most nem ellenőrizhető" hibát ad.

## 4. A függvény telepítése

Parancssorból (Supabase CLI):

```
supabase login
supabase link --project-ref fmvszzhsqfmjcfpxfgdn
supabase functions deploy coach
```

Vagy a Dashboardon: Edge Functions → Deploy a new function → „coach" néven,
és bemásolod az `index.ts` tartalmát.

## Működés

- **Heti kérdéslimit**: gördülő 7 nap, fiókonként (`COACH_WEEKLY_LIMIT`, alapból
  20). A szerver számol a `coach_usage` táblából – a böngészőből nem
  kerülhető meg, mert a táblán nincs törlés-jog. Csak a MEGVÁLASZOLT kérdés
  számít, a heti értékelés is egy kérdés. Az app kiírja, mennyi maradt, és
  mikor szabadul fel a következő.

- Csak bejelentkezett ÉS az engedélyezett listán lévő fiók kap választ (403
  egyébként). A kártya a főoldalon csak bejelentkezve látszik.
- Modell: `claude-sonnet-5-5` (olcsóbb, csevegésre bőven elég), alacsony effort; a naplóból származtatott
  kontextus (`aiUserContext` + a heti export) cache-elt rendszerüzenetben megy.
- Nagyjából: egy kérdés néhány ezer bemeneti token + pár száz kimeneti →
  kérdésenként kb. 1–3 Ft nagyságrend.
