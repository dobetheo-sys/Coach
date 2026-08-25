#!/usr/bin/env node
/**
 * CHECK:DATES — AUCUN BANC GARDÉ NE FABRIQUE UNE DATE D'ENTRÉE DEPUIS « MAINTENANT ».
 *
 * SEPT occurrences de la même famille (R20.7, puis A-6 qui en a ancré cinq d'un coup, puis
 * `audit_v6` le 24/08/2026) : un banc dont le VERDICT dépend du jour où on le lance. Chacune a
 * été ancrée individuellement, et la suivante est arrivée quand même — la septième a même
 * échappé à `bench-dates.cjs` **parce que ses dates étaient déjà relatives, à la mauvaise
 * origine** : elle RESSEMBLAIT à une fixture ancrée.
 *
 * D'où ce contrôle STATIQUE, la forme qui a fermé trois familles là où les correctifs
 * individuels échouaient (`check:chemins` sur les chemins absolus, `npm run casser` sur les
 * mutations, `T-46` sur les élections) : on ne compte plus sur la vigilance, on refuse le motif.
 *
 * CE QUI EST REFUSÉ — une date de CALENDRIER (`toISOString().slice(0,10)` ou un gabarit
 * `getFullYear/getMonth/getDate`) dérivée de `Date.now()` / `new Date()` **sans normalisation
 * du jour de semaine** dans la même expression. Le jour de semaine décide de la longueur de la
 * dernière semaine (N2) et de la phase du cycle de 10 : une fixture qui ne le fixe pas mesure
 * un plan différent chaque jour.
 *
 * CE QUI EST PERMIS — les chronomètres (`Date.now()` pour une durée), les comparaisons
 * d'échéance, et toute expression qui recale explicitement (lundi courant, `courseDans`,
 * `courseUn`, `departPlan`, le dimanche suivant…).
 *
 *   npm run check:dates
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const RACINE = resolve(import.meta.dirname, "..");

/** Les bancs GARDÉS — la même liste que `npm run batterie`, plus les demos exécutées en CI. */
const SURVEILLES = [
  "audit_v6.mjs", "audit_v7.cjs", "bench_r13.cjs", "bench_r14.cjs", "bench_r14_1.cjs",
  "bench_r18.cjs", "banc_invariants.cjs", "banc_grand_public.cjs", "banc_sensibilite.cjs",
  "scripts/lotPhysio.mjs", "scripts/goldenMaster.mjs", "scripts/goldenBundle.mjs",
];

/** Ce qui NORMALISE un jour de semaine — si l'un de ces motifs est là, la date est ancrée. */
const ANCRAGES = [
  /getUTCDay\(\)/, /getDay\(\)/, /lundiCourant/, /courseDans/, /courseUn/, /departPlan/,
  /LUNDI/, /bench-dates/,
];
/** Ce qui fait d'une expression une DATE DE CALENDRIER (et non un chronomètre). */
const PRODUIT_UNE_DATE = [/toISOString\(\)\s*\.slice\(\s*0\s*,\s*10\s*\)/, /getFullYear\(\)/];
const VIENT_DE_MAINTENANT = /Date\.now\(\)|new Date\(\s*\)/;

/**
 * Exemptions NOMMÉES, avec leur raison — jamais une liste muette.
 * Le format est `fichier:ligne` sur le CONTENU, pas sur le numéro : une exemption qui suit un
 * déplacement de ligne cesserait d'exempter ce qu'elle croit exempter (règle 17).
 */
const EXEMPTIONS = [
  { fichier: "scripts/goldenMaster.mjs", motif: /Date\.now\(\) > alerte/,
    raison: "échéance de la passe « course datée » : une comparaison, pas une fixture" },
  { fichier: "bench_r13.cjs", motif: /console\.log\("\\n== BANC R13/,
    raison: "en-tête de rapport : la date est IMPRIMÉE, elle n'entre dans aucune fixture" },
];

let violations = 0, examinees = 0, exemptees = 0;
for (const rel of SURVEILLES) {
  let src;
  try { src = readFileSync(resolve(RACINE, rel), "utf8"); } catch { console.error(`✖ ${rel} introuvable — la liste surveillée a divergé du dépôt`); violations++; continue; }
  src.split("\n").forEach((ligne, i) => {
    const nu = ligne.replace(/^\s*(\*|\/\/|\/\*).*$/, ""); // un commentaire n'exécute rien
    if (!VIENT_DE_MAINTENANT.test(nu)) return;
    if (!PRODUIT_UNE_DATE.some((r) => r.test(nu))) return; // chronomètre : permis
    examinees++;
    if (ANCRAGES.some((r) => r.test(nu))) return;
    const ex = EXEMPTIONS.find((e) => e.fichier === rel && e.motif.test(nu));
    if (ex) { exemptees++; return; }
    violations++;
    console.error(`✖ ${rel}:${i + 1} — date de calendrier dérivée de « maintenant », sans jour de semaine fixé`);
    console.error(`    ${ligne.trim()}`);
  });
}

// Un zéro a besoin de sa population : on publie ce qui a été EXAMINÉ, pas seulement le verdict.
console.log(`${SURVEILLES.length} bancs gardés · ${examinees} expression(s) de date examinée(s) · ${exemptees} exemptée(s) · ${violations} violation(s)`);
if (!examinees) { console.error("✖ aucune expression examinée — la sonde ne mesure rien (motif périmé ?)"); process.exit(1); }
if (violations) {
  console.error("\nUne fixture qui ne fixe pas son jour de semaine mesure un plan différent chaque jour :");
  console.error("la longueur de la dernière semaine (N2) et la phase du cycle de 10 en dépendent.");
  console.error("Ancrer par `bench-dates.cjs` (courseDans / courseUn / departPlan) ou recaler sur le lundi courant.");
  process.exit(1);
}
