const CACHE = 'value-v4';
const ASSETS = ['./', './index.html', './icon-192.png', './icon-512.png', './manifest.json'];

// ── INSTALL — cache assets and activate immediately ──
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c =>
      Promise.allSettled(ASSETS.map(a => c.add(a).catch(() => {})))
    )
  );
  // Skip waiting immediately — don't hold up for old tabs to close
  self.skipWaiting();
});

// ── ACTIVATE — delete old caches and claim all clients immediately ──
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())  // take control of all open tabs NOW
  );
});

// ── MESSAGE — handle manual skip waiting from app ──
self.addEventListener('message', e => {
  if (e.data && e.data.type === 'SKIP_WAITING') self.skipWaiting();
});

// ── FETCH ──
self.addEventListener('fetch', e => {
  const url = e.request.url;

  // version.json: always network, never cache
  if (url.includes('version.json')) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' }).catch(() => new Response('{}'))
    );
    return;
  }

  // index.html: network first, fallback to cache
  // This ensures users always get the latest HTML when online
  if (url.endsWith('/') || url.endsWith('/Value/') || url.endsWith('index.html')) {
    e.respondWith(
      fetch(e.request)
        .then(res => {
          if (res && res.status === 200) {
            caches.open(CACHE).then(c => c.put(e.request, res.clone()));
          }
          return res;
        })
        .catch(() => caches.match(e.request))
    );
    return;
  }

  // Everything else: cache first, then network
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type !== 'opaque') {
          caches.open(CACHE).then(c => c.put(e.request, res.clone()));
        }
        return res;
      }).catch(() => cached);
    })
  );
});
