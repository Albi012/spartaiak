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

  // -- Veszteségmentes összefésülés (két eszköz közti csendes adat-
  //    vesztés ellen) -------------------------------------------------
  // A felhő és a helyi napló UNIÓJA: egyetlen rögzített edzés sem veszik
  // el. Az edzéseket azonosító (t + day) szerint egyesítjük; ütközésnél a
  // logot gyakorlatonként a gazdagabb (több rögzített szett) verzió nyeri.
  // A skalár preferenciák (injury, activeProgram, hidePlan, active) és a
  // kulcsolt mezők per-kulcs az ÚJABB állapotból jönnek (a legutóbbi edzés
  // időbélyege a frisseség-proxy) – az edzéslistát ez sosem csonkítja.
  function _filled(L){ return (L&&L.sets||[]).filter(x=>x!=null).length; }
  function _mergeSession(x, y){
    const out = Object.assign({}, x, y);     // y a bázis a skalárokhoz (note, w, why…)
    out.log = Object.assign({}, x.log||{});
    Object.keys(y.log||{}).forEach(id=>{
      const cur = out.log[id], nw = y.log[id];
      out.log[id] = (!cur || _filled(nw) >= _filled(cur)) ? nw : cur;
    });
    return out;
  }
  function mergeGym(aStr, bStr){
    let a=null, b=null;
    try{ a = aStr ? JSON.parse(aStr) : null; }catch(e){}
    try{ b = bStr ? JSON.parse(bStr) : null; }catch(e){}
    if(!a) return bStr || null;
    if(!b) return aStr || null;
    const latest = s => (s.sessions||[]).reduce((m,x)=>Math.max(m, x.t||0), 0);
    const aNew = latest(a) >= latest(b);
    const newer = aNew ? a : b, older = aNew ? b : a;
    const out = Object.assign({}, older, newer);   // skalárok: újabb nyer
    // Törlés-síremlékek (tombstone): a két oldal uniója. A törlés így nem
    // "adat hiánya" (amit az unió visszahozna), hanem explicit jelölés, ami
    // átmegy a másik eszközre. A kulcs a törölt edzés azonosítója (t+day).
    const tomb = new Map();
    (a.deleted||[]).concat(b.deleted||[]).forEach(d=>{ if(d&&d.k){
      const ex=tomb.get(d.k); if(!ex||(d.at||0)>(ex.at||0)) tomb.set(d.k, d); }});
    out.deleted = [...tomb.values()];
    // Edzések: unió azonosító szerint, ütközésnél log-szintű összefésülés.
    // A síremlékkel jelölt edzések kimaradnak.
    const map = new Map(), key = s => (s.t||0)+'|'+(s.day||'');
    (a.sessions||[]).concat(b.sessions||[]).forEach(s=>{
      const k = key(s); if(tomb.has(k)) return;
      const ex = map.get(k);
      map.set(k, ex ? _mergeSession(ex, s) : s);
    });
    out.sessions = [...map.values()].sort((x,y)=>(x.t||0)-(y.t||0));
    // Kulcsolt mezők: unió (per-kulcs az újabb nyer, a régi kulcsok maradnak).
    // A síremlékkel jelölt kulcsokat (pl. törölt saját gyakorlat cx_… és a
    // hozzá tartozó súly/jegyzet/fotó/progr.) kizárjuk.
    ['weights','notes','photos','customEx','prog','bw'].forEach(f=>{
      if(a[f]||b[f]){ const merged = Object.assign({}, older[f]||{}, newer[f]||{});
        Object.keys(merged).forEach(k=>{ if(tomb.has(k)) delete merged[k]; });
        out[f] = merged; }
    });
    // Id-kulcsolt tömbök: unió id szerint; a síremlékes id-ket (törölt saját
    // edzés r_… / edzésterv p_…) kizárjuk – így törlés után nem térnek vissza.
    ['routines','programs'].forEach(f=>{
      const m = new Map();
      (older[f]||[]).concat(newer[f]||[]).forEach(it=>{ if(it&&it.id && !tomb.has(it.id)) m.set(it.id, it); });
      if(a[f]||b[f]) out[f] = [...m.values()];
    });
    out.lastBackup = Math.max(a.lastBackup||0, b.lastBackup||0) || null;
    // Folyamatban lévő edzés: az utolsó módosítás (activeT) dönt – így egy
    // frissen indított/haladó edzést nem töröl egy másik eszköz elavult
    // null-ja, DE az eldobás (null, friss activeT) megmarad, nem tér vissza.
    const aT=a.activeT||0, bT=b.activeT||0;
    if(aT||bT){ const src = aT>=bT ? a : b; out.active = src.active!=null ? src.active : null; out.activeT = Math.max(aT,bT); }
    else { out.active = (newer.active!=null) ? newer.active : (older.active!=null ? older.active : null); }
    // Biztonság: ha az aktív edzés már befejezett edzésként is szerepel a
    // naplóban (egyik eszköz befejezte, a másik még aktívként hozza), ne
    // duplázzuk – az aktívat elvetjük.
    if(out.active && map.has(key(out.active))) out.active = null;
    return JSON.stringify(out);
  }

  // -- Felhő-tároló adapter (a readKey/writeKey ehhez hív) ------------
  // Nyers felírás (összefésülés nélkül) – belső használat.
  async function rawWrite(value){
    const c = await ensureClient(); if(!c || !cloudUser) return false;
    const { error } = await c.from('gym_state').upsert({
      user_id: cloudUser.id,
      data: JSON.parse(value),
      updated_at: new Date().toISOString()
    });
    return !error;
  }
  async function fetchCloud(){
    const c = await ensureClient(); if(!c || !cloudUser) return null;
    const { data, error } = await c.from('gym_state')
      .select('data').eq('user_id', cloudUser.id).single();
    return (error || !data) ? null : JSON.stringify(data.data);
  }
  // Olvasás: a felhő ÉS a helyi napló összefésült uniója; a felhőt is
  // frissítjük rá (konvergencia), a helyi cache-t is.
  async function cloudRead(){
    const c = await ensureClient(); if(!c || !cloudUser) return null;
    const cloudStr = await fetchCloud();
    const localStr = hooks.getLocal();
    const merged = mergeGym(localStr, cloudStr) || cloudStr || localStr;
    if(merged){
      hooks.setLocal(merged);
      if(merged !== cloudStr){ try{ await rawWrite(merged); }catch(e){} }
    }
    return merged;
  }
  // Írás: a beérkező (helyi) állapotot a felhő aktuális tartalmával
  // fésüljük össze, majd az uniót írjuk vissza – így egy elavult eszköz
  // sem törölheti a másik edzéseit.
  async function cloudWrite(value){
    const c = await ensureClient(); if(!c || !cloudUser) return false;
    const cloudStr = await fetchCloud();
    const merged = mergeGym(value, cloudStr) || value;
    hooks.setLocal(merged);
    return rawWrite(merged);
  }

  // -- Bejelentkezéskori összefésülés (a régi „migráció" helyett) -----
  async function maybeImport(){
    // Nincs kérdés/felülírás: a cloudRead uniót képez és konvergál.
    await cloudRead();
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

  // -- Edzésterv-megosztás -------------------------------------------
  async function sharePlan(toUser, name, payload){
    const c=await ensureClient(); if(!c||!cloudUser) return false;
    const { error } = await c.from('plan_shares').insert({
      from_user: cloudUser.id, from_name: (await myName()), to_user: toUser, name: name||'Terv', payload: payload||{} });
    return !error;
  }
  async function myName(){
    try{ const c=await ensureClient(); if(!c||!cloudUser) return null;
      const { data } = await c.from('profiles').select('display_name').eq('id',cloudUser.id).single();
      return data ? data.display_name : null; }catch(e){ return null; }
  }
  async function listSharedPlans(){
    const c=await ensureClient(); if(!c||!cloudUser) return [];
    const { data } = await c.from('plan_shares').select('*').eq('to_user',cloudUser.id).order('created_at',{ascending:false});
    return data||[];
  }
  async function deleteSharedPlan(id){
    const c=await ensureClient(); if(!c||!cloudUser) return false;
    const { error } = await c.from('plan_shares').delete().eq('id',id);
    return !error;
  }

  window.Auth = {
    hooks, configured, init,
    signUp, signIn, signInOAuth, signOut, currentUser,
    cloudRead, cloudWrite, maybeImport, mergeGym,
    getProfile, saveDisplayName, requestFriend, listFriendships,
    respondFriend, removeFriend, friendStats, publishStats,
    sharePlan, listSharedPlans, deleteSharedPlan,
    isLoggedIn: () => !!cloudUser
  };
})();
