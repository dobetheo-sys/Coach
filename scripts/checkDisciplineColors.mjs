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
console.log(`\n${vivantes} dette(s) vivante(s) · ${resolues} résolue(s) · usages --zn-swim : ${usages}/${PLAFOND_USAGES}`);
console.log(echecs ? "✖ Z-11 : aggravation" : vivantes ? "· Z-11 : dette connue stable (rouge attendu — la règle est née aujourd'hui)" : "✓ Z-11 : aucune couleur de discipline hors discipline");
process.exit(echecs ? 1 : 0);
