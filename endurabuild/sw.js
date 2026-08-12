/* Service worker Zenna — app shell en cache pour l'offline (PWA).
   Stratégie : cache-first pour les assets même-origine (l'app est autonome),
   réseau direct pour tout le reste (Open-Meteo n'est jamais mis en cache —
   une météo périmée est pire qu'une absence de météo).

   O-24 — VERSION ET ASSETS SONT GÉNÉRÉS, PLUS ÉCRITS À LA MAIN.
   Le cache-first ne se purge qu'au changement de VERSION. Tant que c'était une
   constante à incrémenter de mémoire, elle ne l'était pas : mesuré, elle était
   restée à « v17 » pendant 12 commits touchant 14 modules servis, donc neuf lots
   de correctifs n'atteignaient aucun navigateur ayant déjà ouvert l'app.
   VERSION est désormais le HACHAGE du contenu servi : elle change si et seulement
   si un fichier change. Reconstruire : `npm run build:sw` (vérifié en CI par
   `npm run check:sw`, comme `check:app` pour le bundle du monolithe). */

// __SW_VERSION__ (généré par scripts/buildSW.mjs — ne pas éditer à la main)
const VERSION = "eb-pwa-1a19b0de7e26";
// __/SW_VERSION__

// __SW_ASSETS__ (généré par scripts/buildSW.mjs — ne pas éditer à la main)
const ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./css/mobile.css",
  "./css/styles.css",
  "./css/zenna-tabs.css",
  "./css/zenna-today.css",
  "./js/app.js",
  "./js/config.js",
  "./js/data/educatifs/course.js",
  "./js/data/educatifs/enchainements.js",
  "./js/data/educatifs/natation.js",
  "./js/data/educatifs/registry.js",
  "./js/data/educatifs/svgRegistry.js",
  "./js/data/educatifs/swimrun.js",
  "./js/data/educatifs/trail.js",
  "./js/data/educatifs/velo.js",
  "./js/engine.js",
  "./js/export.js",
  "./js/measured.js",
  "./js/notifications.js",
  "./js/projection-log.js",
  "./js/shop-catalog.js",
  "./js/shop-order.js",
  "./js/state.js",
  "./js/strava.js",
  "./js/ui/app-header.js",
  "./js/ui/avatar-tri.js",
  "./js/ui/avatar.js",
  "./js/ui/brand.js",
  "./js/ui/celebrations.js",
  "./js/ui/checkin.js",
  "./js/ui/daily-content.js",
  "./js/ui/feasibility.js",
  "./js/ui/help.js",
  "./js/ui/icons.js",
  "./js/ui/modal.js",
  "./js/ui/plan-view.js",
  "./js/ui/readiness.js",
  "./js/ui/retest.js",
  "./js/ui/sachet.js",
  "./js/ui/session-life.js",
  "./js/ui/steps.js",
  "./js/ui/tab-educatifs.js",
  "./js/ui/tab-nutrition.js",
  "./js/ui/tab-outils.js",
  "./js/ui/tab-plan-general.js",
  "./js/ui/tab-profile.js",
  "./js/ui/tab-today.js",
  "./js/ui/tab-week.js",
  "./js/ui/tabs.js",
  "./js/ui/zenna-motion.js",
  "./assets/fonts/archivo-black-400.woff2",
  "./assets/fonts/space-grotesk-500-700.woff2",
  "./assets/fonts/caveat-600-700.woff2",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
];
// __/SW_ASSETS__

/*
  S-CACHE — PLUS DE `skipWaiting()` AUTOMATIQUE.

  Il faisait prendre le contrôle à la nouvelle version AU MILIEU d'une session. La page
  ouverte, elle, avait déjà chargé son HTML et ses modules depuis l'ANCIEN cache : elle
  restait ancienne, mais son prochain import dynamique (`await import("./steps.js")`,
  chemin « Corriger ma réponse ») venait du NOUVEAU cache. Une page ancienne chargeant un
  module neuf — rare, et impossible à reproduire quand ça arrive.

  La nouvelle version ATTEND donc, et la page propose de recharger (`app.js`). Qui ne
  clique jamais l'obtient quand même au prochain lancement complet : c'est automatique,
  ce n'est simplement plus brutal. `SKIP_WAITING` permet à la page de déclencher la bascule
  quand l'athlète a dit oui — c'est lui qui choisit le moment, pas le hasard du réseau.
*/
self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ASSETS)));
});
self.addEventListener("message", (e) => {
  if (e.data && e.data.type === "SKIP_WAITING") self.skipWaiting();
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
