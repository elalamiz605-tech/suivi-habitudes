// Service worker Momentum : l'application fonctionne hors ligne.
// Stratégie : réseau d'abord (toujours la dernière version quand on est connecté),
// cache en secours (hors ligne). Les pages et fichiers de l'app sont pré-chargés.
const VERSION = 'momentum-v20';
const SHELL = [
  './',
  './index.html',
  './app.html',
  './manifest.webmanifest',
  './css/styles.css',
  './js/main.js', './js/views.js', './js/forms.js', './js/logic.js', './js/store.js',
  './js/scene.js', './js/ui.js', './js/utils.js', './js/icons.js', './js/i18n.js',
  './js/pwa.js', './js/reminders.js', './js/backup.js', './js/insights.js', './js/year.js', './js/coach.js', './js/cloud.js',
  './vendor/three.module.min.js',
  './assets/favicon.svg',
  './assets/fonts/HostGrotesk-Variable.woff2',
  './assets/fonts/MartianMono-Variable.woff2',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(VERSION)
      .then((c) => Promise.allSettled(SHELL.map((u) => c.add(u)))),
    // Pas de skipWaiting ici : la nouvelle version attend que l'utilisateur
    // accepte « Recharger » (message skip-waiting), sinon la page se rechargerait seule.
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((hit) => hit || (req.mode === 'navigate' ? caches.match('./app.html') : Response.error()))),
  );
});

// Rappels : la page demande au service worker d'afficher une notification
// (fonctionne aussi quand l'application installée est en arrière-plan).
self.addEventListener('message', (e) => {
  const m = e.data || {};
  if (m.type === 'notify') {
    self.registration.showNotification(m.title, {
      body: m.body || '',
      icon: './assets/icons/icon-192.png',
      badge: './assets/icons/icon-192.png',
      tag: m.tag || 'momentum',
      renotify: true,
      data: { url: m.url || './app.html#/today' },
    });
  } else if (m.type === 'skip-waiting') {
    self.skipWaiting();
  }
});

// Web Push envoyé par Momentum Cloud (rappels à l'heure, récap du soir, défis).
self.addEventListener('push', (e) => {
  let d = {};
  try { d = e.data ? e.data.json() : {}; } catch (_) { d = { title: 'Momentum', body: e.data ? e.data.text() : '' }; }
  e.waitUntil(self.registration.showNotification(d.title || 'Momentum', {
    body: d.body || '',
    icon: './assets/icons/icon-192.png',
    badge: './assets/icons/icon-192.png',
    tag: d.tag || 'momentum',
    renotify: true,
    data: { url: d.url || './app.html#/today' },
  }));
});

self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  const url = new URL(e.notification.data?.url || './app.html', self.registration.scope).href;
  e.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      const open = list.find((c) => c.url.startsWith(self.registration.scope));
      if (open) return open.focus().then((c) => c.navigate?.(url) || c);
      return self.clients.openWindow(url);
    }),
  );
});
