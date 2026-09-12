// S-4 / S-8 / S-CACHE — LES CORRECTIFS DE LA GRILLE DE SÉCURITÉ, MESURÉS.
//
// Aucun des 26 gates ne regarde ces quatre points : ils mesurent tous ce que le MOTEUR
// produit, jamais ce que la PAGE déclare ni ce que le service worker fait de sa version.
//
// Les quatre :
//   · le libellé du bouton FIT dit le vrai (le lot MARCHE depuis le 28/07, c'est le
//     bouton qui annonçait « un fichier ») ;
//   · l'import a une borne de taille, contrôlée AVANT lecture ;
//   · la page porte une CSP qui borne `connect-src` aux hôtes réellement appelés ;
//   · le service worker ne prend plus le contrôle en plein milieu d'une session.
import { startServer, launchBrowser, makeReporter } from "./harness.mjs";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const PORT = 8605;
const server = await startServer(PORT);
const { ok, report } = makeReporter();
const browser = await launchBrowser();

const lire = (p) => readFileSync(fileURLToPath(new URL("../../endurabuild/" + p, import.meta.url)), "utf8");

// ================================================================================
// S-4 — la politique de sécurité du contenu
// ================================================================================
const html = lire("index.html");
const csp = (/<meta http-equiv="Content-Security-Policy" content="([^"]+)"/.exec(html) || [])[1] || "";
ok(!!csp, "index.html porte une Content-Security-Policy");
ok(/connect-src[^;]*api\.open-meteo\.com/.test(csp) && /connect-src[^;]*www\.strava\.com/.test(csp),
  "…dont `connect-src` nomme les deux hôtes réellement appelés (Open-Meteo, Strava)");
// S-4, révision du 02/09/2026 — `'wasm-unsafe-eval'` a rejoint `'self'`, décision du fondateur
// pour la segmentation MediaPipe du bilan posture. Le jeton n'autorise QUE l'instanciation de
// WebAssembly précompilé ; il n'ouvre PAS `eval()`/`new Function()` sur du texte arbitraire —
// c'est `'unsafe-eval'` qui ferait ça, et lui reste absent. Le critère porte donc sur ce qui
// compte réellement : AUCUN script inline (toujours vrai) ET AUCUN `'unsafe-eval'` (jamais admis).
ok(/script-src[^;]*'self'/.test(csp) && !/script-src[^;]*'unsafe-inline'/.test(csp),
  "…`script-src` autorise 'self' sans jamais 'unsafe-inline' — aucun script inline dans la page");
ok(!/script-src[^;]*(?<!wasm-)'unsafe-eval'/.test(csp),
  "…et `script-src` n'admet jamais 'unsafe-eval' (texte arbitraire) — seul 'wasm-unsafe-eval' "
  + "(WebAssembly précompilé, MediaPipe) est toléré");
ok(/object-src 'none'/.test(csp) && /form-action 'none'/.test(csp) && /base-uri 'self'/.test(csp),
  "…plus les verrous gratuits : `object-src`, `form-action`, `base-uri`");
// `frame-ancestors` est IGNORÉ en `<meta>` (il exige un en-tête HTTP) : le déclarer ne
// protégeait de rien ET produisait une erreur de console à chaque chargement — ce sont les
// suites existantes, qui assertent « aucune erreur JS », qui l'ont attrapé.
ok(!/frame-ancestors/.test(csp),
  "…et PAS de `frame-ancestors`, sans effet en <meta> et bruyant en console");
// LE CRITÈRE QUI COMPTE. Une CSP qui contient `https:` en `connect-src` autorise
// l'exfiltration vers n'importe quel hôte — elle a l'air d'une protection et n'en est pas.
// Ma première écriture le faisait, « parce que l'URL du relais est configurable ».
ok(!/connect-src[^;]*\shttps:(\s|;)/.test(csp),
  "…et `connect-src` ne contient PAS de `https:` global (qui annulerait toute la protection)");
// B3 (décision du fondateur, 12/09/2026) — L'HÔTE DU RELAIS EST ÉPINGLÉ, ET IL SE LIT DANS
// `config.js`. `*.workers.dev` autorisait tout worker Cloudflare de la planète, ce qui est un
// joker d'un cran plus fin que `https:` et pas autre chose. L'attendu n'est donc PAS écrit ici
// (une garde qui porte sa copie de la règle mesure sa copie — leçon Z-05) : il est DÉRIVÉ de
// `STRAVA_RELAY_DEFAULT`, la seule source de l'URL depuis que le réglage avancé est retiré.
const relaisHote = new URL(
  (/STRAVA_RELAY_DEFAULT\s*=\s*"([^"]+)"/.exec(lire("js/config.js")) || [])[1] || "https://introuvable.invalid",
).host;
ok(relaisHote !== "introuvable.invalid", "`config.js` déclare l'URL du relais (" + relaisHote + ")");
ok(csp.includes("https://" + relaisHote),
  "…et `connect-src` épingle CET hôte exact, dérivé de `config.js` (R11.1) — pas une valeur recopiée ici");
ok(!/connect-src[^;]*\*\./.test(csp),
  "…sans aucun joker de sous-domaine (`*.workers.dev` autorisait tout worker Cloudflare)");
// Et le réglage « URL de relais » ne doit pas revenir : un champ que la CSP rend inopérant
// est une promesse fausse. Le critère porte sur la LECTURE de la clé, pas sur un identifiant
// d'input (règle 17 : un libellé se renomme, une lecture d'état se voit).
// …en lisant le CODE et pas les COMMENTAIRES : ma première écriture de ce critère rougissait
// sur le commentaire qui EXPLIQUE le retrait (« Avant : `S.answers.stravaRelay || …` »).
// Onzième occurrence de la famille « mesurer ce qui est écrit au lieu de ce qui s'exécute »
// (règle 15), cette fois dans la garde du lot qui la cite. Les commentaires de bloc et les
// lignes de commentaire partent ; un `//` en fin de ligne de code reste, le retirer
// demanderait de distinguer un `//` dans une chaîne — le piège même d'A2.
const sansCommentaires = (t) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
ok(!/answers\.stravaRelay/.test(sansCommentaires(lire("js/strava.js")) + sansCommentaires(lire("js/ui/tab-profile.js"))),
  "…et plus aucun CODE ne lit `answers.stravaRelay` : l'URL du relais a UNE source, `config.js`");

// L'INSTRUMENT SAIT-IL VOIR ? La CSP ne doit pas se contenter d'exister : elle doit
// couvrir ce que l'app appelle VRAIMENT. On relit les hôtes depuis le code, pas depuis
// la mémoire — un hôte ajouté demain sans être déclaré ferait rougir ce critère.
const hotes = new Set();
for (const f of ["js/app.js", "js/strava.js", "js/ui/steps.js", "js/ui/tab-profile.js", "js/ui/readiness.js"]) {
  let src = ""; try { src = lire(f); } catch { continue; }
  for (const m of src.matchAll(/fetch\("https:\/\/([a-z0-9.-]+)/g)) hotes.add(m[1]);
}
const manquants = [...hotes].filter((h) => !csp.includes(h));
ok(manquants.length === 0,
  "tout hôte appelé par `fetch()` est déclaré dans la CSP (" + [...hotes].join(", ") + ")"
  + (manquants.length ? " — MANQUANT : " + manquants.join(", ") : ""));

// ================================================================================
// S-CACHE — le service worker ne bascule plus tout seul
// ================================================================================
const sw = lire("sw.js");
ok(!/\.then\(\(\) => self\.skipWaiting\(\)\)/.test(sw) && !/waitUntil\([^)]*skipWaiting/.test(sw),
  "le service worker ne fait plus `skipWaiting()` à l'installation");
ok(/SKIP_WAITING/.test(sw), "…il attend un message de la page pour basculer");
const app = lire("js/app.js");
ok(/updatefound/.test(app), "la page écoute `updatefound` (une nouvelle version se voit)");
ok(/controllerchange/.test(app), "…recharge sur `controllerchange`, jamais avant la bascule");
ok(/visibilitychange[\s\S]{0,200}reg\.update\(\)/.test(app),
  "…et revérifie au retour dans l'app (une PWA gelée ne renavigue pas)");
ok(/navigator\.serviceWorker\.controller/.test(app),
  "le bandeau ne s'affiche PAS à la première installation (rien à remplacer)");
// S-CACHE-b — LE BANDEAU COUVRAIT LA BARRE D'ONGLETS. Trouvé par un vrai signal : une suite
// E2E est morte sur « <div id="ebUpdBar"> intercepts pointer events ». Mesuré : bandeau
// 768→832 px, barre 789→844, et `elementFromPoint` au centre de la barre rendait `ebUpdBar` —
// les CINQ onglets injoignables tant qu'on n'avait pas remarqué le « Plus tard ». Une
// notification qui coupe la navigation coûte plus cher que le retard qu'elle évite.
ok(/getElementById\("ebTabbar"\)[\s\S]{0,200}bottom:calc\(12px \+ " \+ hBarre/.test(app),
  "le bandeau se pose AU-DESSUS de la barre d'onglets, sur une hauteur MESURÉE (jamais recopiée)");

// ================================================================================
// S-8 — la borne de taille, et le libellé du bouton FIT
// ================================================================================
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR" });
const page = await ctx.newPage();
await page.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "networkidle" });
await page.waitForTimeout(500);

const s8 = await page.evaluate(() => {
  const E = globalThis.EBV2;
  const out = { max: E && E.maxImportBytes, refuseGros: null, accepteNormal: null, humain: "" };
  try { E.assertImportSize("saison.gpx", 400 * 1024 * 1024); out.refuseGros = false; }
  catch (e) { out.refuseGros = true; out.humain = e.human || e.message || ""; }
  try { E.assertImportSize("sortie.fit", 180 * 1024); out.accepteNormal = true; }
  catch { out.accepteNormal = false; }
  return out;
});
ok(s8.max > 0, "la borne d'import est exposée par le moteur (" + Math.round((s8.max || 0) / 1024 / 1024) + " Mo)");
ok(s8.refuseGros === true, "un fichier de 400 Mo est REFUSÉ");
ok(/Mo/.test(s8.humain) && /limite/.test(s8.humain),
  "…avec un message lisible qui nomme la taille et la limite");
ok(s8.accepteNormal === true, "un fichier d'activité normal (180 Ko) passe — la borne ne gêne personne");

// Le libellé : le lot fonctionne depuis le 28/07 (`multiple` + boucle `for (const f of files)`),
// c'est le bouton qui disait « un fichier ». Le défaut était dans la phrase, pas dans le code.
const profil = lire("js/ui/tab-profile.js");
ok(/multiple/.test(profil) && /for \(const f of files\)/.test(profil),
  "l'import FIT traite bien PLUSIEURS fichiers (attribut `multiple` + boucle)");
ok(!/Importer un fichier \.FIT/.test(profil), "…et le bouton ne dit plus « un fichier »");
ok(/plusieurs à la fois/.test(profil), "…il annonce le lot");
ok(/assertImportSize\(f\.name, f\.size\)[\s\S]{0,120}arrayBuffer\(\)/.test(profil),
  "la taille est contrôlée AVANT `arrayBuffer()` — on ne lit pas 400 Mo pour les refuser ensuite");

await ctx.close();

// ================================================================================
// AUDIT 05 (12/09/2026) — performance & robustesse, sécurité & données
// Chaque critère mesure le COMPORTEMENT rendu quand c'est possible (A1, A4, B1, B2), la
// source seulement là où le comportement n'est pas observable dans un navigateur de test
// (le relais Cloudflare, le service worker sur un 500 réseau).
// ================================================================================
// A1 — le premier chargement ne recharge PAS la page. Mesuré avant le correctif : 2 navigations
// (la seconde à 0,6-1,7 s, à 71 s sur Slow 3G), déclenchées par `clients.claim()` →
// `controllerchange` → `location.reload()` sans contrôleur préalable.
{
  const c1 = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR" });
  const p1 = await c1.newPage();
  let navs = 0;
  p1.on("framenavigated", (f) => { if (f === p1.mainFrame()) navs++; });
  await p1.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "load" });
  await p1.waitForTimeout(3500);
  const ctrl = await p1.evaluate(() => !!(navigator.serviceWorker && navigator.serviceWorker.controller));
  ok(navs === 1, "A1 — le premier chargement fait UNE navigation, pas deux (" + navs + " mesurée(s) en 3,5 s)");
  ok(ctrl === true, "A1 — …et la page est bien CONTRÔLÉE par le worker (hors ligne dès la prochaine ouverture)");
  // A4 — une erreur d'exécution a une surface : un `throw` asynchrone fait apparaître le bandeau.
  await p1.evaluate(() => { setTimeout(() => { throw new Error("test-audit05-erreur"); }, 0); });
  await p1.waitForTimeout(300);
  const bandeau = await p1.evaluate(() => { const b = document.getElementById("ebErrBar"); return b ? b.textContent : ""; });
  ok(/n’a pas bougé/.test(bandeau), "A4 — une exception non rattrapée affiche le bandeau « ton plan n’a pas bougé »");
  // …et un échec RÉSEAU (météo, Strava) n'en affiche PAS : ce n'est pas un défaut de l'app.
  await p1.evaluate(() => { document.getElementById("ebErrBar")?.remove(); Promise.reject(new TypeError("Failed to fetch")); });
  await p1.waitForTimeout(300);
  const benin = await p1.evaluate(() => !!document.getElementById("ebErrBar"));
  ok(benin === false, "A4 — un « Failed to fetch » (réseau) ne déclenche PAS le bandeau");
  // B5 — l'échec d'écriture cesse d'être muet : l'événement émis par `ebSave` atteint le bandeau.
  await p1.evaluate(() => document.dispatchEvent(new CustomEvent("eb:savefailed", { detail: { cause: "QuotaExceededError" } })));
  await p1.waitForTimeout(200);
  const save = await p1.evaluate(() => { const b = document.getElementById("ebErrBar"); return b ? b.textContent : ""; });
  ok(/PAS sauvegardé/.test(save) && /QuotaExceededError/.test(save), "B5 — un échec de sauvegarde est DIT à l'athlète, avec sa cause");
  await c1.close();
}
// A5 — le service worker ne met jamais en cache une réponse en erreur ; l'état ne garde qu'UNE
// copie corrompue et retire l'ancienne clé v1 une fois la v2 relue intacte.
ok(/if \(!res\.ok \|\| res\.type !== "basic"\) return res;/.test(sw), "A5 — sw.js ne met en cache que les réponses saines (`res.ok`, même origine)");
const state = lire("js/state.js");
ok(/startsWith\("eb_state_v2_corrompu_"\)\)localStorage\.removeItem/.test(state), "A5 — une seule copie corrompue est gardée (les anciennes sont purgées)");
ok(/localStorage\.getItem\("eb_state_v2"\)!==json/.test(state), "B5 — `ebSave` RELIT ce qu'il vient d'écrire avant de croire l'écriture");
ok(/removeItem\("eb_state_v1"\)/.test(state), "A5 — `eb_state_v1` est retirée une fois la v2 écrite et relue");
// A3 — le graphe de modules est déclaré dans index.html, dérivé du DISQUE (pas d'une liste à
// tenir) : tout module de js/ y est, sauf `nomodule.js` qui n'en est pas un.
// A3 — MESURÉ puis RETIRÉ : le bloc `modulepreload` (53 modules + 11 feuilles) retardait le premier
// contenu de 2 s sur Fast 3G émulé (16,4 s contre 14,4, trois tirages de chaque côté à ±5 ms) —
// 64 requêtes d'emblée en concurrence avec engine.js, le chemin critique. La page ne doit pas le
// réintroduire sans une mesure qui dise l'inverse.
ok(!/<link[^>]*rel="modulepreload"/.test(html), "A3 — index.html ne porte PAS de <link rel=\"modulepreload\"> (mesuré : +2 s au premier contenu sur Fast 3G)");
ok(/<script nomodule src="js\/nomodule\.js">/.test(html) && !/<link[^>]*nomodule\.js/.test(html), "hors-classement — `nomodule.js` est servi aux navigateurs sans modules ES, et jamais préchargé");
// B3 — anti-cadrage en JS (frame-ancestors est ignoré en <meta>, GitHub Pages n'a pas d'en-tête).
ok(/if \(self !== top\)/.test(app), "B3 — la page refuse de s'afficher dans un cadre étranger (anti-clickjacking JS)");
// B4 — position arrondie (~1 km) ; nonce OAuth des deux côtés.
const readinessSrc = lire("js/ui/readiness.js");
ok(/latitude\.toFixed\(2\)/.test(readinessSrc) && /longitude\.toFixed\(2\)/.test(readinessSrc), "B4 — la position part arrondie au centième de degré vers Open-Meteo");
const stravaSrc = lire("js/strava.js");
ok(/sessionStorage\.setItem\("eb_strava_nonce"/.test(stravaSrc) && /&nonce=/.test(stravaSrc), "B4 — la connexion Strava tire un nonce et l'envoie au relais");
ok(/strava_nonce=/.test(stravaSrc) && /!== attendu/.test(stravaSrc), "B4 — …et le retour est REFUSÉ si le nonce renvoyé ne correspond pas");
const relais = readFileSync(fileURLToPath(new URL("../../server/strava-relay.js", import.meta.url)), "utf8");
ok(/state: JSON\.stringify\(\{ ret, nonce \}\)/.test(relais) && /strava_nonce=/.test(relais), "B4 — le relais transporte le nonce dans `state` et le renvoie dans le fragment");
// B1 — l'export ne contient JAMAIS les jetons Strava, et l'athlète est prévenu du contenu de santé.
// B2 — l'effacement complet existe et vide réellement l'appareil.
{
  const c2 = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "fr-FR", acceptDownloads: true });
  const p2 = await c2.newPage();
  const { runnerStateV1 } = await import("./harness.mjs");
  // Le marqueur d'injection n'est PAS une clé `eb_*` : après l'effacement complet (B2) la page se
  // recharge, et l'état de test ne doit pas être ré-injecté — sinon le critère mesure l'instrument.
  await p2.addInitScript((st) => { if (!localStorage.getItem("zenna_test_injecte")) { localStorage.setItem("zenna_test_injecte", "1"); localStorage.setItem("eb_state_v1", JSON.stringify(st)); } }, runnerStateV1());
  await p2.goto("http://localhost:" + PORT + "/index.html", { waitUntil: "networkidle" });
  await p2.evaluate(() => { const st = JSON.parse(localStorage.getItem("eb_state_v2")); st.shared = st.shared || {}; st.shared.stravaAuth = { access_token: "SECRET-ACCESS", refresh_token: "SECRET-REFRESH", expires_at: 1 }; if (st.plans[0]) st.plans[0].answers.stravaAuth = st.shared.stravaAuth; localStorage.setItem("eb_state_v2", JSON.stringify(st)); });
  await p2.reload({ waitUntil: "networkidle" });
  await p2.evaluate(async () => { const { setTab } = await import("./js/ui/tabs.js"); setTab("profile"); });
  await p2.waitForTimeout(600);
  // les boutons de « Tes données » vivent dans le 3e sous-onglet ; on l'ouvre s'il existe
  await p2.evaluate(() => { const b = [...document.querySelectorAll("button, .zn-seg-btn")].find((x) => /PARAM/i.test(x.textContent)); if (b) b.click(); });
  await p2.waitForTimeout(400);
  await p2.evaluate(() => { for (const d of document.querySelectorAll("details")) d.open = true; });
  const note = await p2.evaluate(() => { const n = document.getElementById("pfBackupNote"); return n ? n.textContent : ""; });
  ok(/réponses de santé/.test(note) && /jetons Strava/.test(note), "B1 — l'athlète est prévenu que l'export contient ses réponses de santé, et jamais ses jetons");
  const [dl] = await Promise.all([p2.waitForEvent("download", { timeout: 5000 }).catch(() => null), p2.evaluate(() => { const b = document.getElementById("pfBackup"); if (b) b.click(); return !!b; })]);
  let contenu = "";
  if (dl) { const chemin = await dl.path(); contenu = readFileSync(chemin, "utf8"); }
  ok(dl !== null && contenu.length > 100, "B1 — « Tout exporter » produit bien un fichier (" + contenu.length + " octets)");
  ok(contenu.length > 0 && !/SECRET-REFRESH/.test(contenu) && !/SECRET-ACCESS/.test(contenu) && !/stravaAuth/.test(contenu), "B1 — le fichier exporté ne contient AUCUN jeton Strava (ni partagé, ni par plan)");
  ok(/"plans"/.test(contenu) && /"shared"/.test(contenu), "B1 — …et reste une sauvegarde complète du reste (plans + état partagé)");
  p2.on("dialog", (d) => d.accept());
  // Le désenregistrement du worker et la purge des caches se passent AVANT le rechargement, dans
  // une page qui n'existe plus ensuite : on les observe par la console, pas après coup.
  const traces = [];
  p2.on("console", (m) => { if (/^EB-TEST-/.test(m.text())) traces.push(m.text()); });
  await p2.evaluate(() => {
    const u = ServiceWorkerRegistration.prototype.unregister;
    ServiceWorkerRegistration.prototype.unregister = function () { console.log("EB-TEST-UNREGISTER"); return u.call(this); };
    const d = CacheStorage.prototype.delete;
    CacheStorage.prototype.delete = function (k) { console.log("EB-TEST-CACHE-DELETE " + k); return d.call(this, k); };
  });
  const avant = await p2.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("eb_")).length);
  const clic = await p2.evaluate(() => { const b = document.getElementById("pfEffacerTout"); if (b) b.click(); return !!b; });
  await p2.waitForTimeout(2500);
  // Après rechargement l'app repart et peut réécrire un `eb_state_v2` VIDE : ce qui compte est
  // qu'aucune clé ne porte encore un plan, une réponse ou un jeton.
  const apres = await p2.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("eb_")).map((k) => {
    try { const v = JSON.parse(localStorage.getItem(k)); const plans = Array.isArray(v?.plans) ? v.plans : null; if (!plans) return k + "=?";
      const pleins = plans.filter((p) => p && (p.sport || Object.keys(p.answers || {}).length > 0)).length;
      return k + "=" + plans.length + " entrée(s), " + pleins + " avec sport/réponses, jeton=" + (v.shared && v.shared.stravaAuth ? "OUI" : "non"); } catch { return k + "=illisible"; } })).catch(() => ["?"]);
  const vide = apres.every((k) => /^eb_state_v2=\d+ entrée\(s\), 0 avec sport\/réponses, jeton=non$/.test(k));
  const ecran = await p2.evaluate(() => (document.getElementById("screen")?.innerText || "").slice(0, 400)).catch(() => "");
  ok(clic && avant > 0 && vide, "B2 — « Effacer toutes mes données » ne laisse aucun plan, aucune réponse, aucun jeton (" + avant + " clé(s) → " + (apres.join(", ") || "aucune") + ")");
  ok(traces.includes("EB-TEST-UNREGISTER") && traces.some((t) => /CACHE-DELETE eb-pwa-/.test(t)), "B2 — …désenregistre le service worker et purge son cache (" + traces.join(" · ") + ")");
  ok(!/Sortie longue|Footing/.test(ecran) && /sport|plan/i.test(ecran), "B2 — …et l'app repart de zéro après rechargement (questionnaire d'accueil)");
  await c2.close();
}

await browser.close();
server.close();
process.exit(report());
