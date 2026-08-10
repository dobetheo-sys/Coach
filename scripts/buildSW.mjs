/**
 * buildSW — LA VERSION DU SERVICE WORKER EST DÉRIVÉE DU CONTENU (O-24).
 *
 * ================================================================================
 * LE DÉFAUT QUE CE SCRIPT SUPPRIME
 * ================================================================================
 *
 * `endurabuild/sw.js` sert l'app en **cache-first** : un asset trouvé en cache est
 * rendu sans jamais interroger le réseau. C'est le bon choix (l'app doit marcher
 * hors ligne), et il a un corollaire qui n'était tenu par rien : **le cache n'est
 * purgé que lorsque `VERSION` change**, et `VERSION` était une constante que
 * quelqu'un devait penser à incrémenter à la main.
 *
 * Mesuré le 03/08/2026, avant ce script : `VERSION = "eb-pwa-v17"` datait de RV.
 * Depuis, **12 commits** avaient modifié **14 modules mis en cache** — U14, U15,
 * U16, I14b, O-21, A-5, A-6, O-22, O-23. Aucun de ces correctifs n'atteignait un
 * navigateur ayant déjà ouvert l'app. Le fondateur a redéployé son worker Strava,
 * s'est reconnecté, a réimporté, et a revu 188 W : il testait le code d'il y a
 * neuf lots.
 *
 * C'est la forme la plus coûteuse de défaut de ce dépôt — celle où la mesure dit
 * vert et l'utilisateur voit rouge. Elle a déjà été payée deux fois sous un autre
 * habillage : R18.1 (« un correctif que la cascade annule est un correctif qu'on
 * croit avoir ») et U16 (`.gd-det { font-size: 11px }` qui écrasait sur mobile
 * l'aération posée deux étages plus haut). Ici c'est le CACHE qui annule, et il
 * annule TOUT.
 *
 * ================================================================================
 * LA RECETTE : LA VERSION EST L'EMPREINTE
 * ================================================================================
 *
 * On ne demande plus à personne de se souvenir. `VERSION` est le hachage du
 * CONTENU de tous les assets mis en cache : elle change si et seulement si un
 * fichier servi change. Il n'y a plus d'état « à jour dans le dépôt mais périmé
 * dans le service worker » — l'un est fonction de l'autre (R11.1 : une seule
 * source de vérité, ici entre les fichiers et le numéro qui les version).
 *
 * `ASSETS` est dérivée du disque pour la même raison : la liste était écrite à la
 * main, et il y manquait `js/measured.js`, `js/projection-log.js` et
 * `js/ui/tab-week.js` — trois modules VIVANTS (importés au démarrage), donc trois
 * trous dans la promesse « l'app marche hors ligne ». Un cache qui oublie un
 * module ne casse pas en ligne : il casse chez quelqu'un, dans le métro.
 *
 * ================================================================================
 * LE MÊME COUPLE QUE `build:app` / `check:app`
 * ================================================================================
 *
 * `npm run build:sw`  → réécrit les deux blocs générés de sw.js
 * `npm run check:sw`  → échoue si le sw.js committé est périmé (gate CI)
 *
 * C'est exactement le motif déjà éprouvé pour le bundle du monolithe. Rien de
 * nouveau à apprendre, et surtout : le contrôle est en CI, donc l'oubli devient
 * impossible plutôt qu'improbable.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join, relative } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const APP = join(root, "endurabuild");
const SW = join(APP, "sw.js");

const DEB_ASSETS = "// __SW_ASSETS__ (généré par scripts/buildSW.mjs — ne pas éditer à la main)";
const FIN_ASSETS = "// __/SW_ASSETS__";
const DEB_VER = "// __SW_VERSION__ (généré par scripts/buildSW.mjs — ne pas éditer à la main)";
const FIN_VER = "// __/SW_VERSION__";

/** Les fichiers non listables par extension : ils ne changent qu'à la main. */
const EN_DUR = [
  "./",
  "./index.html",
  "./manifest.json",
  "./assets/fonts/archivo-black-400.woff2",
  "./assets/fonts/space-grotesk-500-700.woff2",
  "./assets/fonts/caveat-600-700.woff2",
  "./assets/fonts/bebas-neue-400.woff2",
  "./assets/fonts/ibm-plex-mono-400.woff2",
  "./assets/fonts/ibm-plex-mono-700.woff2",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
];

/** Tous les `.js` et `.css` de l'app, récursivement — la source de vérité est le DISQUE. */
function modules(dir) {
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = join(dir, e);
    if (statSync(p).isDirectory()) { out.push(...modules(p)); continue; }
    if (/\.(js|css)$/.test(e)) out.push("./" + relative(APP, p).split("\\").join("/"));
  }
  return out;
}

// `sw.js` ne se met pas lui-même en cache : le navigateur le recharge par un chemin
// dédié, et s'y mettre reviendrait à se rendre immortel.
const listeJs = modules(join(APP, "js")).filter((p) => p !== "./sw.js");
const listeCss = modules(join(APP, "css"));
const ASSETS = [...EN_DUR.slice(0, 3), ...listeCss.sort(), ...listeJs.sort(), ...EN_DUR.slice(3)];

// ---- L'EMPREINTE : le nom du fichier ET son contenu ----------------------------
// Le NOM compte autant que le contenu : retirer un module du cache change ce que
// l'app sert hors ligne, même si aucun octet des autres fichiers n'a bougé.
const h = createHash("sha256");
for (const a of ASSETS) {
  h.update(a);
  if (a === "./") continue;
  try { h.update(readFileSync(join(APP, a.slice(2)))); }
  catch (e) { console.error("✖ asset listé mais introuvable : " + a); process.exit(1); }
}
const VERSION = "eb-pwa-" + h.digest("hex").slice(0, 12);

// ---- Réécriture des deux blocs générés -----------------------------------------
const src = readFileSync(SW, "utf8");
const remplacer = (txt, deb, fin, corps) => {
  const i = txt.indexOf(deb), j = txt.indexOf(fin);
  if (i < 0 || j < 0) { console.error("✖ marqueurs " + deb + " absents de sw.js"); process.exit(1); }
  return txt.slice(0, i) + deb + "\n" + corps + "\n" + txt.slice(j);
};

let out = remplacer(src, DEB_VER, FIN_VER, 'const VERSION = "' + VERSION + '";');
out = remplacer(out, DEB_ASSETS, FIN_ASSETS,
  "const ASSETS = [\n" + ASSETS.map((a) => '  "' + a + '",').join("\n") + "\n];");

const check = process.argv.includes("--check");
if (check) {
  if (out !== src) {
    console.error("✖ endurabuild/sw.js est PÉRIMÉ.");
    console.error("");
    console.error("  Des fichiers servis par le service worker ont changé sans que sa VERSION suive.");
    console.error("  Conséquence : les navigateurs qui ont déjà ouvert l'app continueront de servir");
    console.error("  l'ANCIENNE version depuis leur cache — le correctif n'atteindra personne.");
    console.error("");
    console.error("  Corriger : npm run build:sw   (puis committer sw.js)");
    process.exit(1);
  }
  console.log("✓ sw.js à jour — VERSION " + VERSION + " · " + ASSETS.length + " assets");
} else {
  writeFileSync(SW, out);
  const nb = out === src ? "inchangé" : "réécrit";
  console.log("✓ sw.js " + nb + " — VERSION " + VERSION + " · " + ASSETS.length + " assets précachés");
}
