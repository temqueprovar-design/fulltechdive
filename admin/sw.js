/* Service worker do painel: guarda só a "casca" para abrir rápido. Nada de dados. */
var V = 'ftd-admin-v2';
var SHELL = ['./', 'index.html', 'admin.css?v=2', 'admin.js?v=1', 'icons/icon-192.png'];
self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(V).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  var r = e.request, u = new URL(r.url);
  if (r.method !== 'GET' || u.origin !== location.origin || u.pathname.indexOf('api.php') !== -1 || u.pathname.indexOf('/assets/') !== -1) return;
  e.respondWith(fetch(r).then(function (res) {
    var copy = res.clone();
    caches.open(V).then(function (c) { c.put(r, copy); });
    return res;
  }).catch(function () { return caches.match(r); }));
});
