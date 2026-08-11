// Lance toutes les suites E2E séquentiellement (chacune a son port) et échoue si
// l'une échoue. `npm run test:e2e` — exécuté aussi par la CI (job e2e).
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const SUITES = ["smoke-checkin.mjs", "smoke-r4.mjs", "smoke-retention.mjs", "smoke-improvements.mjs", "smoke-dates.mjs",
  "smoke-trail.mjs", "smoke-nofallback.mjs", "smoke-duathlon.mjs", "smoke-typo.mjs",
  // R16.10 — la suite swimrun revient avec le module (elle sortait avec lui en R12 §0).
  "smoke-swimrun.mjs", "smoke-avatar.mjs",
  // R18.3 — la navigation à cinq onglets, et surtout : un geste, une implémentation.
  "smoke-tabs.mjs",
  // R20.1 — les SEPT questionnaires se traversent : aucune suite ne passait par le triathlon.
  "smoke-questionnaires.mjs",
  // U1-U7 — le PREMIER CONTACT : ce que la personne lit, et ce qu'elle attend. Aucune autre
  // suite ne regarde ça — elles vérifient toutes ce que le moteur produit.
  "smoke-usage.mjs", "smoke-projlog.mjs", "smoke-refus.mjs", "smoke-securite.mjs",
  // RV — le chrono visé : la carte existe ET le plan ne bouge pas. La seconde moitié est la
  // raison d'être de la suite.
  "smoke-feasibility.mjs",
  // Le canal de vente (abonnement ravitaillement) n'avait aucune garde depuis sa livraison —
  // couvre le mécanisme existant et son extension « fin de plan » (08/08/2026).
  "smoke-shop.mjs",
  // R26 — Éducatifs (six disciplines) : A1-A13 du brief, le mécanisme de verrouillage/
  // cascade, l'affichage conditionnel par sport et l'absence de doublon d'identifiant SVG.
  "smoke-educatifs.mjs",
  // R-ZENNA — le reskin animé de 🎯 Aujourd'hui : le mouvement porte l'opacité, donc son
  // absence VIDE l'onglet sans qu'aucune assertion de contenu ne s'en aperçoive.
  "smoke-zenna.mjs"];
let failed = 0;
for (const s of SUITES) {
  console.log("\n━━━ " + s + " ━━━");
  const r = spawnSync(process.execPath, [fileURLToPath(new URL(s, import.meta.url))], { stdio: "inherit" });
  if (r.status !== 0) failed++;
}
console.log("\n═══ E2E : " + (SUITES.length - failed) + "/" + SUITES.length + " suites vertes ═══");
process.exit(failed ? 1 : 0);
