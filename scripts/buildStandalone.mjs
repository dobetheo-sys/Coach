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

// ---- 3. Réassemblage de la page ----
let html = read("index.html");
html = html
  .replace(/\s*<link rel="manifest"[^>]*>/, "")
  .replace(/\s*<link rel="apple-touch-icon"[^>]*>/, "")
  .replace(/\s*<link rel="stylesheet"[^>]*>/g, "")
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
