#!/usr/bin/env node
/**
 * Construit UN SEUL FICHIER HTML autonome à partir de la PWA (`endurabuild/`).
 *
 * Pourquoi : `Coach_Pro_V1.5.html` est le monolithe GELÉ — il embarque le moteur V2 à jour
 * (donc le trail), mais son interface est restée à R4 : pas de carte « Trail » au choix du
 * sport, pas d'étape « ton terrain », pas de check-in en diaporama. Pour tester le trail hors
 * ligne, il faut la PWA — or la PWA est faite de 23 modules ES, 2 feuilles de style et 3
 * polices. Ce script les recoud en un fichier ouvrable d'un double-clic, sans serveur.
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
import { randomBytes } from "node:crypto";

const ROOT = resolve(import.meta.dirname, "..");
const PWA = join(ROOT, "endurabuild");
const OUT = process.argv[2] ? resolve(process.argv[2]) : join(ROOT, "EnduraBuild-standalone.html");

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
let css = ["css/styles.css", "css/mobile.css"].map(read).join("\n");
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
// CSP DU FICHIER AUTONOME — dérivée de celle d'index.html, PAS identique.
//
// La CSP servie (`font-src 'self'`, `script-src 'self'`) est juste pour la PWA : elle vit sous
// un vrai serveur, fichiers séparés, aucun script ni police inline. Le fichier autonome N'A
// PAS ce luxe — tout est recousu dans LA MÊME page (R25.1 a ajouté deux polices en `data:`,
// aucune n'avait jamais été ouverte hors du serveur de dev avant de le découvrir, donc jamais
// vue bloquée). Deux ajouts MINIMAUX, jamais dans `index.html` source (S-4, la CSP servie ne
// bouge pas) :
//  - `font-src` gagne `data:` — les polices embarquées le sont, par construction, en `data:`.
//  - `script-src` gagne un NONCE, généré à CHAQUE build (`randomBytes`, jamais réutilisé,
//    jamais commité). PAS un hash : `loader()` crée deux AUTRES scripts inline À L'EXÉCUTION
//    (l'importmap, l'entrée `import "eb:/js/app.js"`) dont le contenu dépend d'URL de Blob
//    générées à la volée — un hash figé au build ne pourrait jamais les couvrir. PAS
//    `'unsafe-inline'` non plus : ça autoriserait N'IMPORTE QUEL script inline, glissé par
//    n'importe qui d'autre qui ouvrirait ce fichier — le nonce n'autorise que les TROIS
//    scripts que CE build a lui-même posés, avec ce nonce précis dessus (`.nonce =`, jamais
//    `setAttribute("nonce", …)` — la spec ne vérifie que la propriété IDL, pour empêcher un
//    nonce lu dans le HTML de servir à en injecter un autre).
const NONCE = randomBytes(18).toString("base64");

let html = read("index.html");
html = html
  .replace(/\s*<link rel="manifest"[^>]*>/, "")
  .replace(/\s*<link rel="apple-touch-icon"[^>]*>/, "")
  .replace(/\s*<link rel="stylesheet"[^>]*>/g, "")
  .replace(/font-src 'self';/, "font-src 'self' data:;")
  .replace(/script-src 'self';/, "script-src 'self' 'nonce-" + NONCE + "';")
  .replace("</head>", "<style>\n" + css + "\n</style>\n</head>")
  // pas de service worker dans un fichier unique : l'offline est déjà acquis (tout est inline)
  .replace('<script type="module" src="js/app.js"></script>', () => loader());

function loader() {
  const srcMap = {};
  for (const [rel, src] of MODULES) srcMap["eb:/" + rel] = Buffer.from(src, "utf8").toString("base64");
  return [
    '<script type="application/json" id="ebModules" nonce="' + NONCE + '">',
    JSON.stringify(srcMap).replace(/<\//g, "<\\/"),
    "</script>",
    '<script nonce="' + NONCE + '">',
    "",
    "// R11 §8 — le fichier autonome DÉCLARE ce qu'il est. Sans ce drapeau, le code de l'app",
    "// tentait d'enregistrer un service worker qui n'a aucun sens ici (fichier unique, rien à",
    "// mettre en cache) et de charger une icône absente : deux échecs avalés en silence. Un",
    "// échec silencieux n'est pas un problème tant qu'on ne cherche pas la cause d'autre chose.",
    'window.EB_STANDALONE = true;',
    "// Chaque module ES devient un Blob ; un importmap fait pointer les specifiers nus vers",
    "// ces Blobs. Une instance par module (état partagé) + imports circulaires préservés.",
    "// Les DEUX scripts créés ici sont inline : ils reçoivent le MÊME nonce que celui posé sur",
    "// ce bloc-ci (`.nonce =`, propriété IDL — voir le commentaire CSP plus haut).",
    '(function () {',
    '  var raw = JSON.parse(document.getElementById("ebModules").textContent);',
    '  var dec = new TextDecoder("utf-8"), map = { imports: {} };',
    "  for (var k in raw) {",
    '    var bytes = Uint8Array.from(atob(raw[k]), function (c) { return c.charCodeAt(0); });',
    '    map.imports[k] = URL.createObjectURL(new Blob([dec.decode(bytes)], { type: "text/javascript" }));',
    "  }",
    '  var im = document.createElement("script");',
    '  im.type = "importmap"; im.nonce = "' + NONCE + '"; im.textContent = JSON.stringify(map);',
    "  document.head.appendChild(im);",
    '  var entry = document.createElement("script");',
    '  entry.type = "module"; entry.nonce = "' + NONCE + '"; entry.textContent = \'import "eb:/js/app.js";\';',
    "  document.body.appendChild(entry);",
    "})();",
    "",
    "</script>",
  ].join("\n");
}

writeFileSync(OUT, html);
const ko = Math.round(html.length / 1024);
console.log("✓ " + relative(ROOT, OUT) + " — " + MODULES.size + " modules, " + ko + " Ko, zéro requête réseau");
