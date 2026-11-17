// Офлайн-кэш читалки: страница открывается сразу из памяти телефона,
// а новая версия тихо скачивается в фоне и появится при следующем запуске.
const C = 'quran-v1';
const SCOPE = self.registration.scope;
const PAGE = SCOPE; // главная страница хранится под адресом папки
const CORE = [SCOPE, SCOPE + 'index.html', SCOPE + 'apple-touch-icon.png'];
const FONTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(C).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k !== C).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

async function refreshPage() {
  try {
    const r = await fetch(PAGE, { cache: 'no-store' });
    if (r.ok) { const c = await caches.open(C); await c.put(PAGE, r.clone()); await c.put(SCOPE + 'index.html', r); }
  } catch (e) {}
}

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  if (req.mode === 'navigate') {
    e.respondWith(caches.open(C).then(async c => {
      const hit = await c.match(PAGE) || await c.match(SCOPE + 'index.html');
      if (hit) { e.waitUntil(refreshPage()); return hit; }
      const r = await fetch(req); if (r.ok) c.put(PAGE, r.clone()); return r;
    }));
    return;
  }

  if (url.origin === location.origin || FONTS.includes(url.hostname)) {
    e.respondWith(caches.open(C).then(async c => {
      const hit = await c.match(req);
      const net = fetch(req).then(r => { if (r.ok || r.type === 'opaque') c.put(req, r.clone()); return r; }).catch(() => hit);
      return hit || net;
    }));
  }
});
