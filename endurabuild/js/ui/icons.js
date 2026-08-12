// R11.1 — un point unique pour les petites cartes icône/couleur/libellé que l'UI recopiait
// ailleurs. Audit du 07/08/2026 : la carte discipline (sw/bk/rn/br/rs → 🏊/🚴/🏃/🔁/😌) vivait
// en SIX copies indépendantes (plan-view.js, tab-week.js, session-life.js, tab-plan-general.js,
// tab-profile.js ×2), pas toutes identiques (`rs` valait 💪 ici et 😌 là, `br` manquait dans
// certaines) ; la carte verdict (verte/orange/rouge → 🟢/🟠/🔴) en trois (readiness.js,
// tab-today.js, session-life.js), celles-là identiques mais sans rien qui le garantisse. Rien
// n'est cassé aujourd'hui, mais rien ne garantit qu'un septième site les mette à jour ensemble
// — le mode de dérive silencieuse que ce principe existe pour interdire ailleurs dans le dépôt.

// Codes que le moteur émet (sw/bk/rn/br/rs), vérifiés exhaustivement par `demo:avatartri`.
// Accents repris de SPORTS[*].accent (config.js) là où un sport correspond en direct
// (rn/bk/sw) — un athlète qui a vu son avatar en vélo bleu retrouve le même bleu ici, pas une
// troisième palette ; br/rs n'ont pas d'équivalent sport et gardent leur propre couleur.
// `rs` (repos) vaut 😌 — le glyphe le plus récent et le plus juste sémantiquement pour un jour
// de repos, retenu comme référence plutôt que 💪 (qui vivait dans les copies plus anciennes).
export const DISC = {
  sw: { ic: "🏊", ac: "#00b8d9", label: "Natation" },
  bk: { ic: "🚴", ac: "#2e6bff", label: "Vélo" },
  rn: { ic: "🏃", ac: "#ff7a1a", label: "Course" },
  br: { ic: "🔁", ac: "#9b72ff", label: "Brick" },
  rs: { ic: "😌", ac: "#00a376", label: "Repos" },
};

/**
 * L'AXE DE CHARGE — dur / facile / récup / repos, la lecture « d'un coup d'œil » de la semaine.
 *
 * Il était écrit EN DUR à chaque endroit qui l'affiche, sur deux surfaces qui ne se recouvrent
 * pas : des pastels sur le papier (`#ffe3e0` rose pour le dur) et des accents saturés sur le
 * sombre (`rgba(255,61,0,…)` orange). Deux jeux de couleurs pour une même idée, sans rien pour
 * les tenir ensemble — c'est R11.1 appliqué à une couleur sémantique.
 *
 * POURQUOI DEUX VALEURS PAR CHARGE, ET NON UNE : ce ne sont pas deux thèmes au choix, ce sont
 * deux SURFACES. L'app est sombre ; le document exporté est un papier crème (`#f1eadb`) qu'on
 * imprime. Un pastel rose sur du noir est invisible, un orange saturé sur du crème hurle. Les
 * unifier en une seule valeur casserait l'une des deux — l'unification porte sur le POINT DE
 * DÉCLARATION, pas sur la valeur.
 *
 * `rgb` est un TRIPLET et non une couleur finie, parce que le sombre l'emploie à plusieurs
 * opacités (bordure à .34, fond à .14 avant que V3 ne le retire) : une couleur figée obligerait
 * à en déclarer une par opacité.
 *
 * Le jumeau CSS vit dans `css/zenna-today.css` (`--zn-charge-*`). Les deux ne peuvent pas
 * diverger : `smoke-charge.mjs` compare cette table aux tokens rendus, et rougit sinon.
 */
export const CHARGE = {
  dur:    { rgb: "255 61 0",    papier: "#ffe3e0", label: "Dur" },
  facile: { rgb: "31 184 166",  papier: "#d9f3e1", label: "Facile" },
  recup:  { rgb: "155 114 255", papier: "#e9defc", label: "Récup" },
};

// Verdict readiness (verte/orange/rouge, `src/readiness/`) → pastille.
export const VERDICT_ICON = { verte: "🟢", orange: "🟠", rouge: "🔴" };
