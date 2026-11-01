// Service Worker: speichert alle Dateien auf dem Handy, damit die App offline läuft.
importScripts('version.js', 'lib/ionic/dateien.js');
const CACHE = 'pl-' + self.APP_VERSION;

// Alle Dateien, die offline verfügbar sein müssen. Neue Dateien hier ergänzen.
const DATEIEN = [
  './', 'index.html', 'version.js', 'manifest.webmanifest', 'theme.css', 'css/app.css',
  'js/app.js', 'js/store.js', 'js/ui.js', 'js/util.js', 'js/icons.js',
  'lib/inter/inter-latin-wght-normal.woff2',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png',
  ...self.IONIC_DATEIEN
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(DATEIEN)));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k.startsWith('pl-') && k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', e => {
  if (e.data === 'skipWaiting') self.skipWaiting();
});

// Android "Teilen → Packliste": Die geteilte Datei kommt hier an. Wir legen sie im Cache "geteilt-datei" ab
// (beginnt bewusst nicht mit "pl-", damit ein Update sie nicht löscht) und öffnen die App, die sie dann übernimmt.
self.addEventListener('fetch', e => {
  if (e.request.method !== 'POST' || !new URL(e.request.url).pathname.endsWith('/teilen-empfangen')) return;
  e.respondWith((async () => {
    const formular = await e.request.formData();
    const datei = formular.get('datei');
    if (datei) await (await caches.open('geteilt-datei')).put('geteilt', new Response(datei));
    return Response.redirect(new URL('./?geteilt=1', self.registration.scope).href, 303);
  })());
});

// Zuerst aus dem Speicher, sonst aus dem Netz (und dann merken).
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET' || !e.request.url.startsWith(self.location.origin)) return;
  e.respondWith(
    caches.open(CACHE).then(async c => {
      const treffer = await c.match(e.request, { ignoreSearch: true });
      if (treffer) return treffer;
      const antwort = await fetch(e.request);
      if (antwort.ok) c.put(e.request, antwort.clone());
      return antwort;
    })
  );
});
