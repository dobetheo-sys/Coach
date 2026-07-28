/* Service worker EnduraBuild — app shell en cache pour l'offline (PWA).
   Stratégie : cache-first pour les assets même-origine (l'app est autonome),
   réseau direct pour tout le reste (Open-Meteo n'est jamais mis en cache —
   une météo périmée est pire qu'une absence de météo). */
const VERSION = "eb-pwa-v12"; // v12 : R6 — fix avatar, validation dans Aujourd’hui, phases dépliantes, parcours→prédiction, Strava 1 clic
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/styles.css",
  "./css/mobile.css",
  "./js/app.js",
  "./js/engine.js",
  "./js/state.js",
  "./js/config.js",
  "./js/legacy-fallback.js",
  "./js/export.js",
  "./js/ui/steps.js",
  "./js/ui/plan-view.js",
  "./js/ui/readiness.js",
  "./js/ui/tabs.js",
  "./js/ui/tab-profile.js",
  "./js/ui/tab-plan-general.js",
  "./js/ui/tab-today.js",
  "./js/ui/tab-nutrition.js",
  "./js/ui/tab-week.js",
  "./js/ui/checkin.js",
  "./js/ui/avatar.js",
  "./js/ui/celebrations.js",
  "./js/ui/retest.js",
  "./js/ui/modal.js",
  "./js/ui/daily-content.js",
  "./js/notifications.js",
  "./js/strava.js",
  "./assets/fonts/archivo-black-400.woff2",
  "./assets/fonts/space-grotesk-500-700.woff2",
  "./assets/fonts/caveat-600-700.woff2",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});
self.addEventListener("fetch", (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin) return; // météo etc. → réseau direct
  e.respondWith(
    caches.match(e.request).then(
      (hit) =>
        hit ||
        fetch(e.request).then((res) => {
          const copy = res.clone();
          caches.open(VERSION).then((c) => c.put(e.request, copy));
          return res;
        })
    )
  );
});
