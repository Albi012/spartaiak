/* ==================================================================
   A beepitett edzesterv (PLAN) es a felulet ikonjai.
   Az ID-k ADATKULCSOK a naplodban - NE nevezd at oket.
   ================================================================== */
const PLAN = [
 {id:'pa',name:'Push A',sub:'Mell · váll · tricepsz',ex:[
  {id:'bench',n:'Fekvenyomás',s:4,r:'5',w:20,rest:180,inc:2.5,mg:'mell'},
  {id:'dip',n:'Tolódzkodás',s:4,r:'8',w:0,rest:150,inc:2.5,bw:1,mg:'mell'},
  {id:'incdb',n:'Ferdepad nyomás (kézisúlyzó)',s:3,r:'8',w:10,rest:120,inc:2.5,mg:'mell'},
  {id:'ohpdb',n:'Vállból nyomás ülve',s:3,r:'10',w:8,rest:120,inc:2.5,mg:'váll'},
  {id:'lat',n:'Oldalemelés',s:3,r:'15',w:5,rest:60,inc:1,mg:'váll'},
  {id:'push',n:'Tricepsz kötél lehúzás',s:3,r:'12',w:15,rest:60,inc:2.5,mg:'tricepsz'},
  {id:'hipabd',n:'Oldalfekvő csípőtávolítás',s:3,r:'20',w:0,rest:45,inc:2.5,bw:1,mg:'láb'}]},
 {id:'la',name:'Pull A',sub:'Hát · bicepsz',ex:[
  {id:'pull',n:'Húzódzkodás',s:4,r:'8',w:0,rest:180,inc:2.5,bw:1,mg:'hát'},
  {id:'row',n:'Hasalva kézisúlyzós evezés',s:4,r:'10',w:12,rest:150,inc:2.5,mg:'hát'},
  {id:'cable',n:'Ülő kábelevezés',s:3,r:'10',w:25,rest:90,inc:5,mg:'hát'},
  {id:'face',n:'Arcvonó (face pull)',s:3,r:'15',w:15,rest:60,inc:2.5,mg:'váll'},
  {id:'curl',n:'Bicepsz hajlítás',s:3,r:'10',w:8,rest:60,inc:2.5,mg:'bicepsz'},
  {id:'hammer',n:'Kalapácshajlítás (csigán)',s:3,r:'12',w:8,rest:60,inc:2.5,mg:'bicepsz'},
  {id:'hipabd',n:'Oldalfekvő csípőtávolítás',s:3,r:'20',w:0,rest:45,inc:2.5,bw:1,mg:'láb'}]},
 {id:'pb',name:'Push B',sub:'Váll · mell · törzs',ex:[
  {id:'ohp',n:'Ülő rúdas vállból nyomás',s:4,r:'5',w:20,rest:180,inc:2.5,mg:'váll'},
  {id:'dbbench',n:'Fekvenyomás kézisúlyzóval',s:4,r:'8',w:12,rest:150,inc:2.5,mg:'mell'},
  {id:'dipbw',n:'Tolódzkodás (testsúly)',s:3,r:'8',w:0,rest:120,inc:2.5,bw:1,mg:'mell'},
  {id:'machinc',n:'Ferdepad Smith-gépben',s:3,r:'10',w:20,rest:120,inc:2.5,mg:'mell'},
  {id:'french',n:'Tricepsz lehúzás rúddal (csiga)',s:3,r:'12',w:15,rest:60,inc:2.5,mg:'tricepsz'},
  {id:'plank',n:'Plank',s:3,r:'50 mp',w:0,rest:45,inc:2.5,bw:1,time:1,mg:'törzs'}]},
 {id:'lb',name:'Pull B',sub:'Hát · hátsó lánc',ex:[
  {id:'tbar',n:'Hasalva kézisúlyzós evezés',s:4,r:'6',w:12,rest:150,inc:2.5,mg:'hát'},
  {id:'wide',n:'Széles fogású lehúzás',s:4,r:'8',w:25,rest:120,inc:5,mg:'hát'},
  {id:'onerow',n:'Egykezes kézisúlyzó evezés',s:3,r:'10',w:12,rest:90,inc:2.5,mg:'hát'},
  {id:'legcurl',n:'Combhajlítás fekve',s:4,r:'12',w:15,rest:120,inc:5,mg:'láb'},
  {id:'rear',n:'Hátsó vállemelés',s:3,r:'15',w:5,rest:60,inc:1,mg:'váll'},
  {id:'knee',n:'Hanging knee raise',s:3,r:'12',w:0,rest:60,inc:2.5,bw:1,mg:'törzs'}]}
];
const MGS=['mell','hát','váll','tricepsz','bicepsz','láb','törzs'];

// Monokróm SVG ikonok (currentColor → követik a témát, sosem emojik).
const _s='<svg class="svgic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">';
const ICON={
  account:_s+'<circle cx="12" cy="8" r="4"/><path d="M4 20a8 8 0 0 1 16 0"/></svg>',
  injury:_s+'<path d="M12 6v12M6 12h12"/></svg>',
  more:'<svg class="svgic" viewBox="0 0 24 24" fill="currentColor" stroke="none"><circle cx="5" cy="12" r="1.8"/><circle cx="12" cy="12" r="1.8"/><circle cx="19" cy="12" r="1.8"/></svg>',
  moon:_s+'<path d="M21 12.8A9 9 0 1 1 11.2 3 7 7 0 0 0 21 12.8z"/></svg>',
  sun:_s+'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M19.1 4.9l-1.4 1.4M6.3 17.7l-1.4 1.4"/></svg>',
  edit:_s+'<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
  check:'<svg class="svgic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>',
  back:'<svg class="svgic" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 18l-6-6 6-6"/></svg>',
  play:'<svg class="svgic" viewBox="0 0 24 24" fill="currentColor"><path d="M7 5v14l11-7z"/></svg>',
  video:_s+'<rect x="2.5" y="5.5" width="14" height="13" rx="2.5"/><path d="M16.5 9.5l5-3v11l-5-3z"/></svg>',
  physio:_s+'<path d="M3 12h3l2-5 3 10 2-7 2 4h6"/></svg>',
  dumbbell:'<svg class="svgic" viewBox="0 0 24 24" fill="currentColor"><rect x="1.5" y="9" width="2.5" height="6" rx="1"/><rect x="4" y="6.8" width="2.4" height="10.4" rx="1"/><rect x="6.4" y="10.6" width="11.2" height="2.8" rx="1.2"/><rect x="17.6" y="6.8" width="2.4" height="10.4" rx="1"/><rect x="20" y="9" width="2.5" height="6" rx="1"/></svg>',
  list:_s+'<path d="M8 6h13M8 12h13M8 18h13M3.5 6h.01M3.5 12h.01M3.5 18h.01"/></svg>',
  chart:_s+'<path d="M3 3v18h18"/><path d="M7 14l4-4 3 3 5-6"/></svg>',
  friends:_s+'<circle cx="9" cy="8" r="3.2"/><path d="M3.5 20a5.5 5.5 0 0 1 11 0"/><path d="M16 6.2a3 3 0 0 1 0 5.6"/><path d="M17.5 20a5.3 5.3 0 0 0-2.3-3.6"/></svg>',
  share:_s+'<circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="M8.3 10.8l7.4-4.3M8.3 13.2l7.4 4.3"/></svg>',
  plans:_s+'<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 9h8M8 13h8M8 17h5"/></svg>'
};

