#!/usr/bin/env node
/**
 * `npm run audit:v7` — banc de régression EXTERNE multi-sport (trail / swimrun / duathlon).
 *
 * Le harnais `audit_v7.cjs` vient d'un audit indépendant : il ne connaît pas `auditPlan()` et ne
 * lui fait pas confiance. Il compare le plan ÉMIS aux PROMESSES — règles déclarées dans le
 * moteur, réponses de l'athlète, et chiffres que le moteur calcule lui-même (`swimrunObjective`).
 * C'est ce qui lui a permis de trouver ce que l'auditeur interne ne voit pas : il rendait
 * `score: 100, hardViolations: []` sur des plans contenant 90 min de seuil ou aucun vélo.
 *
 * Ce script fixe un SEUIL par check : au-delà, exit 1. Les seuils à 0 sont des garde-fous
 * définitifs (santé, doses, contrats) ; les autres sont la dette restante, chiffrée, qui ne doit
 * jamais remonter. Baisser un seuil quand on corrige : c'est le même contrat que le banc v6.
 */
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const N = process.argv[2] || "150";

/** Seuil maximal toléré par check. 0 = garde-fou définitif, ne jamais remonter. */
const BUDGET = {
  // --- Garde-fous de SÉCURITÉ et de contrat : zéro, définitivement ---
  "U-MED": 0,        // drapeau médical contourné (R4.0) — bloquant
  "U-CRASH": 0,
  "U-EMPTY": 0,
  "U-NONDET": 0,
  "U-TEXT": 0,
  "U-MIN": 0,
  "U-MIN-REST": 0,   // contrat V1Plan (R4.8a)
  "U-MIN-SUM": 0,
  "U-REPCAP": 0,     // déversoir de volume dans les blocs de qualité (R4.1)
  "U-DOSE": 0,       // dose d'intensité intenable (R4.1c)
  "U-MINEUR": 0,
  "U-OFF": 0,
  "U-DOUBLES": 0,
  "U-SESSBUDGET": 0,
  "U-VOLCAP": 0,
  "U-STRUCT": 0,
  "U-DATE-DUP": 0,
  "U-TAPER": 0,
  "S-OW": 0,         // plafond d'accès à l'eau libre (R4.3)
  "S-TRANSITIONS": 0, // nom de la pivot vs prescription (R4.4/R5.1)
  "S-SOLO": 0,       // parler de binôme en solo (R4.8d)
  "S-EPAULE": 0,
  "T-POLES": 0,
  "T-KM": 0,
  "T-DESC": 0,
  "D-SWIM": 0,
  "D-SWIMTXT": 0,
  "D-VO2": 0,
  "D-BRICK": 0,
  "D-TERRAIN": 0,
  // --- Dette restante, chiffrée : ne doit jamais remonter (voir R10_DEFECTS.md) ---
  "U-DECL": 2,       // R5.3 — CORRIGÉ : la courbe annoncée se réconcilie avec le prescrit
  "U-RACEDATE": 12,  // R4.8b — course lointaine : plafond assumé + avertissement
  "U-DUP": 0,        // R5.5 — CORRIGÉ : jamais deux fois la même séance de qualité par semaine
  "T-DPLUS": 0,      // R4.7a — CORRIGÉ : le D+ par bloc suit le terrain accessible (T1b)
  "T-NIGHT": 2,      // R4.7b — la consigne nuit est un ATTRIBUT greffé sur les séances survivantes
  "T-DPLUS-WK": 2,
  "T-POLES-ADV": 2,
  "S-NOVO2": 0,      // R5.4/R5.5 — CORRIGÉ : le stimulus change de support et de créneau
  "S-LONGSWIM": 8,   // plus longue nage non répétée sur les valeurs extrêmes (saisies invraisemblables)
  "S-MIX": 9,        // part course/nage du plan vs de la course
  "S-RUN-STARVED": 10,
  "S-PREREQ": 12,    // format RABATTU + avertissement (choix assumé, cf. R10_DEFECTS)
  "D-DISC": 1,       // R5.2 — CORRIGÉ : couverture en dernier + aucune coupe n'orpheline la discipline principale
};

let failed = false;
for (const sport of ["trail", "swimrun", "duathlon"]) {
  const out = execFileSync(process.execPath, [join(ROOT, "audit_v7.cjs"), sport, N], {
    env: { ...process.env, ENGINE: join(ROOT, "endurabuild/js/engine.js") },
    encoding: "utf8", maxBuffer: 64 * 1024 * 1024,
  });
  const d = JSON.parse(out);
  const over = [];
  for (const [id, n] of d.rows) {
    // R11 — les refus d'entrée typés sont le comportement DEMANDÉ : le fuzz produit
    // volontairement des combinaisons impossibles (Ironman dans 3 semaines, FTP négative).
    // Ils sont comptés et affichés, jamais budgétés comme un défaut.
    if (id.startsWith("U-REFUS:")) continue;
    const key = id.startsWith("U-CRASH") ? "U-CRASH" : id;
    const budget = BUDGET[key];
    if (budget === undefined) { over.push(`${id} = ${n} (check INCONNU : ajouter son budget)`); continue; }
    if (n > budget) over.push(`${id} = ${n} > ${budget}`);
  }
  const pct = Math.round((d.clean / d.cases) * 100);
  console.log(`${over.length ? "✖" : "✔"} ${sport.padEnd(9)} ${d.clean}/${d.cases} profils sans défaut (${pct}%) · ${d.refusals || 0} refus d'entrée · ${d.crashes} crash · ${d.nondet} non-déterminisme`);
  for (const o of over) console.log("     " + o);
  if (over.length) failed = true;
}
console.log(failed
  ? "\n✖ Un check dépasse son budget. Corriger, ou baisser le budget SI le changement est voulu et documenté."
  : "\n✓ audit v7 : tous les checks dans leur budget.");
process.exit(failed ? 1 : 0);
