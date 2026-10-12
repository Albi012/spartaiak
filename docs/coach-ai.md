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

(`SUPABASE_URL` és `SUPABASE_ANON_KEY` alapból elérhető.)

## 3. A függvény telepítése

Parancssorból (Supabase CLI):

```
supabase login
supabase link --project-ref fmvszzhsqfmjcfpxfgdn
supabase functions deploy coach
```

Vagy a Dashboardon: Edge Functions → Deploy a new function → „coach" néven,
és bemásolod az `index.ts` tartalmát.

## Működés

- Csak bejelentkezett ÉS az engedélyezett listán lévő fiók kap választ (403
  egyébként). A kártya a főoldalon csak bejelentkezve látszik.
- Modell: `claude-opus-5-5`, alacsony effort; a naplóból származtatott
  kontextus (`aiUserContext` + a heti export) cache-elt rendszerüzenetben megy.
- Nagyjából: egy kérdés néhány ezer bemeneti token + pár száz kimeneti →
  kérdésenként kb. 1–3 Ft nagyságrend.
