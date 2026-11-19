// Offline support for the inspection app.
// Network first: when online you always get the newest version;
// when offline (or the network fails) the last copy saved on this device is used.
// It also sends the saved login with each request, because Home Screen apps on iPad
// don't send the login cookie from here.
var CACHE = "insp-app-v1";

self.addEventListener("install", function (e) {
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(self.clients.claim());
});

function savedLogin() {
  return caches.open("bsi-auth")
    .then(function (c) { return c.match("/__bsi_token"); })
    .then(function (r) { return r ? r.text() : ""; })
    .catch(function () { return ""; });
}

self.addEventListener("fetch", function (e) {
  var req = e.request;
  var url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;
  e.respondWith(
    savedLogin().then(function (tok) {
      var send = tok ? new Request(req.url, { headers: { "X-BSI-Auth": tok }, credentials: "same-origin" }) : req;
      return fetch(send);
    }).then(function (res) {
      // Only keep good, non-empty pages (never the login page)
      if (res && res.ok && res.headers.get("content-length") !== "0") {
        var copy = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copy); });
      }
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (hit) {
        return hit || caches.match(self.registration.scope, { ignoreSearch: true });
      });
    })
  );
});
