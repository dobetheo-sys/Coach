#!/usr/bin/env node
/**
 * Z-01 (version CLIQUET) — LA DETTE DE LITTÉRAUX NE REMONTE PLUS.
 *
 * Réponse au STOP de Phase 1, §6 : la dette mesurée s'est concentrée sur R28/R29 — la
 * discipline s'est dégradée quand la vélocité a monté, et un contrôle passé une fois avant le
 * merge se dégraderait pareil juste après. Le Z-01 « zéro littéral hors zenna-tokens.css » du
 * prompt ne peut pas encore bloquer (la dette historique est réelle et son remboursement est
 * un travail de Phase 4) : un gate rouge en permanence est un gate que plus personne ne lit
 * (R16.10-a). D'où le CLIQUET, la forme des budgets d'audit_v7 : le compte actuel est le
 * PLAFOND, tout nouveau littéral au-dessus échoue, tout remboursement ABAISSE le plafond dans
 * le même commit (le script le dit). Quand les plafonds atteignent 0, ce fichier EST Z-01.
 */
import { readFileSync } from "node:fs";
import { join, resolve } from "node:path";
const ROOT = resolve(import.meta.dirname, "..");
const lire = (p) => readFileSync(join(ROOT, "endurabuild", "css", p), "utf8");

/** On compte HORS définitions de tokens (une ligne `--x: #hex` est une déclaration, pas une
 *  dette) et HORS commentaires — un littéral cité dans une explication n'est pas du style. */
const sansCommentaires = (css) => css.replace(/\/\*[\s\S]*?\*\//g, "");
const compte = (css) => {
  const corps = sansCommentaires(css).split("\n").filter((l) => !/^\s*--[a-z0-9-]+\s*:/.test(l)).join("\n");
  return {
    hex: (corps.match(/#[0-9a-fA-F]{3,8}\b/g) || []).length,
    durees: (corps.match(/\b\d+(?:\.\d+)?m?s\b/g) || []).length,
  };
};

// PLAFONDS = l'état mesuré au 14/08/2026, après le routage §5 (on-accent, beat-35, cut-bevel).
// Les abaisser est un progrès à committer ; les monter est un échec.
const PLAFONDS = {
  // 20 → 16 (FOUNDATION, 04/09/2026) : le fond `#000` et le halo radial du body, et les deux
  // littéraux de la pastille de nav, lisent les jetons désormais.
  "zenna-today.css": { hex: 16, durees: 5 },
  "zenna-tabs.css": { hex: 48, durees: 9 },
  // Le bilan posture (écran 2a) : recréé sur les jetons, pas sur la palette de sa référence
  // de design — 23 de ses 26 couleurs hors-jeton en étaient des quasi-doublons. D'où un
  // plafond qui NAÎT bas au lieu de photographier une dette.
  "zenna-posture.css": { hex: 0, durees: 0 },
  // FOUNDATION de la refonte (04/09/2026) — les HUIT feuilles de ZONE naissent à ZÉRO et y
  // restent : les jetons vivent dans le bloc `body.theme-zenna` de zenna-today.css (l'autorité),
  // les tailles dans les paliers `--fs-*`. Un agent de zone qui a besoin d'une valeur qui
  // n'existe pas déclare le JETON dans le socle, jamais un littéral chez lui.
  "zenna-aujourdhui.css": { hex: 0, durees: 0 },
  "zenna-semaine.css": { hex: 0, durees: 0 },
  "zenna-plan.css": { hex: 0, durees: 0 },
  "zenna-profil.css": { hex: 0, durees: 0 },
  "zenna-boutique.css": { hex: 0, durees: 0 },
  "zenna-educatifs.css": { hex: 0, durees: 0 },
  "zenna-matin.css": { hex: 0, durees: 0 },
  "zenna-questionnaire.css": { hex: 0, durees: 0 },
};

let echecs = 0;
for (const [f, plafond] of Object.entries(PLAFONDS)) {
  const c = compte(lire(f));
  for (const k of ["hex", "durees"]) {
    const etat = c[k] > plafond[k] ? "✖ DÉPASSE" : c[k] < plafond[k] ? "↓ sous le plafond — l'ABAISSER à " + c[k] + " dans ce commit" : "✓";
    console.log(`${c[k] > plafond[k] ? "✖" : "·"} ${f} ${k} : ${c[k]} / plafond ${plafond[k]} ${etat}`);
    if (c[k] > plafond[k]) echecs++;
  }
}
console.log(echecs ? "\n✖ Z-01 cliquet : de NOUVEAUX littéraux sont entrés — tokenise-les ou déclare le token manquant." : "\n✓ Z-01 cliquet : aucune dette nouvelle.");
process.exit(echecs ? 1 : 0);
