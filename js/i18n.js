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


      /* — Gyakorlatnevek (PLAN + LIB + ARCHIVE + REHAB) —
       * A KULCS a magyar név, ami a `n` mezőben él. A nyers `e.n` SOHA nem
       * fordítódik le – a párosítás (`aiMatchEx`) és a mentett adat arra épül;
       * a felület az `exN(e)` / `trn(n)` segéden át fordít (index.html).
       * Saját gyakorlat (`cx_…`) nincs a szótárban → magára esik vissza. */
      '45°-os hátsó nyújtás':'45° back extension',
      '45°-os lábtolás':'45° leg press',
      '90/90 csípőforgatás':'90/90 hip rotation',
      'Ablaktörlő (windshield)':'Windshield wipers',
      'Alkartámasz (plank)':'Forearm plank',
      'Alsó fogású húzódzkodás':'Chin-up',
      'Alsó kábeltárogatás':'Low cable fly',
      'Arcvonó (face pull)':'Face pull',
      'Arnold nyomás':'Arnold press',
      'Bayesian kábel-hajlítás':'Bayesian cable curl',
      'Bicepsz hajlítás':'Biceps curl',
      'Bird dog':'Bird dog',
      'Boka körzés':'Ankle circles',
      'Bolgár kitörés':'Bulgarian split squat',
      'Bradford prés':'Bradford press',
      'Bőrönd-tartás (carry)':'Suitcase carry',
      'Comb közelítő gép':'Hip adduction machine',
      'Comb távolító gép':'Hip abduction machine',
      'Combfeszítő nyújtás állva':'Standing quad stretch',
      'Combhajlítás fekve':'Lying leg curl',
      'Csuklóhajlítás (alkar)':'Wrist curl (forearm)',
      'Csípő abdukció kábelen':'Cable hip abduction',
      'Csípőemelés (hip thrust)':'Hip thrust',
      'Csípőhajlító nyújtás (kitörésben)':'Hip flexor stretch (lunge)',
      'Curtsy (keresztlépő) kitörés':'Curtsy lunge',
      'Dead bug':'Dead bug',
      'Dobozguggolás':'Box squat',
      'Drag curl':'Drag curl',
      'Dragon flag':'Dragon flag',
      'Dőlt kábeles oldalemelés':'Leaning cable lateral raise',
      'Egyenes karú lehúzás':'Straight-arm pulldown',
      'Egykezes francia nyomás':'Single-arm French press',
      'Egykezes kézisúlyzó evezés':'One-arm dumbbell row',
      'Egykezes lehúzás':'Single-arm lat pulldown',
      'Egykezes tricepsz lehúzó':'Single-arm triceps pushdown',
      'Egylábas RDL':'Single-leg RDL',
      'Elülső guggolás':'Front squat',
      'Elülső vállemelés':'Front raise',
      'Elülső vállemelés kábelen':'Cable front raise',
      'EZ-rudas bicepsz':'EZ-bar curl',
      'Falcsúsztatás (wall slide)':'Wall slide',
      'Falülés':'Wall sit',
      'Farizom híd':'Glute bridge',
      'Farizom rúgás kábelen':'Cable glute kickback',
      'Farmer séta':'Farmer\'s walk',
      'Favágó (cable)':'Cable woodchopper',
      'Fej fölötti tricepsz nyújtás':'Overhead triceps extension',
      'Fekvenyomás':'Bench press',
      'Fekvenyomás kézisúlyzóval':'Dumbbell bench press',
      'Fekvő lábemelés':'Lying leg raise',
      'Fekvőtámasz':'Push-up',
      'Felhúzás (deadlift)':'Deadlift',
      'Felhúzás blokkról (rack pull)':'Rack pull',
      'Fellépés (step-up)':'Step-up',
      'Felső kábeltárogatás':'High cable fly',
      'Felülés (sit-up)':'Sit-up',
      'Ferde fekvenyomás rúddal':'Incline barbell bench press',
      'Ferde gépi mellnyomás':'Incline machine chest press',
      'Ferdehas hasprés':'Oblique crunch',
      'Ferdepad nyomás (kézisúlyzó)':'Incline dumbbell press',
      'Ferdepad Smith-gépben':'Incline press in Smith machine',
      'Ferdepados hajlítás':'Incline dumbbell curl',
      'Ferdepados kalapács':'Incline hammer curl',
      'Fordított csuklóhajlítás (alkar)':'Reverse wrist curl (forearm)',
      'Fordított evezés (test)':'Inverted row',
      'Fordított fogású hajlítás':'Reverse curl',
      'Fordított fogású lehúzó':'Reverse-grip pushdown',
      'Fordított hasprés':'Reverse crunch',
      'Fordított pec-deck (hátsó váll)':'Reverse pec-deck (rear delt)',
      'Fordított tárogatás kézisúlyzóval':'Dumbbell reverse fly',
      'Függő lábemelés (nyújtott)':'Hanging straight-leg raise',
      'Függő oldalemelés':'Hanging oblique raise',
      'Galamb póz':'Pigeon pose',
      'Glute-ham raise':'Glute-ham raise',
      'Good morning':'Good morning',
      'Gorilla evezés (kettlebell)':'Gorilla row (kettlebell)',
      'Guggolás (back squat)':'Back squat',
      'Gumiszalag szétnyitás':'Band pull-apart',
      'Gyermekpóz nyújtás':'Child\'s pose stretch',
      'Gyémánt fekvőtámasz':'Diamond push-up',
      'Gépi bicepsz':'Machine curl',
      'Gépi mellnyomás':'Machine chest press',
      'Gépi oldalemelés':'Machine lateral raise',
      'Gépi vállnyomás':'Machine shoulder press',
      'Hack guggolás':'Hack squat',
      'Hanging knee raise':'Hanging knee raise',
      'Hasalva kézisúlyzós evezés':'Chest-supported dumbbell row',
      'Hasgörgő (ab wheel)':'Ab wheel rollout',
      'Hasprés (crunch)':'Crunch',
      'Hasprés kábelen':'Cable crunch',
      'Hegymászó':'Mountain climber',
      'Hollow hold':'Hollow hold',
      'Homloktörő (skull crusher)':'Skull crusher',
      'Hyperextension':'Hyperextension',
      'Hátra kitörés':'Reverse lunge',
      'Hátsó vállemelés':'Rear delt raise',
      'Húzódzkodás':'Pull-up',
      'JM prés':'JM press',
      'Járó kitörés':'Walking lunge',
      'Kagyló (clamshell)':'Clamshell',
      'Kalapácshajlítás (csigán)':'Hammer curl (cable)',
      'Kehelyguggolás':'Goblet squat',
      'Keresztirányú kalapács':'Cross-body hammer curl',
      'Kerékpár hasprés':'Bicycle crunch',
      'Kettlebell lendítés':'Kettlebell swing',
      'Kitörés (lunge)':'Lunge',
      'Kobra nyújtás':'Cobra stretch',
      'Koncentrációs hajlítás':'Concentration curl',
      'Kontrollált lelépés (step-down)':'Controlled step-down',
      'Kozák guggolás':'Cossack squat',
      'Kroc evezés (nehéz egykezes)':'Kroc row (heavy one-arm)',
      'Kubai prés':'Cuban press',
      'Kábeles bicepsz':'Cable curl',
      'Kábeles keresztezés (crossover)':'Cable crossover',
      'Kábeles mellnyomás állva':'Standing cable chest press',
      'Kézisúlyzós hajlítás állva':'Standing dumbbell curl',
      'Köteles tricepsz lehúzás':'Rope triceps pushdown',
      'Kötél-kalapács':'Rope hammer curl',
      'Landmine csavarás':'Landmine twist',
      'Landmine nyomás':'Landmine press',
      'Lehúzás semleges foggal':'Neutral-grip lat pulldown',
      'Lábemelt fekvőtámasz':'Decline push-up',
      'Lábnyújtás (leg extension)':'Leg extension',
      'Lábtolás (leg press)':'Leg press',
      'Lábujj a rúdhoz':'Toes to bar',
      'Lábujj-érintő hasprés':'Toe-touch crunch',
      'Lökés (push press)':'Push press',
      'Macska–teve (cat-cow)':'Cat-cow',
      'Magas kábeles hajlítás':'High cable curl',
      'Meadows evezés':'Meadows row',
      'Megállított guggolás':'Paused squat',
      'Melltámaszos gépi evezés':'Chest-supported machine row',
      'Negatív fekvenyomás rúddal':'Decline barbell bench press',
      'Negatív tárogatás':'Decline dumbbell fly',
      'Nordic combhajlítás':'Nordic hamstring curl',
      'Nyak körkörös mozgás':'Neck circles',
      'Nyújtott lábú felhúzás':'Stiff-leg deadlift',
      'Oldal kitörés':'Lateral lunge',
      'Oldalemelés':'Lateral raise',
      'Oldalemelés kábelen':'Cable lateral raise',
      'Oldalfekvő csípőtávolítás':'Side-lying hip abduction',
      'Oldalhajlítás kézisúlyzóval':'Dumbbell side bend',
      'Oldalplank':'Side plank',
      'Oldaltámasz':'Side plank',
      'Ollózás (flutter kick)':'Flutter kick',
      'Orosz csavarás':'Russian twist',
      'Padlóprés':'Floor press',
      'Pados tolódzkodás':'Bench dip',
      'Pallof prés (anti-rotáció)':'Pallof press (anti-rotation)',
      'Pec-deck (butterfly)':'Pec-deck (butterfly)',
      'Pendlay evezés':'Pendlay row',
      'Pisztoly guggolás (egy láb)':'Pistol squat (single leg)',
      'Plank':'Plank',
      'Pullover':'Pullover',
      'Pók-hajlítás':'Spider curl',
      'Rack húzás (részleges felhúzás)':'Rack pull (partial deadlift)',
      'Rekeszizom-légzés':'Diaphragmatic breathing',
      'Renegade evezés':'Renegade row',
      'RKC plank':'RKC plank',
      'Román felhúzás (RDL)':'Romanian deadlift (RDL)',
      'Rúdas bicepsz hajlítás':'Barbell curl',
      'Sarkon / lábujjhegyen járás':'Heel / toe walking',
      'Scott-pados hajlítás':'Preacher curl',
      'Seal row (padon fekve)':'Seal row',
      'Sissy guggolás':'Sissy squat',
      'Sleeper stretch':'Sleeper stretch',
      'Smith-gépes fekvenyomás':'Smith machine bench press',
      'Smith-gépes guggolás':'Smith machine squat',
      'Svend prés':'Svend press',
      'Szamár vádliemelés':'Donkey calf raise',
      'Szorító prés (squeeze)':'Squeeze press',
      'Széles fogású gépi evezés':'Wide-grip machine row',
      'Széles fogású lehúzás':'Wide-grip lat pulldown',
      'Szűk fogású fekvenyomás':'Close-grip bench press',
      'Szűk fogású lehúzás':'Close-grip lat pulldown',
      'Súlyozott hátnyújtás':'Weighted back extension',
      'Tarkónyomás':'Behind-the-neck press',
      'Tate prés':'Tate press',
      'Terminal knee extension (gumi)':'Terminal knee extension (band)',
      'Tolódzkodás':'Dip',
      'Tolódzkodás (testsúly)':'Dip (bodyweight)',
      'Tolódzkodás mellre dőlve':'Chest dip',
      'Trap-bar felhúzás':'Trap-bar deadlift',
      'Tricepsz kickback':'Triceps kickback',
      'Tricepsz kötél lehúzás':'Triceps rope pushdown',
      'Tricepsz lehúzás rúddal':'Triceps bar pushdown',
      'Tricepsz lehúzás rúddal (csiga)':'Triceps bar pushdown (cable)',
      'Tricepsz tolódzkodás gépen':'Machine triceps dip',
      'Tárcsafogás (pinch grip)':'Plate pinch grip',
      'Tárcsás elülső emelés':'Plate front raise',
      'Tárogatás kézisúlyzóval':'Dumbbell fly',
      'Térd-a-fal boka mobilizálás':'Knee-to-wall ankle mobilisation',
      'Törölköző-húzás lábujjal':'Towel toe curl',
      'V-felülés':'V-up',
      'Vádliemelés (térd-stabil)':'Calf raise (knee-stable)',
      'Vádlinyújtás falnál':'Calf stretch at the wall',
      'Vállból nyomás ülve':'Seated dumbbell shoulder press',
      'Vállnyomás kézisúlyzóval állva':'Standing dumbbell shoulder press',
      'Vállvonás (trapéz)':'Shrug (traps)',
      'Vállvonás kézisúlyzóval':'Dumbbell shrug',
      'Y-emelés (hátsó váll)':'Y-raise (rear delt)',
      'Y-T-W emelés hason fekve':'Prone Y-T-W raise',
      'Yates evezés (alsó fogás)':'Yates row (underhand grip)',
      'Z-prés (földön ülve)':'Z-press (seated on floor)',
      'Zercher guggolás':'Zercher squat',
      'Zottman hajlítás':'Zottman curl',
      'Álló combhajlítás':'Standing leg curl',
      'Álló evezés (upright row)':'Upright row',
      'Álló vádliemelés':'Standing calf raise',
      'Öves guggolás':'Belt squat',
      'Ülő combhajlítás':'Seated leg curl',
      'Ülő gépi evezés':'Seated machine row',
      'Ülő kábelevezés':'Seated cable row',
      'Ülő rúdas vállból nyomás':'Seated barbell overhead press',
      'Ülő vádliemelés':'Seated calf raise',


      // — Izomcsoportok (az `mg` DATA-kulcs marad magyar, csak a kiírás fordul) —
      'mell':'Chest', 'hát':'Back', 'váll':'Shoulders', 'tricepsz':'Triceps',
      'bicepsz':'Biceps', 'láb':'Legs', 'törzs':'Core', 'egyéb':'other',

      // — Gyakorlat-forrás (választó) —
      'beépített':'built-in', 'könyvtár':'library', 'archív':'archived', 'saját':'custom',

      // — Gyógytorna-testtájak —
      'Mobilitás':'Mobility',
      'Váll / nyak':'Shoulder / neck', 'Hát / derék':'Back / lower back', 'Csípő':'Hip',
      'Térd':'Knee', 'Boka / lábfej':'Ankle / foot', 'Törzs / stabilizáció':'Core / stability',
      '5 perces rutin':'5-minute routine',

      // — Beépített napok alcíme —
      'Mell · váll · tricepsz':'Chest · shoulders · triceps',
      'Hát · bicepsz':'Back · biceps',
      'Váll · mell · törzs':'Shoulders · chest · core',
      'Hát · hátsó lánc':'Back · posterior chain',

      // — Kész sablonok —
      'Teljes test A':'Full body A', 'Teljes test B':'Full body B', 'Teljes test C':'Full body C',
      'Felső A':'Upper A', 'Alsó A':'Lower A', 'Felső B':'Upper B', 'Alsó B':'Lower B',
      'Tolás nap':'Push day', 'Húzás nap':'Pull day', 'Láb nap':'Leg day',
      '5×5 A':'5×5 A', '5×5 B':'5×5 B',
      'Kezdő teljes test':'Beginner full body', 'Felső / Alsó':'Upper / Lower',
      'Push / Pull / Láb':'Push / Pull / Legs', '5×5 erő':'5×5 strength',
      '3 nap · A / B / C':'3 days · A / B / C', '4 nap · felső+alsó':'4 days · upper+lower',
      '3 nap · PPL':'3 days · PPL', '2 nap · A / B':'2 days · A / B',

      // — Készenlét-tényezők —
      'Heti terhelés':'Weekly load', 'Testsúly-trend':'Bodyweight trend', 'Pihenőnapok':'Rest days',
      'Terhelés':'Load', 'Testsúly':'Bodyweight', 'Pihenő':'Rest',

      // — Technika-ábra / videó —
      'technika ábra':'technique illustration',
      'helyes technika gyakorlat':'exercise proper form',


      // — Testsúly-trend (Haladás fül) —
      'Csak a ténylegesen mért napok':'Measured days only',
      '{n} mérés':'{n} measurements', '{n} nap':'{n} days', '{n} nap alatt':'over {n} days',
      '7 napos átlag':'7-day average', 'Az előző héthez':'Vs. previous week',
      'nagyjából stabil':'roughly stable', 'kg/hét':'kg/week',
      'Testsúly rögzítése':'Log bodyweight',

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
