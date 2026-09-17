/* Edzésnapló – service worker
 * Offline app-héj cache. A localStorage (gymlog_v1) NEM ide tartozik,
 * azt a böngésző kezeli – a service worker csak a statikus fájlokat
 * cache-eli, az éles edzésadatot nem érinti.
 */
const VERSION = 'v104';
const APP_CACHE = 'edzesnaplo-app-' + VERSION;
const FONT_CACHE = 'edzesnaplo-fonts';

// Az app-héj: relatív útvonalak, hogy localhoston és Netlify-on is működjön.
const APP_SHELL = [
  './',
  './index.html',
  './js/auth.js',
  './js/health.js',
  './vendor/supabase.js',   // a felhő-réteg a repóból jön, nem CDN-ről (offline + áruház)
  './vendor/fonts.css',     // a betűk is a repóból – nincs Google Fonts kérés
  './vendor/fonts/Barlow-400-latin-ext.woff2',
  './vendor/fonts/Barlow-400-latin.woff2',
  './vendor/fonts/Barlow-500-latin-ext.woff2',
  './vendor/fonts/Barlow-500-latin.woff2',
  './vendor/fonts/Barlow-600-latin-ext.woff2',
  './vendor/fonts/Barlow-600-latin.woff2',
  './vendor/fonts/BarlowCondensed-500-latin-ext.woff2',
  './vendor/fonts/BarlowCondensed-500-latin.woff2',
  './vendor/fonts/BarlowCondensed-600-latin-ext.woff2',
  './vendor/fonts/BarlowCondensed-600-latin.woff2',
  './vendor/fonts/BarlowCondensed-700-latin-ext.woff2',
  './vendor/fonts/BarlowCondensed-700-latin.woff2',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png',
  './apple-touch-icon.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(APP_CACHE).then((c) => c.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((k) => k !== APP_CACHE && k !== FONT_CACHE).map((k) => caches.delete(k))
    )).then(() => self.clients.claim())
  );
});

// Lehetővé teszi az azonnali frissítést, ha az oldal ezt kéri.
self.addEventListener('message', (e) => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // A betűk MÁR A REPÓBAN vannak (vendor/fonts), így az app-héj cache-eli
  // őket a többi statikus fájllal együtt – nincs külön Google Fonts ág.
  // Ez a blokk csak a RÉGI, még Google Fontsot kérő kliensek (egy korábbi
  // build gyorsítótárából induló lap) miatt marad itt: stale-while-revalidate,
  // hogy azok se törjenek el a frissítés pillanatában.
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    e.respondWith(
      caches.open(FONT_CACHE).then(async (cache) => {
        const cached = await cache.match(req);
        const network = fetch(req).then((res) => {
          if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
          return res;
        }).catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // Csak saját origin.
  if (url.origin !== self.location.origin) return;

  // Navigáció (HTML): network-first, offline esetén a cache-elt index.html.
  if (req.mode === 'navigate') {
    e.respondWith(
      fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(APP_CACHE).then((c) => c.put('./index.html', copy));
        return res;
      }).catch(() => caches.match('./index.html').then((r) => r || caches.match('./')))
    );
    return;
  }

  // Statikus fájlok: cache-first, háttérben frissítéssel.
  e.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((res) => {
        if (res && res.ok) {
          const copy = res.clone();
          caches.open(APP_CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
