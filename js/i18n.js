/* Edzésnapló – nyelvi réteg
 *
 * TERVEZÉSI DÖNTÉS: a KULCS maga a magyar szöveg.
 * Nem találunk ki `home.title` szerű azonosítókat, mert:
 *   - az app egyetlen, ~5000 soros fájl, ahol a kulcs-kitalálás és a
 *     későbbi kulcs-átnevezés több hibát okozna, mint amennyit megold;
 *   - így a fordítás BEVEZETHETŐ FOKOZATOSAN: amit még nem fordítottunk le,
 *     az automatikusan magyarul jelenik meg, nem üresen vagy `missing.key`
 *     alakban. Egy edzésnaplóban a félig üres felület rosszabb, mint a
 *     félig magyar.
 *
 * Használat:  tr('Mentés most')           → 'Save now' (en) / 'Mentés most' (hu)
 *             tr('{n} edzés', {n:12})     → behelyettesítés
 *
 * A nyelv a `gymlog_lang` kulcsban él (`hu` | `en`), FÜGGETLENÜL a
 * `gymlog_v1` edzésadattól – a nyelvváltás soha nem érinti a naplót.
 * Hiánya = magyar (lásd `detect()` – szándékosan nem tippelünk a
 * böngésző nyelvéből, amíg a fordítás nem teljes).
 */
(function(){
  'use strict';

  const DICT = {
    en: {
      // — Navigáció, fülek —
      'Edzés':'Workout', 'Tervek':'Plans', 'Napló':'Log', 'Haladás':'Progress', 'Barátok':'Friends',

      // — Főoldal —
      'Ez a hét':'This week',
      'Az aktív tervedből még hátra van:':'Left from your active plan:',
      'A tervedet végigcsináltad ezen a héten. Szép munka.':'You finished your plan this week. Nice work.',
      'Megvolt:':'Done:',
      'Kezdés ›':'Start ›',
      'Mára beosztva':'Scheduled for today',
      'Heti beosztás megadása':'Set weekly schedule',
      'Heti beosztás módosítása':'Edit weekly schedule',
      'Mit edzek ma?':'What should I train today?',
      'A heti beosztásod szerint ez van mára.':'Your weekly schedule says this is today.',
      'Napi testsúly':'Daily bodyweight',
      'Alvás':'Sleep',
      'Rég mentettél biztonsági másolatot':'You haven’t backed up in a while',
      'Kézi mentésre senki nem emlékszik, amíg el nem veszti az adatait.':'Nobody remembers manual backups until they lose their data.',
      'Mentés most':'Back up now',
      'Később':'Later',

      // — Lejátszó —
      'Következő ›':'Next ›',
      '‹ Előző':'‹ Previous',
      'Edzés lezárása':'Finish workout',
      'Edzés eldobása':'Discard workout',
      'Jegyzet':'Note',
      'Bemelegítés':'Warm-up',
      'Tárcsák':'Plates',
      'Szünet':'Pause',
      'Pihenő – koppints a leállításhoz':'Rest – tap to stop',
      'Első alkalom – a technika a cél, ne a súly.':'First time – aim for form, not weight.',
      'Előző:':'Previous:',
      'cél:':'target:',
      'kész':'done',

      // — Napló —
      'Javítás':'Fix',
      'Törlés':'Delete',
      'Edzés javítása':'Fix workout',
      'a változás azonnal mentődik':'changes are saved immediately',
      'Szett törlése':'Delete set',
      'Rögzítés':'Record',
      'Kész':'Done',
      'szett':'set',
      'Még nincs lezárt edzés.':'No finished workouts yet.',
      'Heti összefoglaló edzőnek':'Weekly summary for your coach',
      'Terhelt izmok':'Muscles worked',

      // — Haladás —
      'Megakadt gyakorlatok':'Stalled exercises',
      'A naplóból, súly és ismétlés alapján. Koppints a részletekért.':'Derived from your log, by weight and reps. Tap for details.',
      'edzés':'workouts',
      'hetes sorozat':'week streak',
      'össztömeg':'total volume',
      'átlag készenlét':'avg readiness',

      // — Készenlét —
      'Készenlét':'Readiness',
      'Miből jön ez a szám?':'Where does this number come from?',
      'jó':'good', 'közepes':'moderate', 'alacsony':'low',

      // — Általános gombok / lapok —
      'Mégse':'Cancel',
      'Mentés':'Save',
      'Bezárás':'Close',
      'Profil':'Profile',
      'Bejelentkezve':'Signed in',
      'Adatvédelem':'Privacy',
      'Verzió':'Version',
      'Nyelv':'Language',
      'Magyar':'Hungarian',
      'Angol':'English',

      // — Heti beosztás —
      'Heti beosztás':'Weekly schedule',
      'Melyik nap mi?':'What goes on which day?',
      'Nem kötelező – beosztás nélkül a heti nézet csak sorrendet mutat.':
        'Optional – without a schedule the weekly view just shows order.',
      'Egy edzés több napra is betehető (pl. hétfő és csütörtök). A beosztás csak javaslat – bármikor indíthatsz bármit.':
        'A workout can go on several days (e.g. Monday and Thursday). The schedule is only a suggestion – you can start anything any time.',
      'Beosztás törlése':'Clear schedule',

      // — Hétköznapok (rövid) —
      'H':'Mo', 'K':'Tu', 'Sze':'We', 'Cs':'Th', 'P':'Fr', 'Szo':'Sa', 'V':'Su',

      // — Mértékegységek —
      'kg':'kg', 'mp':'s', 'ism.':'reps', 'testsúly':'bodyweight'
    }
  };

  let lang = 'hu';

  // SZÁNDÉKOSAN nem a böngésző nyelvéből indulunk ki, amíg a fordítás nem
  // teljes: egy angol böngészőt automatikusan „angol" felületre tenni,
  // ami valójában nagyrészt magyar, rosszabb, mint magyarul hagyni. Az
  // angol EGYELŐRE kifejezett választás (Profil → Nyelv).
  // Ha a `coverage()` eléri a teljes felületet, ITT kapcsold be a
  // `navigator.language` alapú tippelést – a többi kód készen áll rá.
  function detect(){
    try{
      const saved = localStorage.getItem('gymlog_lang');
      if(saved==='hu' || saved==='en') return saved;
    }catch(e){}
    return 'hu';
  }

  // A magyar a FORRÁSNYELV: ott a kulcs maga a kimenet, szótár nélkül is.
  function t(key, vars){
    let s = key;
    if(lang!=='hu'){ const d=DICT[lang]; if(d && d[key]!=null) s=d[key]; }
    if(vars){ Object.keys(vars).forEach(k=>{ s = s.split('{'+k+'}').join(vars[k]); }); }
    return s;
  }

  function setLang(l){
    if(l!=='hu' && l!=='en') return;
    lang = l;
    try{ localStorage.setItem('gymlog_lang', l); }catch(e){}
    try{ document.documentElement.setAttribute('lang', l); }catch(e){}
  }
  function getLang(){ return lang; }
  // Hány kulcsot fordítottunk le eddig – a fokozatos bevezetés mérésére.
  function coverage(){ return Object.keys(DICT.en||{}).length; }

  lang = detect();
  try{ document.documentElement.setAttribute('lang', lang); }catch(e){}

  window.I18N = { t, setLang, getLang, coverage, DICT };
  // A globális neve SZÁNDÉKOSAN `tr`, nem `t`: az app kódjában sok helyen van
  // lokális `const t = …` (cél-ismétlésszám, szöveg-akkumulátor), ami egy
  // egybetűs globálist elárnyékolna – és csak futásidőben derülne ki.
  window.tr = t;
})();
