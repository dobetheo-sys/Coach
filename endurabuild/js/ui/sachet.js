// LE SACHET ZENNA — le produit des maquettes, dessiné en SVG.
//
// Pourquoi dessiné et non photographié : le dépôt n'embarque aucun asset raster (D19, zéro
// requête externe), et une photo de produit qui n'existe pas encore serait un rendu 3D qu'il
// faudrait refaire à chaque changement de saveur. Le sachet est donc construit depuis la table
// `GEL_ZENNA` — ajouter une saveur suffit à la dessiner.
//
// LE Z VIENT DE `brand.js`, JAMAIS D'UNE COPIE. C'est la leçon que R-ZENNA v8 a payée : la
// géométrie du logo existait en deux endroits (le SVG de l'app et le générateur d'icônes), et
// la favicone en portait un TROISIÈME encodage de 21,6 Ko. `symbolePath()` est la source ; ici
// on ne fait que la placer et la mettre à l'échelle.
//
// DEUX NIVEAUX DE DÉTAIL, et c'est une décision de lisibilité, pas d'optimisation : à 26 px de
// large, « ZENNA / GEL GLUCIDE / 30 G GLUCIDES » se rend en traits de moins d'un pixel — du
// bruit qui salit la forme au lieu de l'informer. La vignette ne porte donc que ce qui reste
// lisible à cette taille : la silhouette, le Z, le pan de couleur de la saveur.
import { symbolePath } from "./brand.js";
import { GEL_ZENNA, saveurGel } from "../shop-catalog.js";

// Le tracé du logo vit dans un carré 0-100 ; on le replace dans le sachet par une transformée
// plutôt qu'en recalculant des coordonnées (recalculer, c'est recopier).
function zHTML(cx, cy, taille) {
  const k = taille / 100;
  return '<path d="' + symbolePath() + '" fill="#f04808" transform="translate('
    + (cx - taille / 2) + ' ' + (cy - taille / 2) + ') scale(' + k.toFixed(4) + ')"/>';
}

/**
 * Le sachet d'une saveur. `detail` : "vignette" (petit, muet) ou "grand" (avec les mentions).
 * Toujours `aria-hidden` — c'est une ILLUSTRATION : la saveur est déjà nommée en toutes lettres
 * par le bouton ou la carte qui l'entoure, et la faire lire deux fois par un lecteur d'écran
 * n'apprend rien. Une saveur inconnue (« peu d'importance ») rend une chaîne vide plutôt qu'un
 * sachet gris qui ferait croire à un produit.
 */
export function sachetHTML(saveur, detail = "vignette", largeurPx = 26) {
  const s = saveurGel(saveur);
  if (!s) return "";
  const grand = detail === "grand";
  const W = 100, H = 132;
  const p = [];

  // Corps crème. Le bord haut est DENTELÉ comme une soudure de sachet — c'est ce qui le fait
  // lire comme un sachet et non comme une carte ; sans lui la forme est un rectangle.
  const dents = [];
  for (let x = 4; x < W - 4; x += 6) dents.push("l3 2.6 l3 -2.6");
  p.push('<path d="M4 9 ' + dents.join(" ") + ' L' + (W - 4) + ' ' + (H - 4)
    + ' Q' + (W - 4) + ' ' + H + ' ' + (W - 9) + ' ' + H
    + ' L9 ' + H + ' Q4 ' + H + ' 4 ' + (H - 4) + ' Z" fill="' + GEL_ZENNA.creme + '"/>');

  // Le pan diagonal de la saveur, en bas à gauche — la signature visuelle de la gamme.
  p.push('<path d="M4 ' + (grand ? H - 28 : H - 46) + ' L' + (W - 4) + ' ' + (grand ? H - 40 : H - 74)
    + ' L' + (W - 4) + ' ' + (H - 22) + ' L4 ' + (H - 22) + ' Z" fill="' + s.bloc + '"/>');
  // Bandeau bas sombre.
  p.push('<path d="M4 ' + (H - 22) + ' L' + (W - 4) + ' ' + (H - 22) + ' L' + (W - 4) + ' ' + (H - 4)
    + ' Q' + (W - 4) + ' ' + H + ' ' + (W - 9) + ' ' + H + ' L9 ' + H + ' Q4 ' + H + ' 4 ' + (H - 4)
    + ' Z" fill="' + GEL_ZENNA.encreSombre + '"/>');

  // La pastille de saveur, en haut — présente aux deux tailles : c'est elle qui distingue les
  // quatre sachets d'un coup d'œil dans la rangée de choix.
  p.push('<rect x="26" y="14" width="48" height="11" rx="2.5" fill="' + s.bloc + '"/>');

  p.push(zHTML(W / 2, grand ? 42 : 52, grand ? 24 : 32));

  if (grand) {
    // PAS de `font-family` en attribut de présentation : un attribut SVG est parsé comme du
    // XML, `var(--zn-mono)` n'y est PAS résolu, et la police retombait en silence sur celle du
    // navigateur. La police vient donc du CSS (`.zn-sachet text`), qui, lui, sait lire une
    // variable — et évite d'écrire une seconde fois la pile de polices du thème (R11.1).
    const t = (txt, y, size, fill, weight, ls) =>
      '<text x="' + W / 2 + '" y="' + y + '" text-anchor="middle" font-size="'
      + size + '" font-weight="' + (weight || 700) + '" letter-spacing="' + (ls || 0) + '" fill="' + fill + '">' + txt + "</text>";
    p.push(t("ZENNA", 60, 12, "#14140f", 800, 1));
    p.push(t("GEL GLUCIDE", 67, 4.6, "#6b6b63", 600, 0.8));
    p.push(t(s.libelle.toUpperCase(), 79, 7.5, s.texte, 800, 0.3));
    // Le chiffre est le seul argument du sachet qu'on lit à un mètre : il reste sur le crème,
    // au-dessus du pan de couleur. Ma première géométrie le posait DANS le pan (« 30 G » à
    // y=102 pour un pan qui commence à 86) — il s'y noyait, et c'est ce que le rendu a montré.
    p.push(t(GEL_ZENNA.glucidesG + " G", 94, 14, "#14140f", 800, 0));
    p.push(t("GLUCIDES", 100, 4.4, "#14140f", 700, 1));
    p.push(t("NET " + GEL_ZENNA.poidsNetG + " G", H - 8, 4.6, GEL_ZENNA.creme, 700, 0.8));
  }

  const h = Math.round(largeurPx * (H / W));
  return '<svg class="zn-sachet" viewBox="0 0 ' + W + " " + H + '" width="' + largeurPx + '" height="' + h
    + '" aria-hidden="true" focusable="false">' + p.join("") + "</svg>";
}

/** Les arguments produit des maquettes — formulés sur ce qui est VÉRIFIABLE sur le sachet
 *  (une composition, un poids, une origine), jamais sur un effet promis à l'athlète. */
export const ATOUTS_GEL = [
  { t: "1 sachet", d: GEL_ZENNA.glucidesG + " g de glucides" },
  { t: "Sans colorant", d: "ni conservateur" },
  { t: "Fabriqué", d: "en France" },
];
