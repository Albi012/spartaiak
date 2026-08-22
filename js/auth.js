/* ------------------------------------------------------------------ *
 * Fiók + felhő-szinkron – CSONTVÁZ (1. fázis)
 *
 * Ez a modul még NINCS bekötve az index.html-be – az app változatlanul
 * fut localStorage-ból. A bekötés lépései: docs/1-fazis-auth-TODO.md.
 *
 * Elv: a meglévő readKey/writeKey réteg mögé illesztjük a felhőt. A
 * gymlog_v1 JSON-alak NEM változik – a felhő ugyanazt a stringet tárolja.
 * ------------------------------------------------------------------ */
(function(){
  'use strict';

  const KEY = 'gymlog_v1';
  let sb = null;          // Supabase kliens (lusta betöltés)
  let cloudUser = null;   // be van-e jelentkezve

  // A hívó (index.html) ezeket állítja be a bekötéskor:
  //   window.Auth.hooks = { onChange, getLocal, setLocal, reload }
  const hooks = {
    onChange: null,                 // (user|null) => void
    getLocal: () => { try{ return localStorage.getItem(KEY); }catch(e){ return null; } },
    setLocal: (v) => { try{ localStorage.setItem(KEY, v); }catch(e){} },
    reload:   null                  // () => void  (app újratöltése/renderelése)
  };

  function configured(){
    return !!(window.SUPABASE_CONFIG && window.SUPABASE_CONFIG.url &&
              window.SUPABASE_CONFIG.anonKey &&
              !/YOUR-/.test(window.SUPABASE_CONFIG.url));
  }

  // Supabase JS lusta betöltése (offline/CSP megfontolás: lásd TODO).
  async function ensureClient(){
    if(sb) return sb;
    if(!configured()) return null;
    try{
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
      sb = createClient(window.SUPABASE_CONFIG.url, window.SUPABASE_CONFIG.anonKey);
      return sb;
    }catch(e){ console.warn('Supabase kliens nem tölthető be (offline?)', e); return null; }
  }

  // -- Auth műveletek (stub-ok – a valós UI a bekötéskor jön) ----------
  async function init(){
    const c = await ensureClient();
    if(!c) return;                 // nincs konfig → az app localStorage-ból fut
    const { data } = await c.auth.getSession();
    cloudUser = data && data.session ? data.session.user : null;
    c.auth.onAuthStateChange(async (_e, session)=>{
      cloudUser = session ? session.user : null;
      if(cloudUser) await maybeImport();
      if(hooks.onChange) hooks.onChange(cloudUser);
      if(hooks.reload)   hooks.reload();
    });
    if(cloudUser) await maybeImport();
    if(hooks.onChange) hooks.onChange(cloudUser);
  }

  async function signUp(email, password){
    const c = await ensureClient(); if(!c) throw new Error('nincs konfig');
    return c.auth.signUp({ email, password });
  }
  async function signIn(email, password){
    const c = await ensureClient(); if(!c) throw new Error('nincs konfig');
    return c.auth.signInWithPassword({ email, password });
  }
  async function signInOAuth(provider){   // 'google' | 'apple'
    const c = await ensureClient(); if(!c) throw new Error('nincs konfig');
    return c.auth.signInWithOAuth({ provider });
  }
  async function signOut(){
    const c = await ensureClient(); if(!c) return;
    await c.auth.signOut(); cloudUser = null;
    if(hooks.onChange) hooks.onChange(null);
    if(hooks.reload)   hooks.reload();
  }
  function currentUser(){ return cloudUser; }

  // -- Felhő-tároló adapter (a readKey/writeKey ehhez hív) ------------
  // Csak a KEY-t szinkronizáljuk; be kell jelentkezve lenni.
  async function cloudRead(){
    const c = await ensureClient(); if(!c || !cloudUser) return null;
    const { data, error } = await c.from('gym_state')
      .select('data').eq('user_id', cloudUser.id).single();
    if(error || !data) return null;
    const str = JSON.stringify(data.data);
    hooks.setLocal(str);            // helyi cache frissítése
    return str;
  }
  async function cloudWrite(value){
    const c = await ensureClient(); if(!c || !cloudUser) return false;
    const { error } = await c.from('gym_state').upsert({
      user_id: cloudUser.id,
      data: JSON.parse(value),
      updated_at: new Date().toISOString()
    });
    return !error;
  }

  // -- Egyszeri migráció: localStorage → felhő ------------------------
  async function maybeImport(){
    const local = hooks.getLocal();
    if(!local) return;
    let localSessions = 0;
    try{ localSessions = (JSON.parse(local).sessions || []).length; }catch(e){}
    if(!localSessions) return;

    const cloud = await cloudRead();            // felhő állapota
    let cloudSessions = 0;
    try{ cloudSessions = cloud ? (JSON.parse(cloud).sessions || []).length : 0; }catch(e){}

    if(cloudSessions === 0){
      if(confirm('Feltöltsem a helyi naplódat ('+localSessions+
                 ' edzés) a fiókodba?')){
        await cloudWrite(local);
      }
    }
    // Ha mindkét oldalon van adat: NE dönts helyette – a bekötéskor
    // mutass választót (melyik legyen az alap). Lásd TODO.
  }

  window.Auth = {
    hooks, configured, init,
    signUp, signIn, signInOAuth, signOut, currentUser,
    cloudRead, cloudWrite, maybeImport,
    isLoggedIn: () => !!cloudUser
  };
})();
