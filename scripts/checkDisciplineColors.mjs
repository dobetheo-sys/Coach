#!/usr/bin/env node
/**
 * Z-11 — UNE COULEUR DE DISCIPLINE NE PORTE QUE LE SENS DE SA DISCIPLINE.
 *
 * Règle écrite par l'arbitrage du 14/08/2026 (ARBITRAGE_B22_PHASE2 §5.2), après DEUX
 * collisions mesurées de la même classe : l'or `#ffd23d` (accent + pastille « échange en
 * attente » + DISC.rn.ac, coprésents sur 🗓 Plan — la sœur d'O-31, que R27 avait déjà refusée
 * pour l'or légendaire), et la courbe FITNESS du graphe de charge colorée `var(--zn-swim)` —
 * la discipline natation portant un sens non-disciplinaire sur un écran où les disciplines
 * apparaissent côte à côte (vérifié : 🎯 Aujourd'hui rend la pile de disciplines du héros ET
 * le graphe de charge).
 *
 * ÉCRIT ROUGE LE JOUR DE LA RÈGLE (contrat du dépôt : un test naît rouge contre le défaut
 * qu'il garde). Il liste les usages HORS contexte disciplinaire ; le jour où ils sont résolus,
 * ce script devient le garde-fou permanent. Contrat `expect` du banc v6 : la dette connue
 * n'échoue pas la CI, une AGGRAVATION oui.
 */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
const ROOT = resolve(import.meta.dirname, "..", "endurabuild");
const lire = (p) => readFileSync(join(ROOT, p), "utf8");

/** Les usages CONNUS hors discipline — le plafond du cliquet. Chaque entrée retirée du code
 *  doit être retirée d'ici DANS LE MÊME COMMIT (le script le dit).
 *  HISTORIQUE : les deux dettes de naissance (courbe Fitness CTL et sa légende en
 *  `var(--zn-swim)`, plan-view.js + tab-today.js) sont RÉSOLUES par B1 (e0720d4, 14/08/2026),
 *  qui a retiré le modèle CTL/ATL/TSB de l'UI — le gate est vert depuis, et il garde. */
const DETTE_CONNUE = [];

let vivantes = 0, resolues = 0, echecs = 0;
for (const d of DETTE_CONNUE) {
  const ok = d.motif.test(lire(d.fichier));
  if (ok) { vivantes++; console.log(`· dette connue VIVANTE : ${d.fichier} — ${d.quoi}`); }
  else { resolues++; console.log(`↓ dette RÉSOLUE : ${d.fichier} — ${d.quoi} → retirer l'entrée de DETTE_CONNUE dans ce commit`); }
}
// AGGRAVATION : tout NOUVEL usage de --zn-swim hors des fichiers/graphes déjà comptés.
const FICHIERS = ["css/zenna-today.css", "css/zenna-tabs.css", "js/ui/plan-view.js", "js/ui/tab-today.js"];
let usages = 0;
for (const f of FICHIERS) usages += (lire(f).match(/--zn-swim/g) || []).length;
const PLAFOND_USAGES = 2; // re-mesuré après B1 (14/08/2026) : la définition (zenna-today.css) + 1 commentaire historique (plan-view.js) — descendu de 12 avec la résolution des 2 dettes
if (usages > PLAFOND_USAGES) { echecs++; console.log(`✖ ${usages} usages de --zn-swim (plafond ${PLAFOND_USAGES}) — un NOUVEL usage est entré, vérifier qu'il est disciplinaire et monter le plafond avec sa justification`); }

/* ---- Z-11 ÉTENDU (ARBITRAGES_STOP_PHASE2 §5) — LES TROIS ESPACES DE NOMS ----------------
 * MARQUE (accents identitaires) · DISCIPLINE (--zn-swim + DISC[*].ac) · ÉTAT (bon/attente/
 * charge). Règle : « aucune valeur n'est partagée entre deux espaces coprésents à l'écran »
 * — cliquet, plafond initial = l'état MESURÉ. Les valeurs sont LUES dans les fichiers
 * (leçon Z-05 : une liste blanche recopiée dérive), seule l'APPARTENANCE est déclarée ici.
 * État mesuré au 14/08/2026 : 3 valeurs partagées, chacune documentée —
 *   #ff3d00  MARQUE ∩ DISCIPLINE(vélo) ∩ ÉTAT(charge dure)  → O-31, arbitré « non corrigé »
 *   #ffd23d  MARQUE(or) ∩ DISCIPLINE(course) ∩ ÉTAT(pastille d'attente)  → doublon n°3
 *   #9b72ff  DISCIPLINE(brick) ∩ ÉTAT(charge récup) + --zn-violet  → trouvé PAR CE CLIQUET
 * (le n°5, fatigue = orange-2, est RÉSOLU : B1 a tué son seul consommateur, les tokens morts
 * --zn-fatigue/--zn-form sont retirés dans le même commit que cette extension.) */
const cssToday = lire("css/zenna-today.css");
const icons = lire("js/ui/icons.js");
const tok = (nom) => (cssToday.match(new RegExp("\\" + nom + ":\\s*(#[0-9a-fA-F]{3,8})")) || [])[1]?.toLowerCase() ?? null;
const rgbToHex = (rgb) => "#" + rgb.trim().split(/\s+/).map((n) => (+n).toString(16).padStart(2, "0")).join("");
const disc = {}; for (const m of icons.matchAll(/(\w+):\s*\{\s*ic:[^}]*?ac:\s*"(#[0-9a-fA-F]{3,8})"/g)) disc[m[1]] = m[2].toLowerCase();
const charge = {}; for (const m of icons.matchAll(/(dur|facile|recup):\s*\{\s*rgb:\s*"([\d ]+)"/g)) charge[m[1]] = rgbToHex(m[2]);
const ESPACES = {
  MARQUE: { "--zn-orange": tok("--zn-orange"), "--zn-orange-2": tok("--zn-orange-2"), "--zn-cyan": tok("--zn-cyan"), "--zn-gold": tok("--zn-gold"), "--zn-violet": tok("--zn-violet") },
  DISCIPLINE: { "--zn-swim": tok("--zn-swim"), "DISC.sw": disc.sw, "DISC.bk": disc.bk, "DISC.rn": disc.rn, "DISC.br": disc.br },
  ETAT: { "--zn-good": tok("--zn-good"), "--zn-good-dark": tok("--zn-good-dark"), "--zn-gold-dot": tok("--zn-gold-dot"), "DISC.rs": disc.rs, "CHARGE.dur": charge.dur, "CHARGE.facile": charge.facile, "CHARGE.recup": charge.recup },
};
const morts = ["--zn-fatigue", "--zn-form"].filter((t) => cssToday.includes(t + ":"));
if (morts.length) { echecs++; console.log(`✖ token(s) mort(s) réintroduit(s) : ${morts.join(", ")} — B1 a tué leur seul consommateur, un token mort est une invitation à le recâbler`); }
const parValeur = new Map();
for (const [esp, tokens] of Object.entries(ESPACES))
  for (const [nom, val] of Object.entries(tokens)) {
    if (!val) { echecs++; console.log(`✖ valeur illisible pour ${nom} (${esp}) — le fichier a changé de forme, adapter la lecture`); continue; }
    if (!parValeur.has(val)) parValeur.set(val, []);
    parValeur.get(val).push({ esp, nom });
  }
const partages = [...parValeur.entries()].filter(([, l]) => new Set(l.map((x) => x.esp)).size > 1);
const PLAFOND_PARTAGES = 3; // l'état mesuré du 14/08/2026 (O-31 · n°3 · brick/récup) — ne peut que descendre
for (const [val, l] of partages) console.log(`· valeur partagée entre espaces : ${val} — ${l.map((x) => x.esp + ":" + x.nom).join(" · ")}`);
if (partages.length > PLAFOND_PARTAGES) { echecs++; console.log(`✖ ${partages.length} valeurs partagées entre espaces (plafond ${PLAFOND_PARTAGES}) — une NOUVELLE collision d'espaces est née`); }

/* ---- §6.1 (DOC_UNIQUE) — prévu/validé n'est JAMAIS encodé par la seule opacité ----------
 * Le graphe B1 encode le validé par une barre IMBRIQUÉE plus étroite (x + 22 %, largeur
 * 56 %) EN PLUS de l'opacité (.26 vs pleine) : la distinction survit au plein soleil et à la
 * basse vision. Ce check épingle la propriété : les deux rectangles existent et leurs
 * largeurs DIFFÈRENT — retirer l'imbrication en gardant l'opacité le fait rougir. */
const pv = lire("js/ui/plan-view.js");
const aOpacite = /opacity="\.26"/.test(pv);
const aImbrication = /wB\s*\*\s*0\.56/.test(pv) && /wB\s*\*\s*0\.22/.test(pv);
if (!aOpacite || !aImbrication) { echecs++; console.log(`✖ §6.1 : le graphe de charge n'encode plus prévu/validé par opacité ET imbrication (opacité=${aOpacite}, imbrication=${aImbrication}) — la seule opacité tombe en plein soleil/basse vision`); }

console.log(`\n${vivantes} dette(s) vivante(s) · ${resolues} résolue(s) · usages --zn-swim : ${usages}/${PLAFOND_USAGES} · valeurs partagées entre espaces : ${partages.length}/${PLAFOND_PARTAGES}`);
console.log(echecs ? "✖ Z-11 : aggravation" : vivantes ? "· Z-11 : dette connue stable (rouge attendu — la règle est née aujourd'hui)" : "✓ Z-11 : aucune couleur de discipline hors discipline, aucun espace de noms nouveau partagé");
process.exit(echecs ? 1 : 0);
