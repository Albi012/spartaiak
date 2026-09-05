/* Edzésnapló – natív Health-híd (alvásadat)
 * ------------------------------------------------------------------
 * Ez a modul CSAK akkor csinál bármit, ha az app natív burokban fut
 * (Capacitor), és van hozzá Health plugin. Sima weben (Netlify/GitHub
 * Pages, böngésző, PWA) TELJESEN inert: a `Health.available()` false-t
 * ad, a kártya kézi bevitelre esik vissza. Így a web-app változatlan.
 *
 * A tényleges plugin-hívás egyetlen helyen, a readLastNightSleep()-ben
 * van, és szándékosan több ismert plugin-alakot próbál. A KONKRÉT plugin
 * és a pontos metódusnevek/adatalak a docs/native-health/README.md-ben –
 * a natív build során ott kell véglegesíteni (iOS: HealthKit
 * SleepAnalysis; Android: Health Connect SleepSession).
 *
 * A modul semmit nem tár – a beolvasott alvást a Health.hooks.applySleep
 * callbacken adja át az appnak, ami a saját S.sleep mezőjébe menti.
 */
(function () {
  'use strict';

  var H = { hooks: { applySleep: null } };

  function cap() { return (typeof window !== 'undefined' && window.Capacitor) ? window.Capacitor : null; }
  function platform() { var c = cap(); try { return (c && c.getPlatform) ? c.getPlatform() : 'web'; } catch (e) { return 'web'; } }
  function plugin() {
    var c = cap(); if (!c) return null;
    var P = c.Plugins || {};
    // A választott plugin regisztrált neve (lásd runbook). Több ismert
    // néven is keressük, hogy a build során ne kelljen ezt átírni.
    return P.Health || P.CapacitorHealth || P.HealthConnect || P.HealthKit || null;
  }

  // Elérhető-e a natív alvás-behúzás ezen az eszközön?
  H.available = function () {
    var p = platform();
    return (p === 'ios' || p === 'android') && !!plugin();
  };

  // Helyi „ébredés napja" kulcs (YYYY-MM-DD) – egyezik az app bwKey-ével.
  function dayKey(dt) {
    var d = dt || new Date();
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }

  // Engedélykérés – a plugintól függő alakot próbáljuk.
  async function requestPerm(p) {
    try {
      if (p.requestHealthPermissions) return await p.requestHealthPermissions({ permissions: ['READ_SLEEP'] });
      if (p.requestAuthorization)     return await p.requestAuthorization({ read: ['sleep', 'sleepAnalysis'] });
      if (p.requestPermissions)       return await p.requestPermissions({ read: ['sleep'] });
    } catch (e) { throw e; }
    return null;
  }

  // Az elmúlt éjszaka nyers alvás-intervallumai. A visszaadott alak
  // plugin-függő; itt normalizáljuk {start,end,stage} tömbbé.
  async function readLastNightSleep(p) {
    var end = new Date();
    var start = new Date(end.getTime() - 18 * 3600 * 1000); // tegnap ~délig visszamenőleg
    var opt = { startDate: start.toISOString(), endDate: end.toISOString() };
    var raw = null;
    if (p.querySleep)             raw = await p.querySleep(opt);
    else if (p.queryAggregated)   raw = await p.queryAggregated(Object.assign({ dataType: 'sleep' }, opt));
    else if (p.querySamples)      raw = await p.querySamples(Object.assign({ sampleName: 'sleepAnalysis' }, opt));
    else if (p.query)             raw = await p.query(Object.assign({ dataType: 'sleep' }, opt));
    else return [];
    // Gyakori burkolások kicsomagolása:
    var arr = (raw && (raw.sleep || raw.samples || raw.result || raw.data || raw.records)) || raw || [];
    if (!Array.isArray(arr)) arr = [];
    return arr.map(function (s) {
      return {
        start: s.startDate || s.start || s.startTime || s.from,
        end:   s.endDate   || s.end   || s.endTime   || s.to,
        stage: (s.stage || s.value || s.sleepState || s.type || '').toString().toLowerCase()
      };
    });
  }

  // Alvott percek összegzése. Az „ágyban/ébren" szakaszokat kihagyjuk,
  // ha a stage ezt jelzi; egyébként minden intervallumot beszámítunk.
  function aggregateMinutes(intervals) {
    var total = 0;
    for (var i = 0; i < intervals.length; i++) {
      var iv = intervals[i];
      var a = iv.start ? new Date(iv.start).getTime() : 0;
      var b = iv.end ? new Date(iv.end).getTime() : 0;
      if (!(b > a)) continue;
      var st = iv.stage || '';
      // Kihagyjuk az egyértelmű nem-alvás szakaszokat.
      if (st.indexOf('awake') >= 0 || st.indexOf('inbed') >= 0 || st === 'in_bed' || st === '0') continue;
      total += (b - a) / 60000;
    }
    return Math.round(total);
  }

  // Elmúlt éjszaka behúzása. Web-en / híd nélkül {ok:false}. Soha nem dob.
  H.syncSleep = async function () {
    if (!H.available()) return { ok: false, reason: 'unavailable' };
    var p = plugin();
    try { await requestPerm(p); } catch (e) { return { ok: false, reason: 'permission' }; }
    var intervals;
    try { intervals = await readLastNightSleep(p); } catch (e) { return { ok: false, reason: 'query' }; }
    var min = aggregateMinutes(intervals || []);
    if (!(min > 0)) return { ok: false, reason: 'empty' };
    // Az ébredés napjához rendeljük (az intervallumok vége, vagy ma).
    var lastEnd = null;
    (intervals || []).forEach(function (iv) { if (iv.end) { var t = new Date(iv.end).getTime(); if (!lastEnd || t > lastEnd) lastEnd = t; } });
    var day = dayKey(lastEnd ? new Date(lastEnd) : new Date());
    if (typeof H.hooks.applySleep === 'function') {
      try { H.hooks.applySleep(day, min, 0); } catch (e) {}
    }
    return { ok: true, day: day, min: min, q: 0 };
  };

  // Induláskor: ha van natív híd, opcionálisan azonnal megpróbálhatjuk a
  // csendes behúzást (az app dönt, hívja-e). Itt csak jelezzük a készséget.
  H.init = function () { return H.available(); };

  if (typeof window !== 'undefined') window.Health = H;
})();
