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

  // -- Profil + barátok (2. fázis) -----------------------------------
  function randCode(){ // 6 jegyű, félreérthető karakterek nélkül
    const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; let s='';
    for(let i=0;i<6;i++) s+=A[Math.floor(Math.random()*A.length)];
    return s;
  }
  async function getProfile(){
    const c=await ensureClient(); if(!c||!cloudUser) return null;
    let { data } = await c.from('profiles').select('display_name,friend_code').eq('id',cloudUser.id).single();
    if(!data) return null;
    // barát-kód biztosítása (első használatkor)
    if(!data.friend_code){
      let code=randCode();
      const up=await c.from('profiles').update({friend_code:code}).eq('id',cloudUser.id).select('display_name,friend_code').single();
      if(up.data) data=up.data;
    }
    return data;
  }
  async function saveDisplayName(name){
    const c=await ensureClient(); if(!c||!cloudUser) return false;
    const { error } = await c.from('profiles').update({display_name:name}).eq('id',cloudUser.id);
    return !error;
  }
  async function requestFriend(code){
    const c=await ensureClient(); if(!c||!cloudUser) return 'error';
    const { data, error } = await c.rpc('request_friend',{ code:(code||'').trim().toUpperCase() });
    return error ? 'error' : data;   // 'ok' | 'accepted' | 'self' | 'notfound'
  }
  async function listFriendships(){
    const c=await ensureClient(); if(!c||!cloudUser) return [];
    const { data } = await c.from('friendships').select('*')
      .or('requester.eq.'+cloudUser.id+',addressee.eq.'+cloudUser.id);
    return data||[];
  }
  async function respondFriend(requesterId, accept){
    const c=await ensureClient(); if(!c||!cloudUser) return false;
    if(accept){
      const { error } = await c.from('friendships').update({status:'accepted'})
        .eq('requester',requesterId).eq('addressee',cloudUser.id);
      return !error;
    } else {
      const { error } = await c.from('friendships').delete()
        .eq('requester',requesterId).eq('addressee',cloudUser.id);
      return !error;
    }
  }
  async function removeFriend(otherId){
    const c=await ensureClient(); if(!c||!cloudUser) return false;
    const { error } = await c.from('friendships').delete()
      .or('and(requester.eq.'+cloudUser.id+',addressee.eq.'+otherId+'),and(requester.eq.'+otherId+',addressee.eq.'+cloudUser.id+')');
    return !error;
  }
  async function friendStats(userId){
    const c=await ensureClient(); if(!c||!cloudUser) return null;
    const { data } = await c.from('shared_stats').select('display_name,data,updated_at').eq('user_id',userId).single();
    return data||null;
  }
  async function publishStats(summary, displayName){
    const c=await ensureClient(); if(!c||!cloudUser) return false;
    const { error } = await c.from('shared_stats').upsert({
      user_id: cloudUser.id, display_name: displayName||null,
      data: summary||{}, updated_at: new Date().toISOString() });
    return !error;
  }

  window.Auth = {
    hooks, configured, init,
    signUp, signIn, signInOAuth, signOut, currentUser,
    cloudRead, cloudWrite, maybeImport,
    getProfile, saveDisplayName, requestFriend, listFriendships,
    respondFriend, removeFriend, friendStats, publishStats,
    isLoggedIn: () => !!cloudUser
  };
})();
