// R11.1 — un point unique pour les petites cartes icône/couleur/libellé que l'UI recopiait
// ailleurs. Audit du 07/08/2026 : la carte discipline (sw/bk/rn/br/rs → 🏊/🚴/🏃/🔁/😌) vivait
// en SIX copies indépendantes (plan-view.js, tab-week.js, session-life.js, tab-plan-general.js,
// tab-profile.js ×2), pas toutes identiques (`rs` valait 💪 ici et 😌 là, `br` manquait dans
// certaines) ; la carte verdict (verte/orange/rouge → 🟢/🟠/🔴) en trois (readiness.js,
// tab-today.js, session-life.js), celles-là identiques mais sans rien qui le garantisse. Rien
// n'est cassé aujourd'hui, mais rien ne garantit qu'un septième site les mette à jour ensemble
// — le mode de dérive silencieuse que ce principe existe pour interdire ailleurs dans le dépôt.

// Codes que le moteur émet (sw/bk/rn/br/rs), vérifiés exhaustivement par `demo:avatartri`.
// `rs` (repos) vaut 😌 — le glyphe le plus récent et le plus juste sémantiquement pour un jour
// de repos, retenu comme référence plutôt que 💪 (qui vivait dans les copies plus anciennes).
//
// LES TROIS ACCENTS DE DISCIPLINE VIENNENT DE LA MAQUETTE (fondateur, 12/08/2026) — et la
// condition posée pour les adopter était MESURÉE, pas esthétique : un badge de discipline porte
// de l'information (c'est la seule couleur de la ligne, et c'est elle qui dit la discipline),
// il tombe donc sous WCAG 1.4.11, 3:1 minimum, en tuile PLEINE sur `--zn-surface-3`. Mesuré
// avant adoption — natation 5,52 · vélo 4,34 · course 10,67 : les trois passent, les trois
// sont adoptés. (Anciennes valeurs, pour mémoire : #00b8d9 · #2e6bff · #ff7a1a.)
//
// CE QUE CE CHANGEMENT A CASSÉ, ET QUI EST DIT PLUTÔT QUE TU : ce commentaire affirmait
// jusqu'ici que les accents étaient « repris de SPORTS[*].accent (config.js) là où un sport
// correspond en direct (rn/bk/sw) — pas une troisième palette ». Ce n'est plus vrai : `config.js`
// garde les anciennes valeurs, parce qu'il décrit un AUTRE axe (le sport qu'on prépare, pas la
// discipline d'une séance) et qu'il peint d'autres écrans (l'avatar, les cartes de sport du
// questionnaire) que le fondateur n'a pas arbitrés. Mesuré : les deux axes ne se rencontrent sur
// AUCUN écran — 0 badge de discipline sur 📋 Profil, 0 accent de sport sur 🗓 Plan et 📅 Semaine.
// La divergence est donc invisible aujourd'hui ; elle est gardée par `smoke-carte-seance` §6,
// qui la rendra visible le jour où un écran affichera les deux.
//
// `--acc`, lui, ne porte plus aucune couleur de sport dans l'app : `zenna-today.css` le redéfinit
// à l'orange de marque sous `body.theme-zenna`, qui est toujours posée. Mesuré sur les trois
// sports — `body[data-sport="bike"]{--acc:#2e6bff}` (styles.css) rend `#ff3d00`. Ces règles-là
// sont mortes en app et ne survivent que pour le thème papier.
export const DISC = {
  sw: { ic: "🏊", ac: "#3b9eff", label: "Natation" },
  bk: { ic: "🚴", ac: "#ff3d00", label: "Vélo" },
  rn: { ic: "🏃", ac: "#ffd23d", label: "Course" },
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
