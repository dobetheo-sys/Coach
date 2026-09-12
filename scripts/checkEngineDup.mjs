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
// ---- VALEURS RÉFLÉCHIES (12/09/2026, décision 2a après `RAPPORT-swimrun-css.md`) -----------
// Une table recopiée « qui REFLÈTE » une autre est le même producteur de faux verts qu'un
// renommage : rien ne rougit quand l'une bouge et pas l'autre. On compare donc par VALEUR, en
// lisant ce qui s'EXÉCUTE (import des modules TS) partout où c'est possible ; les `durCaps` de
// run/bike sont des littéraux locaux à une fonction, lus par regex sur la source — c'est écrit.
const { MIN_WEEKS, CAP_LONG } = await import("../src/engine/constraintMatrix.ts");
const { DUA_MIN_WEEKS } = await import("../src/sports/duathlon/tables.ts");
const durCapsDe = (fichier) => {
  const src = readFileSync(join(ROOT, fichier), "utf8");
  const m = src.match(/const durCaps = \((\{[\s\S]*?\}) as Record/);
  if (!m) throw new Error("check:dup — `const durCaps = ({…} as Record` introuvable dans " + fichier + " : le motif a bougé, ne pas rendre vert par défaut");
  return Function("return (" + m[1] + ")")();
};
const REFLETS = [
  { quoi: "MIN_WEEKS.duathlon ↔ DUA_MIN_WEEKS (duathlon/tables.ts)", a: MIN_WEEKS.duathlon, b: DUA_MIN_WEEKS },
  { quoi: "CAP_LONG (course) ↔ durCaps.hi de run/index.ts", a: Object.fromEntries(Object.entries(durCapsDe("src/sports/run/index.ts")).map(([k, v]) => [k, v.hi])), b: Object.fromEntries(Object.keys(durCapsDe("src/sports/run/index.ts")).map((k) => [k, CAP_LONG[k]])) },
  { quoi: "CAP_LONG (vélo) ↔ durCaps.hi de bike/index.ts", a: Object.fromEntries(Object.entries(durCapsDe("src/sports/bike/index.ts")).map(([k, v]) => [k, v.hi])), b: Object.fromEntries(Object.keys(durCapsDe("src/sports/bike/index.ts")).map((k) => [k, CAP_LONG[k]])) },
];
for (const r of REFLETS) {
  const cles = new Set([...Object.keys(r.a), ...Object.keys(r.b)]);
  const ecarts = [...cles].filter((k) => r.a[k] !== r.b[k]).map((k) => `${k}: ${r.a[k]} ≠ ${r.b[k]}`);
  if (!cles.size) { console.log(`✖ ${r.quoi} : AUCUNE clé comparée — l'instrument ne mesure rien`); echecs++; continue; }
  console.log(`${ecarts.length ? "✖" : "·"} ${r.quoi} : ${cles.size} clé(s)${ecarts.length ? " — " + ecarts.join(", ") : " identiques"}`);
  if (ecarts.length) echecs++;
}
console.log(echecs ? "\n✖ Z-03 : une valeur moteur a gagné une copie, ou deux tables réfléchies divergent." : "\n✓ Z-03 cliquet : aucun doublon nouveau, tables réfléchies identiques.");
process.exit(echecs ? 1 : 0);
