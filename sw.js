const CACHE = 'value-v2';
const ASSETS = ['./', './index.html', './icon-192.png', './icon-512.png', './manifest.json', './version.json'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.allSettled(ASSETS.map(a => c.add(a).catch(()=>{})))));
  // Don't skipWaiting here — let the app control when to update
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))));
  self.clients.claim();
});

// Listen for SKIP_WAITING message from the app
self.addEventListener('message', e => {
  if(e.data && e.data.type === 'SKIP_WAITING'){
    self.skipWaiting();
  }
});

self.addEventListener('fetch', e => {
  // Always fetch version.json fresh — never cache it
  if(e.request.url.includes('version.json')){
    e.respondWith(fetch(e.request).catch(()=>caches.match(e.request)));
    return;
  }
  e.respondWith(
    caches.match(e.request).then(cached => {
      if(cached) return cached;
      return fetch(e.request).then(res => {
        if(res && res.status===200 && res.type!=='opaque'){
          caches.open(CACHE).then(c=>c.put(e.request,res.clone()));
        }
        return res;
      }).catch(()=>cached);
    })
  );
});
