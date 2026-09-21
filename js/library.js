/* ==================================================================
   Katalogusok: gyogytorna (REHAB), gyakorlat-konyvtar (LIB),
   technika-videok (VIDEO) es technika-abrak (GIFX).
   Mind ID-kulcsos - NE nevezd at oket.
   ================================================================== */
/* ---- Gyógytorna / mobilitás katalógus ----------------------------- *
 * Testtájankénti mobilitás/prehab/nyújtó gyakorlatok – REFERENCIA, nem
 * orvosi tanács. Nem naplózódik magától; a „Felvétel gyakorlatként" a
 * customEx-be másolja, hogy edzésbe tehető és naplózható legyen.
 * A `cue` rövid technikai emlékeztető, az `r` a cél (szett×ism./mp).
 */
const REGION_MG={shoulder:'váll',back:'hát',hip:'láb',knee:'láb',ankle:'láb',core:'törzs'};
// Sérült izomcsoport → ajánlott gyógytorna-testtáj (közelítő).
const REG_FOR_MG={mell:'shoulder','hát':'back','váll':'shoulder',tricepsz:'shoulder',bicepsz:'shoulder','láb':'hip','törzs':'core'};
const REHAB=[
 {id:'shoulder',name:'Váll / nyak',ex:[
   {id:'rh_bandpull',n:'Gumiszalag szétnyitás',cue:'Lapockát hátra-le, könyök enyhén hajlítva, lassú vissza.',r:'2×15'},
   {id:'rh_wallslide',n:'Falcsúsztatás (wall slide)',cue:'Alkar a falon, lapocka aktív, ne dőlj hátra.',r:'2×10'},
   {id:'rh_sleeper',n:'Sleeper stretch',cue:'Oldalt fekve, felkar 90°, kézfejet lassan a talaj felé.',r:'2×30 mp / o'},
   {id:'rh_ytw',n:'Y-T-W emelés hason fekve',cue:'Homlok le, hüvelykujj felfelé, lapockából emelj.',r:'2×8 / betű'},
   {id:'rh_neckcar',n:'Nyak körkörös mozgás',cue:'Lassú, fájdalommentes körök, váll laza.',r:'2×5 / irány'}
 ]},
 {id:'back',name:'Hát / derék',ex:[
   {id:'rh_catcow',n:'Macska–teve (cat-cow)',cue:'Gerincet szegmentekben görbítsd/nyújtsd, lélegezz.',r:'2×10'},
   {id:'rh_child',n:'Gyermekpóz nyújtás',cue:'Csípő a sarok felé, kar előre, hát elengedve.',r:'2×40 mp'},
   {id:'rh_birddog2',n:'Bird dog',cue:'Ellentétes kar-láb, medence stabil, ne csavarodj.',r:'2×10'},
   {id:'rh_deadbug2',n:'Dead bug',cue:'Derék a talajon végig, ellentétes kar-láb lassan.',r:'2×10'},
   {id:'rh_cobra',n:'Kobra nyújtás',cue:'Hason fekve felsőtest emel, váll le-hátra.',r:'2×20 mp'}
 ]},
 {id:'hip',name:'Csípő',ex:[
   {id:'rh_hipflex',n:'Csípőhajlító nyújtás (kitörésben)',cue:'Hátsó csípő előre, farizom feszít, törzs egyenes.',r:'2×30 mp / o'},
   {id:'rh_bridge',n:'Farizom híd',cue:'Sarokból nyomj, farizom szorít a tetőn, ne derékból.',r:'2×12'},
   {id:'rh_clam',n:'Kagyló (clamshell)',cue:'Oldalt fekve térd nyílik, medence ne forduljon.',r:'2×15 / o'},
   {id:'rh_9090',n:'90/90 csípőforgatás',cue:'Ülve két térd 90°, oldalról oldalra lassan.',r:'2×8 / o'},
   {id:'rh_pigeon',n:'Galamb póz',cue:'Elülső síp vízszintes, törzs előre, ne erőltesd.',r:'2×40 mp / o'}
 ]},
 {id:'knee',name:'Térd',ex:[
   {id:'rh_quadstr',n:'Combfeszítő nyújtás állva',cue:'Boka a farhoz, térdek egymás mellett, medence be.',r:'2×30 mp / o'},
   {id:'rh_tke',n:'Terminal knee extension (gumi)',cue:'Térd teljes nyújtásig, comb feszít, lassú.',r:'2×15'},
   {id:'rh_stepdown',n:'Kontrollált lelépés (step-down)',cue:'Térd a lábfej felett, lassan le, ne dőljön befelé.',r:'2×10 / o'},
   {id:'rh_wallsit',n:'Falülés',cue:'Comb vízszintesig, térd 90°, sarok terhelt.',r:'2×30 mp'},
   {id:'rh_calf2',n:'Vádliemelés (térd-stabil)',cue:'Lassú fel-le, boka stabil, teljes tartomány.',r:'2×15'}
 ]},
 {id:'ankle',name:'Boka / lábfej',ex:[
   {id:'rh_anklecar',n:'Boka körzés',cue:'Nagy, lassú körök mindkét irányba.',r:'2×8 / irány'},
   {id:'rh_calfstr',n:'Vádlinyújtás falnál',cue:'Hátsó sarok a talajon, térd nyújtva majd hajlítva.',r:'2×30 mp / o'},
   {id:'rh_kneewall',n:'Térd-a-fal boka mobilizálás',cue:'Térd a fal felé a lábujjon túl, sarok marad.',r:'2×10 / o'},
   {id:'rh_towel',n:'Törölköző-húzás lábujjal',cue:'Lábujjakkal húzd magad felé, boltozat aktív.',r:'2×15'},
   {id:'rh_heelwalk',n:'Sarkon / lábujjhegyen járás',cue:'Rövid szakaszok, kontrollált, egyensúly.',r:'2×20 lépés'}
 ]},
 {id:'core',name:'Törzs / stabilizáció',ex:[
   {id:'rh_plank2',n:'Alkartámasz (plank)',cue:'Farizom-has feszít, medence semleges, ne lógj.',r:'2×30 mp',time:1},
   {id:'rh_sideplank2',n:'Oldaltámasz',cue:'Test egyenes vonalban, csípő fent, váll stabil.',r:'2×20 mp / o',time:1},
   {id:'rh_pallof2',n:'Pallof prés (anti-rotáció)',cue:'Kar előre, törzs ne forduljon, lassú.',r:'2×10 / o'},
   {id:'rh_hollow2',n:'Hollow hold',cue:'Derék a talajon, kar-láb enyhén emelve.',r:'2×20 mp',time:1},
   {id:'rh_breath',n:'Rekeszizom-légzés',cue:'Hasba lélegezz, borda 360°, lassú kilégzés.',r:'2×8'}
 ]}
];
// Beépített gyakorlat-könyvtár – a választóban jelenik meg (izomcsoportra
// szűrhető). Stabil `x_…` ID-k (a naplóban is kulcsként szerepelhetnek –
// NE nevezd át őket). A PLAN 4 napja marad az alapértelmezett terv.
const _L=(id,n,mg,s,r,w,rest,inc,extra)=>({id,n,mg,s,r,w,rest,inc,...(extra||{})});
const LIB_ARR=[
  // MELL
  _L('x_inclbb','Ferde fekvenyomás rúddal','mell',4,'6',40,150,2.5),
  _L('x_declbb','Negatív fekvenyomás rúddal','mell',4,'8',40,150,2.5),
  _L('x_inclmach','Ferde gépi mellnyomás','mell',3,'10',20,120,5),
  _L('x_machpress','Gépi mellnyomás','mell',3,'10',25,90,5),
  _L('x_dbfly','Tárogatás kézisúlyzóval','mell',3,'12',10,75,2.5),
  _L('x_lowfly','Alsó kábeltárogatás','mell',3,'15',10,60,2.5),
  _L('x_highfly','Felső kábeltárogatás','mell',3,'15',10,60,2.5),
  _L('x_pecdeck','Pec-deck (butterfly)','mell',3,'12',25,75,5),
  _L('x_pushup','Fekvőtámasz','mell',3,'15',0,60,2.5,{bw:1}),
  _L('x_declpushup','Lábemelt fekvőtámasz','mell',3,'12',0,60,2.5,{bw:1}),
  _L('x_svend','Svend prés','mell',3,'15',5,60,1.25),
  // HÁT
  _L('x_deadlift','Felhúzás (deadlift)','hát',4,'5',60,180,5),
  _L('x_pendlay','Pendlay evezés','hát',4,'6',50,150,2.5),
  _L('x_chinup','Alsó fogású húzódzkodás','hát',4,'8',0,150,2.5,{bw:1}),
  _L('x_neutralpd','Lehúzás semleges foggal','hát',3,'10',50,90,5),
  _L('x_closepd','Szűk fogású lehúzás','hát',3,'10',50,90,5),
  _L('x_straightarm','Egyenes karú lehúzás','hát',3,'15',25,60,5),
  _L('x_seatedrow','Ülő gépi evezés','hát',3,'10',45,90,5),
  _L('x_chestrow','Melltámaszos gépi evezés','hát',3,'10',40,90,5),
  _L('x_meadows','Meadows evezés','hát',3,'10',20,90,2.5),
  _L('x_shrug','Vállvonás (trapéz)','hát',4,'12',60,75,5),
  _L('x_dbshrug','Vállvonás kézisúlyzóval','hát',4,'12',24,75,2.5),
  _L('x_pullover','Pullover','hát',3,'12',20,75,2.5),
  _L('x_invrow','Fordított evezés (test)','hát',3,'12',0,75,2.5,{bw:1}),
  // VÁLL
  _L('x_arnold','Arnold nyomás','váll',3,'10',12.5,90,2.5),
  _L('x_dbpress','Vállnyomás kézisúlyzóval állva','váll',3,'8',14,120,2.5),
  _L('x_machsp','Gépi vállnyomás','váll',3,'10',20,90,5),
  _L('x_cablelat','Oldalemelés kábelen','váll',3,'15',5,60,1.25),
  _L('x_frontraise','Elülső vállemelés','váll',3,'12',7.5,60,2.5),
  _L('x_revpecdeck','Fordított pec-deck (hátsó váll)','váll',3,'15',15,60,5),
  _L('x_uprightrow','Álló evezés (upright row)','váll',3,'12',25,75,2.5),
  _L('x_pushpress','Lökés (push press)','váll',4,'5',35,150,2.5),
  _L('x_landmine','Landmine nyomás','váll',3,'10',20,90,2.5),
  // TRICEPSZ
  _L('x_closegrip','Szűk fogású fekvenyomás','tricepsz',4,'8',40,120,2.5),
  _L('x_skull','Homloktörő (skull crusher)','tricepsz',3,'10',25,75,2.5),
  _L('x_ohext','Fej fölötti tricepsz nyújtás','tricepsz',3,'12',20,75,2.5),
  _L('x_dbfrench','Egykezes francia nyomás','tricepsz',3,'12',10,60,2.5),
  _L('x_dipmach','Tricepsz tolódzkodás gépen','tricepsz',3,'10',30,75,5),
  _L('x_kickback','Tricepsz kickback','tricepsz',3,'15',7.5,60,2.5),
  _L('x_pushbar','Tricepsz lehúzás rúddal','tricepsz',3,'12',30,60,2.5),
  // BICEPSZ
  _L('x_bbcurl','Rúdas bicepsz hajlítás','bicepsz',3,'8',25,75,2.5),
  _L('x_ezcurl','EZ-rudas bicepsz','bicepsz',3,'10',20,75,2.5),
  _L('x_preacher','Scott-pados hajlítás','bicepsz',3,'10',20,75,2.5),
  _L('x_inclcurl','Ferdepados hajlítás','bicepsz',3,'10',10,60,2.5),
  _L('x_cablecurl','Kábeles bicepsz','bicepsz',3,'12',20,60,2.5),
  _L('x_concentration','Koncentrációs hajlítás','bicepsz',3,'12',10,60,2.5),
  _L('x_spider','Pók-hajlítás','bicepsz',3,'12',10,60,2.5),
  _L('x_reversecurl','Fordított fogású hajlítás','bicepsz',3,'12',15,60,2.5),
  // LÁB
  _L('x_squat','Guggolás (back squat)','láb',5,'5',60,180,5),
  _L('x_frontsquat','Elülső guggolás','láb',4,'6',40,150,5),
  _L('x_legpress','Lábtolás (leg press)','láb',4,'10',80,120,10),
  _L('x_hacksquat','Hack guggolás','láb',4,'8',40,120,5),
  _L('x_goblet','Kehelyguggolás','láb',3,'12',20,90,2.5),
  _L('x_lunge','Kitörés (lunge)','láb',3,'10',20,90,2.5),
  _L('x_bulgarian','Bolgár kitörés','láb',3,'10',16,90,2.5),
  _L('x_stepup','Fellépés (step-up)','láb',3,'10',16,75,2.5),
  _L('x_rdl','Román felhúzás (RDL)','láb',4,'8',50,150,5),
  _L('x_stiffdl','Nyújtott lábú felhúzás','láb',3,'10',40,120,5),
  _L('x_legext','Lábnyújtás (leg extension)','láb',3,'12',30,75,5),
  _L('x_legcurlseat','Ülő combhajlítás','láb',3,'12',30,75,5),
  _L('x_hipthrust','Csípőemelés (hip thrust)','láb',4,'10',40,90,5),
  _L('x_gluteham','Glute-ham raise','láb',3,'10',0,90,2.5,{bw:1}),
  _L('x_calfstand','Álló vádliemelés','láb',4,'12',40,60,5),
  _L('x_calfseated','Ülő vádliemelés','láb',4,'15',20,60,5),
  _L('x_adductor','Comb közelítő gép','láb',3,'15',30,60,5),
  _L('x_abductor','Comb távolító gép','láb',3,'15',30,60,5),
  _L('x_kbswing','Kettlebell lendítés','láb',4,'12',16,75,4),
  // TÖRZS
  _L('x_hangleg','Függő lábemelés (nyújtott)','törzs',3,'10',0,60,2.5,{bw:1}),
  _L('x_toestobar','Lábujj a rúdhoz','törzs',3,'8',0,75,2.5,{bw:1}),
  _L('x_legraise','Fekvő lábemelés','törzs',3,'15',0,45,2.5,{bw:1}),
  _L('x_situp','Felülés (sit-up)','törzs',3,'15',0,45,2.5,{bw:1}),
  _L('x_cablecrunch','Hasprés kábelen','törzs',3,'12',25,60,5),
  _L('x_abwheel','Hasgörgő (ab wheel)','törzs',3,'10',0,60,2.5,{bw:1}),
  _L('x_russian','Orosz csavarás','törzs',3,'20',10,45,2.5),
  _L('x_pallof','Pallof prés (anti-rotáció)','törzs',3,'12',15,45,2.5),
  _L('x_woodchop','Favágó (cable)','törzs',3,'12',15,45,2.5),
  _L('x_sidebend','Oldalhajlítás kézisúlyzóval','törzs',3,'15',15,45,2.5),
  _L('x_deadbug','Dead bug','törzs',3,'12',0,45,2.5,{bw:1}),
  _L('x_sideplank','Oldalplank','törzs',3,'40 mp',0,45,5,{bw:1,time:1}),
  _L('x_dragonflag','Dragon flag','törzs',3,'6',0,90,2.5,{bw:1}),
  _L('x_farmer','Farmer séta','törzs',3,'30 mp',30,75,5,{time:1}),
  // — 2. köteg: gépes/kábeles/unilaterális/grip —
  // MELL
  _L('x_smithbench','Smith-gépes fekvenyomás','mell',4,'8',40,120,2.5),
  _L('x_cablepress','Kábeles mellnyomás állva','mell',3,'12',15,75,2.5),
  _L('x_chestdip','Tolódzkodás mellre dőlve','mell',3,'10',0,90,2.5,{bw:1}),
  _L('x_squeeze','Szorító prés (squeeze)','mell',3,'12',14,75,2.5),
  _L('x_declfly','Negatív tárogatás','mell',3,'12',10,75,2.5),
  _L('x_diamondpush','Gyémánt fekvőtámasz','mell',3,'12',0,60,2.5,{bw:1}),
  // HÁT
  _L('x_yatesrow','Yates evezés (alsó fogás)','hát',4,'8',50,120,2.5),
  _L('x_sealrow','Seal row (padon fekve)','hát',3,'10',40,90,2.5),
  _L('x_kroc','Kroc evezés (nehéz egykezes)','hát',3,'12',30,90,2.5),
  _L('x_widerowm','Széles fogású gépi evezés','hát',3,'10',40,90,5),
  _L('x_goodmorning','Good morning','hát',3,'8',30,120,5),
  _L('x_ext45','45°-os hátsó nyújtás','hát',3,'12',10,75,2.5,{bw:1}),
  _L('x_gorillarow','Gorilla evezés (kettlebell)','hát',3,'10',24,90,2.5),
  // VÁLL
  _L('x_reverseflydb','Fordított tárogatás kézisúlyzóval','váll',3,'15',8,60,2.5),
  _L('x_machinelat','Gépi oldalemelés','váll',3,'15',15,60,5),
  _L('x_cablefrontr','Elülső vállemelés kábelen','váll',3,'12',7.5,60,2.5),
  _L('x_plateraise','Tárcsás elülső emelés','váll',3,'12',10,60,2.5),
  _L('x_zpress','Z-prés (földön ülve)','váll',3,'8',25,120,2.5),
  _L('x_bradford','Bradford prés','váll',3,'10',20,90,2.5),
  _L('x_cubanpress','Kubai prés','váll',3,'12',7.5,60,2.5),
  // TRICEPSZ
  _L('x_jmpress','JM prés','tricepsz',3,'10',30,90,2.5),
  _L('x_benchdip','Pados tolódzkodás','tricepsz',3,'12',0,60,2.5,{bw:1}),
  _L('x_reversepush','Fordított fogású lehúzó','tricepsz',3,'12',20,60,2.5),
  _L('x_singlepush','Egykezes tricepsz lehúzó','tricepsz',3,'12',10,60,2.5),
  _L('x_tatepress','Tate prés','tricepsz',3,'12',12.5,75,2.5),
  // BICEPSZ
  _L('x_dbcurlstand','Kézisúlyzós hajlítás állva','bicepsz',3,'10',12.5,60,2.5),
  _L('x_zottman','Zottman hajlítás','bicepsz',3,'10',10,60,2.5),
  _L('x_bayesian','Bayesian kábel-hajlítás','bicepsz',3,'12',10,60,2.5),
  _L('x_machinecurl','Gépi bicepsz','bicepsz',3,'12',20,60,5),
  _L('x_dragcurl','Drag curl','bicepsz',3,'10',20,60,2.5),
  _L('x_ropehammer','Kötél-kalapács','bicepsz',3,'12',20,60,2.5),
  _L('x_wristcurl','Csuklóhajlítás (alkar)','bicepsz',3,'15',20,45,2.5),
  _L('x_revwrist','Fordított csuklóhajlítás (alkar)','bicepsz',3,'15',10,45,1.25),
  // LÁB
  _L('x_smithsquat','Smith-gépes guggolás','láb',4,'8',50,120,5),
  _L('x_pausesquat','Megállított guggolás','láb',4,'5',50,180,5),
  _L('x_boxsquat','Dobozguggolás','láb',4,'5',50,180,5),
  _L('x_beltsquat','Öves guggolás','láb',3,'10',40,120,5),
  _L('x_pistol','Pisztoly guggolás (egy láb)','láb',3,'6',0,90,2.5,{bw:1}),
  _L('x_walkinglunge','Járó kitörés','láb',3,'12',20,90,2.5),
  _L('x_reverselunge','Hátra kitörés','láb',3,'10',20,90,2.5),
  _L('x_sidelunge','Oldal kitörés','láb',3,'10',16,75,2.5),
  _L('x_nordic','Nordic combhajlítás','láb',3,'6',0,120,2.5,{bw:1}),
  _L('x_singlerdl','Egylábas RDL','láb',3,'10',16,90,2.5),
  _L('x_legpress45','45°-os lábtolás','láb',4,'10',80,120,10),
  _L('x_donkeycalf','Szamár vádliemelés','láb',4,'15',40,60,5),
  _L('x_sissy','Sissy guggolás','láb',3,'12',0,75,2.5,{bw:1}),
  _L('x_hipabduct','Csípő abdukció kábelen','láb',3,'15',10,45,2.5),
  // TÖRZS
  _L('x_hollow','Hollow hold','törzs',3,'30 mp',0,45,5,{bw:1,time:1}),
  _L('x_rkcplank','RKC plank','törzs',3,'30 mp',0,45,5,{bw:1,time:1}),
  _L('x_vups','V-felülés','törzs',3,'12',0,45,2.5,{bw:1}),
  _L('x_bicycle','Kerékpár hasprés','törzs',3,'20',0,45,2.5,{bw:1}),
  _L('x_reversecrunch','Fordított hasprés','törzs',3,'15',0,45,2.5,{bw:1}),
  _L('x_windshield','Ablaktörlő (windshield)','törzs',3,'10',0,60,2.5,{bw:1}),
  _L('x_obliquecr','Ferdehas hasprés','törzs',3,'15',0,45,2.5,{bw:1}),
  _L('x_landminetwist','Landmine csavarás','törzs',3,'12',15,45,2.5),
  _L('x_hangoblique','Függő oldalemelés','törzs',3,'10',0,60,2.5,{bw:1}),
  _L('x_backextw','Súlyozott hátnyújtás','törzs',3,'12',10,75,2.5),
  _L('x_suitcase','Bőrönd-tartás (carry)','törzs',3,'30 mp',24,60,4,{time:1}),
  _L('x_pinch','Tárcsafogás (pinch grip)','bicepsz',3,'30 mp',10,45,2.5,{time:1}),
  // — 3. köteg: bővítés a bevett gyakorlat-katalógushoz (hiánypótlás) —
  // MELL
  _L('x_cablecross','Kábeles keresztezés (crossover)','mell',3,'15',10,60,2.5),
  _L('x_floorpress','Padlóprés','mell',3,'8',40,120,2.5),
  // HÁT
  _L('x_rackpull','Rack húzás (részleges felhúzás)','hát',3,'6',70,150,5),
  _L('x_singlepd','Egykezes lehúzás','hát',3,'12',25,60,5),
  _L('x_renegade','Renegade evezés','hát',3,'10',16,75,2.5),
  // VÁLL
  _L('x_behindneck','Tarkónyomás','váll',3,'8',30,120,2.5),
  _L('x_leaningcablelat','Dőlt kábeles oldalemelés','váll',3,'15',5,60,1.25),
  _L('x_yraise','Y-emelés (hátsó váll)','váll',3,'15',6,60,2.5),
  // TRICEPSZ
  _L('x_ropepush','Köteles tricepsz lehúzás','tricepsz',3,'12',20,60,2.5),
  // BICEPSZ
  _L('x_crosshammer','Keresztirányú kalapács','bicepsz',3,'12',12.5,60,2.5),
  _L('x_inclhammer','Ferdepados kalapács','bicepsz',3,'12',10,60,2.5),
  _L('x_highcablecurl','Magas kábeles hajlítás','bicepsz',3,'15',10,60,2.5),
  // LÁB
  _L('x_trapbar','Trap-bar felhúzás','láb',4,'6',60,150,5),
  _L('x_zercher','Zercher guggolás','láb',4,'8',40,150,5),
  _L('x_cossack','Kozák guggolás','láb',3,'10',10,90,2.5),
  _L('x_curtsy','Curtsy (keresztlépő) kitörés','láb',3,'12',12,75,2.5),
  _L('x_glutekick','Farizom rúgás kábelen','láb',3,'15',15,45,2.5),
  _L('x_standleg','Álló combhajlítás','láb',3,'12',15,60,2.5),
  // TÖRZS
  _L('x_crunch','Hasprés (crunch)','törzs',3,'20',0,45,2.5,{bw:1}),
  _L('x_toetouch','Lábujj-érintő hasprés','törzs',3,'15',0,45,2.5,{bw:1}),
  _L('x_birddog','Bird dog','törzs',3,'12',0,45,2.5,{bw:1}),
  _L('x_mountainclimber','Hegymászó','törzs',3,'30 mp',0,45,5,{bw:1,time:1}),
  _L('x_flutter','Ollózás (flutter kick)','törzs',3,'30 mp',0,45,5,{bw:1,time:1})
];
const LIB={}; LIB_ARR.forEach(e=>LIB[e.id]=e);
// Technika-videó gyakorlatonként. A VIDEO térkép a PONTOS, bedrótozott
// linkeké (exId → teljes URL); ha egy gyakorlathoz nincs itt bejegyzés, a
// nevéből épített YouTube-keresés nyílik (mindig működik, nem rohad el).
// Új pontos linket ide vegyél fel: VIDEO['bench']='https://youtu.be/…'.
const VIDEO={};
function videoUrl(e){
  if(e && VIDEO[e.id]) return VIDEO[e.id];
  const q=encodeURIComponent(exN(e)+' '+tr('helyes technika gyakorlat'));
  return 'https://www.youtube.com/results?search_query='+q;
}
// Technika-animáció (GIF) gyakorlatonként. A GIFX térkép exId → fájl-alapnév;
// a fájlok a `gif/` mappában vannak, a képek © Gym visual (gymvisual.com) –
// az attribúciót a `gifBox()` mindig kiírja a kép alá, ne vedd ki.
// Az ID-k naplókulcsok: ha új gyakorlat kap ábrát, ide vegyél fel sort.
// A GIF-ek NEM részei a service worker app-héjának (`sw.js` APP_SHELL) –
// futásidőben, megtekintéskor cache-elődnek, így az offline app-héj könnyű marad.
const GIFX={bench:'0025-EIeI8Vf',dip:'0251-9WTm7dq',incdb:'0314-ns0SIbU',ohpdb:'0405-znQUdHY',
  lat:'0334-DsgkuIt',push:'0200-dU605di',hipabd:'0710-7WaDzyL',pull:'0652-lBDjFxJ',
  row:'0327-7vG5o25',cable:'0861-fUBheHs',face:'0203-wqNPGCg',curl:'0294-NbVPDMW',
  hammer:'0165-HPlPoQA',ohp:'0091-kTbSH9h',dbbench:'0289-SpYC0Kp',dipbw:'0251-9WTm7dq',
  machinc:'0757-5v7KYld',french:'0201-3ZflifB',plank:'2135-VBAWRPG',tbar:'0327-7vG5o25',
  wide:'0150-eYnzaCm',onerow:'0292-C0MA9bC',legcurl:'0586-17lJ1kr',rear:'2292-mu5Guxt',
  knee:'0011-03lzqwk',hyp:'0489-zhMwOwE',x_inclbb:'0047-3TZduzM',x_declbb:'0033-GrO65fd',
  x_inclmach:'1299-jHAnWmT',x_machpress:'0577-T0yTjgW',x_dbfly:'0308-yz9nUhF',
  x_lowfly:'0179-FVmZVhk',x_pecdeck:'0596-v3xmPAR',x_pushup:'0662-I4hDWkc',
  x_declpushup:'0279-i5cEhka',x_svend:'0856-I1OBLnn',x_deadlift:'0032-ila4NZS',
  x_pendlay:'0027-eZyBC3j',x_chinup:'1326-T2mxWqc',x_neutralpd:'0818-rkg41Fb',
  x_closepd:'2616-4c9BhzB',x_straightarm:'0238-x69MAlq',x_seatedrow:'1350-7I6LNUG',
  x_chestrow:'1350-7I6LNUG',x_shrug:'0095-dG7tG5y',x_dbshrug:'0406-NJzBsGJ',
  x_pullover:'0375-9XjtHvS',x_invrow:'0499-bZGHsAZ',x_arnold:'2137-Xy4jlWA',
  x_dbpress:'0426-A6wtbuL',x_machsp:'0603-67n3r98',x_cablelat:'0178-goJ6ezq',
  x_frontraise:'0310-3eGE2JC',x_uprightrow:'0120-UDlhcO8',x_pushpress:'1700-FS63wTN',
  x_closegrip:'0030-J6Dx1Mu',x_skull:'0061-iZop9xO',x_ohext:'0092-5uFK1xr',
  x_dbfrench:'1738-5fKX7wi',x_dipmach:'0814-X6C6i5Y',x_pushbar:'0241-gAwDzB3',
  x_bbcurl:'0031-25GPyDY',x_ezcurl:'0447-6TG6x2w',x_preacher:'0070-qOgPVf6',
  x_inclcurl:'0318-ae9UoXQ',x_cablecurl:'0868-G08RZcQ',x_concentration:'0297-gvsWLQw',
  x_spider:'0454-Ye5Qxb0',x_reversecurl:'0080-xNrS20v',x_squat:'0043-qXTaZnJ',
  x_frontsquat:'0042-zG0zs85',x_legpress:'2287-V07qpXy',x_hacksquat:'0046-5VCj6iH',
  x_goblet:'1760-yn8yg1r',x_lunge:'0054-t8iSghb',x_bulgarian:'0099-gGNQmVt',
  x_stepup:'0431-aXtJhlg',x_rdl:'0085-wQ2c4XD',x_stiffdl:'0116-hrVQWvE',
  x_legext:'0585-my33uHU',x_legcurlseat:'0599-Zg3XY7P',x_gluteham:'3193-Vvwjz6N',
  x_calfstand:'1372-8ozhUIZ',x_calfseated:'0088-ktsFQAZ',x_adductor:'0598-oHsrypV',
  x_abductor:'0597-CHpahtl',x_kbswing:'0549-UHJlbu3',x_hangleg:'0472-I3tsCnC',
  x_legraise:'0620-WhuFnR7',x_situp:'3679-6ZCiYWQ',x_cablecrunch:'0175-WW95auq',
  x_russian:'0687-XVDdcoj',x_pallof:'0979-9pa4H5m',x_sidebend:'0407-IpONWYv',
  x_deadbug:'0276-iny3m5y',x_sideplank:'3544-5VXmnV5',x_farmer:'2133-qPEzJjA',
  x_smithbench:'0748-trqKQv2',x_cablepress:'2144-nIR4Rwl',x_chestdip:'0251-9WTm7dq',
  x_declfly:'0302-xXm4nYq',x_diamondpush:'0283-soIB2rj',x_kroc:'0292-C0MA9bC',
  x_widerowm:'0218-qcY50ZD',x_goodmorning:'0044-XlZ4lAC',x_ext45:'0488-zkgRrbK',
  x_reverseflydb:'0383-EAs3xL9',x_machinelat:'0584-dRTfGZT',x_cablefrontr:'0162-u2X71Np',
  x_bradford:'0105-dCPESfR',x_cubanpress:'0299-QfAKy1G',x_jmpress:'0052-ZsiqXYa',
  x_benchdip:'1399-9RT8oQW',x_reversepush:'0207-VjYliFZ',x_singlepush:'1723-qRZ5S1N',
  x_tatepress:'0436-s5PdDyY',x_dbcurlstand:'0294-NbVPDMW',x_zottman:'0439-kXaIn5A',
  x_bayesian:'0868-G08RZcQ',x_dragcurl:'0038-IENzBdA',x_ropehammer:'0165-HPlPoQA',
  x_wristcurl:'0126-82LxxkW',x_revwrist:'0082-LsZkfU6',x_smithsquat:'0770-jFtipLl',
  x_pausesquat:'0043-qXTaZnJ',x_pistol:'0544-5bpPTHv',x_walkinglunge:'1460-IZVHb27',
  x_reverselunge:'0078-VaP75jl',x_sidelunge:'1410-py1HSzx',x_singlerdl:'1756-gEyURal',
  x_legpress45:'0739-10Z2DXU',x_donkeycalf:'0284-u5ESqzH',x_sissy:'1489-xdYPUtE',
  x_vups:'1014-H6ETwO9',x_bicycle:'0972-tZkGYZ9',x_reversecrunch:'0872-nCU1Ekp',
  x_obliquecr:'1495-cJgSTmh',x_landminetwist:'0562-QYysSLV',x_hangoblique:'1761-BaE7O6U',
  x_backextw:'0573-rUXfn3R',x_cablecross:'1269-UKWTJWR',x_floorpress:'0065-vtusOWT',
  x_rackpull:'0074-za9Ni4z',x_singlepd:'3563-U5INZY6',x_renegade:'0521-b9kqlBy',
  x_behindneck:'0747-Gpn4ADc',x_leaningcablelat:'0178-goJ6ezq',x_yraise:'1017-aHDy5O5',
  x_ropepush:'0200-dU605di',x_crosshammer:'0298-Qyk5J3p',x_inclhammer:'0320-ByX0WxV',
  x_highcablecurl:'0868-G08RZcQ',x_trapbar:'0811-jQGwmxN',x_zercher:'0127-LSTChY9',
  x_standleg:'0795-C5jncD2',x_crunch:'0274-TFqbd8t',x_mountainclimber:'0630-RJgzwny',
  rack:'0074-za9Ni4z',abs:'0175-WW95auq'};
function gifUrl(e){ const f=e&&GIFX[e.id]; return f?('gif/'+f+'.gif'):null; }
// Egységes ábra-doboz: lusta betöltés, fix arány (nincs ugrálás), és a
// kötelező forrásmegjelölés. Ha nincs ábra az adott gyakorlathoz, üres string.
// Kis lista-bélyegkép (gyakorlatválasztó). Lusta betöltés: a böngésző csak a
// látótérbe kerülő ábrákat tölti le, így a ~160 elemű könyvtár nem húz be
// mindent egyszerre. A forrásmegjelölés a lap alján egyszer szerepel.
function gifThumb(e){
  const u=gifUrl(e); if(!u) return '';
  return `<img class="exgift" src="${u}" alt="" loading="lazy" decoding="async" width="44" height="44">`;
}
function gifBox(e,opt){
  const u=gifUrl(e); if(!u) return '';
  const w=(opt&&opt.w)||200;
  return `<figure class="exgif" style="max-width:${w}px">
    <img src="${u}" alt="${esc(exN(e)+' – '+tr('technika ábra'))}" loading="lazy" decoding="async" width="180" height="180">
    <figcaption>Ábra © <a href="https://gymvisual.com/" target="_blank" rel="noopener noreferrer">Gym visual</a></figcaption>
  </figure>`;
}
