#!/usr/bin/env node
/**
 * AUCUN CHEMIN ABSOLU DE MACHINE DANS LE DÉPÔT.
 *
 *   npm run check:chemins
 *
 * Trouvé au premier passage en CI après le merge du 17/08/2026 : `mesure:o56` échouait en
 * **moins d'une seconde** sur `ENOENT: /home/user/Coach/endurabuild/js/state.js` — un chemin
 * absolu codé en dur dans une contre-preuve. Le script tournait dans le bac à sable où il avait
 * été écrit et **nulle part ailleurs** : ni en CI, ni chez le fondateur. Balayé, sept fichiers
 * portaient la même faute, dont DEUX en CI.
 *
 * Ce que ça dit : une garde qui ne peut s'exécuter qu'à un seul endroit ne garde rien, et rien
 * ne le signalait — le script passait en local, donc « il marche ». C'est la forme d'O-24
 * appliquée aux outils : un défaut dont la cause est « quelqu'un doit s'en souvenir » se ferme
 * en le rendant IMPOSSIBLE, pas improbable.
 *
 * Les commentaires sont exclus : ce fichier-ci cite le chemin fautif pour expliquer la règle,
 * et les entrées du registre le citeront aussi.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const RACINE = join(import.meta.dirname, "..");
const DOSSIERS = ["scripts", "src", "tests", "endurabuild/js", ".github/workflows"];
const RACINES_FICHIERS = [".mjs", ".cjs", ".js", ".ts", ".yml"];
// Un chemin absolu de MACHINE : racine unix personnelle, /Users (macOS), lettre de lecteur.
const ABSOLU = /(["'`])(\/home\/|\/Users\/|[A-Za-z]:\\\\)/;

const fichiers = [];
const marcher = (d) => {
  let entrees; try { entrees = readdirSync(d); } catch { return; }
  for (const e of entrees) {
    if (e === "node_modules" || e === ".git") continue;
    const p = join(d, e);
    if (statSync(p).isDirectory()) marcher(p);
    else if (RACINES_FICHIERS.some((x) => e.endsWith(x))) fichiers.push(p);
  }
};
for (const d of DOSSIERS) marcher(join(RACINE, d));

/** Retire les commentaires — un chemin CITÉ dans une explication n'est pas un chemin utilisé. */
const sansCommentaires = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split("\n").map((l) => l.replace(/(^|[^:])\/\/.*$/, "$1").replace(/^\s*#.*$/, "")).join("\n");

const fautes = [];
for (const f of fichiers) {
  const src = sansCommentaires(readFileSync(f, "utf8"));
  src.split("\n").forEach((l, i) => {
    const m = ABSOLU.exec(l);
    if (m) fautes.push(`${relative(RACINE, f)}:${i + 1}  ${l.trim().slice(0, 90)}`);
  });
}
console.log(`${fichiers.length} fichiers balayés`);
if (!fautes.length) { console.log("✓ aucun chemin absolu de machine — tout est dérivé."); process.exit(0); }
console.log(`✖ ${fautes.length} chemin(s) absolu(s) — ces fichiers ne peuvent tourner que sur UNE machine :\n`);
for (const x of fautes) console.log("   " + x);
console.log("\n  Dériver depuis `import.meta.dirname` (ESM) ou `__dirname` (CJS).");
process.exit(1);
