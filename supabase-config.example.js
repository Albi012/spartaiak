// Supabase konfiguráció – MINTA.
// Másold `supabase-config.js` néven és töltsd ki a saját projekted adataival.
// A `supabase-config.js` a .gitignore-ban van – NE kerüljön a repóba.
//
// Az anon kulcs publikus lehet (a böngészőbe kerül); az adatot a Row Level
// Security védi, nem a kulcs titkossága. A service_role kulcsot SOHA ne tedd
// a frontendbe.
window.SUPABASE_CONFIG = {
  url: 'https://YOUR-PROJECT.supabase.co',
  anonKey: 'YOUR-ANON-PUBLIC-KEY'
};
