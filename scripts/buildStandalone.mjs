#!/usr/bin/env node
/**
 * Construit UN SEUL FICHIER HTML autonome à partir de la PWA (`endurabuild/`).
 *
 * Pourquoi : `Coach_Pro_V1.5.html` est le monolithe GELÉ — il embarque le moteur V2 à jour
 * (donc le trail), mais son interface est restée à R4 : pas de carte « Trail » au choix du
 * sport, pas d'étape « ton terrain », pas de check-in en diaporama. Pour tester le trail hors
 * ligne, il faut la PWA — or la PWA est faite de dizaines de modules ES, plusieurs feuilles de
 * style et 3 polices. Ce script les recoud en un fichier ouvrable d'un double-clic, sans
 * serveur — `css/zenna-today.css` (R-ZENNA) rejoint la liste comme `styles.css`/`mobile.css`,
 * l'onglet Aujourd'hui l'injecte en script (js/app.js) mais reste sans serveur pour aller la
 * chercher : elle doit être là au même titre que les deux autres.
 *
 * Comment (et pourquoi comme ça) : chaque module devient un `Blob` et les specifiers relatifs
 * sont réécrits en specifiers NUS (`eb:/js/…`) résolus par un `importmap`. C'est la seule
 * technique qui préserve exactement la sémantique des modules : une instance unique par
 * fichier (l'état `S` de `state.js` est partagé, sinon rien ne fonctionne) ET les imports
 * circulaires (`app.js` ↔ `steps.js`) continuent de marcher. Un bundle « tout concaténé »
 * casserait les deux.
 *
 * Le fichier produit est jetable : la source de vérité reste `endurabuild/`.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join, dirname, resolve, relative } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const PWA = join(ROOT, "endurabuild");
const OUT = process.argv[2] ? resolve(process.argv[2]) : join(ROOT, "Zenna-standalone.html");

const read = (p) => readFileSync(join(PWA, p), "utf8");
const b64 = (p) => readFileSync(join(PWA, p)).toString("base64");

// ---- 1. Modules ES : collecte par suivi des imports depuis l'entrée ----
const MODULES = new Map(); // "js/app.js" -> source réécrite
const SPEC = /(\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)(["'])(\.{1,2}\/[^"']+)\2/g;

function collect(rel) {
  if (MODULES.has(rel)) return;
  if (!existsSync(join(PWA, rel))) throw new Error("module introuvable : " + rel);
  const src = read(rel);
  const deps = [];
  const rewritten = src.replace(SPEC, (_m, head, q, spec) => {
    const dep = relative(PWA, resolve(join(PWA, dirname(rel)), spec)).split("\\").join("/");
    deps.push(dep);
    return head + q + "eb:/" + dep + q;
  });
  MODULES.set(rel, rewritten);
  for (const d of deps) collect(d);
}
collect("js/app.js");

// ---- 2. CSS + polices en data: (aucune requête réseau, donc offline par construction) ----
// FOUNDATION (04/09/2026) — la liste suit celle d'`app.js` (socle + posture + les huit zones) :
// une feuille chargée par l'app et absente d'ici serait la « feuille manquante en silence »
// que ce script existe pour empêcher.
let css = ["css/styles.css", "css/mobile.css", "css/zenna-today.css", "css/zenna-tabs.css", "css/zenna-posture.css",
  "css/zenna-aujourdhui.css", "css/zenna-semaine.css", "css/zenna-plan.css", "css/zenna-profil.css",
  "css/zenna-boutique.css", "css/zenna-educatifs.css", "css/zenna-matin.css", "css/zenna-questionnaire.css"].map(read).join("\n");
css = css.replace(/url\("\.\.\/assets\/fonts\/([^"]+)"\)/g,
  (_m, f) => 'url("data:font/woff2;base64,' + b64("assets/fonts/" + f) + '")');

// R13.2 — GARDE : la feuille d'IMPRESSION de ui/plan-view.js est une chaîne JavaScript
// (concaténations `+'…'` comprises). Collée dans le <style> principal, le parseur CSS en
// récupère ce qui est syntaxiquement valide : `body{font-family:-apple-system,Arial…}` tue
// Space Grotesk comme police de base de tout le fichier, un `h2` global souligne le check-in,
// un `ul` global rétrécit toutes les listes. C'est arrivé (audit standalone-4) — un défaut
// que « ça rend moins bien que la PWA » décrit et qu'aucun diff de module ne montre. Le build
// échoue si la signature réapparaît, en nommant la cause.
if (/font-family:-apple-system,Arial/.test(css) || /\n\s*\+'/.test(css)) {
  console.error("✖ R13.2 : la CSS d'impression de ui/plan-view.js (chaîne JS, `-apple-system,Arial` ou lignes `+'…'`)");
  console.error("  a fuité dans css/styles.css ou css/mobile.css. Elle ne doit vivre QUE dans plan-view.js :");
  console.error("  retirer le bloc collé du fichier CSS, puis relancer.");
  process.exit(1);
}

// ---- 3. Réassemblage de la page ----
//
// La CSP de `index.html` (S-4) passait ici TELLE QUELLE — et elle casse le fichier autonome
// À DEUX ENDROITS, découvert en testant ce build sous Playwright : `script-src 'self'` sans
// `'unsafe-inline'` bloque le <script> de bootstrap que `loader()` injecte plus bas (le seul
// moyen de démarrer un fichier unique, sans serveur, est un peu de JS inline) ; `font-src
// 'self'` sans `data:` bloque les polices auto-hébergées elles-mêmes (D19, base64 depuis
// `styles.css`) — silencieux, jamais détecté, parce que ce fichier est git-ignoré et
// n'est testé par AUCUN gate. Aucun des deux n'a de sens ici : ce fichier N'EST PAS le
// produit déployé (`index.html` garde sa CSP stricte intacte), c'est un artefact JETABLE,
// tout son contenu vient de CE script, il n'y a ni serveur ni tiers à s'en protéger.
let html = read("index.html");
html = html
  .replace(/\s*<link rel="manifest"[^>]*>/, "")
  .replace(/\s*<link rel="apple-touch-icon"[^>]*>/, "")
  // R-ZENNA v8 — la favicone est EMBARQUÉE, pas retirée. Elle pointe désormais sur
  // `assets/icon-192.png` (1,2 Ko, généré depuis `brand.js`) au lieu d'un data-URI SVG qui
  // pesait 21,6 Ko des 26,7 Ko du HTML servi — c'est-à-dire 81 % d'un document qui est sur le
  // chemin critique du premier rendu, sur l'onglet dont U7 mesure le budget à 2 000 ms. C'était
  // aussi un SECOND encodage de la géométrie du logo, exactement ce que `brand.js` existe pour
  // empêcher (R11.1). Ici, pas de serveur : on l'inline en base64.
  .replace(/<link rel="icon" href="assets\/([^"]+)">/,
    (_m, f) => '<link rel="icon" href="data:image/png;base64,' + b64("assets/" + f) + '">')
  .replace(/\s*<link rel="stylesheet"[^>]*>/g, "")
  .replace(
    /<meta http-equiv="Content-Security-Policy" content="[^"]*">/,
    // `blob:` en script-src : chaque module ES devient un Blob (§1 ci-dessus), importé via
    // importmap — sans ce jeton, le NAVIGATEUR bloque le chargement de tous les modules,
    // pas seulement le bootstrap. Trouvé en testant : le bootstrap passait, plus rien
    // n'exécutait derrière lui.
    '<meta http-equiv="Content-Security-Policy" content="default-src \'self\'; script-src \'self\' \'unsafe-inline\' blob:; style-src \'self\' \'unsafe-inline\'; img-src \'self\' data: blob:; font-src \'self\' data:; connect-src \'self\' https://api.open-meteo.com https://www.strava.com https://*.workers.dev; form-action \'none\'; base-uri \'self\'; object-src \'none\'">'
  )
  .replace("</head>", "<style>\n" + css + "\n</style>\n</head>")
  // pas de service worker dans un fichier unique : l'offline est déjà acquis (tout est inline)
  .replace('<script type="module" src="js/app.js"></script>', () => loader());

function loader() {
  const srcMap = {};
  for (const [rel, src] of MODULES) srcMap["eb:/" + rel] = Buffer.from(src, "utf8").toString("base64");
  return [
    '<script type="application/json" id="ebModules">',
    JSON.stringify(srcMap).replace(/<\//g, "<\\/"),
    "</script>",
    "<script>",
    "// R11 §8 — le fichier autonome DÉCLARE ce qu'il est. Sans ce drapeau, le code de l'app",
    "// tentait d'enregistrer un service worker qui n'a aucun sens ici (fichier unique, rien à",
    "// mettre en cache) et de charger une icône absente : deux échecs avalés en silence. Un",
    "// échec silencieux n'est pas un problème tant qu'on ne cherche pas la cause d'autre chose.",
    'window.EB_STANDALONE = true;',
    "// Chaque module ES devient un Blob ; un importmap fait pointer les specifiers nus vers",
    "// ces Blobs. Une instance par module (état partagé) + imports circulaires préservés.",
    '(function () {',
    '  var raw = JSON.parse(document.getElementById("ebModules").textContent);',
    '  var dec = new TextDecoder("utf-8"), map = { imports: {} };',
    "  for (var k in raw) {",
    '    var bytes = Uint8Array.from(atob(raw[k]), function (c) { return c.charCodeAt(0); });',
    '    map.imports[k] = URL.createObjectURL(new Blob([dec.decode(bytes)], { type: "text/javascript" }));',
    "  }",
    '  var im = document.createElement("script");',
    '  im.type = "importmap"; im.textContent = JSON.stringify(map);',
    "  document.head.appendChild(im);",
    '  var entry = document.createElement("script");',
    '  entry.type = "module"; entry.textContent = \'import "eb:/js/app.js";\';',
    "  document.body.appendChild(entry);",
    "})();",
    "</script>",
  ].join("\n");
}

writeFileSync(OUT, html);
const ko = Math.round(html.length / 1024);
console.log("✓ " + relative(ROOT, OUT) + " — " + MODULES.size + " modules, " + ko + " Ko, zéro requête réseau");
