// Edző AI – Supabase Edge Function (Deno).
//
// A Claude API-kulcs CSAK itt él (Supabase secret: ANTHROPIC_API_KEY), soha
// nem kerül a böngészőbe. A kliens a bejelentkezett felhasználó JWT-jével
// hívja; a függvény ellenőrzi, hogy a fiók az engedélyezett listán van-e
// (COACH_ALLOWED_EMAILS, vesszővel elválasztva) – így amíg nincs előfizetés,
// a költség nem szaladhat el.
//
// Telepítés: docs/coach-ai.md
import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...CORS, "Content-Type": "application/json" } });

const MAX_TURNS = 20;          // ennyi üzenet megy vissza a beszélgetésből
const MAX_CHARS = 4000;        // egy üzenet / a kontextus felső határa (karakter)

const SYSTEM = `Te egy tapasztalt, gyakorlatias erőedző vagy egy magyar edzésnapló-appban.
A felhasználó saját naplójából készült összefoglalót kapsz (terv, munkasúlyok, heti terhelés,
alvás, testsúly, és ha kéri, a heti edzései szettenként). Ebből dolgozz: hivatkozz a konkrét
számaira, és ne találj ki adatot, ami nincs benne – ha valami hiányzik, mondd ki.
Magyarul válaszolj, tömören, telefonon olvasható módon: rövid bekezdések vagy pár pontos lista,
konkrét súly / szett / ismétlés javaslattal, ha az a kérdés.
Nem vagy orvos: fájdalom, sérülés vagy egészségügyi panasz esetén javasold, hogy forduljon
szakemberhez, és ne állíts fel diagnózist.`;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ error: "Csak POST." }, 405);

  // 1) Ki hív? A JWT-t a Supabase maga ellenőrzi.
  const auth = req.headers.get("Authorization") || "";
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: auth } },
  });
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return json({ error: "Jelentkezz be az edző használatához." }, 401);

  // 2) Engedélyezett fiók?
  const allowed = (Deno.env.get("COACH_ALLOWED_EMAILS") || "")
    .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!allowed.includes((user.email || "").toLowerCase()))
    return json({ error: "Az edző AI egyelőre csak meghívott fiókoknak érhető el." }, 403);

  // 3) Bemenet: a beszélgetés + a naplóból származtatott kontextus.
  let body: { messages?: { role: string; content: string }[]; context?: string };
  try { body = await req.json(); } catch { return json({ error: "Hibás kérés." }, 400); }
  const msgs = (body.messages || [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim())
    .slice(-MAX_TURNS)
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content.slice(0, MAX_CHARS) }));
  if (!msgs.length || msgs[msgs.length - 1].role !== "user") return json({ error: "Nincs kérdés." }, 400);
  const context = String(body.context || "").slice(0, MAX_CHARS * 3);

  // 4) Claude.
  const client = new Anthropic({ apiKey: Deno.env.get("ANTHROPIC_API_KEY")! });
  try {
    const res = await client.beta.messages.create({
      model: "claude-sonnet-5-5",
      max_tokens: 4000,
      output_config: { effort: "low" },
      betas: ["server-side-fallback-2026-07-01"],
      // @ts-ignore – a "default" alak az újabb SDK-típusokban van benne
      fallbacks: "default",
      system: [
        { type: "text", text: SYSTEM },
        { type: "text", text: "A felhasználó naplójának összefoglalója:\n\n" + context, cache_control: { type: "ephemeral" } },
      ],
      messages: msgs,
    });
    if (res.stop_reason === "refusal")
      return json({ error: "Erre a kérdésre az edző nem tud válaszolni." }, 200);
    const text = res.content.filter((b) => b.type === "text").map((b) => (b as { text: string }).text).join("\n").trim();
    return json({ reply: text || "(üres válasz)" });
  } catch (e) {
    if (e instanceof Anthropic.RateLimitError) return json({ error: "Túl sok kérés – próbáld újra pár perc múlva." }, 429);
    if (e instanceof Anthropic.APIError) return json({ error: "Az AI szolgáltatás most nem elérhető." }, 502);
    return json({ error: "Váratlan hiba." }, 500);
  }
});
