#!/usr/bin/env node
/**
 * Z-03 (cliquet) — AUCUNE VALEUR MOTEUR DÉFINIE PLUS D'UNE FOIS, plafond = l'état mesuré.
 *
 * Cas modèle (prompt de merge §2, confirmé en Phase 1) : `_IFZ`, la table de zones d'intensité
 * recopiée dans l'UI — que son propre commentaire déclare dupliquée. Mesuré au 14/08/2026 :
 * **3 exemplaires** (plan-view.js, Coach_Pro_V1.5.html — monolithe gelé —, splitPwa.py).
 * Le plafond ne peut que DESCENDRE : la Phase 2.1 (table de traçabilité) nourrira cette liste
 * de tous les doublons qu'elle trouve, chacun avec son plafond du jour.
 */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
const ROOT = resolve(import.meta.dirname, "..");
const compte = (fichiers, motif) => fichiers.reduce((n, f) => {
  try { return n + ((readFileSync(join(ROOT, f), "utf8").match(motif) || []).length ? 1 : 0); }
  catch { return n; }
}, 0);

const DOUBLONS = [
  { quoi: "_IFZ (table de zones d'intensité recopiée dans l'UI)", plafond: 1, // B1 : copie UI morte ; reste le monolithe GELÉ (sa propre UI legacy) — descendu 3 → 1
    fichiers: ["endurabuild/js/ui/plan-view.js", "Coach_Pro_V1.5.html", "scripts/splitPwa.py"],
    motif: /_IFZ\s*=\s*\{/ },
];
let echecs = 0;
for (const d of DOUBLONS) {
  const n = compte(d.fichiers, d.motif);
  const etat = n > d.plafond ? "✖ UNE COPIE DE PLUS" : n < d.plafond ? `↓ ${n} — abaisser le plafond dans ce commit` : "· stable";
  console.log(`${n > d.plafond ? "✖" : "·"} ${d.quoi} : ${n}/${d.plafond} ${etat}`);
  if (n > d.plafond) echecs++;
}
console.log(echecs ? "\n✖ Z-03 : une valeur moteur a gagné une copie." : "\n✓ Z-03 cliquet : aucun doublon nouveau.");
process.exit(echecs ? 1 : 0);
