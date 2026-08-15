#!/usr/bin/env node
/**
 * T-28 — POUR TOUTE BORNE AUDITÉE, LE GÉNÉRATEUR LIT-IL LA MÊME SOURCE QUE L'AUDITEUR ?
 *
 *   node scripts/balayageT28.mjs
 *
 * Un générateur et un auditeur qui lisent deux sources pour la MÊME grandeur, c'est `_IFZ` sous
 * une autre forme : deux vérités pour une borne. Et le mode de défaillance est particulièrement
 * mauvais — le générateur produit sereinement ce que l'auditeur refusera, donc le défaut
 * n'apparaît qu'au gate, longtemps après sa cause. B-02 vient d'en payer une journée.
 *
 * Le balayage vaut mieux que le correctif ponctuel : si un couple diverge, d'autres divergent
 * probablement, et ils attendent tous un profil pour se révéler.
 *
 * CE QUE LE BALAYAGE COMPARE : l'intervalle ADMISSIBLE de chaque côté. Le générateur est correct
 * si le sien est CONTENU dans celui de l'auditeur — il a le droit d'être plus strict (une marge
 * de sécurité), jamais plus permissif (il produirait alors du refusable). On signale donc les
 * deux, en distinguant :
 *   · ⚠ PERMISSIF — le générateur autorise ce que l'auditeur refuse. C'est le défaut.
 *   · · strict    — le générateur est plus serré. Ce n'est pas un défaut, mais c'est une borne
 *                   morte côté auditeur, et ça mérite d'être vu.
 *   · = identique — les deux lisent la même chose.
 */
import {
  BRICK_BIKE_BOUNDS, BRICK_TAPER_BIKE_BOUNDS, CAP_BRICK_BIKE, CAP_BRICK_RUN,
  C21_REPRISE_BRICK_FACTOR,
} from "../src/engine/constraintMatrix.ts";

const FORMATS = ["S", "M", "70.3", "Full", "L", "PM"];
const lignes = [];

/**
 * Le générateur, pour un leg vélo de brick (`blockBounds`, branche `s.brick`) :
 *   floor = BRICK_BIKE_BOUNDS[fmt][0] × share      ← C21b : MÊME source que l'auditeur
 *   cap   = CAP_BRICK_BIKE[fmt] × brickRF × share  ← une AUTRE table, et sans phase
 * `share` vaut 1 quand le leg est en un seul bloc ; on balaie ce cas, le pire pour le cap.
 */
for (const fmt of FORMATS)
  for (const [phase, aud] of [["charge", BRICK_BIKE_BOUNDS[fmt]], ["affûtage", BRICK_TAPER_BIKE_BOUNDS[fmt]]])
    for (const [hist, rf] of [["ancien/confirme", 1], ["reprise", C21_REPRISE_BRICK_FACTOR]]) {
      const gen = [Math.round(BRICK_BIKE_BOUNDS[fmt][0] * 1), Math.round((CAP_BRICK_BIKE[fmt] || 300) * rf * 1)];
      lignes.push({
        borne: "leg vélo de brick", cle: `${fmt}/${phase}/${hist}`,
        sourceAud: phase === "charge" ? "BRICK_BIKE_BOUNDS (C21b)" : "BRICK_TAPER_BIKE_BOUNDS (C21c)",
        sourceGen: "BRICK_BIKE_BOUNDS[0] (plancher) + CAP_BRICK_BIKE (plafond)",
        aud, gen,
      });
    }

// Le leg COURSE du brick : l'auditeur ne le borne pas du tout ; le générateur, si.
for (const fmt of FORMATS)
  lignes.push({
    borne: "leg course de brick", cle: `${fmt}/toutes phases`,
    sourceAud: "— (aucune borne auditée)", sourceGen: "CAP_BRICK_RUN",
    aud: null, gen: [8, CAP_BRICK_RUN[fmt] || 70],
  });

const contenu = (g, a) => a && g[0] >= a[0] && g[1] <= a[1];
let permissifs = 0, stricts = 0, identiques = 0, nonAudites = 0;

console.log("T-28 — BORNES AUDITÉES vs SOURCE LUE PAR LE GÉNÉRATEUR\n");
console.log("  état  borne / clé                                   auditeur       générateur     sources");
for (const l of lignes) {
  let etat, marque;
  if (!l.aud) { etat = "non audité"; marque = "?"; nonAudites++; }
  else if (l.aud[0] === l.gen[0] && l.aud[1] === l.gen[1]) { etat = "identique"; marque = "="; identiques++; }
  else if (contenu(l.gen, l.aud)) { etat = "strict"; marque = "·"; stricts++; }
  else { etat = "PERMISSIF"; marque = "⚠"; permissifs++; }
  if (marque === "=" ) continue; // le cas sain n'a pas besoin d'être lu ligne à ligne
  console.log(`  ${marque} ${etat.padEnd(10)} ${(l.borne + " · " + l.cle).padEnd(44)} `
    + `${(l.aud ? "[" + l.aud[0] + ", " + l.aud[1] + "]" : "—").padEnd(14)} `
    + `[${l.gen[0]}, ${l.gen[1]}]`.padEnd(15) + ` ${l.sourceGen}`);
}

console.log(`\n  ⚠ ${permissifs} permissif(s) · · ${stricts} strict(s) · = ${identiques} identique(s) · ? ${nonAudites} non audité(s)`);
if (permissifs) {
  console.log("\n  ⚠ PERMISSIF = le générateur peut produire ce que l'auditeur refuse. C'est le défaut");
  console.log("    que B-02 a payé : le plan sort propre de la génération et rouge au gate.");
}
process.exit(0);
