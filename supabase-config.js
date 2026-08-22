// Supabase konfiguráció (1. fázis – fiók + felhő-szinkron).
// A publikálható (sb_publishable_…) kulcs SZÁNDÉKOSAN böngésző-biztos:
// az adatot a Row Level Security védi, nem a kulcs titkossága. Ezért ez a
// fájl a repóban lehet (így a Netlify is kiszolgálja). A titkos
// sb_secret_… / service_role kulcs SOHA nem kerülhet ide.
window.SUPABASE_CONFIG = {
  url: 'https://fmvszzhsqfmjcfpxfgdn.supabase.co',
  anonKey: 'sb_publishable_txMdb2yFmWcitQ0zn0srlA_9wGU8BGn'
};
