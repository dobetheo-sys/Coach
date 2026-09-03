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
ok(/connect-src[^;]*workers\.dev/.test(csp),
  "…le relais Strava est déclaré par son domaine (`*.workers.dev`), pas par un joker");

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
await browser.close();
server.close();
process.exit(report());
