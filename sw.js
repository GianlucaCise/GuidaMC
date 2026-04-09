// sw.js — Service Worker guida-mc
// Strategia: Cache First per asset statici, Network First per HTML

const CACHE_NAME = 'guida-mc-v1';

// Asset statici da pre-cachare subito all'installazione
const PRECACHE = [
  './',
  './index.html',
  './style.css',
  './shared.js',
  './versioni.html',
  './glossario.html',
  './server/vanilla-crafty.html',
  './server/vanilla-systemd.html',
  './server/paper-crafty.html',
  './server/paper-systemd.html',
  './server/fabric-crafty.html',
  './server/fabric-systemd.html',
  './addons/index.html',
  './addons/discord-bridge.html',
  './addons/geyser.html',
  './addons/bluemap.html',
  './addons/dynmap.html',
  './addons/voice-discord-bridge.html',
  // Font Google — pre-cacheati tramite fetch al momento dell'install
  'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700&family=Syne:wght@400;600;800&display=swap',
];

// ── INSTALL — precache tutto ──────────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      // Fetch dei font con mode no-cors (opaque response, ma funziona dalla cache)
      const requests = PRECACHE.map(url => {
        if (url.startsWith('https://fonts.googleapis.com')) {
          return cache.add(new Request(url, { mode: 'no-cors' })).catch(() => {});
        }
        return cache.add(url).catch(() => {});
      });
      return Promise.all(requests);
    }).then(() => self.skipWaiting())
  );
});

// ── ACTIVATE — pulisce cache vecchie ─────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ── FETCH — strategia per tipo di risorsa ────────────────────
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Font Google/gstatic — Cache First (cambiano rarissimamente)
  if (
    url.hostname === 'fonts.googleapis.com' ||
    url.hostname === 'fonts.gstatic.com'
  ) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // CSS, JS — Cache First (versionate dal CACHE_NAME)
  if (
    event.request.destination === 'style' ||
    event.request.destination === 'script'
  ) {
    event.respondWith(cacheFirst(event.request));
    return;
  }

  // HTML — Network First: prova rete, fallback cache
  // Così il contenuto è sempre aggiornato se online,
  // ma funziona anche offline dopo la prima visita
  if (event.request.destination === 'document') {
    event.respondWith(networkFirst(event.request));
    return;
  }

  // Tutto il resto (immagini, API esterne) — Network only
  // Non cachiamo le API di versioni (cambiano continuamente)
});

// ── STRATEGIE ─────────────────────────────────────────────────

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok || response.type === 'opaque') {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Risorsa non disponibile offline.', { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // Fallback alla home se la pagina specifica non è in cache
    const fallback = await caches.match('./index.html');
    return fallback || new Response('Offline — pagina non disponibile.', { status: 503 });
  }
}
