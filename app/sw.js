// Furrow service worker: keeps the app itself available offline.
// Farm data lives in the phone's IndexedDB, not here.
var V = "furrow-app-v1";
var SHELL = ["./", "index.html", "manifest.webmanifest", "vendor/supabase.js", "icon-192.png", "icon-512.png", "icon-180.png"];
self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(V).then(function (c) { return c.addAll(SHELL); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener("activate", function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== V; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener("fetch", function (e) {
  var r = e.request, u = new URL(r.url);
  if (r.method !== "GET") return;
  if (u.origin === location.origin) {
    if (r.mode === "navigate") {
      // newest page when online, cached page when offline
      e.respondWith(fetch(r).then(function (res) {
        var cp = res.clone(); caches.open(V).then(function (c) { c.put("index.html", cp); }); return res;
      }).catch(function () { return caches.match("index.html"); }));
      return;
    }
    e.respondWith(caches.match(r).then(function (h) {
      return h || fetch(r).then(function (res) {
        var cp = res.clone(); caches.open(V).then(function (c) { c.put(r, cp); }); return res;
      });
    }));
    return;
  }
  if (/fonts\.(googleapis|gstatic)\.com$/.test(u.host)) {
    e.respondWith(caches.open(V).then(function (c) {
      return c.match(r).then(function (h) {
        var f = fetch(r).then(function (res) { c.put(r, res.clone()); return res; }).catch(function () { return h; });
        return h || f;
      });
    }));
  }
});
