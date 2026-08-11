// ============================================================================
// LA MARQUE — UN SEUL ENDROIT (R-ZENNA v7)
// ============================================================================
// AVANT CE MODULE, LA MARQUE EXISTAIT EN QUATRE VERSIONS, mesuré en balayant les six écrans :
//   1. le questionnaire  — « ENDURA » + « BUILD » dans un bloc orange (Archivo Black droit) ;
//   2. l'en-tête des onglets — une tuile « E » à coin coupé + le mot incliné ;
//   3. le favicon, l'icône PWA et l'apple-touch-icon — un triangle rouge sur fond CRÈME,
//      c'est-à-dire l'ancienne direction artistique, INSTALLÉE sur l'écran d'accueil des gens ;
//   4. les cartes de partage — « ENDURABUILD » en Archivo Black avec deux barres d'accent.
// Quatre identités sur quatre surfaces, dont deux que j'avais moi-même introduites en portant
// la maquette. C'est ce que le fondateur a vu en parlant d'« ancien logo par endroits ».
//
// CE MODULE EST LE POINT UNIQUE (R11.1). Toute surface qui dessine la marque le lit ; personne
// ne redessine. Quand le vrai logo arrivera, il se pose ICI et les quatre surfaces suivent —
// c'est exactement la raison d'être du module (décision du fondateur : « tu me fournis le
// logo »).
//
// ─────────────────────────────────────────────────────────────────────────────
// OÙ POSER LE VRAI LOGO, QUAND IL ARRIVERA
//   · le SYMBOLE   → remplacer `MARQUE.polygone` (liste de points, repère 0-100). S'il n'est
//                     pas polygonal, voir la note de `dansSymbole` : le générateur d'icônes
//                     n'a pas de rastériseur SVG et demandera alors une autre approche ;
//   · le MOT       → `MARQUE.mot` (le texte) et, si la typo change, `--zn-display` ;
//   · les COULEURS → `MARQUE.encre` / `MARQUE.fond`, qui pilotent AUSSI les icônes générées.
// Rien d'autre à toucher : l'en-tête, le questionnaire, le favicon, les icônes PWA et la carte
// de partage en dérivent. `npm run make:icons` régénère les PNG depuis la même source.
//
// POURQUOI UN SVG EN `currentColor` ET NON UNE IMAGE : le symbole doit suivre le thème (il est
// posé sur de l'orange dans l'en-tête, sur du noir dans l'icône, sur du transparent dans la
// carte de partage). Une image figée obligerait à en maintenir trois variantes — la faute que
// ce module existe pour supprimer.
// ============================================================================

/**
 * LA SOURCE. Provisoire tant que le vrai logo n'est pas fourni : le monogramme reprend la
 * forme que la maquette donne à sa marque (une tuile à coin coupé portant une lettre), avec
 * l'initiale du PRODUIT — jamais « Z », qui est le nom de la maquette et non celui de l'app.
 */
export const MARQUE = {
  mot: "ENDURABUILD",
  /**
   * LE SYMBOLE EST UN POLYGONE, PAS UN CHEMIN SVG — et c'est délibéré (R11.1).
   * Deux rendus en ont besoin et ils n'ont pas le même moteur : l'app le dessine en SVG, et
   * `scripts/makeIcons.mjs` le peint PIXEL PAR PIXEL (générateur PNG zéro dépendance : il n'a
   * pas de rastériseur SVG). Écrire un chemin pour l'un et une géométrie pour l'autre ferait
   * deux définitions du même symbole, qui divergeraient au premier ajustement. Le polygone est
   * la source ; le chemin SVG en DÉRIVE (`symbolePath()`), et les pixels aussi.
   * Repère : viewBox 0 0 100 100.
   */
  polygone: [[22, 16], [78, 16], [78, 33], [41, 33], [41, 44], [73, 44], [73, 60],
             [41, 60], [41, 72], [79, 72], [79, 89], [22, 89]],
  /** Les deux couleurs de l'identité — elles pilotent aussi les icônes générées. */
  encre: "#0a0a0a",
  fond: "#ff3d00",
  /** Le fond des icônes d'application (écran d'accueil, onglet du navigateur). */
  fondIcone: "#08090a",
};

/** Le chemin SVG du symbole, DÉRIVÉ du polygone — jamais écrit à la main. */
export function symbolePath() {
  return "M" + MARQUE.polygone.map((p) => p[0] + " " + p[1]).join(" L") + " Z";
}

/** Le symbole est-il peint en ce point ? (règle pair-impair) — sert au générateur d'icônes. */
export function dansSymbole(x, y) {
  const pts = MARQUE.polygone;
  let dedans = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [xi, yi] = pts[i], [xj, yj] = pts[j];
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) dedans = !dedans;
  }
  return dedans;
}

/**
 * Le symbole dans sa tuile à coin coupé. `taille` en px ; `plein` = tuile orange à encre
 * sombre (l'usage courant), sinon symbole seul en `currentColor`.
 */
export function brandMarkHTML(taille = 30, plein = true) {
  const svg = '<svg viewBox="0 0 100 100" width="' + Math.round(taille * 0.52) + '" height="'
    + Math.round(taille * 0.52) + '" aria-hidden="true" focusable="false"><path d="'
    + symbolePath() + '" fill="currentColor"/></svg>';
  if (!plein) return svg;
  return '<span class="zn-logo-mark" aria-hidden="true" style="width:' + taille + "px;height:" + taille + 'px">'
    + svg + "</span>";
}

/** Le mot-marque. `niveau` : "grand" (accueil) ou "petit" (en-tête). */
export function brandWordHTML(niveau = "petit") {
  return '<span class="zn-brand-word' + (niveau === "grand" ? " grand" : "") + '">' + MARQUE.mot + "</span>";
}

/** La marque complète — symbole + mot. C'est ce que consomment l'en-tête et l'accueil. */
export function brandHTML(niveau = "petit") {
  return '<span class="zn-brand">' + brandMarkHTML(niveau === "grand" ? 54 : 30) + brandWordHTML(niveau) + "</span>";
}
